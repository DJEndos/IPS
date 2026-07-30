const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const { Inventory, StockMovement } = require('../models/Inventory');
const generateRef = require('../utils/generateRef');

// @desc Create a purchase order (status: pending)
const createPurchase = async (req, res, next) => {
  try {
    const { supplierId, items } = req.body; // items: [{ productId, quantity, costPrice }]

    let totalAmount = 0;
    const purchaseItems = items.map((i) => {
      const subtotal = i.quantity * i.costPrice;
      totalAmount += subtotal;
      return { product: i.productId, quantity: i.quantity, costPrice: i.costPrice, subtotal };
    });

    const purchase = await Purchase.create({
      purchaseRef: generateRef('PUR'),
      supplier: supplierId,
      items: purchaseItems,
      totalAmount,
      orderedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

// @desc Mark a purchase as received -> increases stock
const receivePurchase = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase) throw Object.assign(new Error('Purchase not found'), { statusCode: 404 });
    if (purchase.status === 'received') {
      throw Object.assign(new Error('Purchase already received'), { statusCode: 400 });
    }

    for (const item of purchase.items) {
      await Inventory.findOneAndUpdate(
        { product: item.product },
        { $inc: { quantityInStock: item.quantity }, lastRestockedAt: new Date() },
        { upsert: true, session }
      );

      await StockMovement.create(
        [
          {
            product: item.product,
            type: 'purchase_in',
            quantity: item.quantity,
            reference: purchase.purchaseRef,
            performedBy: req.user._id,
          },
        ],
        { session }
      );
    }

    purchase.status = 'received';
    purchase.receivedAt = new Date();
    await purchase.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, data: purchase });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

const getPurchases = async (req, res, next) => {
  try {
    const purchases = await Purchase.find()
      .populate('supplier', 'name')
      .populate('orderedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: purchases.length, data: purchases });
  } catch (error) {
    next(error);
  }
};

const getPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier')
      .populate('orderedBy', 'name')
      .populate('items.product', 'name sku');
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPurchase, receivePurchase, getPurchases, getPurchase };
