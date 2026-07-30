// Generates human-readable, sortable reference numbers
// e.g. INV-20260730-0F3K9 / PUR-20260730-A1B2C
const generateRef = (prefix = 'REF') => {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
};

module.exports = generateRef;
