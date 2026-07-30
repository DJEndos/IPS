const express = require('express');
const router = express.Router();
const {
  getInventory,
  getLowStock,
  adjustStock,
  getStockHistory,
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'manager'), getInventory);
router.get('/low-stock', protect, authorize('admin', 'manager'), getLowStock);
router.get('/history/:productId', protect, authorize('admin', 'manager'), getStockHistory);
router.post('/adjust', protect, authorize('admin', 'manager'), adjustStock);

module.exports = router;
