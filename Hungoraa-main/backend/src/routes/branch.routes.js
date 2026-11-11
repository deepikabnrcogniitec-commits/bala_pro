const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/branch.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public: list branches for a restaurant
router.get('/restaurants/:restaurantId/branches', ctrl.getBranches);
router.get('/branches/:id', ctrl.getBranchById);

// Protected
router.post('/restaurants/:restaurantId/branches', protect, authorize('owner', 'admin'), ctrl.createBranch);
router.put('/branches/:id', protect, authorize('owner', 'admin'), ctrl.updateBranch);
router.delete('/branches/:id', protect, authorize('owner', 'admin'), ctrl.deleteBranch);
router.patch('/branches/:id/toggle', protect, authorize('owner', 'admin'), ctrl.toggleBranchStatus);

module.exports = router;
