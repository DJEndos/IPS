const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    provider: {
      type: String,
      enum: ['cash', 'paystack', 'flutterwave', 'stripe', 'bank_transfer'],
      required: true,
    },
    reference: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'NGN' },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    gatewayResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
