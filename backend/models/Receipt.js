const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema(
  {
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true, unique: true },
    receiptNo: { type: String, required: true, unique: true },
    pdfUrl: { type: String }, // if stored/generated to disk or cloud
    emailedTo: { type: String },
    smsSentTo: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Receipt', receiptSchema);
