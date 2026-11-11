const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createSettlement, updateSettlementStatus,
  getAllSettlements, getMySettlements, getSettlement,
  getSettlementReport,
} = require('../controllers/settlement.controller');

router.use(protect);

// Admin
router.post('/', authorize('admin'), createSettlement);
router.get('/', authorize('admin'), getAllSettlements);
router.patch('/:id/status', authorize('admin'), updateSettlementStatus);
router.get('/report', authorize('admin'), getSettlementReport);

// Owner
router.get('/my', authorize('owner'), getMySettlements);

// Admin + Owner
router.get('/:id', authorize('admin', 'owner'), getSettlement);

module.exports = router;
