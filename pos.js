requireAuth(['cashier', 'manager', 'admin']);
renderUserBadge();

let allProducts = [];
let cart = []; // { productId, name, unitPrice, taxRate, quantity, stock }

async function loadProducts(search = '') {
  try {
    const res = await Api.get('/products', { search, limit: 60 });
    allProducts = res.data;
    renderProductGrid(allProducts);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderProductGrid(products) {
  const grid = document.getElementById('productGrid');
  const empty = document.getElementById('productEmpty');
  grid.innerHTML = '';

  if (!products.length) {
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  products.forEach((p) => {
    const lowStock = p.quantityInStock <= (p.reorderLevel || 5);
    const col = document.createElement('div');
    col.className = 'col';
    col.innerHTML = `
      <div class="pos-product-tile h-100" data-id="${p._id}">
        <div class="d-flex justify-content-between align-items-start mb-1">
          <span class="fw-semibold small">${p.name}</span>
          <span class="badge stock-pill ${lowStock ? 'badge-low' : 'badge-ok'}">${p.quantityInStock} ${p.unit}</span>
        </div>
        <div class="text-muted-label mb-1">${p.sku}</div>
        <div class="price">${formatNaira(p.sellingPrice)}</div>
      </div>`;
    col.querySelector('.pos-product-tile').addEventListener('click', () => addToCart(p));
    grid.appendChild(col);
  });
}

function addToCart(product) {
  if (product.quantityInStock <= 0) {
    showToast(`${product.name} is out of stock`, 'error');
    return;
  }
  const existing = cart.find((c) => c.productId === product._id);
  if (existing) {
    if (existing.quantity + 1 > product.quantityInStock) {
      showToast('Not enough stock available', 'error');
      return;
    }
    existing.quantity += 1;
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      unitPrice: product.sellingPrice,
      taxRate: product.taxRate || 0,
      quantity: 1,
      stock: product.quantityInStock,
    });
  }
  renderCart();
}

function changeQty(productId, delta) {
  const line = cart.find((c) => c.productId === productId);
  if (!line) return;
  const newQty = line.quantity + delta;
  if (newQty <= 0) {
    cart = cart.filter((c) => c.productId !== productId);
  } else if (newQty > line.stock) {
    showToast('Not enough stock available', 'error');
    return;
  } else {
    line.quantity = newQty;
  }
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const emptyMsg = document.getElementById('cartEmptyMsg');

  if (!cart.length) {
    container.innerHTML = '';
    emptyMsg.classList.remove('d-none');
    container.appendChild(emptyMsg);
  } else {
    emptyMsg.classList.add('d-none');
    container.innerHTML = cart.map((line) => `
      <div class="cart-line py-2 d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-semibold small">${line.name}</div>
          <div class="text-muted-label">${formatNaira(line.unitPrice)} each</div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-sm btn-outline-secondary" onclick="changeQty('${line.productId}', -1)">−</button>
          <span class="figure">${line.quantity}</span>
          <button class="btn btn-sm btn-outline-secondary" onclick="changeQty('${line.productId}', 1)">+</button>
          <span class="figure fw-semibold" style="min-width:80px;text-align:right">${formatNaira(line.unitPrice * line.quantity)}</span>
        </div>
      </div>
    `).join('');
  }

  updateTotals();
}

function updateTotals() {
  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const tax = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity * (l.taxRate / 100), 0);
  const discount = Number(document.getElementById('discountInput').value) || 0;
  const total = subtotal + tax - discount;

  document.getElementById('sumSubtotal').textContent = formatNaira(subtotal);
  document.getElementById('sumTax').textContent = formatNaira(tax);
  document.getElementById('sumTotal').textContent = formatNaira(total < 0 ? 0 : total);

  const amountPaid = Number(document.getElementById('amountPaid').value) || 0;
  const change = amountPaid - total;
  document.getElementById('changeDue').textContent = formatNaira(change > 0 ? change : 0);

  return { subtotal, tax, discount, total };
}

document.getElementById('discountInput').addEventListener('input', updateTotals);
document.getElementById('amountPaid').addEventListener('input', updateTotals);

document.getElementById('clearCartBtn').addEventListener('click', () => {
  cart = [];
  renderCart();
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  renderProductGrid(allProducts.filter((p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)));
});

document.getElementById('barcodeInput').addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;
  const code = e.target.value.trim();
  if (!code) return;
  e.target.value = '';

  const match = allProducts.find((p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase());
  if (match) {
    addToCart(match);
  } else {
    try {
      const res = await Api.get(`/products/${code}`);
      addToCart(res.data);
    } catch {
      showToast(`No product found for "${code}"`, 'error');
    }
  }
});

document.getElementById('checkoutBtn').addEventListener('click', async () => {
  if (!cart.length) {
    showToast('Cart is empty', 'error');
    return;
  }

  const { total, discount } = updateTotals();
  const amountPaid = Number(document.getElementById('amountPaid').value) || 0;

  if (amountPaid < total) {
    showToast('Amount received is less than the total due', 'error');
    return;
  }

  const btn = document.getElementById('checkoutBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const res = await Api.post('/sales', {
      items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      discountTotal: discount,
      amountPaid,
      paymentMethod: document.getElementById('paymentMethod').value,
    });

    document.getElementById('invoiceNoText').textContent = res.data.invoiceNo;
    document.getElementById('viewReceiptBtn').href = `${API_BASE_URL}/receipts/${res.data._id}?token=${Api.getToken()}`;
    new bootstrap.Modal(document.getElementById('receiptModal')).show();

    // reset for next sale
    cart = [];
    document.getElementById('discountInput').value = 0;
    document.getElementById('amountPaid').value = '';
    renderCart();
    loadProducts(); // refresh stock counts
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check2-circle"></i> Complete Sale';
  }
});

loadProducts();
