const express = require('express');
const router = express.Router();
const {
  createPurchase,
  receivePurchase,
  getPurchases,
  getPurchase,
} = require('../controllers/purchaseController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'manager'), getPurchases);
router.get('/:id', protect, authorize('admin', 'manager'), getPurchase);
router.post('/', protect, authorize('admin', 'manager'), createPurchase);
router.put('/:id/receive', protect, authorize('admin', 'manager'), receivePurchase);

module.exports = router;
