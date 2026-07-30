const PDFDocument = require('pdfkit');

// Streams a PDF receipt directly to an HTTP response
const generateReceiptPDF = (sale, res) => {
  const doc = new PDFDocument({ size: [226, 500], margin: 10 }); // 80mm thermal-ish width

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=receipt-${sale.invoiceNo}.pdf`);

  doc.pipe(res);

  doc.fontSize(12).text('INVENTORY & POS SYSTEM', { align: 'center' });
  doc.fontSize(8).text('Thank you for shopping with us', { align: 'center' });
  doc.moveDown();
  doc.fontSize(8).text(`Invoice: ${sale.invoiceNo}`);
  doc.text(`Date: ${new Date(sale.createdAt).toLocaleString()}`);
  doc.text(`Cashier: ${sale.cashier?.name || 'N/A'}`);
  if (sale.customer) doc.text(`Customer: ${sale.customer.name}`);
  doc.moveDown();
  doc.text('--------------------------------');

  sale.items.forEach((item) => {
    doc.text(`${item.productName}`);
    doc.text(`  ${item.quantity} x N${item.unitPrice.toFixed(2)} = N${item.subtotal.toFixed(2)}`);
  });

  doc.text('--------------------------------');
  doc.text(`Subtotal: N${sale.subtotal.toFixed(2)}`);
  doc.text(`Tax: N${sale.taxTotal.toFixed(2)}`);
  doc.text(`Discount: N${sale.discountTotal.toFixed(2)}`);
  doc.fontSize(10).text(`TOTAL: N${sale.grandTotal.toFixed(2)}`);
  doc.fontSize(8).text(`Paid (${sale.paymentMethod}): N${sale.amountPaid.toFixed(2)}`);
  doc.text(`Change: N${sale.changeDue.toFixed(2)}`);
  doc.moveDown();
  doc.text('Powered by Inventory & POS System', { align: 'center' });

  doc.end();
};

module.exports = generateReceiptPDF;
