const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/login', loginUser);
router.post('/register', protect, authorize('admin'), registerUser);
router.get('/me', protect, getMe);

module.exports = router;
