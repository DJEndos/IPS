const { Inventory, StockMovement } = require('../models/Inventory');
const Product = require('../models/Product');

// @desc Get full stock list with product details
const getInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.find().populate({
      path: 'product',
      select: 'name sku barcode sellingPrice reorderLevel unit isActive',
    });
    res.json({ success: true, count: inventory.length, data: inventory });
  } catch (error) {
    next(error);
  }
};

// @desc Get products at or below their reorder level
const getLowStock = async (req, res, next) => {
  try {
    const inventory = await Inventory.find().populate('product', 'name sku reorderLevel unit');
    const lowStock = inventory.filter(
      (item) => item.product && item.quantityInStock <= item.product.reorderLevel
    );
    res.json({ success: true, count: lowStock.length, data: lowStock });
  } catch (error) {
    next(error);
  }
};

// @desc Manually adjust stock (damage, correction, stocktake, etc.)
const adjustStock = async (req, res, next) => {
  try {
    const { productId, quantity, note } = req.body; // quantity can be negative

    const inventory = await Inventory.findOne({ product: productId });
    if (!inventory) return res.status(404).json({ success: false, message: 'Inventory record not found' });

    inventory.quantityInStock = Math.max(0, inventory.quantityInStock + Number(quantity));
    await inventory.save();

    await StockMovement.create({
      product: productId,
      type: 'adjustment',
      quantity,
      note,
      performedBy: req.user._id,
    });

    res.json({ success: true, data: inventory });
  } catch (error) {
    next(error);
  }
};

// @desc Get stock movement history for a product
const getStockHistory = async (req, res, next) => {
  try {
    const movements = await StockMovement.find({ product: req.params.productId })
      .populate('performedBy', 'name role')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: movements.length, data: movements });
  } catch (error) {
    next(error);
  }
};

module.exports = { getInventory, getLowStock, adjustStock, getStockHistory };
