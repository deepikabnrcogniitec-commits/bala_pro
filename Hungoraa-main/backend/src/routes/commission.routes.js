const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getAllCommissions,
  getCommissionById,
  getCommissionByRestaurant,
  getMyCommissions,
  getCommissionTrend,
} = require('../controllers/commission.controller');

router.use(protect);

// Admin
router.get('/',                              authorize('admin'), getAllCommissions);
router.get('/trend',                         authorize('admin'), getCommissionTrend);
router.get('/restaurant/:restaurantId',      authorize('admin'), getCommissionByRestaurant);
router.get('/:id',                           authorize('admin'), getCommissionById);

// Owner
router.get('/my',                            authorize('owner'), getMyCommissions);

module.exports = router;
