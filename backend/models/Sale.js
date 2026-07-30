const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true }, // snapshot at time of sale
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    items: { type: [saleItemSchema], required: true, validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    taxTotal: { type: Number, required: true, min: 0, default: 0 },
    discountTotal: { type: Number, required: true, min: 0, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0 },
    changeDue: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'transfer', 'paystack', 'flutterwave'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'paid',
    },
    status: {
      type: String,
      enum: ['completed', 'voided', 'refunded'],
      default: 'completed',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', saleSchema);
