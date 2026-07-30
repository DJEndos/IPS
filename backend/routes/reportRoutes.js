const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getTopProducts,
  getInventoryValuation,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.get('/sales', protect, authorize('admin', 'manager'), getSalesReport);
router.get('/top-products', protect, authorize('admin', 'manager'), getTopProducts);
router.get('/inventory-valuation', protect, authorize('admin', 'manager'), getInventoryValuation);

module.exports = router;
