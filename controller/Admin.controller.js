const Traveldetails = require("../model/traveldetails"); // adjust path as needed
const Admin = require("../model/Admin.model");
const userprofiles = require("../model/Profile"); // Import the User model
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
// const nodemailer = require('nodemailer');
const Consignment = require("../model/consignment.model");
const Earning = require("../model/Earning");
const Request = require("../model/consignment.model");
const travelhistory = require("../model/travel.history");
const getDateRange = require("../utils/getDateRange");
const mongoose = require("mongoose");
const ConsignmentToCarry = require("../model/ConsignmentToCarry.model");

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email, isActive: true });

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log(token);

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phoneNumber: admin.phoneNumber,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res
      .status(500)
      .json({ message: "Error during login", error: error.message });
  }
};

module.exports.createAdmin = async (req, res) => {
  try {
    if (!req.admin || req.admin.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Superadmin privileges required" });
    }

    const { name, email, password, phoneNumber, role } = req.body;

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const newAdmin = new Admin({
      name,
      email,
      password,
      phoneNumber,
      role: role || "support",
    });

    await newAdmin.save();

    res.status(201).json({
      message: "Admin account created successfully",
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        phoneNumber: newAdmin.phoneNumber,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error("Error creating admin account:", error);
    res
      .status(500)
      .json({ message: "Error creating admin account", error: error.message });
  }
};

module.exports.getAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id).select("-password"); // exclude password for security

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      phoneNumber: admin.phoneNumber,
      role: admin.role,
    });
  } catch (error) {
    console.error("Error fetching admin:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports.deleteAdminById = async (req, res) => {
  try {
    const requestingAdmin = req.admin;
    const targetAdminId = req.params.id;

    // Check if the requester is a superadmin
    if (!requestingAdmin || requestingAdmin.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Only superadmin can delete an admin" });
    }

    // Prevent deletion if target ID is not provided
    if (!targetAdminId) {
      return res.status(400).json({ message: "Admin ID is required" });
    }

    // Prevent self-deletion
    if (
      requestingAdmin &&
      requestingAdmin._id &&
      requestingAdmin._id.toString() === targetAdminId.toString()
    ) {
      return res
        .status(400)
        .json({ message: "Superadmin cannot delete themselves" });
    }

    const deletedAdmin = await Admin.findByIdAndDelete(targetAdminId);

    if (!deletedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports.updateAdminProfile = async (req, res) => {
  const adminId = req.params.id;
  const { name, email, role, phoneNumber } = req.body;

  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    // Check if the admin exists
    const existingAdmin = await Admin.findById(adminId);
    if (!existingAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Update fields if provided
    if (name) existingAdmin.name = name;
    if (email) existingAdmin.email = email;
    if (role) existingAdmin.role = role;
    if (phoneNumber) existingAdmin.phoneNumber = phoneNumber;

    // Save changes
    await existingAdmin.save();

    res.status(200).json({
      message: "Admin profile updated successfully",
      admin: existingAdmin,
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// exports.getDashboardData = async (req, res) => {
//   try {
//     // Fetch total users/riders
//     const totalUsers = await User.countDocuments();

//     // Fetch total earnings
//     const earningsResponse = await axios.get(`${process.env.BASE_URL}/earn/totalEarnings`, {
//       headers: { Authorization: req.headers.authorization },
//     });
//     console.log('Earnings Response:', earningsResponse.data);
//     const totalEarnings = earningsResponse.data.totalEarnings;

//     // Fetch daily and monthly orders (mocked for now)
//     const dailyOrders = await axios.get(`${process.env.BASE_URL}/order/dailyOrders`, {
//       headers: { Authorization: req.headers.authorization },
//   });
//     const monthlyOrders = await axios.get(`${process.env.BASE_URL}/order/monthlyOrders`, {
//       headers: { Authorization: req.headers.authorization },
// });

//     // Fetch recent transactions (mocked for now)
//     const recentTransactions = [
//       { id: 1, name: 'John Doe', amount: 500, date: '2025-05-05' },
//       { id: 2, name: 'Jane Smith', amount: 300, date: '2025-05-04' },
//     ]; // Replace with actual API or database query

//     // Respond with aggregated data
//     res.status(200).json({
//       totalUsers,
//       totalEarnings,
//       dailyOrders,
//       monthlyOrders,
//       recentTransactions,
//     });
//   } catch (error) {
//     console.error('Error fetching dashboard data:', error.message);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

module.exports.getDahsboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total stats
    const [
      totalRequests,
      totalAccepted,
      totalCancelled,
      totalDelivered,
      totalTravel,
    ] = await Promise.all([
      Consignment.countDocuments(),
      Consignment.countDocuments({ status: "Accepted" }),
      Consignment.countDocuments({ status: "Rejected" }),
      Consignment.countDocuments({ status: "Completed" }),
      Traveldetails.countDocuments(),
    ]);

    // Daily stats
    const [dailyConsignments, dailyTravels] = await Promise.all([
      Consignment.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            accepted: {
              $sum: { $cond: [{ $eq: ["$status", "Accepted"] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] },
            },
            delivered: {
              $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
            },
          },
        },
      ]),
      Traveldetails.countDocuments({ createdAt: { $gte: startOfDay } }),
    ]);

    // Monthly stats
    const [monthlyConsignments, monthlyTravels] = await Promise.all([
      Consignment.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            accepted: {
              $sum: { $cond: [{ $eq: ["$status", "Accepted"] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] },
            },
            delivered: {
              $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
            },
          },
        },
      ]),
      Traveldetails.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    res.status(200).json({
      totalRequests,
      totalAccepted,
      totalCancelled,
      totalDelivered,
      totalConsignments: totalRequests,
      totalTravel,

      daily: {
        totalRequests: dailyConsignments[0]?.totalRequests || 0,
        accepted: dailyConsignments[0]?.accepted || 0,
        cancelled: dailyConsignments[0]?.cancelled || 0,
        delivered: dailyConsignments[0]?.delivered || 0,
        totalConsignments: dailyConsignments[0]?.totalRequests || 0,
        totalTravel: dailyTravels,
      },

      monthly: {
        totalRequests: monthlyConsignments[0]?.totalRequests || 0,
        accepted: monthlyConsignments[0]?.accepted || 0,
        cancelled: monthlyConsignments[0]?.cancelled || 0,
        delivered: monthlyConsignments[0]?.delivered || 0,
        totalConsignments: monthlyConsignments[0]?.totalRequests || 0,
        totalTravel: monthlyTravels,
      },
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports.getAllTravelSummary = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, driverName, date } = req.query;

    const filter = {};

    // Apply search filter on travelId if present
    if (search) {
      filter.travelId = { $regex: search, $options: "i" };
    }

    // Apply driver name filter if present
    if (driverName) {
      filter.username = { $regex: driverName, $options: "i" };
    }

    // Apply date filter if present
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999); // Set to end of the day
      filter.travelDate = { $gte: start, $lte: end };
    }

    // Query the database to fetch travel data with the applied filters
    const travels = await Traveldetails.find(filter)
      .select(
        "travelId username duration expectedearning payableAmount status Leavinglocation Goinglocation distance travelDate"
      )
      .skip(skip)
      .limit(limit)
      .sort({ travelDate: -1 }); // Sorting by travel date in descending order

    // Get total count of travels matching the filter
    const total = await Traveldetails.countDocuments(filter);

    // Get count of completed travels (for summary)
    const totalCompleted = await Traveldetails.countDocuments({
      status: "Completed",
    });

    // Return the result along with pagination and summary
    res.status(200).json({
      success: true,
      data: travels, // List of travels
      pagination: {
        total, // Total number of travels matching filter
        page, // Current page number
        limit, // Items per page
        totalPages: Math.ceil(total / limit), // Total pages available based on pagination
      },
      totals: {
        completed: totalCompleted, // Total completed travels for summary
      },
    });
  } catch (error) {
    console.error("Error fetching travel summaries:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

module.exports.getAllAdmins = async (req, res) => {
  const search = req.query.search || ""; // Get search query from the request
  const searchRegex = new RegExp(search, "i"); // Case-insensitive regex search

  try {
    // Build the query dynamically based on the search input
    const query = search
      ? {
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
            { phoneNumber: searchRegex },
          ],
        }
      : {}; // If no search term, return all admins

    // Find admins with the dynamic query and exclude the password field
    const admins = await Admin.find(query, "-password"); // Exclude the password field

    res.status(200).json({ success: true, admins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// module.exports.forgotPassword = async (req, res) => {
//   const { email } = req.body;

//   try {
//     // 1. Check if admin exists
//     const admin = await Admin.findOne({ email });
//     if (!admin) {
//       return res.status(404).json({ message: 'Admin not found' });
//     }

//     // 2. Generate reset token (valid for 1 hour)
//     const resetToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
//       expiresIn: '1h',
//     });

//     // 3. Compose reset link
//     const resetLink = `http://your-frontend-url.com/reset-password/${resetToken}`;

//     // 4. Setup nodemailer transport
//     const transporter = nodemailer.createTransport({
//       service: 'Gmail', // or other like SendGrid, Outlook
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     // 5. Send email
//     await transporter.sendMail({
//       to: email,
//       subject: 'Password Reset Request',
//       html: `<p>Hello ${admin.name},</p>
//              <p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>`,
//     });

//     res.status(200).json({ message: 'Password reset link sent to email.' });
//   } catch (err) {
//     console.error('Forgot Password Error:', err);
//     res.status(500).json({ message: 'Server error. Try again later.' });
//   }
// };

module.exports.getTotalUsers = async (req, res) => {
  try {
    const totalUsers = await userprofiles.countDocuments({});
    res.status(200).json({
      message: "Total user profiles fetched successfully.",
      total: totalUsers,
    });
  } catch (err) {
    console.error("Error fetching total user profiles:", err);
    res.status(500).json({ message: "Error fetching total user profiles." });
  }
};

module.exports.getTotalEarnings = async (req, res) => {
  try {
    // Fetch all earnings documents
    const allEarnings = await Earning.find({});
    
    let totalEarnings = 0;
    const allTransactions = [];

    // Iterate over all earnings documents
    for (const earning of allEarnings) {
      // Iterate over all transactions in each earning
      for (const transaction of earning.transactions) {
        // Check if transaction status is completed (case-insensitive)
        if (transaction.status && transaction.status.toLowerCase() === 'completed') {
          // Sum up the total fare from each transaction
          const transactionAmount = parseFloat(transaction.totalFare) || parseFloat(transaction.amount) || 0;
          totalEarnings += transactionAmount;
          
          // Add transaction details to the array
          allTransactions.push({
            date: transaction.timestamp ? new Date(transaction.timestamp).toISOString().split('T')[0] : 'N/A',
            amount: transactionAmount,
            paymentId: transaction.paymentId || 'N/A',
            title: transaction.title || 'N/A',
            travelId: transaction.travelId || 'N/A',
            status: transaction.status || 'N/A',
            method: transaction.paymentMethod || 'N/A',
            phoneNumber: earning.phoneNumber || 'N/A'
          });
        }
      }
    }

    // Sort transactions by date (newest first)
    allTransactions.sort((a, b) => {
      if (a.date === 'N/A' || b.date === 'N/A') return 0;
      return new Date(b.date) - new Date(a.date);
    });

    res.status(200).json({
      status: "success",
      totalEarnings: totalEarnings,
      data: allTransactions,
      totalTransactions: allTransactions.length
    });
  } catch (error) {
    console.error("Error fetching total earnings:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports.getTransactionHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // default page 1
    const limit = parseInt(req.query.limit) || 10; // default 10 per page
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").toLowerCase();

    // Step 1: Fetch all earnings documents with transactions
    const earningsDocs = await Earning.find({
      "transactions.0": { $exists: true },
    });

    const transactions = [];

    for (const doc of earningsDocs) {
      const user = await userprofiles.findOne({ phoneNumber: doc.phoneNumber });
      const customerName = user
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : "Unknown";

      doc.transactions.forEach((txn) => {
        if (txn.status === "Completed") {
          const transaction = {
            customerName,
            transactionId: txn.paymentId,
            paymentMode: txn.paymentMethod,
            amount: txn.amount,
            title: txn.title,
            date: txn.timestamp?.toISOString().split("T")[0],
          };

          // Apply search filter
          const matchesSearch = [
            transaction.customerName,
            transaction.transactionId,
            transaction.paymentMode,
            transaction.title,
          ].some((field) => field?.toLowerCase().includes(search));

          if (!search || matchesSearch) {
            transactions.push(transaction);
          }
        }
      });
    }

    // Sort by date descending (optional)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Paginate
    const paginatedTransactions = transactions.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      message: "Transaction history fetched successfully",
      total: transactions.length,
      page,
      limit,
      data: paginatedTransactions,
    });
  } catch (err) {
    console.error("Error fetching transaction history:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

module.exports.getUserTravelDetails = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";

  const searchRegex = new RegExp(search, "i");

  try {
    // Build search filter
    const searchFilter = search
      ? {
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
            { phoneNumber: searchRegex },
            {
              $expr: {
                $regexMatch: {
                  input: { $concat: ["$firstName", " ", "$lastName"] },
                  regex: searchRegex,
                },
              },
            },
          ],
        }
      : {};

    const users = await userprofiles
      .find(searchFilter)
      .select("firstName lastName email phoneNumber totalRating")
      .skip(skip)
      .limit(limit)
      .lean();

    const result = users.map(user => ({
      id: user._id,
      username: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      email: user.email,
      phoneNumber: user.phoneNumber,
      totalRating: user.totalRating || 0,
    }));

    const totalCount = await userprofiles.countDocuments(searchFilter);

    res.status(200).json({
      success: true,
      data: result,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Fetch travel history for a specific user

module.exports.getTravelHistory = async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Fetch all travel history for the user
    const travels = await travelhistory
      .find({ phoneNumber })
      .sort({ createdAt: -1 })
      .lean();

    if (!travels.length) {
      return res.status(404).json({ message: "No travel history found" });
    }

    // Iterate through travels and count consignments for each travelId
    const travelsWithConsignments = await Promise.all(
      travels.map(async (travel) => {
        const consignmentCount = await Request.countDocuments({
          travelId: travel.travelId,
        });
        return { ...travel, consignmentCount };
      })
    );

    res.status(200).json({ travels: travelsWithConsignments });
  } catch (error) {
    console.error("Error fetching travel history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.deleteProfileByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`Received UserId for deletion: ${userId}`);

    // Find the user first
    const user = await userprofiles.findOne({
      $or: [{ _id: userId }, { userId: userId }],
    });

    if (!user) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const phoneNumber = user.phoneNumber;

    // Delete related earnings and travel records
    const [earningsDeleteResult, travelDeleteResult] = await Promise.all([
      Earning.deleteMany({ phoneNumber }), // If you switch to userId later, use { userId: user._id }
      Traveldetails.deleteMany({ phoneNumber }),
    ]);

    // Delete user profile
    await userprofiles.deleteOne({ _id: user._id });

    res.status(200).json({
      message: "Profile and related records deleted successfully",
      deletedUserId: user._id,
      earningsDeleted: earningsDeleteResult.deletedCount,
      travelsDeleted: travelDeleteResult.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting user and related records:", error);
    res.status(500).json({ error: "Server Error", details: error.message });
  }
};


module.exports.getSalesDashboard = async (req, res) => {
  try {
    const { fromDate, toDate, periodType } = req.query;
    let startDate, endDate;

    if (fromDate && toDate) {
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
    } else if (periodType) {
      ({ startDate, endDate } = getDateRange(periodType));
    }

    const match = { status: "Delivered" };
    if (startDate && endDate) {
      match.createdAt = { $gte: startDate, $lte: endDate };
    }
    const cons= await ConsignmentToCarry.find();
    console.log(cons)
    const agg = await ConsignmentToCarry.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "traveldetails",
          localField: "travelId",
          foreignField: "travelId",
          as: "travel",
        },
      },
      { $unwind: "$travel" },

      {
        $group: {
          _id: "$travel.travelMode",
          senderTotal: {
            $sum: {
              $cond: [
                { $ifNull: ["$earning.senderTotalPay", false] },
                { $toDouble: "$earning.senderTotalPay" },
                0,
              ],
            },
          },
          travellerTotal: {
            $sum: {
              $cond: [
                { $ifNull: ["$earning.totalFare", false] },
                { $toDouble: "$earning.totalFare" },
                0,
              ],
            },
          },
          senderCount: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $ifNull: ["$earning.senderTotalPay", false] },
                  { $gt: [{ $toDouble: "$earning.senderTotalPay" }, 0] }
                ]}, 
                1, 
                0
              ] 
            } 
          },
          travellerCount: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $ifNull: ["$earning.totalFare", false] },
                  { $gt: [{ $toDouble: "$earning.totalFare" }, 0] }
                ]}, 
                1, 
                0
              ] 
            } 
          },
          totalConsignments: { $sum: 1 },
        },
      },
    ]);
    console.log(agg)

    // Flatten into table-like rows
    const tableData = [];
    agg.forEach((row) => {
      tableData.push({
        type: "Sender",
        mode: row._id,
        amount: row.senderTotal.toFixed(2),
        count: row.senderCount,
        totalConsignments: row.totalConsignments
      });
      tableData.push({
        type: "Traveller",
        mode: row._id,
        amount: row.travellerTotal.toFixed(2),
        count: row.travellerCount,
        totalConsignments: row.totalConsignments
      });
    });

    res.json({
      success: true,
      filters: { startDate, endDate },
      data: tableData,
    });
  } catch (error) {
    console.error("Error fetching sales dashboard:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};



module.exports.getRegionBreakdown = async (req, res) => {
  try {
    const { type, fromDate, toDate, periodType } = req.query;
    let startDate, endDate;

    if (fromDate && toDate) {
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
    } else if (periodType) {
      ({ startDate, endDate } = getDateRange(periodType));
    }

    let match = { status: "Delivered" }; // Only consider delivered consignments
    if (startDate && endDate) {
      match.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (!type || (type !== "Sender" && type !== "Traveller")) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid type. Must be 'Sender' or 'Traveller'" 
      });
    }

    const breakdown = await ConsignmentToCarry.aggregate([
      { $match: match },
      
      // Lookup travel details to get travelMode
      {
        $lookup: {
          from: "traveldetails",
          localField: "travelId",
          foreignField: "travelId",
          as: "travel",
        },
      },
      { $unwind: "$travel" },

      // Group by region (startinglocation) and travel mode
      {
        $group: {
          _id: { 
            state: "$startinglocation", 
            mode: "$travel.travelMode" 
          },
          senderTotal: {
            $sum: {
              $cond: [
                { $ifNull: ["$earning.senderTotalPay", false] },
                { $toDouble: "$earning.senderTotalPay" },
                0,
              ],
            },
          },
          travellerTotal: {
            $sum: {
              $cond: [
                { $ifNull: ["$earning.totalFare", false] },
                { $toDouble: "$earning.totalFare" },
                0,
              ],
            },
          },
          consignmentCount: { $sum: 1 }
        },
      },

      // Project based on type requested
      {
        $project: {
          stateWise: "$_id.state",
          modeOfTravel: "$_id.mode",
          totalAmount: {
            $cond: {
              if: { $eq: [type, "Sender"] },
              then: "$senderTotal",
              else: "$travellerTotal"
            }
          },
          consignmentCount: 1,
          _id: 0,
        },
      },

      // Sort by totalAmount descending
      { $sort: { totalAmount: -1 } }
    ]);

    res.json({
      success: true,
      filters: { startDate, endDate, type },
      data: breakdown,
    });
  } catch (error) {
    console.error("Error fetching region breakdown:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
