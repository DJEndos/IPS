const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const generateReceiptPDF = require('../utils/receiptGenerator');
const { protect } = require('../middleware/auth');

// @desc Stream a PDF receipt for a given sale
// @route GET /api/receipts/:saleId
router.get('/:saleId', protect, async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.saleId)
      .populate('cashier', 'name')
      .populate('customer', 'name');

    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });

    generateReceiptPDF(sale, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
