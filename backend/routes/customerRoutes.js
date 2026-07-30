const express = require('express');
const router = express.Router();
const {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getCustomers);
router.post('/', protect, createCustomer);
router.put('/:id', protect, updateCustomer);
router.delete('/:id', protect, authorize('admin', 'manager'), deleteCustomer);

module.exports = router;
