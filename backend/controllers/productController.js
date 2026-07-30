const Product = require('../models/Product');
const { Inventory } = require('../models/Inventory');

// @desc Get all products (supports ?search=&category=&page=&limit=)
const getProducts = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$text = { $search: search };
    }
    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    // attach current stock level for convenience
    const productIds = products.map((p) => p._id);
    const stockRecords = await Inventory.find({ product: { $in: productIds } });
    const stockMap = Object.fromEntries(stockRecords.map((s) => [s.product.toString(), s.quantityInStock]));

    const data = products.map((p) => ({
      ...p.toObject(),
      quantityInStock: stockMap[p._id.toString()] ?? 0,
    }));

    res.json({ success: true, count: data.length, total, page: Number(page), data });
  } catch (error) {
    next(error);
  }
};

// @desc Get single product by ID or barcode
const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = (await Product.findById(id).catch(() => null)) || (await Product.findOne({ barcode: id }));

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const stock = await Inventory.findOne({ product: product._id });
    res.json({ success: true, data: { ...product.toObject(), quantityInStock: stock?.quantityInStock ?? 0 } });
  } catch (error) {
    next(error);
  }
};

// @desc Create product + initialize its inventory record
const createProduct = async (req, res, next) => {
  try {
    const { initialStock = 0, ...productData } = req.body;
    const product = await Product.create(productData);

    await Inventory.create({
      product: product._id,
      quantityInStock: initialStock,
      lastRestockedAt: initialStock > 0 ? new Date() : undefined,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// Soft delete to preserve historical sales/purchase references
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deactivated' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
