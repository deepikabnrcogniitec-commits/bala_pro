const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/menu.controller');
const { protect, authorize, optionalAuth } = require('../middleware/auth.middleware');
const { uploadSingle } = require('../config/upload');

// Public: get menu (also used by mobile via GET /restaurants/:id/menu)
router.get('/:restaurantId', optionalAuth, ctrl.getMenu);

// Owner/admin protected routes
router.use(protect, authorize('owner', 'admin'));

router.post('/:restaurantId', ctrl.createOrUpdateMenu);

// Category CRUD
router.post('/:restaurantId/categories', uploadSingle('menus', 'image'), ctrl.addCategory);
router.put('/:restaurantId/categories/:categoryId', uploadSingle('menus', 'image'), ctrl.updateCategory);
router.delete('/:restaurantId/categories/:categoryId', ctrl.deleteCategory);

// Item CRUD
router.post('/:restaurantId/categories/:categoryId/items', uploadSingle('menu-items', 'image'), ctrl.addMenuItem);
router.put('/:restaurantId/categories/:categoryId/items/:itemId', uploadSingle('menu-items', 'image'), ctrl.updateMenuItem);
router.delete('/:restaurantId/categories/:categoryId/items/:itemId', ctrl.deleteMenuItem);

module.exports = router;
