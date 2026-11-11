const express = require('express');
const router = express.Router();
const { getPublicSettings } = require('../controllers/admin.controller');

// Public — safe platform settings for mobile clients (home hero, flags)
router.get('/public', getPublicSettings);

module.exports = router;
