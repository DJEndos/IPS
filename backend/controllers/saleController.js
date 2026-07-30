const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { Inventory, StockMovement } = require('../models/Inventory');
const generateRef = require('../utils/generateRef');

// @desc    Create a new sale (POS checkout)
// @route   POST /api/sales
// @access  Private (cashier, manager, admin)
const createSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { items, customerId, discountTotal = 0, amountPaid, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      throw Object.assign(new Error('Sale must include at least one item'), { statusCode: 400 });
    }

    let subtotal = 0;
    let taxTotal = 0;
    const saleItems = [];

    for (const line of items) {
      const product = await Product.findById(line.productId).session(session);
      if (!product) throw Object.assign(new Error(`Product ${line.productId} not found`), { statusCode: 404 });

      const inventory = await Inventory.findOne({ product: product._id }).session(session);
      if (!inventory || inventory.quantityInStock < line.quantity) {
        throw Object.assign(
          new Error(`Insufficient stock for ${product.name}. Available: ${inventory?.quantityInStock ?? 0}`),
          { statusCode: 400 }
        );
      }

      const lineSubtotal = product.sellingPrice * line.quantity;
      const lineTax = lineSubtotal * (product.taxRate / 100);

      subtotal += lineSubtotal;
      taxTotal += lineTax;

      saleItems.push({
        product: product._id,
        productName: product.name,
        quantity: line.quantity,
        unitPrice: product.sellingPrice,
        taxRate: product.taxRate,
        subtotal: lineSubtotal,
      });

      // Deduct stock
      inventory.quantityInStock -= line.quantity;
      await inventory.save({ session });

      await StockMovement.create(
        [
          {
            product: product._id,
            type: 'sale_out',
            quantity: -line.quantity,
            performedBy: req.user._id,
          },
        ],
        { session }
      );
    }

    const grandTotal = subtotal + taxTotal - discountTotal;

    if (amountPaid < grandTotal) {
      throw Object.assign(new Error('Amount paid is less than the grand total'), { statusCode: 400 });
    }

    const sale = await Sale.create(
      [
        {
          invoiceNo: generateRef('INV'),
          cashier: req.user._id,
          customer: customerId || undefined,
          items: saleItems,
          subtotal,
          taxTotal,
          discountTotal,
          grandTotal,
          amountPaid,
          changeDue: amountPaid - grandTotal,
          paymentMethod,
          paymentStatus: 'paid',
        },
      ],
      { session }
    );

    if (customerId) {
      await Customer.findByIdAndUpdate(
        customerId,
        { $inc: { totalSpent: grandTotal, loyaltyPoints: Math.floor(grandTotal / 1000) } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: sale[0] });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// @desc Get all sales (supports ?startDate=&endDate=&cashier=)
const getSales = async (req, res, next) => {
  try {
    const { startDate, endDate, cashier, page = 1, limit = 20 } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (cashier) query.cashier = cashier;

    const sales = await Sale.find(query)
      .populate('cashier', 'name')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Sale.countDocuments(query);
    res.json({ success: true, count: sales.length, total, page: Number(page), data: sales });
  } catch (error) {
    next(error);
  }
};

const getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('cashier', 'name')
      .populate('customer', 'name phone');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};

// @desc Void a sale and restore stock (manager/admin only)
const voidSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) throw Object.assign(new Error('Sale not found'), { statusCode: 404 });
    if (sale.status !== 'completed') {
      throw Object.assign(new Error('Only completed sales can be voided'), { statusCode: 400 });
    }

    for (const item of sale.items) {
      await Inventory.findOneAndUpdate(
        { product: item.product },
        { $inc: { quantityInStock: item.quantity } },
        { session }
      );
      await StockMovement.create(
        [
          {
            product: item.product,
            type: 'return_in',
            quantity: item.quantity,
            reference: sale.invoiceNo,
            note: 'Sale voided',
            performedBy: req.user._id,
          },
        ],
        { session }
      );
    }

    sale.status = 'voided';
    await sale.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, data: sale });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

module.exports = { createSale, getSales, getSale, voidSale };
