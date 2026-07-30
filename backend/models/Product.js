const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    barcode: { type: String, unique: true, sparse: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0, max: 100 }, // percentage, e.g. VAT 7.5
    unit: { type: String, default: 'pcs' }, // pcs, kg, litre, carton...
    reorderLevel: { type: Number, default: 5 },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', sku: 'text', barcode: 'text' });

module.exports = mongoose.model('Product', productSchema);
