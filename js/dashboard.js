const currentUser = requireAuth(['admin', 'manager']);
renderUserBadge();

// Hide the "Staff & Roles" nav item for managers (admin-only)
if (currentUser.role !== 'admin') {
  document.querySelector('[data-panel="users"]')?.parentElement.remove();
}

// ---------- Panel switching ----------
document.querySelectorAll('[data-panel]').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('[data-panel]').forEach((l) => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.panel').forEach((p) => p.classList.add('d-none'));
    const panel = document.getElementById(`panel-${link.dataset.panel}`);
    panel.classList.remove('d-none');
    loadPanelData(link.dataset.panel);
  });
});

let categoriesCache = [];
let suppliersCache = [];
let productsCache = [];

async function loadPanelData(panel) {
  try {
    if (panel === 'overview') return loadOverview();
    if (panel === 'products') return loadProducts();
    if (panel === 'categories') return loadCategories();
    if (panel === 'inventory') return loadInventory('all');
    if (panel === 'suppliers') return loadSuppliers();
    if (panel === 'purchases') return loadPurchases();
    if (panel === 'sales') return loadSales();
    if (panel === 'customers') return loadCustomers();
    if (panel === 'reports') return loadReport();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------- Overview ----------
async function loadOverview() {
  const today = new Date().toISOString().slice(0, 10);
  const [salesRes, lowStockRes, valuationRes, topRes] = await Promise.all([
    Api.get('/reports/sales', { startDate: today }),
    Api.get('/inventory/low-stock'),
    Api.get('/reports/inventory-valuation'),
    Api.get('/reports/top-products', { limit: 5 }),
  ]);

  document.getElementById('statRevenue').textContent = formatNaira(salesRes.data.summary.totalRevenue);
  document.getElementById('statTxns').textContent = salesRes.data.summary.totalTransactions;
  document.getElementById('statLowStock').textContent = lowStockRes.count;
  document.getElementById('statInvValue').textContent = formatNaira(valuationRes.data.totalRetailValue);

  document.getElementById('topProductsBody').innerHTML = topRes.data.map((p) => `
    <tr><td>${p.name}</td><td class="num">${p.totalQuantitySold}</td><td class="num">${formatNaira(p.totalRevenue)}</td></tr>
  `).join('') || '<tr><td colspan="3" class="text-muted text-center">No sales yet</td></tr>';
}

// ---------- Categories ----------
async function loadCategories() {
  const res = await Api.get('/categories');
  categoriesCache = res.data;
  document.getElementById('categoriesBody').innerHTML = res.data.map((c) => `
    <tr><td>${c.name}</td><td>${c.description || '—'}</td></tr>
  `).join('') || '<tr><td colspan="2" class="text-muted text-center">No categories yet</td></tr>';

  const select = document.getElementById('p_category');
  if (select) select.innerHTML = res.data.map((c) => `<option value="${c._id}">${c.name}</option>`).join('');
}

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await Api.post('/categories', {
      name: document.getElementById('c_name').value,
      description: document.getElementById('c_description').value,
    });
    showToast('Category created');
    bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
    e.target.reset();
    loadCategories();
  } catch (err) { showToast(err.message, 'error'); }
});

// ---------- Products ----------
async function loadProducts() {
  await loadCategories();
  const res = await Api.get('/products', { limit: 100 });
  productsCache = res.data;
  renderProductsTable(productsCache);
}

function renderProductsTable(products) {
  document.getElementById('productsBody').innerHTML = products.map((p) => `
    <tr>
      <td>${p.name}</td>
      <td class="figure">${p.sku}</td>
      <td>${p.category?.name || '—'}</td>
      <td class="num">${formatNaira(p.costPrice)}</td>
      <td class="num">${formatNaira(p.sellingPrice)}</td>
      <td class="num">${p.quantityInStock}</td>
      <td>
        <button class="btn btn-sm btn-outline-navy" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&apos;")})'>
          <i class="bi bi-pencil"></i>
        </button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="text-muted text-center">No products yet</td></tr>';
}

document.getElementById('productSearch')?.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  renderProductsTable(productsCache.filter((p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)));
});

function openProductModal(product = null) {
  document.getElementById('productForm').reset();
  document.getElementById('p_id').value = '';
  document.getElementById('p_initialStockWrap').classList.remove('d-none');

  if (product && product._id) {
    document.getElementById('p_id').value = product._id;
    document.getElementById('p_name').value = product.name;
    document.getElementById('p_sku').value = product.sku;
    document.getElementById('p_barcode').value = product.barcode || '';
    document.getElementById('p_category').value = product.category?._id || product.category;
    document.getElementById('p_cost').value = product.costPrice;
    document.getElementById('p_price').value = product.sellingPrice;
    document.getElementById('p_tax').value = product.taxRate;
    document.getElementById('p_unit').value = product.unit;
    document.getElementById('p_reorder').value = product.reorderLevel;
    document.getElementById('p_initialStockWrap').classList.add('d-none'); // stock managed via Inventory panel when editing
    new bootstrap.Modal(document.getElementById('productModal')).show();
  }
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('p_id').value;
  const payload = {
    name: document.getElementById('p_name').value,
    sku: document.getElementById('p_sku').value,
    barcode: document.getElementById('p_barcode').value || undefined,
    category: document.getElementById('p_category').value,
    costPrice: Number(document.getElementById('p_cost').value),
    sellingPrice: Number(document.getElementById('p_price').value),
    taxRate: Number(document.getElementById('p_tax').value),
    unit: document.getElementById('p_unit').value,
    reorderLevel: Number(document.getElementById('p_reorder').value),
  };
  if (!id) payload.initialStock = Number(document.getElementById('p_initialStock').value) || 0;

  try {
    if (id) {
      await Api.put(`/products/${id}`, payload);
      showToast('Product updated');
    } else {
      await Api.post('/products', payload);
      showToast('Product created');
    }
    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    loadProducts();
  } catch (err) { showToast(err.message, 'error'); }
});

// ---------- Inventory ----------
document.querySelectorAll('[data-invtab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-invtab]').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    loadInventory(tab.dataset.invtab);
  });
});

async function loadInventory(mode) {
  const res = mode === 'low' ? await Api.get('/inventory/low-stock') : await Api.get('/inventory');
  document.getElementById('inventoryBody').innerHTML = res.data.map((i) => {
    const low = i.product && i.quantityInStock <= i.product.reorderLevel;
    return `
      <tr>
        <td>${i.product?.name || 'Unknown'}</td>
        <td class="figure">${i.product?.sku || '—'}</td>
        <td class="num">${i.quantityInStock}</td>
        <td class="num">${i.product?.reorderLevel ?? '—'}</td>
        <td><span class="badge ${low ? 'badge-low' : 'badge-ok'}">${low ? 'Low Stock' : 'OK'}</span></td>
      </tr>`;
  }).join('') || '<tr><td colspan="5" class="text-muted text-center">No inventory records</td></tr>';
}

// ---------- Suppliers ----------
async function loadSuppliers() {
  const res = await Api.get('/suppliers');
  suppliersCache = res.data;
  document.getElementById('suppliersBody').innerHTML = res.data.map((s) => `
    <tr><td>${s.name}</td><td>${s.contactPerson || '—'}</td><td>${s.phone}</td><td>${s.email || '—'}</td></tr>
  `).join('') || '<tr><td colspan="4" class="text-muted text-center">No suppliers yet</td></tr>';

  const select = document.getElementById('pu_supplier');
  if (select) select.innerHTML = res.data.map((s) => `<option value="${s._id}">${s.name}</option>`).join('');
}

document.getElementById('supplierForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await Api.post('/suppliers', {
      name: document.getElementById('s_name').value,
      contactPerson: document.getElementById('s_contact').value,
      phone: document.getElementById('s_phone').value,
      email: document.getElementById('s_email').value,
      address: document.getElementById('s_address').value,
    });
    showToast('Supplier created');
    bootstrap.Modal.getInstance(document.getElementById('supplierModal')).hide();
    e.target.reset();
    loadSuppliers();
  } catch (err) { showToast(err.message, 'error'); }
});

// ---------- Purchases ----------
async function loadPurchases() {
  await loadSuppliers();
  if (!productsCache.length) { const r = await Api.get('/products', { limit: 100 }); productsCache = r.data; }
  const res = await Api.get('/purchases');
  document.getElementById('purchasesBody').innerHTML = res.data.map((p) => `
    <tr>
      <td class="figure">${p.purchaseRef}</td>
      <td>${p.supplier?.name || '—'}</td>
      <td class="num">${formatNaira(p.totalAmount)}</td>
      <td><span class="badge ${p.status === 'received' ? 'badge-ok' : 'badge-pending'}">${p.status}</span></td>
      <td>${p.orderedBy?.name || '—'}</td>
      <td>${p.status === 'pending' ? `<button class="btn btn-sm btn-naira" onclick="receivePurchase('${p._id}')">Mark Received</button>` : ''}</td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="text-muted text-center">No purchase orders yet</td></tr>';
}

async function receivePurchase(id) {
  try {
    await Api.put(`/purchases/${id}/receive`);
    showToast('Purchase received — stock updated');
    loadPurchases();
  } catch (err) { showToast(err.message, 'error'); }
}

document.getElementById('addPurchaseItemBtn').addEventListener('click', () => {
  const wrap = document.createElement('div');
  wrap.className = 'row g-2 mb-2 purchase-item-row';
  wrap.innerHTML = `
    <div class="col-5">
      <select class="form-select item-product">
        ${productsCache.map((p) => `<option value="${p._id}" data-cost="${p.costPrice}">${p.name}</option>`).join('')}
      </select>
    </div>
    <div class="col-3"><input type="number" class="form-control item-qty" placeholder="Qty" min="1" value="1"></div>
    <div class="col-3"><input type="number" class="form-control item-cost" placeholder="Cost Price"></div>
    <div class="col-1"><button type="button" class="btn btn-outline-danger" onclick="this.closest('.purchase-item-row').remove()">×</button></div>
  `;
  document.getElementById('purchaseItemsList').appendChild(wrap);

  const productSelect = wrap.querySelector('.item-product');
  const costInput = wrap.querySelector('.item-cost');
  costInput.value = productSelect.selectedOptions[0]?.dataset.cost || '';
  productSelect.addEventListener('change', () => {
    costInput.value = productSelect.selectedOptions[0]?.dataset.cost || '';
  });
});

document.getElementById('purchaseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const rows = document.querySelectorAll('.purchase-item-row');
  if (!rows.length) { showToast('Add at least one item', 'error'); return; }

  const items = Array.from(rows).map((row) => ({
    productId: row.querySelector('.item-product').value,
    quantity: Number(row.querySelector('.item-qty').value),
    costPrice: Number(row.querySelector('.item-cost').value),
  }));

  try {
    await Api.post('/purchases', { supplierId: document.getElementById('pu_supplier').value, items });
    showToast('Purchase order created');
    bootstrap.Modal.getInstance(document.getElementById('purchaseModal')).hide();
    document.getElementById('purchaseItemsList').innerHTML = '';
    e.target.reset();
    loadPurchases();
  } catch (err) { showToast(err.message, 'error'); }
});

// ---------- Sales ----------
async function loadSales() {
  const start = document.getElementById('salesStart').value;
  const end = document.getElementById('salesEnd').value;
  const res = await Api.get('/sales', { startDate: start, endDate: end, limit: 100 });
  document.getElementById('salesBody').innerHTML = res.data.map((s) => `
    <tr>
      <td class="figure">${s.invoiceNo}</td>
      <td>${s.cashier?.name || '—'}</td>
      <td class="num">${formatNaira(s.grandTotal)}</td>
      <td class="text-capitalize">${s.paymentMethod}</td>
      <td><span class="badge ${s.status === 'completed' ? 'badge-ok' : 'badge-low'}">${s.status}</span></td>
      <td>${new Date(s.createdAt).toLocaleString()}</td>
      <td>
        <a href="${API_BASE_URL}/receipts/${s._id}" target="_blank" class="btn btn-sm btn-outline-navy"><i class="bi bi-receipt"></i></a>
        ${s.status === 'completed' ? `<button class="btn btn-sm btn-outline-danger" onclick="voidSale('${s._id}')">Void</button>` : ''}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="text-muted text-center">No sales found</td></tr>';
}

document.getElementById('salesFilterBtn').addEventListener('click', loadSales);

async function voidSale(id) {
  if (!confirm('Void this sale? Stock will be restored.')) return;
  try {
    await Api.put(`/sales/${id}/void`);
    showToast('Sale voided');
    loadSales();
  } catch (err) { showToast(err.message, 'error'); }
}

// ---------- Customers ----------
async function loadCustomers() {
  const res = await Api.get('/customers');
  document.getElementById('customersBody').innerHTML = res.data.map((c) => `
    <tr><td>${c.name}</td><td>${c.phone}</td><td class="num">${c.loyaltyPoints}</td><td class="num">${formatNaira(c.totalSpent)}</td></tr>
  `).join('') || '<tr><td colspan="4" class="text-muted text-center">No customers yet</td></tr>';
}

document.getElementById('customerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await Api.post('/customers', {
      name: document.getElementById('cu_name').value,
      phone: document.getElementById('cu_phone').value,
      email: document.getElementById('cu_email').value,
    });
    showToast('Customer added');
    bootstrap.Modal.getInstance(document.getElementById('customerModal')).hide();
    e.target.reset();
    loadCustomers();
  } catch (err) { showToast(err.message, 'error'); }
});

// ---------- Users (admin only) ----------
document.getElementById('userForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await Api.post('/auth/register', {
      name: document.getElementById('u_name').value,
      email: document.getElementById('u_email').value,
      password: document.getElementById('u_password').value,
      role: document.getElementById('u_role').value,
    });
    showToast('Staff account created');
    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
    e.target.reset();
  } catch (err) { showToast(err.message, 'error'); }
});

// ---------- Reports ----------
async function loadReport() {
  const start = document.getElementById('reportStart').value;
  const end = document.getElementById('reportEnd').value;
  const res = await Api.get('/reports/sales', { startDate: start, endDate: end });
  document.getElementById('reportBody').innerHTML = res.data.dailyBreakdown.map((d) => `
    <tr><td>${d._id}</td><td class="num">${formatNaira(d.totalSales)}</td><td class="num">${d.totalTransactions}</td></tr>
  `).join('') || '<tr><td colspan="3" class="text-muted text-center">No data for this range</td></tr>';
}

document.getElementById('reportFilterBtn').addEventListener('click', loadReport);

// Initial load
loadOverview();
