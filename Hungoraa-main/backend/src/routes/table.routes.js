const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createTable, getRestaurantTables, updateTable, deleteTable, toggleAvailability,
} = require('../controllers/table.controller');

router.use(protect);

router.get('/', getRestaurantTables);
router.post('/', authorize('owner', 'admin'), createTable);
router.put('/:id', authorize('owner', 'admin'), updateTable);
router.delete('/:id', authorize('owner', 'admin'), deleteTable);
router.patch('/:id/toggle', authorize('owner', 'admin'), toggleAvailability);

module.exports = router;
