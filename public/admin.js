let editing = null;
let products = [];
const $ = id => document.getElementById(id);
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function api(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try { data = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}

function setFavicon() {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = '/favicon.svg';
}

async function refresh() {
  try {
    const [ps, os, st] = await Promise.all([api('/api/products'), api('/api/orders'), api('/api/stats')]);
    products = Array.isArray(ps) ? ps : [];
    $('productsStat').textContent = st.products ?? 0;
    $('stockStat').textContent = st.lowStock ?? 0;
    $('ordersStat').textContent = st.orders ?? 0;
    $('revenueStat').textContent = money(st.revenue);
    renderProducts();
    renderOrders(Array.isArray(os) ? os : []);
    $('dbStatus').textContent = 'DATABASE CONNECTED';
    $('dbStatus').className = 'status online';
  } catch (error) {
    $('dbStatus').textContent = 'DATABASE ERROR';
    $('dbStatus').className = 'status offline';
    toast(error.message);
  }
}

function renderProducts() {
  const query = $('search').value.trim().toLowerCase();
  const list = products.filter(p => `${p.name} ${p.category} ${p.gender || ''}`.toLowerCase().includes(query));
  $('productRows').innerHTML = list.length ? list.map(p => `
    <tr>
      <td><div class="product-cell"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"><div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.gender || 'Unisex')}</small></div></div></td>
      <td><span class="tag">${escapeHtml(p.category)}</span></td>
      <td><strong>${money(p.price)}</strong></td>
      <td><span class="stock ${Number(p.stock) <= 5 ? 'low' : ''}">${p.stock}</span></td>
      <td>${escapeHtml(p.sizes)}</td>
      <td><button class="action" onclick="editProduct(${Number(p.id)})">EDIT</button><button class="action danger" onclick="deleteProduct(${Number(p.id)})">DELETE</button></td>
    </tr>`).join('') : `<tr><td colspan="6"><div class="empty-table"><b>No products yet.</b><span>Add your first shoe to publish it on the storefront.</span><button class="primary" onclick="openForm()">+ ADD FIRST SHOE</button></div></td></tr>`;
}

function renderOrders(list) {
  $('orderRows').innerHTML = list.length ? list.map(o => `
    <tr>
      <td><strong>#${o.id}</strong></td>
      <td><strong>${escapeHtml(o.customer_name)}</strong><small>${escapeHtml(o.email)}</small></td>
      <td><strong>${money(o.total)}</strong></td>
      <td>${o.item_count}</td>
      <td><select class="status-select" onchange="updateStatus(${Number(o.id)},this.value)">${['Pending','Confirmed','Shipped','Delivered','Cancelled'].map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td>${new Date(o.created_at).toLocaleString()}</td>
    </tr>`).join('') : '<tr><td colspan="6"><div class="empty-table"><b>No orders yet.</b><span>Orders placed through the storefront will appear here.</span></div></td></tr>';
}

function openForm(product = null) {
  editing = product;
  const form = $('form');
  $('formTitle').textContent = product ? 'Edit product' : 'Add a new shoe';
  $('formSub').textContent = product ? 'Update the product details below.' : 'Add a product and it will appear on the storefront immediately.';
  form.elements.name.value = product?.name || '';
  form.elements.category.value = product?.category || 'Sneakers';
  form.elements.gender.value = product?.gender || 'Unisex';
  form.elements.price.value = product?.price ?? '';
  form.elements.rating.value = product?.rating ?? 5;
  form.elements.stock.value = product?.stock ?? 0;
  form.elements.sizes.value = product?.sizes || '6,7,8,9,10,11,12';
  form.elements.image.value = product?.image || '';
  form.elements.description.value = product?.description || '';
  $('modal').classList.add('open');
  document.body.classList.add('locked');
  form.elements.name.focus();
}

async function saveProduct(event) {
  event.preventDefault();
  const form = event.target;
  const body = Object.fromEntries(new FormData(form));
  body.price = Number(body.price);
  body.rating = Number(body.rating || 5);
  body.stock = Number(body.stock || 0);
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'SAVING…';
  try {
    await api(editing ? `/api/products/${editing.id}` : '/api/products', {
      method: editing ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
    closeForm();
    toast(editing ? 'Product updated' : 'Product published to storefront');
    await refresh();
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; button.textContent = 'PUBLISH PRODUCT'; }
}

function closeForm() { $('modal').classList.remove('open'); document.body.classList.remove('locked'); editing = null; }
function editProduct(id) { const p = products.find(x => Number(x.id) === Number(id)); if (p) openForm(p); }

async function deleteProduct(id) {
  const product = products.find(x => Number(x.id) === Number(id));
  if (!product || !confirm(`Delete “${product.name}”?`)) return;
  try { await api(`/api/products/${id}`, {method:'DELETE'}); toast('Product deleted'); await refresh(); }
  catch (error) { toast(error.message); }
}

async function updateStatus(id, status) {
  try { await api(`/api/orders/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status})}); toast('Order status updated'); await refresh(); }
  catch (error) { toast(error.message); await refresh(); }
}

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(window.adminToast);
  window.adminToast = setTimeout(() => $('toast').classList.remove('show'), 2200);
}

$('newBtn').onclick = () => openForm();
$('close').onclick = closeForm;
$('form').onsubmit = saveProduct;
$('search').oninput = renderProducts;
$('modal').onclick = e => { if (e.target === $('modal')) closeForm(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeForm(); });
setFavicon();
refresh();