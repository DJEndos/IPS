const Supplier = require('../models/Supplier');

const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    next(error);
  }
};

const createSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, message: 'Supplier deactivated' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSuppliers, createSupplier, updateSupplier, deleteSupplier };
