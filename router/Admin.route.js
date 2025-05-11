const express = require('express');
const { login,createAdmin, getAllTravelSummary, getAllAdmins, updateAdminProfile, getAdminById, deleteAdminById, forgotPassword, getDahsboardStats, getTotalUsers, getTotalEarnings, getTransactionHistory, getUserTravelDetails, getTravelHistory, deleteProfileByUserId } = require('../controller/Admin.controller');
const { authenticateAdmin, authorizeRole } = require('../Middleware/Adminmiddleware');
const { getFareConfig, updateFareConfig } = require('../controller/FareController');

const router = express.Router();


router.post('/login', login);


router.post('/signup', authenticateAdmin, authorizeRole('superadmin'), createAdmin);

router.get('/dashboard', authenticateAdmin, getDahsboardStats)
router.get('/allTravelSummary', authenticateAdmin, getAllTravelSummary)
router.get('/getFareDetails', authenticateAdmin, authorizeRole('superadmin'), getFareConfig)
router.put('/updateFareDetails', authenticateAdmin, authorizeRole('superadmin'), updateFareConfig)
router.get('/getAllAdmins', authenticateAdmin, getAllAdmins)
router.get('/getUserTravelDetails', authenticateAdmin, getUserTravelDetails)
router.get('/getDashboardStats', authenticateAdmin, getDahsboardStats)
router.get('/getTotalUsers', authenticateAdmin, getTotalUsers)
router.get('/getTotalEarnings', authenticateAdmin, getTotalEarnings)
router.get('/getTransactionHistory', authenticateAdmin, getTransactionHistory)
router.get('/travelHistory/:phoneNumber', authenticateAdmin, getTravelHistory)
router.get('/delete/:userId', authenticateAdmin, authorizeRole('superadmin'), deleteProfileByUserId);
router.put('/update/:id', authenticateAdmin, authorizeRole('superadmin'), updateAdminProfile)
router.delete('/delete/:id', authenticateAdmin, authorizeRole('superadmin'), deleteAdminById)
// router.post('/forgot-password', forgotPassword)
router.get('/:id', authenticateAdmin, authorizeRole('superadmin'), getAdminById)

module.exports = router;
