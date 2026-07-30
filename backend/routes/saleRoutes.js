const express = require('express');
const router = express.Router();
const { createSale, getSales, getSale, voidSale } = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'manager'), getSales);
router.get('/:id', protect, getSale);
router.post('/', protect, authorize('cashier', 'manager', 'admin'), createSale);
router.put('/:id/void', protect, authorize('admin', 'manager'), voidSale);

module.exports = router;
