const Customer = require('../models/Customer');

const getCustomers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = search
      ? { $or: [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }] }
      : {};
    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCustomers, createCustomer, updateCustomer, deleteCustomer };
