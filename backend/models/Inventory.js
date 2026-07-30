const mongoose = require('mongoose');

// Current stock snapshot per product
const inventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    quantityInStock: { type: Number, required: true, default: 0, min: 0 },
    lastRestockedAt: { type: Date },
  },
  { timestamps: true }
);

// Immutable audit trail of every stock change (restock, sale, adjustment, return)
const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: {
      type: String,
      enum: ['purchase_in', 'sale_out', 'adjustment', 'return_in', 'return_out'],
      required: true,
    },
    quantity: { type: Number, required: true }, // positive or negative
    reference: { type: String }, // e.g. related Sale or Purchase ID
    note: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Inventory = mongoose.model('Inventory', inventorySchema);
const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

module.exports = { Inventory, StockMovement };
