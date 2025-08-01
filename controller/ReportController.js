const mongoose = require('mongoose');
const User = require('../../user/model/Profile');
const TravelDetails = require('../../user/model/traveldetails');
const ConsignmentDetails = require('../../consignment/model/contraveldetails');
const ConsignmentHistory = require('../../consignment/model/conhistory');

class ReportController {
  // Helper function to safely format dates
  static formatDate(dateValue) {
    if (!dateValue) return 'N/A';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toISOString().split('T')[0];
    } catch (error) {
      return 'N/A';
    }
  }

  // Helper function to create user lookup map
  static createUserMap(users) {
    const userMap = {};
    users.forEach(user => {
      userMap[user.phoneNumber] = user;
    });
    return userMap;
  }

  // Get Traveler Report (Enhanced)
  static async getTravelerReport(req, res) {
    try {
      console.log('📊 Generating Enhanced Traveler Report...');
      
      // Get all related data in parallel
      const [allTravelDetails, userProfiles, consignmentHistory, earnings] = await Promise.all([
        TravelDetails.find({}).lean(),
        User.find({ role: 'traveler' }).lean(),
        ConsignmentHistory.find({}).lean(),
        require('../../traveller/model/Earning').find({}).lean()
      ]);
      
             // Create lookup maps
       const userMap = ReportController.createUserMap(userProfiles);
       const earningMap = {};
      earnings.forEach(earning => {
        earningMap[earning.phoneNumber] = earning;
      });
      
      // Group travel details by phone number to find unique travelers
      const travelerGroups = {};
      allTravelDetails.forEach(travel => {
        if (!travelerGroups[travel.phoneNumber]) {
          travelerGroups[travel.phoneNumber] = [];
        }
        travelerGroups[travel.phoneNumber].push(travel);
      });

      const travelerReports = await Promise.all(
        Object.keys(travelerGroups).map(async (travelerPhone) => {
          const travelerTravels = travelerGroups[travelerPhone];
          const traveler = userMap[travelerPhone];
          const userEarnings = earningMap[travelerPhone];
          
          // Get consignment history where this traveler is involved
          const consignmentHistory = await ConsignmentHistory.find({
            'traveldetails.phoneNumber': travelerPhone
          });

          // Calculate earnings from multiple sources
          const travelEarnings = travelerTravels.reduce((sum, travel) => {
            return sum + (parseFloat(travel.payableAmount) || 0);
          }, 0);

          const transactionEarnings = userEarnings?.totalEarnings || 0;
          const totalEarnings = Math.max(travelEarnings, transactionEarnings);

          // Get consignment details for this traveler
          const travelerConsignments = consignmentHistory.map(history => ({
            consignmentId: history.consignmentId,
            description: history.description,
            status: history.status,
            expectedEarning: history.expectedEarning,
            distance: history.distance,
            category: history.category,
            pickup: history.pickupLocation,
            delivery: history.deliveryLocation
          }));

          // Calculate performance metrics
          const completedTravels = travelerTravels.filter(t => t.status === 'Completed').length;
          const totalTravels = travelerTravels.length;
          const completionRate = totalTravels > 0 ? (completedTravels / totalTravels) * 100 : 0;

          // Get recent transactions
          const recentTransactions = userEarnings?.transactions?.slice(-5).map(t => ({
            title: t.title,
            amount: t.amount,
            status: t.status,
            paymentMethod: t.paymentMethod,
                         timestamp: ReportController.formatDate(t.timestamp)
          })) || [];

          // Get the most recent status
          const latestTravel = travelerTravels.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          )[0];

          const statusOfConsignment = latestTravel ? latestTravel.status : 'No Travels';

          return {
            travelerId: traveler ? (traveler.userId || traveler._id.toString()) : travelerPhone,
            name: traveler ? `${traveler.firstName || ''} ${traveler.lastName || ''}`.trim() : 'Unknown',
            phoneNo: travelerPhone,
            email: traveler?.email || 'N/A',
            address: traveler ? `${traveler.currentLocation?.coordinates?.[1] || ''}, ${traveler.currentLocation?.coordinates?.[0] || ''}` : 'Unknown',
            state: 'Active',
            noOfConsignment: consignmentHistory.length,
            totalAmount: totalEarnings,
            travelerConsignment: travelerConsignments,
            statusOfConsignment: statusOfConsignment,
            payment: totalEarnings > 0 ? 'Paid' : 'Pending',
            averageRating: traveler ? (traveler.averageRating || 0) : 0,
            totalRating: traveler ? (traveler.totalrating || 0) : 0,
            isVerified: traveler?.isVerified || false,
            completionRate: completionRate.toFixed(2),
            totalTravels: totalTravels,
            completedTravels: completedTravels,
            recentTransactions: recentTransactions,
                         createdAt: ReportController.formatDate(traveler?.createdAt),
             lastUpdated: ReportController.formatDate(traveler?.lastUpdated)
          };
        })
      );

      console.log(`✅ Enhanced traveler report generated with ${travelerReports.length} records`);
      res.status(200).json(travelerReports);
    } catch (error) {
      console.error('❌ Error fetching enhanced traveler report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  }

  // Get Sender Report (Enhanced)
  static async getSenderReport(req, res) {
    try {
      console.log('📦 Generating Enhanced Sender Report...');
      
      // Get all related data in parallel
      const [consignments, userProfiles, consignmentHistory, requestForCarry] = await Promise.all([
        ConsignmentDetails.find({}).lean(),
        User.find({}).lean(),
        ConsignmentHistory.find({}).lean(),
        require('../../user/model/requestforcarry').find({}).lean()
      ]);
      
             // Create lookup maps
       const userMap = ReportController.createUserMap(userProfiles);
       const requestMap = {};
      requestForCarry.forEach(request => {
        if (!requestMap[request.consignmentId]) {
          requestMap[request.consignmentId] = [];
        }
        requestMap[request.consignmentId].push(request);
      });
      
      // Group consignments by sender phone number
      const senderGroups = {};
      consignments.forEach(consignment => {
        if (!senderGroups[consignment.phoneNumber]) {
          senderGroups[consignment.phoneNumber] = [];
        }
        senderGroups[consignment.phoneNumber].push(consignment);
      });

      const senderReports = await Promise.all(
        Object.keys(senderGroups).map(async (senderPhone) => {
          const senderConsignments = senderGroups[senderPhone];
          const sender = userMap[senderPhone];
          
          // Get consignment history for this sender
          const consignmentHistory = await ConsignmentHistory.find({
            senderPhoneNumber: senderPhone
          });

          // Calculate total amount from consignments
          const totalAmount = senderConsignments.reduce((sum, consignment) => {
            return sum + (parseFloat(consignment.earning) || 0);
          }, 0);

          // Calculate performance metrics
          const completedConsignments = senderConsignments.filter(c => c.status === 'Completed').length;
          const pendingConsignments = senderConsignments.filter(c => c.status === 'Pending').length;
          const inProgressConsignments = senderConsignments.filter(c => c.status === 'In Progress').length;
          const completionRate = senderConsignments.length > 0 ? (completedConsignments / senderConsignments.length) * 100 : 0;

          // Get consignment details for this sender
          const senderConsignmentDetails = senderConsignments.map(consignment => {
            const requests = requestMap[consignment.consignmentId] || [];
            const acceptedRequest = requests.find(r => r.status === 'Accepted');
            
            return {
            consignmentId: consignment.consignmentId,
            description: consignment.Description,
            status: consignment.status,
            earning: consignment.earning,
            distance: consignment.distance,
            category: consignment.category,
            weight: consignment.weight,
                             dimensionalweight: consignment.dimensionalweight,
               hasTraveler: acceptedRequest ? 'Yes' : 'No',
               travelerName: acceptedRequest?.travellername || 'N/A',
               createdAt: ReportController.formatDate(consignment.createdAt),
               updatedAt: ReportController.formatDate(consignment.updatedAt)
            };
          });

          // Get the most recent status
          const latestConsignment = senderConsignments.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          )[0];

          const statusOfConsignment = latestConsignment ? latestConsignment.status : 'No Consignments';

          return {
            senderId: sender ? (sender.userId || sender._id.toString()) : senderPhone,
            name: sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() : 'Unknown',
            phoneNo: senderPhone,
            email: sender?.email || 'N/A',
            address: sender ? `${sender.currentLocation?.coordinates?.[1] || ''}, ${sender.currentLocation?.coordinates?.[0] || ''}` : 'Unknown',
            state: 'Active',
            noOfConsignment: senderConsignments.length,
            completedConsignments: completedConsignments,
            pendingConsignments: pendingConsignments,
            inProgressConsignments: inProgressConsignments,
            completionRate: completionRate.toFixed(2),
            totalAmount: totalAmount,
            averageAmount: senderConsignments.length > 0 ? totalAmount / senderConsignments.length : 0,
            senderConsignment: senderConsignmentDetails,
            statusOfConsignment: statusOfConsignment,
            payment: totalAmount > 0 ? 'Paid' : 'Pending',
                         averageRating: sender ? (sender.averageRating || 0) : 0,
             totalRating: sender ? (sender.totalrating || 0) : 0,
             isVerified: sender?.isVerified || false,
             createdAt: ReportController.formatDate(sender?.createdAt),
             lastUpdated: ReportController.formatDate(sender?.lastUpdated)
          };
        })
      );

      console.log(`✅ Enhanced sender report generated with ${senderReports.length} records`);
      res.status(200).json(senderReports);
    } catch (error) {
      console.error('❌ Error fetching enhanced sender report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  }

  // Get Consignment Consolidated Report (Enhanced)
  static async getConsignmentConsolidatedReport(req, res) {
    try {
      console.log('📊 Generating Enhanced Consignment Consolidated Report...');
      
      // Import additional models
      const ConsignmentToCarry = require('../../traveller/model/consignmenttocarry');
      const RequestForCarry = require('../../user/model/requestforcarry');
      const TravelHistory = require('../../user/model/travel.history');
      const Earning = require('../../traveller/model/Earning');

      // Get all data in parallel for better performance
      const [
        consignments, 
        consignmentHistory, 
        travelDetails, 
        userProfiles, 
        consignmentToCarry, 
        requestForCarry,
        earnings
      ] = await Promise.all([
        ConsignmentDetails.find({}).lean(),
        ConsignmentHistory.find({}).lean(),
        TravelDetails.find({}).lean(),
        User.find({}).lean(),
        ConsignmentToCarry.find({}).lean(),
        RequestForCarry.find({}).lean(),
        Earning.find({}).lean()
      ]);
      
             // Create lookup maps for efficient relationship resolution
       const userMap = ReportController.createUserMap(userProfiles);
      const travelMap = {};
      travelDetails.forEach(travel => {
        travelMap[travel.travelId] = travel;
      });
      const requestMap = {};
      requestForCarry.forEach(request => {
        requestMap[request.consignmentId] = request;
      });
      const carryMap = {};
      consignmentToCarry.forEach(carry => {
        carryMap[carry.consignmentId] = carry;
      });
      const earningMap = {};
      earnings.forEach(earning => {
        earningMap[earning.phoneNumber] = earning;
      });

      const consolidatedReport = await Promise.all(
        consignments.map(async (consignment) => {
          // Find sender information
          const sender = userMap[consignment.phoneNumber];
          
          // Find consignment history for this consignment
          const history = consignmentHistory.find(h => h.consignmentId === consignment.consignmentId);
          
          // Find consignment to carry data
          const carryData = carryMap[consignment.consignmentId];
          
          // Find request for carry data
          const requestData = requestMap[consignment.consignmentId];
          
          // Find traveler information with enhanced logic
          let traveler = null;
          let travelerAcceptanceDate = null;
          let travelMode = null;
          let travelStartDate = null;
          let travelEndDate = null;
          let travelerId = 'N/A';
          let amountToBePaidToTraveler = 0;
          
          // Enhanced traveler finding logic
          if (history && history.traveldetails && history.traveldetails.length > 0) {
            const latestTravelDetail = history.traveldetails[history.traveldetails.length - 1];
            traveler = userMap[latestTravelDetail.phoneNumber];
            travelerAcceptanceDate = latestTravelDetail.timestamp;
            travelMode = latestTravelDetail.travelMode;
            travelerId = traveler?._id?.toString() || latestTravelDetail.phoneNumber;
            amountToBePaidToTraveler = parseFloat(history.expectedEarning) || 0;
            
            // Find travel details for start and end dates
            const travelDetail = travelMap[latestTravelDetail.travelId];
            if (travelDetail) {
              travelStartDate = travelDetail.travelDate;
              travelEndDate = travelDetail.expectedEndTime;
            }
          } else if (carryData) {
            // Try to find traveler from carry data
            const travelDetail = travelMap[carryData.travelId];
            if (travelDetail) {
              traveler = userMap[travelDetail.phoneNumber];
              travelerAcceptanceDate = carryData.createdAt;
              travelMode = travelDetail.travelMode;
              travelStartDate = travelDetail.travelDate;
              travelEndDate = travelDetail.expectedEndTime;
              travelerId = traveler?._id?.toString() || travelDetail.phoneNumber;
              amountToBePaidToTraveler = parseFloat(carryData.earning) || 0;
            }
          } else if (requestData) {
            // Try to find traveler from request data
            const travelDetail = travelMap[requestData.travelId];
            if (travelDetail) {
              traveler = userMap[travelDetail.phoneNumber];
              travelerAcceptanceDate = requestData.createdAt;
              travelMode = requestData.travelmode;
              travelStartDate = travelDetail.travelDate;
              travelEndDate = travelDetail.expectedEndTime;
              travelerId = traveler?._id?.toString() || travelDetail.phoneNumber;
              amountToBePaidToTraveler = parseFloat(requestData.earning) || 0;
            }
          }

          // Enhanced amount calculations
          const totalAmountSender = parseFloat(consignment.earning) || 0;
          const tneAmount = totalAmountSender - amountToBePaidToTraveler;
          const taxComponent = tneAmount * 0.18; // 18% tax

          // Enhanced payment status logic
          let senderPaymentStatus = 'Pending';
          let travelerPaymentStatus = 'N/A';

          // Sender payment status logic
          if (totalAmountSender > 0) {
            if (consignment.status === 'Completed' || consignment.status === 'Delivered') {
              senderPaymentStatus = 'Paid';
            } else if (consignment.status === 'Accepted' || consignment.status === 'In Progress') {
              senderPaymentStatus = 'Paid';
            } else {
              senderPaymentStatus = 'Pending';
            }
          }

          // Traveler payment status logic
          if (amountToBePaidToTraveler > 0) {
            if (consignment.status === 'Completed' || consignment.status === 'Delivered') {
              travelerPaymentStatus = 'Paid';
            } else if (consignment.status === 'In Progress') {
              travelerPaymentStatus = 'Partial';
            } else {
              travelerPaymentStatus = 'Pending';
            }
          }

                     // Enhanced received date logic
           let receivedDate = 'N/A';
           if (history?.delivered) {
             receivedDate = ReportController.formatDate(history.delivered);
           } else if (carryData?.dateandtimeofdelivery) {
             receivedDate = ReportController.formatDate(carryData.dateandtimeofdelivery);
           } else if (carryData?.status === 'Delivered') {
             receivedDate = ReportController.formatDate(carryData.updatedAt);
           }

          // Get traveler earnings data
          const travelerEarnings = earningMap[traveler?.phoneNumber];
          const travelerTotalEarnings = travelerEarnings?.totalEarnings || 0;

          return {
            consignmentId: consignment.consignmentId,
            consignmentStatus: consignment.status,
            senderId: sender?._id?.toString() || consignment.phoneNumber,
            senderName: sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() : 'Unknown',
            senderMobileNo: consignment.phoneNumber,
            senderAddress: consignment.startinglocation,
            totalAmountSender: totalAmountSender,
            paymentStatus: senderPaymentStatus,
            travelerId: travelerId,
                         travelerAcceptanceDate: ReportController.formatDate(travelerAcceptanceDate),
            travelerName: traveler ? `${traveler.firstName || ''} ${traveler.lastName || ''}`.trim() : 'N/A',
            travelerMobileNo: traveler?.phoneNumber || 'N/A',
            travelerAddress: traveler?.currentLocation ? `${traveler.currentLocation.coordinates?.[1] || ''}, ${traveler.currentLocation.coordinates?.[0] || ''}` : 'N/A',
            amountToBePaidToTraveler: amountToBePaidToTraveler,
            travelerPaymentStatus: travelerPaymentStatus,
            travelerTotalEarnings: travelerTotalEarnings,
            travelMode: travelMode || 'N/A',
                         travelStartDate: ReportController.formatDate(travelStartDate),
             travelEndDate: ReportController.formatDate(travelEndDate),
            recepientName: consignment.recievername,
            recepientAddress: consignment.goinglocation,
            recepientPhoneNo: consignment.recieverphone,
            receivedDate: receivedDate,
            tneAmount: tneAmount,
            taxComponent: taxComponent,
            // Additional enhanced fields
            weight: consignment.weight,
            category: consignment.category,
            subcategory: consignment.subcategory,
            description: consignment.Description,
            dimensions: consignment.dimensions,
            distance: consignment.distance,
            duration: consignment.duration,
            handleWithCare: consignment.handleWithCare,
            specialRequest: consignment.specialRequest,
                         dateOfSending: ReportController.formatDate(consignment.dateOfSending),
             createdAt: ReportController.formatDate(consignment.createdAt),
             updatedAt: ReportController.formatDate(consignment.updatedAt)
          };
        })
      );

      console.log(`✅ Enhanced consolidated report generated with ${consolidatedReport.length} records`);
      res.status(200).json(consolidatedReport);
    } catch (error) {
      console.error('❌ Error fetching enhanced consignment consolidated report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  }

  // New: Get Business Intelligence Report
  static async getBusinessIntelligenceReport(req, res) {
    try {
      console.log('📈 Generating Business Intelligence Report...');
      
      // Get all data in parallel
      const [
        consignments, 
        userProfiles, 
        travelDetails, 
        consignmentHistory,
        earnings
      ] = await Promise.all([
        ConsignmentDetails.find({}).lean(),
        User.find({}).lean(),
        TravelDetails.find({}).lean(),
        ConsignmentHistory.find({}).lean(),
        require('../../traveller/model/Earning').find({}).lean()
      ]);

      // Calculate business metrics
      const totalConsignments = consignments.length;
      const completedConsignments = consignments.filter(c => c.status === 'Completed').length;
      const totalRevenue = consignments.reduce((sum, c) => sum + (parseFloat(c.earning) || 0), 0);
      
      const totalTravelers = userProfiles.filter(u => u.role === 'traveler').length;
      const activeTravelers = travelDetails.length > 0 ? new Set(travelDetails.map(t => t.phoneNumber)).size : 0;
      const totalTravelerEarnings = earnings.reduce((sum, e) => sum + (e.totalEarnings || 0), 0);
      
      const totalSenders = new Set(consignments.map(c => c.phoneNumber)).size;
      const totalTravels = travelDetails.length;
      const completedTravels = travelDetails.filter(t => t.status === 'Completed').length;

      // Status distribution
      const statusDistribution = {};
      consignments.forEach(consignment => {
        statusDistribution[consignment.status] = (statusDistribution[consignment.status] || 0) + 1;
      });

      // Category distribution
      const categoryDistribution = {};
      consignments.forEach(consignment => {
        if (consignment.category) {
          categoryDistribution[consignment.category] = (categoryDistribution[consignment.category] || 0) + 1;
        }
      });

      // Travel mode distribution
      const travelModeDistribution = {};
      travelDetails.forEach(travel => {
        if (travel.travelMode) {
          travelModeDistribution[travel.travelMode] = (travelModeDistribution[travel.travelMode] || 0) + 1;
        }
      });

      // Top performers
      const travelerEarnings = {};
      earnings.forEach(earning => {
        travelerEarnings[earning.phoneNumber] = earning.totalEarnings || 0;
      });

      const topTravelers = Object.entries(travelerEarnings)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([phone, earnings]) => {
          const user = userProfiles.find(u => u.phoneNumber === phone);
          return {
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
            phoneNumber: phone,
            totalEarnings: earnings
          };
        });

      const senderAmounts = {};
      consignments.forEach(consignment => {
        const amount = parseFloat(consignment.earning) || 0;
        senderAmounts[consignment.phoneNumber] = (senderAmounts[consignment.phoneNumber] || 0) + amount;
      });

      const topSenders = Object.entries(senderAmounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([phone, amount]) => {
          const user = userProfiles.find(u => u.phoneNumber === phone);
          return {
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
            phoneNumber: phone,
            totalAmount: amount
          };
        });

      const businessReport = {
        generatedAt: new Date().toISOString(),
        summary: {
          totalConsignments,
          completedConsignments,
          completionRate: totalConsignments > 0 ? (completedConsignments / totalConsignments) * 100 : 0,
          totalRevenue,
          totalTravelers,
          activeTravelers,
          totalTravelerEarnings,
          totalSenders,
          totalTravels,
          completedTravels,
          averageConsignmentValue: totalConsignments > 0 ? totalRevenue / totalConsignments : 0
        },
        distributions: {
          statusDistribution,
          categoryDistribution,
          travelModeDistribution
        },
        topPerformers: {
          topTravelers,
          topSenders
        }
      };

      console.log('✅ Business intelligence report generated successfully');
      res.status(200).json(businessReport);
    } catch (error) {
      console.error('❌ Error generating business intelligence report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  }

  // New: Get Travel Details Report
  static async getTravelDetailsReport(req, res) {
    try {
      console.log('🚗 Generating Travel Details Report...');
      
      const [travelDetails, userProfiles, requestForCarry] = await Promise.all([
        TravelDetails.find({}).lean(),
        User.find({}).lean(),
        require('../../user/model/requestforcarry').find({}).lean()
      ]);

             const userMap = ReportController.createUserMap(userProfiles);
      const requestMap = {};
      requestForCarry.forEach(request => {
        if (!requestMap[request.travelId]) {
          requestMap[request.travelId] = [];
        }
        requestMap[request.travelId].push(request);
      });

      const travelData = travelDetails.map(travel => {
        const traveler = userMap[travel.phoneNumber];
        const requests = requestMap[travel.travelId] || [];
        
        // Calculate statistics
        const acceptedRequests = requests.filter(r => r.status === 'Accepted').length;
        const totalRequests = requests.length;
        const acceptanceRate = totalRequests > 0 ? (acceptedRequests / totalRequests) * 100 : 0;
        
        const totalEarning = requests
          .filter(r => r.status === 'Accepted')
          .reduce((sum, r) => sum + (parseFloat(r.earning) || 0), 0);

        return {
          travelId: travel.travelId,
          travelerId: traveler?._id?.toString() || travel.phoneNumber,
          travelerName: traveler ? `${traveler.firstName || ''} ${traveler.lastName || ''}`.trim() : 'Unknown',
          phoneNumber: travel.phoneNumber,
          leavingLocation: travel.Leavinglocation,
          goingLocation: travel.Goinglocation,
          fullFrom: travel.fullFrom,
          fullTo: travel.fullTo,
          travelMode: travel.travelMode,
          travelmode_number: travel.travelmode_number,
                     travelDate: ReportController.formatDate(travel.travelDate),
          expectedStartTime: travel.expectedStartTime,
          expectedEndTime: travel.expectedEndTime,
                     endDate: ReportController.formatDate(travel.endDate),
          distance: travel.distance,
          duration: travel.duration,
          expectedearning: parseFloat(travel.expectedearning) || 0,
          payableAmount: parseFloat(travel.payableAmount) || 0,
          weight: travel.weight,
          TE: travel.TE,
          discount: travel.discount,
          status: travel.status,
                     startedat: travel.startedat ? ReportController.formatDate(travel.startedat) : 'N/A',
           endedat: travel.endedat ? ReportController.formatDate(travel.endedat) : 'N/A',
          totalRequests: totalRequests,
          acceptedRequests: acceptedRequests,
          acceptanceRate: acceptanceRate.toFixed(2),
          totalEarning: totalEarning,
          averageRating: travel.averageRating || 0,
          totalRating: travel.totalrating || 0,
                     createdAt: ReportController.formatDate(travel.createdAt),
           updatedAt: ReportController.formatDate(travel.updatedAt)
        };
      });

      console.log(`✅ Travel details report generated with ${travelData.length} records`);
      res.status(200).json(travelData);
    } catch (error) {
      console.error('❌ Error generating travel details report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  }
}

module.exports = ReportController; 