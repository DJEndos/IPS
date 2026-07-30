const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { Inventory } = require('../models/Inventory');

// @desc Sales summary for a date range, grouped by day
const getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { status: 'completed' };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const dailySales = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalSales: { $sum: '$grandTotal' },
          totalTransactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const overall = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalTax: { $sum: '$taxTotal' },
          totalDiscount: { $sum: '$discountTotal' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        summary: overall[0] || { totalRevenue: 0, totalTax: 0, totalDiscount: 0, totalTransactions: 0 },
        dailyBreakdown: dailySales,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Best-selling products
const getTopProducts = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const topProducts = await Sale.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.productName' },
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: Number(limit) },
    ]);

    res.json({ success: true, data: topProducts });
  } catch (error) {
    next(error);
  }
};

// @desc Inventory valuation report
const getInventoryValuation = async (req, res, next) => {
  try {
    const inventory = await Inventory.find().populate('product', 'name sku costPrice sellingPrice');

    let totalCostValue = 0;
    let totalRetailValue = 0;

    const data = inventory
      .filter((i) => i.product)
      .map((i) => {
        const costValue = i.quantityInStock * i.product.costPrice;
        const retailValue = i.quantityInStock * i.product.sellingPrice;
        totalCostValue += costValue;
        totalRetailValue += retailValue;
        return {
          product: i.product.name,
          sku: i.product.sku,
          quantityInStock: i.quantityInStock,
          costValue,
          retailValue,
        };
      });

    res.json({
      success: true,
      data: { totalCostValue, totalRetailValue, potentialProfit: totalRetailValue - totalCostValue, items: data },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSalesReport, getTopProducts, getInventoryValuation };
