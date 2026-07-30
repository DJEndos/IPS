const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    costPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseRef: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: [purchaseItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'received', 'cancelled'],
      default: 'pending',
    },
    orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receivedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Purchase', purchaseSchema);
