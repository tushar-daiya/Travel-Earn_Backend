const express = require('express');
const router = express.Router();
const ReportController = require('../controller/ReportController');

// Get Traveler Report
router.get('/travel-history', ReportController.getTravelerReport);

// Get Sender Report
router.get('/consignment-history', ReportController.getSenderReport);

// Get Consignment Consolidated Report
router.get('/consignment-consolidated', ReportController.getConsignmentConsolidatedReport);

// Get Consignment Consolidated Report with MongoDB Aggregation
router.get('/consignment-consolidated-aggregation', ReportController.getConsignmentConsolidatedReportAggregation);

// New Enhanced Endpoints
// Get Business Intelligence Report
// router.get('/business-intelligence', ReportController.getBusinessIntelligenceReport);

// Get Travel Details Report
router.get('/travel-details', ReportController.getTravelDetailsReport);

// Get Enhanced Traveler Report (with more details)
router.get('/traveler-report-enhanced', ReportController.getTravelerReport);

// Get Enhanced Sender Report (with more details)
router.get('/sender-report-enhanced', ReportController.getSenderReport);

// Get Enhanced Consignment Consolidated Report (with more details)
router.get('/consignment-consolidated-enhanced', ReportController.getConsignmentConsolidatedReport);

module.exports = router; 