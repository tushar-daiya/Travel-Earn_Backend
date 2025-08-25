const mongoose = require('mongoose');
const User = require('../model/Profile');
const TravelDetails = require('../model/traveldetails');
const ConsignmentDetails = require('../model/consignment.model');
const ConsignmentHistory = require('../model/travel.history');

class ReportController {
  // Get Consignment Consolidated Report
  static async getConsignmentConsolidatedReport(req, res) {
    try {
      console.log('📊 Generating Consignment Consolidated Report...');
      
      // Get query parameters for pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 30;
      const skip = (page - 1) * limit;
      
      console.log('📄 Pagination params:', { page, limit, skip });

      const Consignment = require('../model/consignment.model');
      const ConsignmentToCarry = require('../model/ConsignmentToCarry.model');
      const TravelDetails = require('../model/traveldetails');
      const FareConfig = require('../model/FareConfig');
      
      // Get fare configuration for T&E and Tax calculations
      const fareConfig = await FareConfig.findOne();
      const margin = fareConfig?.margin || 0.2;
      const TE = fareConfig?.TE || 0;
      
      console.log('🔍 Starting aggregation pipeline...');
      
      const report = await Consignment.aggregate([
        // Lookup consignment to carry information (only for accepted consignments)
        {
          $lookup: {
            from: "consignmenttocarries",
            let: { 
              consignmentId: "$consignmentId",
              status: "$status"
            },
            pipeline: [
              {
                $match: {
                  $expr: { 
                    $and: [
                      { $eq: ["$consignmentId", "$$consignmentId"] },
                      { $eq: ["$$status", "Accepted"] }
                    ]
                  }
                }
              }
            ],
            as: "carryInfo"
          }
        },
        
        // Lookup travel details using travelId from carryInfo
        {
          $lookup: {
            from: "traveldetails",
            let: { 
              travelId: { $arrayElemAt: ["$carryInfo.travelId", 0] }
            },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$travelId", "$$travelId"] }
                }
              }
            ],
            as: "travelDetails"
          }
        },
        
        // Project the final report fields with exact field names
        {
          $project: {
            // 1. Consignment ID
            "Consignment ID": "$consignmentId",
            
            // 2. Consignment Status
            "Consignment Status": "$status",
            
            // 3. Sender ID
            "Sender ID": "$_id",
            
            // 4. Sender Name - Use username from consignment model
            "Sender Name": {
              $ifNull: ["$username", "Unknown"]
            },
            
            // 5. Sender Mobile No
            "Sender Mobile No": "$phoneNumber",
            
            // 6. Sender Address
            "Sender Address": {
              $ifNull: [
                "$fullstartinglocation",
                "$startinglocation"
              ]
            },
            
            // 7. Total Amount Sender
            "Total Amount Sender": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.earning.senderTotalPay", 0] },
                0
              ]
            },
            
            // 8. Payment Status - Based on consignment status
            "Payment Status": {
              $cond: {
                if: { 
                  $in: [
                    "$status",
                    ["Delivered", "Completed", "Collected"]
                  ]
                },
                then: "Paid",
                else: "Pending"
              }
            },
            
            // 9. Traveler Id
            "Traveler Id": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails._id", 0] },
                "N/A"
              ]
            },
            
            // 10. Traveler Acceptance Date
            "Traveler Acceptance Date": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.createdAt", 0] },
                null
              ]
            },
            
            // 11. Traveler Name - Use username from traveldetails model
            "Traveler Name": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.username", 0] },
                "N/A"
              ]
            },
            
            // 12. Traveler Mobile No
            "Traveler Mobile No": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.phoneNumber", 0] },
                "N/A"
              ]
            },
            
            // 13. Traveler Address
            "Traveler Address": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.Leavinglocation", 0] },
                "N/A"
              ]
            },
            
            // 14. Amount to be paid to Traveler
            "Amount to be paid to Traveler": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.earning.totalFare", 0] },
                0
              ]
            },
            
            // 15. Traveler Payment Status - Based on carryInfo status
            "Traveler Payment Status": {
              $cond: {
                if: { 
                  $in: [
                    { $arrayElemAt: ["$carryInfo.status", 0] },
                    ["Delivered", "Completed"]
                  ]
                },
                then: "Paid",
                else: {
                  $cond: {
                    if: { 
                      $eq: [
                        { $arrayElemAt: ["$carryInfo.status", 0] },
                        "In Transit"
                      ]
                    },
                    then: "Partial",
                    else: "Pending"
                  }
                }
              }
            },
            
            // 16. Travel Mode
            "Travel Mode": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.travelMode", 0] },
                "N/A"
              ]
            },
            
            // 17. Travel Start Date
            "Travel Start Date": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.expectedStartTime", 0] },
                { $arrayElemAt: ["$travelDetails.travelDate", 0] },
                null
              ]
            },
            
            // 18. Travel End Date
            "Travel End Date": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.expectedEndTime", 0] },
                null
              ]
            },
            
            // 19. Recipient Name
            "Recipient Name": "$recievername",
            
            // 20. Recipient Address
            "Recipient Address": {
              $ifNull: [
                "$fullgoinglocation",
                "$goinglocation"
              ]
            },
            
            // 21. Recipient Phone no
            "Recipient Phone no": "$recieverphone",
            
            // 22. Received Date
            "Received Date": {
              $cond: {
                if: { 
                  $eq: [
                    { $arrayElemAt: ["$carryInfo.status", 0] },
                    "Delivered"
                  ]
                },
                then: { $arrayElemAt: ["$carryInfo.updatedAt", 0] },
                else: null
              }
            },
            
            // 23. T&E Amount
            "T&E Amount": { $literal: TE },
            
            // 24. Tax Component
            "Tax Component": {
              $multiply: [
                {
                  $ifNull: [
                    { $arrayElemAt: ["$carryInfo.earning.senderTotalPay", 0] },
                    0
                  ]
                },
                margin
              ]
            }
          }
        },
        
        // Add pagination
        { $skip: skip },
        { $limit: limit }
      ]);

      // Process the results to format dates and handle null values
      const processedReport = report.map(item => {
        // Helper function to format dates to ISO format
        const formatDate = (dateValue) => {
          if (!dateValue || dateValue === 'N/A') return null;
          try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return null;
            return date.toISOString();
          } catch (error) {
            return null;
          }
        };

        // Helper function to format amounts
        const formatAmount = (amount) => {
          if (amount === null || amount === undefined || amount === 'N/A') return 0;
          return parseFloat(amount) || 0;
        };

        return {
          "Consignment ID": item["Consignment ID"] || "N/A",
          "Consignment Status": item["Consignment Status"] || "Pending",
          "Sender ID": item["Sender ID"]?.toString() || "N/A",
          "Sender Name": item["Sender Name"] || "Unknown",
          "Sender Mobile No": item["Sender Mobile No"] || "N/A",
          "Sender Address": item["Sender Address"] || "N/A",
          "Total Amount Sender": formatAmount(item["Total Amount Sender"]),
          "Payment Status": item["Payment Status"] || "Pending",
          "Traveler Id": item["Traveler Id"]?.toString() || "N/A",
          "Traveler Acceptance Date": formatDate(item["Traveler Acceptance Date"]),
          "Traveler Name": item["Traveler Name"] || "N/A",
          "Traveler Mobile No": item["Traveler Mobile No"] || "N/A",
          "Traveler Address": item["Traveler Address"] || "N/A",
          "Amount to be paid to Traveler": formatAmount(item["Amount to be paid to Traveler"]),
          "Traveler Payment Status": item["Traveler Payment Status"] || "Pending",
          "Travel Mode": item["Travel Mode"] || "N/A",
          "Travel Start Date": formatDate(item["Travel Start Date"]),
          "Travel End Date": formatDate(item["Travel End Date"]),
          "Recipient Name": item["Recipient Name"] || "N/A",
          "Recipient Address": item["Recipient Address"] || "N/A",
          "Recipient Phone no": item["Recipient Phone no"] || "N/A",
          "Received Date": formatDate(item["Received Date"]),
          "T&E Amount": formatAmount(item["T&E Amount"]),
          "Tax Component": formatAmount(item["Tax Component"])
        };
      });

      // Get total count for pagination
      const totalCount = await Consignment.countDocuments();

      console.log(`✅ Consignment consolidated report generated with ${processedReport.length} records (page ${page})`);
      res.status(200).json({
        data: processedReport,
        pagination: {
          totalPages: Math.ceil(totalCount / limit),
          totalRecords: totalCount,
          recordsPerPage: limit,
          currentPage: page
        }
      });
    } catch (error) {
      console.error('❌ Error fetching consignment consolidated report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get Sender Report
  static async getSenderReport(req, res) {
    try {
      console.log('📊 Generating Sender Report...');
      
      // Get query parameters for pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 30;
      const skip = (page - 1) * limit;
      
      console.log('📄 Pagination params:', { page, limit, skip });

      const User = require('../model/Profile');
      const Consignment = require('../model/consignment.model');
      const ConsignmentToCarry = require('../model/ConsignmentToCarry.model');
      
      console.log('🔍 Starting sender report aggregation...');
      
      // First, get all users who have created consignments
      const senderReport = await User.aggregate([
        // Lookup consignments created by this user
        {
          $lookup: {
            from: "consignments",
            localField: "phoneNumber",
            foreignField: "phoneNumber",
            as: "consignments"
          }
        },
        
        // Only include users who have consignments
        {
          $match: {
            "consignments.0": { $exists: true }
          }
        },
        
        // Lookup ConsignmentToCarry for earnings calculation
        {
          $lookup: {
            from: "consignmenttocarries",
            let: { userPhone: "$phoneNumber" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$senderphone", "$$userPhone"] }
                }
              }
            ],
            as: "carryInfo"
          }
        },
        
        // Calculate summary statistics
        {
          $addFields: {
            numberOfConsignments: { $size: "$consignments" },
            totalAmountPaid: {
              $sum: {
                $map: {
                  input: "$consignments",
                  as: "consignment",
                  in: {
                    $cond: {
                      if: { $eq: ["$$consignment.status", "Accepted"] },
                      then: {
                        $let: {
                          vars: {
                            carryInfo: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$carryInfo",
                                    cond: { $eq: ["$$this.consignmentId", "$$consignment.consignmentId"] }
                                  }
                                },
                                0
                              ]
                            }
                          },
                          in: { $ifNull: ["$$carryInfo.earning.senderTotalPay", 0] }
                        }
                      },
                      else: 0
                    }
                  }
                }
              }
            },
            // Calculate earnings from accepted consignments
            totalEarnings: {
              $sum: {
                $map: {
                  input: "$carryInfo",
                  as: "carry",
                  in: { $ifNull: ["$$carry.earning.senderTotalPay", 0] }
                }
              }
            }
          }
        },
        
        // Add consignment details for expandable view
        {
          $addFields: {
            consignmentDetails: {
              $map: {
                input: "$consignments",
                as: "consignment",
                in: {
                  consignmentId: "$$consignment.consignmentId",
                  startingLocation: {
                    $ifNull: ["$$consignment.fullstartinglocation", "$$consignment.startinglocation"]
                  },
                  endingLocation: {
                    $ifNull: ["$$consignment.fullgoinglocation", "$$consignment.goinglocation"]
                  },
                  paymentStatus: "$$consignment.paymentStatus",
                  consignmentStatus: "$$consignment.status",
                  dateOfSending: "$$consignment.dateOfSending",
                  weight: "$$consignment.weight",
                  description: "$$consignment.Description",
                  receiverName: "$$consignment.recievername",
                  receiverPhone: "$$consignment.recieverphone",
                  earnings: {
                    $let: {
                      vars: {
                        carryInfo: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$carryInfo",
                                cond: { $eq: ["$$this.consignmentId", "$$consignment.consignmentId"] }
                              }
                            },
                            0
                          ]
                        }
                      },
                      in: { $ifNull: ["$$carryInfo.earning.senderTotalPay", 0] }
                    }
                  }
                }
              }
            }
          }
        },
        
        // Project the final report fields
        {
          $project: {
            // Basic sender information
            "Sender Id": "$_id",
            "Name": {
              $concat: [
                { $ifNull: ["$firstName", ""] },
                " ",
                { $ifNull: ["$lastName", ""] }
              ]
            },
            "Phone No": "$phoneNumber",
            "Address": {
              $ifNull: [
                { $arrayElemAt: ["$consignments.fullstartinglocation", 0] },
                { $arrayElemAt: ["$consignments.startinglocation", 0] },
                "N/A"
              ]
            },
            "State": "N/A", // This would need to be extracted from address if available
            
            // Summary statistics
            "No of Consignment": "$numberOfConsignments",
            "Total Amount": "$totalAmountPaid",
            
            // Detailed consignment information (for expandable view)
            "Sender's Consignment": "$consignmentDetails",
            
            // Payment status summary
            "Status of Consignment": {
              $cond: {
                if: { $gt: ["$numberOfConsignments", 0] },
                then: {
                  $cond: {
                    if: { $eq: ["$totalAmountPaid", 0] },
                    then: "Pending Payment",
                    else: "Payment Completed"
                  }
                },
                else: "No Consignments"
              }
            },
            
            "Payment": {
              $cond: {
                if: { $gt: ["$totalAmountPaid", 0] },
                then: "Paid",
                else: "Pending"
              }
            }
          }
        },
        
        // Add pagination
        { $skip: skip },
        { $limit: limit }
      ]);

      // Process the results to format data properly
      const processedReport = senderReport.map(item => {
        // Helper function to format amounts
        const formatAmount = (amount) => {
          if (amount === null || amount === undefined || amount === 'N/A') return 0;
          return parseFloat(amount) || 0;
        };

        // Process consignment details
        const processedConsignments = item["Sender's Consignment"].map(consignment => ({
          consignmentId: consignment.consignmentId || "N/A",
          startingLocation: consignment.startingLocation || "N/A",
          endingLocation: consignment.endingLocation || "N/A",
          paymentStatus: consignment.paymentStatus || "pending",
          consignmentStatus: consignment.consignmentStatus || "Pending",
          dateOfSending: consignment.dateOfSending ? new Date(consignment.dateOfSending).toISOString() : null,
          weight: consignment.weight || "N/A",
          description: consignment.description || "N/A",
          receiverName: consignment.receiverName || "N/A",
          receiverPhone: consignment.receiverPhone || "N/A",
          earnings: formatAmount(consignment.earnings)
        }));

        return {
          "Sender Id": item["Sender Id"]?.toString() || "N/A",
          "Name": item["Name"]?.trim() || "Unknown",
          "Phone No": item["Phone No"] || "N/A",
          "Address": item["Address"] || "N/A",
          "State": item["State"] || "N/A",
          "No of Consignment": item["No of Consignment"] || 0,
          "Total Amount": formatAmount(item["Total Amount"]),
          "Sender's Consignment": processedConsignments,
          "Status of Consignment": item["Status of Consignment"] || "No Consignments",
          "Payment": item["Payment"] || "Pending"
        };
      });

      // Get total count for pagination
      const totalCount = await User.countDocuments({
        phoneNumber: { $in: await Consignment.distinct("phoneNumber") }
      });

      console.log(`✅ Sender report generated with ${processedReport.length} records (page ${page})`);
      res.status(200).json({
        data: processedReport,
        pagination: {
          totalPages: Math.ceil(totalCount / limit),
          totalRecords: totalCount,
          recordsPerPage: limit,
          currentPage: page
        }
      });
    } catch (error) {
      console.error('❌ Error fetching sender report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get Sender Consignment Details (for expandable view)
  static async getSenderConsignmentDetails(req, res) {
    try {
      const { senderPhone } = req.params;
      
      if (!senderPhone) {
        return res.status(400).json({ error: 'Sender phone number is required' });
      }

      console.log(`🔍 Fetching consignment details for sender: ${senderPhone}`);

      const Consignment = require('../model/consignment.model');
      const ConsignmentToCarry = require('../model/ConsignmentToCarry.model');

      const consignmentDetails = await Consignment.aggregate([
        // Match consignments by sender phone number
        {
          $match: {
            phoneNumber: senderPhone
          }
        },
        
        // Lookup ConsignmentToCarry for earnings
        {
          $lookup: {
            from: "consignmenttocarries",
            localField: "consignmentId",
            foreignField: "consignmentId",
            as: "carryInfo"
          }
        },
        
        // Project the detailed information
        {
          $project: {
            consignmentId: 1,
            startingLocation: {
              $ifNull: ["$fullstartinglocation", "$startinglocation"]
            },
            endingLocation: {
              $ifNull: ["$fullgoinglocation", "$goinglocation"]
            },
            paymentStatus: 1,
            consignmentStatus: 1,
            dateOfSending: 1,
            weight: 1,
            description: "$Description",
            receiverName: "$recievername",
            receiverPhone: "$recieverphone",
            earnings: {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.earning.senderTotalPay", 0] },
                0
              ]
            },
            carryStatus: {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.status", 0] },
                "N/A"
              ]
            }
          }
        },
        
        // Sort by date of sending (newest first)
        {
          $sort: { dateOfSending: -1 }
        }
      ]);

      // Process the results
      const processedDetails = consignmentDetails.map(item => ({
        consignmentId: item.consignmentId || "N/A",
        startingLocation: item.startingLocation || "N/A",
        endingLocation: item.endingLocation || "N/A",
        paymentStatus: item.paymentStatus || "pending",
        consignmentStatus: item.consignmentStatus || "Pending",
        dateOfSending: item.dateOfSending ? new Date(item.dateOfSending).toISOString() : null,
        weight: item.weight || "N/A",
        description: item.description || "N/A",
        receiverName: item.receiverName || "N/A",
        receiverPhone: item.receiverPhone || "N/A",
        earnings: parseFloat(item.earnings) || 0,
        carryStatus: item.carryStatus || "N/A"
      }));

      console.log(`✅ Found ${processedDetails.length} consignments for sender ${senderPhone}`);
      res.status(200).json({
        data: processedDetails,
        senderPhone: senderPhone
      });
    } catch (error) {
      console.error('❌ Error fetching sender consignment details:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get Traveler Report
  static async getTravelerReport(req, res) {
    try {
      console.log('📊 Generating Traveler Report...');
      
      // Get query parameters for pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 30;
      const skip = (page - 1) * limit;
      
      console.log('📄 Pagination params:', { page, limit, skip });

      const User = require('../model/Profile');
      const TravelHistory = require('../model/travel.history');
      const Consignment = require('../model/consignment.model');
      const ConsignmentToCarry = require('../model/ConsignmentToCarry.model');
      
      console.log('🔍 Starting traveler report aggregation...');
      
      // Step 1: Get all users (userprofiles) and extract id, name, phone number
      // Step 2: Filter travel histories by phone number
      // Step 3: Calculate total consignments and earnings
      const travelerReport = await User.aggregate([
        // Step 1: Get all users with their basic info
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            phoneNumber: 1
          }
        },
        
        // Step 2: Lookup travel histories by phone number
        {
          $lookup: {
            from: "travelhistories",
            localField: "phoneNumber",
            foreignField: "phoneNumber",
            as: "travelHistories"
          }
        },
        
        // Only include users who have travel histories
        {
          $match: {
            "travelHistories.0": { $exists: true }
          }
        },
        
        // Step 3: Calculate summary statistics
        {
          $addFields: {
            numberOfTravels: { $size: "$travelHistories" },
            totalConsignments: {
              $sum: {
                $map: {
                  input: "$travelHistories",
                  as: "history",
                  in: { $ifNull: ["$$history.consignments", 0] }
                }
              }
            }
          }
        },
        
        // Project the final report fields
        {
          $project: {
            // Basic traveler information
            "Traveler Id": "$_id",
            "Name": {
              $concat: [
                { $ifNull: ["$firstName", ""] },
                " ",
                { $ifNull: ["$lastName", ""] }
              ]
            },
            "Phone No": "$phoneNumber",
            "Address": "N/A", // Will be extracted from travel histories if needed
            
            // Summary statistics
            "No of Travels": "$numberOfTravels",
            "No of Consignments": "$totalConsignments",
            
            // Payment status summary
            "Status of Consignments": {
              $cond: {
                if: { $gt: ["$totalConsignments", 0] },
                then: "Payment Pending", // Will be calculated separately
                else: "No Consignments"
              }
            },
            
            "Payment": "Pending" // Will be calculated separately
          }
        },
        
        // Add pagination
        { $skip: skip },
        { $limit: limit }
      ]);

      // Calculate earnings separately for better performance
      const processedReport = [];
      for (const item of travelerReport) {
        const phoneNumber = item["Phone No"];
        
        // Get travel histories for this user
        const travelHistories = await TravelHistory.find({ phoneNumber });
        
        let totalEarnings = 0;
        
        // Calculate earnings from all consignment details
        for (const history of travelHistories) {
          if (history.consignmentDetails && history.consignmentDetails.length > 0) {
            for (const consignmentDetail of history.consignmentDetails) {
              // Get earnings from ConsignmentToCarry model
              const carryInfo = await ConsignmentToCarry.findOne({ 
                consignmentId: consignmentDetail.consignmentId 
              });
              
              if (carryInfo && carryInfo.earning && carryInfo.earning.totalFare) {
                totalEarnings += parseFloat(carryInfo.earning.totalFare) || 0;
              }
            }
          }
        }
        
        // Helper function to format amounts
        const formatAmount = (amount) => {
          if (amount === null || amount === undefined || amount === 'N/A') return 0;
          return parseFloat(amount) || 0;
        };

        processedReport.push({
          "Traveler Id": item["Traveler Id"]?.toString() || "N/A",
          "Name": item["Name"]?.trim() || "Unknown",
          "Phone No": item["Phone No"] || "N/A",
          "Address": item["Address"] || "N/A",
          "No of Travels": item["No of Travels"] || 0,
          "No of Consignments": item["No of Consignments"] || 0,
          "Total Amount": formatAmount(totalEarnings),
          "Status of Consignments": item["No of Consignments"] > 0 ? 
            (totalEarnings > 0 ? "Payment Completed" : "Payment Pending") : 
            "No Consignments",
          "Payment": totalEarnings > 0 ? "Paid" : "Pending"
        });
      }

      // Get total count for pagination
      const totalCount = await User.countDocuments({
        phoneNumber: { $in: await TravelHistory.distinct("phoneNumber") }
      });

      console.log(`✅ Traveler report generated with ${processedReport.length} records (page ${page})`);
      res.status(200).json({
        data: processedReport,
        pagination: {
          totalPages: Math.ceil(totalCount / limit),
          totalRecords: totalCount,
          recordsPerPage: limit,
          currentPage: page
        }
      });
    } catch (error) {
      console.error('❌ Error fetching traveler report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get Traveler Consignment Details (for expandable view)
  static async getTravelerConsignmentDetails(req, res) {
    try {
      const { travelerPhone } = req.params;
      
      if (!travelerPhone) {
        return res.status(400).json({ error: 'Traveler phone number is required' });
      }

      console.log(`🔍 Fetching consignment details for traveler: ${travelerPhone}`);

      const TravelHistory = require('../model/travel.history');
      const Consignment = require('../model/consignment.model');
      const ConsignmentToCarry = require('../model/ConsignmentToCarry.model');

      // Step 2: Get all travel histories for this phone number
      const travelHistories = await TravelHistory.find({ phoneNumber: travelerPhone });
      
      if (!travelHistories || travelHistories.length === 0) {
        return res.status(200).json({
          data: [],
          travelerPhone: travelerPhone,
          message: "No travel histories found for this traveler"
        });
      }

      // Step 3 & 4: Extract consignment details from travel histories
      const allConsignmentDetails = [];
      let totalEarnings = 0;

      for (const history of travelHistories) {
        if (history.consignmentDetails && history.consignmentDetails.length > 0) {
          for (const consignmentDetail of history.consignmentDetails) {
            // Step 5: Get consignment status and payment status using consignment ID
            const consignment = await Consignment.findOne({ 
              consignmentId: consignmentDetail.consignmentId 
            });

            // Step 6: Get earnings from ConsignmentToCarry model
            const carryInfo = await ConsignmentToCarry.findOne({ 
              consignmentId: consignmentDetail.consignmentId 
            });

            const earnings = carryInfo?.earning?.totalFare || 0;
            totalEarnings += parseFloat(earnings) || 0;

            // Format dimensions from complex object to simple string
            let formattedDimensions = "N/A";
            if (carryInfo?.dimensions) {
              try {
                let dimensionsObj = carryInfo.dimensions;
                
                // If dimensions is a string, try to parse it
                if (typeof carryInfo.dimensions === 'string') {
                  // Handle the format "{ length: '5', breadth: '15', height: '5', unit: 'cm' }"
                  const dimensionString = carryInfo.dimensions.trim();
                  if (dimensionString.startsWith('{') && dimensionString.endsWith('}')) {
                    // Convert to valid JSON by adding quotes around property names
                    const jsonString = dimensionString
                      .replace(/(\w+):/g, '"$1":')  // Add quotes around property names
                      .replace(/'/g, '"');          // Replace single quotes with double quotes
                    
                    dimensionsObj = JSON.parse(jsonString);
                  } else {
                    // Try regular JSON parse
                    dimensionsObj = JSON.parse(carryInfo.dimensions);
                  }
                }
                
                if (dimensionsObj && dimensionsObj.length && dimensionsObj.breadth && dimensionsObj.height && dimensionsObj.unit) {
                  formattedDimensions = `${dimensionsObj.length} × ${dimensionsObj.breadth} × ${dimensionsObj.height} ${dimensionsObj.unit}`;
                }
              } catch (error) {
                console.log('Error parsing dimensions:', error);
                formattedDimensions = "N/A";
              }
            }

            // Extract travel date from expectedStartTime
            let travelDate = "N/A";
            if (history.expectedStartTime) {
              try {
                const startDate = new Date(history.expectedStartTime);
                travelDate = startDate.toLocaleDateString('en-CA'); // Format: YYYY-MM-DD
              } catch (error) {
                console.log('Error parsing travel date:', error);
                travelDate = "N/A";
              }
            }
            

            // Determine travel mode display - show vehicle type for roadways, else show travel mode
            let travelModeDisplay = "N/A";
            console.log('Debug - travelMode:', history.travelMode, 'vehicleType:', history.vehicleType);
            if (history.travelMode === "roadways") {
              if (history.vehicleType) {
                travelModeDisplay = history.vehicleType;
              } else {
                travelModeDisplay = "Road Transport"; // Fallback for roadways without vehicle type
              }
            } else if (history.travelMode) {
              travelModeDisplay = history.travelMode;
            }
            console.log('Debug - final travelModeDisplay:', travelModeDisplay);

            allConsignmentDetails.push({
              consignmentId: consignmentDetail.consignmentId || "N/A",
              status: consignment?.status || "N/A",
              paymentStatus: consignment?.paymentStatus || "pending",
              weight: consignmentDetail.weight || "N/A",
              dimensions: formattedDimensions,
              pickup: consignmentDetail.pickup || "N/A",
              drop: consignmentDetail.drop || "N/A",
              timestamp: consignmentDetail.timestamp ? new Date(consignmentDetail.timestamp).toISOString() : null,
              travelId: history.travelId || "N/A",
              travelMode: travelModeDisplay,
              travelDate: travelDate,
              expectedStartTime: history.expectedStartTime || "N/A",
              expectedEndTime: history.expectedendtime || "N/A",
              earnings: parseFloat(earnings) || 0,
              carryStatus: carryInfo?.status || "N/A"
            });
          }
        }
      }

      // Sort by timestamp (newest first)
      allConsignmentDetails.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      console.log(`✅ Found ${allConsignmentDetails.length} consignments for traveler ${travelerPhone}`);
      res.status(200).json({
        data: allConsignmentDetails,
        travelerPhone: travelerPhone,
        totalEarnings: totalEarnings,
        totalConsignments: allConsignmentDetails.length
      });
    } catch (error) {
      console.error('❌ Error fetching traveler consignment details:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = ReportController;


