const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    loyaltyPoints: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
