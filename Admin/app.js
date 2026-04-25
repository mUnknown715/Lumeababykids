// const API = 'http://localhost:4000';
const API = 'https://bilgy-stomatological-ryleigh.ngrok-free.dev';


function authHeader() {
  const token = localStorage.getItem('lumea_admin_token');
  return { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' };
}

function resolveImg(url) {
  if (!url || url.trim() === '') return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return API + url;
}
let adminToken = localStorage.getItem('lumea_admin_token');
let editingProductId = null;
let categories = [];

/* ══ MOBILE SIDEBAR ══ */
function toggleSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

// Close sidebar when a nav item is clicked on mobile
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 768) toggleSidebar();
    });
  });
});

/* ══ COLOR BUILDER ══ */
let productColors = []; // [{name, hex, images:[url,...]}]

function addColorSwatch() {
  const hex   = document.getElementById('pf-color-pick').value;
  const name  = document.getElementById('pf-color-name').value.trim();
  const stock = parseInt(document.getElementById('pf-color-stock').value) || 0;
  if (!name) { toast('Please enter a color name'); return; }
  if (productColors.find(c => c.name.toLowerCase() === name.toLowerCase())) { toast('Color already added'); return; }
  productColors.push({ name, hex, stock, images: [] });
  renderColorSwatches();
  document.getElementById('pf-color-name').value  = '';
  document.getElementById('pf-color-stock').value = '';
}

function renderColorSwatches() {
  const list = document.getElementById('pf-colors-list');
  list.style.cssText = 'display:flex;flex-direction:column;gap:.5rem;margin-bottom:.7rem;width:100%';
  list.innerHTML = '';
  productColors.forEach((c, i) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'background:var(--blush);border-radius:1rem;padding:.8rem 1rem;border:1.5px solid var(--rose);width:100%';

    // Image previews for this color
    const imgPreviews = c.images.map((url, j) => `
      <div style="position:relative;width:52px;height:52px;border-radius:.5rem;overflow:hidden;border:1.5px solid var(--rose);flex-shrink:0">
        <img src="${resolveImg(url)}" style="width:100%;height:100%;object-fit:cover"/>
        <button onclick="removeColorImage(${i},${j})" style="position:absolute;top:1px;right:1px;background:rgba(46,26,34,.75);color:white;border:none;border-radius:50%;width:16px;height:16px;cursor:pointer;font-size:.6rem;display:flex;align-items:center;justify-content:center;padding:0">×</button>
      </div>`).join('');

    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.6rem">
        <div style="width:24px;height:24px;border-radius:50%;background:${c.hex};border:2px solid rgba(0,0,0,.1);flex-shrink:0"></div>
        <span style="font-size:.82rem;font-weight:500;color:var(--text);flex:1">${c.name}</span>
        <div style="display:flex;align-items:center;gap:.3rem">
          <label style="font-size:.7rem;color:var(--muted)">Stock:</label>
          <input type="number" min="0" value="${c.stock ?? 0}" onchange="updateColorStock(${i}, this.value)"
            style="width:60px;padding:.25rem .4rem;border:1.5px solid var(--rose);border-radius:.5rem;font-family:'DM Sans',sans-serif;font-size:.78rem;text-align:center;background:white;color:var(--text)"/>
        </div>
        <button onclick="removeColor(${i})" style="background:none;border:none;cursor:pointer;color:#e74c3c;font-size:.8rem;padding:0">Remove</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:.4rem;align-items:center" id="color-imgs-${i}">
        ${imgPreviews}
        <label style="width:52px;height:52px;border:1.5px dashed var(--rose);border-radius:.5rem;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);font-size:1.2rem;flex-shrink:0" title="Add image for this color">
          +
          <input type="file" accept="image/*" multiple style="display:none" onchange="uploadColorImages(${i}, this)">
        </label>
      </div>`;
    list.appendChild(wrap);
  });
  document.getElementById('pf-colors').value = productColors.length ? JSON.stringify(productColors) : '';

  // Refresh summary
  let sizeTotal = 0;
  document.querySelectorAll('.size-qty').forEach(inp => {
    if (!inp.disabled) sizeTotal += parseInt(inp.value) || 0;
  });
  renderColorStockSummary(sizeTotal);
}

function removeColor(i) {
  productColors.splice(i, 1);
  renderColorSwatches();
}

function removeColorImage(colorIdx, imgIdx) {
  productColors[colorIdx].images.splice(imgIdx, 1);
  renderColorSwatches();
}

function updateColorStock(colorIdx, value) {
  const newStock = parseInt(value) || 0;

  // Calculate total stock from sizes
  let sizeTotal = 0;
  document.querySelectorAll('.size-qty').forEach(inp => {
    if (!inp.disabled) sizeTotal += parseInt(inp.value) || 0;
  });

  // Calculate what other colors are using
  const otherColorsTotal = productColors.reduce((sum, c, i) => {
    return i === colorIdx ? sum : sum + (parseInt(c.stock) || 0);
  }, 0);

  const maxAllowed = sizeTotal - otherColorsTotal;

  if (newStock > maxAllowed) {
    toast(`Color stock cannot exceed remaining stock (${maxAllowed} left after other colors)`);
    // Reset input to max allowed
    const inputs = document.querySelectorAll(`[onchange*="updateColorStock(${colorIdx}"]`);
    document.querySelectorAll('[onchange]').forEach(inp => {
      if (inp.getAttribute('onchange') === `updateColorStock(${colorIdx}, this.value)`) {
        inp.value = maxAllowed;
      }
    });
    productColors[colorIdx].stock = maxAllowed;
  } else {
    productColors[colorIdx].stock = newStock;
  }

  document.getElementById('pf-colors').value = productColors.length ? JSON.stringify(productColors) : '';
  renderColorStockSummary(sizeTotal);
}

function renderColorStockSummary(sizeTotal) {
  const el = document.getElementById('color-stock-summary');
  if (!el) return;
  const colorTotal = productColors.reduce((sum, c) => sum + (parseInt(c.stock) || 0), 0);
  const remaining  = sizeTotal - colorTotal;
  el.innerHTML = `
    <div style="display:flex;gap:1rem;flex-wrap:wrap;font-size:.75rem;margin-top:.4rem">
      <span style="color:var(--muted)">Size total: <strong style="color:var(--text)">${sizeTotal}</strong></span>
      <span style="color:var(--muted)">Colors total: <strong style="color:${colorTotal > sizeTotal ? '#e74c3c' : 'var(--wine)'}">${colorTotal}</strong></span>
      <span style="color:var(--muted)">Unassigned: <strong style="color:${remaining < 0 ? '#e74c3c' : '#27ae60'}">${remaining}</strong></span>
    </div>`;
}

async function uploadColorImages(colorIdx, input) {
  const files = Array.from(input.files);
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res  = await fetch(`${API}/api/admin/upload-image`, { method: 'POST', headers: authHeader(), body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        productColors[colorIdx].images.push(data.url);
      } else {
        toast('Image upload failed: ' + (data.detail || 'Unknown error'));
      }
    } catch { toast('Upload error'); }
  }
  renderColorSwatches();
}

function loadColorSwatches(jsonStr) {
  productColors = [];
  try { if (jsonStr) productColors = JSON.parse(jsonStr); } catch {}
  // Ensure each color has images array
  productColors = productColors.map(c => ({ ...c, images: c.images || [] }));
  renderColorSwatches();
}


const ADMIN_SIZES = ['0-1M','0-3M','3-6M','6-9M','9-12M','6-12M','12-18M','18-24M','24-36M','2Y','3Y','4Y','5Y','6Y'];

function buildSizeGrid(existingData) {
  // existingData = JSON string like '{"0-3M":10,"3-6M":5}' or null
  let parsed = {};
  try { if (existingData) parsed = JSON.parse(existingData); } catch {}

  const grid = document.getElementById('pf-sizes-grid');
  if (!grid) return;
  grid.innerHTML = '';

  ADMIN_SIZES.forEach(size => {
    const qty  = parsed[size] !== undefined ? parsed[size] : 0;
    const active = qty > 0;
    const card = document.createElement('div');
    card.style.cssText = `border:1.5px solid ${active ? 'var(--wine)' : 'var(--rose)'};border-radius:.7rem;padding:.6rem .7rem;background:${active ? 'rgba(139,51,82,.05)' : 'white'};transition:all .15s`;
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem">
        <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.8rem;font-weight:600;color:var(--text)">
          <input type="checkbox" data-size="${size}" class="size-check" style="accent-color:var(--wine);width:14px;height:14px" ${active ? 'checked' : ''}>
          ${size}
        </label>
      </div>
      <input type="number" data-size="${size}" class="size-qty" min="0" max="9999" value="${qty}"
        style="width:100%;padding:.3rem .5rem;border:1px solid var(--rose);border-radius:.4rem;font-size:.78rem;font-family:'DM Sans',sans-serif;text-align:center"
        placeholder="qty" ${!active ? 'disabled' : ''}>`;

    const checkbox = card.querySelector('.size-check');
    const qtyInput = card.querySelector('.size-qty');

    checkbox.addEventListener('change', () => {
      const on = checkbox.checked;
      qtyInput.disabled = !on;
      card.style.borderColor = on ? 'var(--wine)' : 'var(--rose)';
      card.style.background  = on ? 'rgba(139,51,82,.05)' : 'white';
      if (on && !qtyInput.value) qtyInput.value = 1;
      if (!on) qtyInput.value = 0;
      updateStockTotal();
    });

    qtyInput.addEventListener('input', updateStockTotal);
    grid.appendChild(card);
  });
  updateStockTotal();
}

function updateStockTotal() {
  let total = 0;
  document.querySelectorAll('.size-qty').forEach(inp => {
    if (!inp.disabled) total += parseInt(inp.value) || 0;
  });
  const el = document.getElementById('pf-stock-total');
  if (el) el.textContent = total;
  const stockEl = document.getElementById('pf-stock');
  if (stockEl) stockEl.value = total;
  renderColorStockSummary(total);
}

function readSizeData() {
  // Returns { sizeJson, total }
  const result = {};
  document.querySelectorAll('.size-check').forEach(chk => {
    if (chk.checked) {
      const size = chk.dataset.size;
      const qty  = parseInt(document.querySelector(`.size-qty[data-size="${size}"]`).value) || 0;
      result[size] = qty;
    }
  });
  return {
    sizeJson: Object.keys(result).length ? JSON.stringify(result) : null,
    total: Object.values(result).reduce((a, b) => a + b, 0)
  };
}


async function adminLogin() {
  const email = document.getElementById('adm-email').value.trim();
  const pass  = document.getElementById('adm-pass').value;
  const errEl = document.getElementById('login-err');
  const btn   = document.querySelector('.btn-wine');

  errEl.textContent = '';

  if (!email || !pass) { errEl.textContent = 'Please fill in all fields.'; return; }

  btn.textContent = 'Signing in…';
  btn.disabled    = true;

  try {
    const res  = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.detail || `Login failed (${res.status})`; return; }
    if (data.data.user.role !== 'admin') { errEl.textContent = 'Access denied. Admins only.'; return; }
    adminToken = data.data.access_token;
    localStorage.setItem('lumea_admin_token', adminToken);
    showDashboard();
  } catch (e) {
    errEl.textContent = 'Cannot connect to server: ' + e.message;
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled    = false;
  }
}

function adminLogout() {
  localStorage.removeItem('lumea_admin_token');
  adminToken = null;
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login-wrap').style.display = 'flex';
}

function showDashboard() {
  document.getElementById('login-wrap').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  loadStats();
  loadCategories();
}

/* Auto-show dashboard if already logged in — validate token first */
async function initAdmin() {
  const token = localStorage.getItem('lumea_admin_token');
  if (!token) return; // stay on login page
  try {
    const res = await fetch(`${API}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
    });
    if (res.status === 401) {
      // Token expired — clear and show login
      localStorage.removeItem('lumea_admin_token');
      adminToken = null;
      return;
    }
    // Token valid — show dashboard
    adminToken = token;
    showDashboard();
  } catch {
    // Server unreachable — still show dashboard (offline-first)
    showDashboard();
  }
}
initAdmin();

/* ══ NAVIGATION ══ */
function showTab(tabId, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');
}

/* ══ STATS ══ */
async function loadStats() {
  try {
    const res  = await fetch(`${API}/api/admin/stats`, { headers: authHeader() });
    const data = await res.json();
    if (!res.ok) return;
    const d = data.data;
    document.getElementById('stat-orders').textContent   = d.total_orders;
    document.getElementById('stat-revenue').textContent  = `$${parseFloat(d.total_revenue).toFixed(2)}`;
    document.getElementById('stat-users').textContent    = d.total_users;
    document.getElementById('stat-products').textContent = d.total_products;

    document.getElementById('recent-orders-body').innerHTML = d.recent_orders.map(o => `
      <tr>
        <td><code style="font-size:.75rem;color:var(--wine)">#${o.id.substring(0,8).toUpperCase()}</code></td>
        <td>${o.first_name||''} ${o.last_name||''}</td>
        <td style="color:var(--muted)">${o.email||'—'}</td>
        <td style="font-weight:500;color:var(--wine)">$${parseFloat(o.total).toFixed(2)}</td>
        <td><span class="badge badge-${o.status}">${o.status}</span></td>
        <td style="color:var(--muted)">${new Date(o.created_at).toLocaleDateString()}</td>
      </tr>`).join('');
  } catch(e) { console.error(e); }
}

/* ══ PRODUCTS ══ */
async function loadAdminProducts() {
  const res  = await fetch(`${API}/api/admin/products`, { headers: authHeader() });
  const data = await res.json();
  document.getElementById('products-body').innerHTML = data.data.map(p => `
    <tr>
      <td>${p.image_url
        ? `<img src="${resolveImg(p.image_url)}" class="prod-thumb" onerror="this.outerHTML='<div class=prod-emoji>${p.emoji||'👶'}</div>'">`
        : `<div class="prod-emoji">${p.emoji||'👶'}</div>`}</td>
      <td style="font-weight:500">${p.name}</td>
      <td style="color:var(--muted)">${p.age_group ? p.age_group.split(',').map(s=>s.trim().replace(/\b\w/g,c=>c.toUpperCase())).join(', ') : '—'}</td>
      <td style="color:var(--wine);font-weight:500">$${parseFloat(p.price).toFixed(2)}</td>
      <td>${p.stock}</td>
      <td><span class="badge ${p.is_active?'badge-delivered':'badge-cancelled'}">${p.is_active?'Active':'Hidden'}</span></td>
      <td><div class="action-btns">
        <button class="btn-sm btn-edit" onclick="openProductModal('${p.id}')">Edit</button>
        <button class="btn-sm btn-del" onclick="hideProduct('${p.id}','${p.name.replace(/'/g,"\\'")}')">Hide</button>
        <button class="btn-sm" style="background:#fff0f0;color:#c0392b" onclick="permanentDeleteProduct('${p.id}','${p.name.replace(/'/g,"\\'")}')">Delete ✕</button>
      </div></td>
    </tr>`).join('');
}

async function loadCategories() {
  // Age group is now hardcoded in the form — no longer loaded from DB
}

function openProductModal(productId) {
  editingProductId = productId;
  pendingImageUrls = [];
  document.getElementById('pf-image-previews').innerHTML = '';
  document.getElementById('modal-title-text').textContent = productId ? 'Edit Product' : 'Add Product';

  if (!productId) {
    ['pf-name','pf-slug','pf-desc','pf-price','pf-compare','pf-emoji'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('pf-c1').value = '#fce4ec';
    document.getElementById('pf-c2').value = '#f8bbd0';
    document.getElementById('pf-badge').value = '';
    document.getElementById('pf-active').value = 'true';
    document.querySelectorAll('.pf-age-check').forEach(cb => cb.checked = false);
    document.getElementById('pf-gender').value   = '';
    document.getElementById('pf-season').value   = '';
    document.getElementById('pf-type').value     = '';
    buildSizeGrid(null);
    loadColorSwatches(null);
  } else {
    fetch(`${API}/api/admin/products`, { headers: authHeader() })
      .then(r => r.json()).then(d => {
        const p = d.data.find(x => x.id === productId);
        if (!p) return;
        document.getElementById('pf-name').value    = p.name || '';
        document.getElementById('pf-slug').value    = p.slug || '';
        document.getElementById('pf-desc').value    = p.description || '';
        document.getElementById('pf-price').value   = p.price || '';
        document.getElementById('pf-compare').value = p.compare_price || '';
        document.getElementById('pf-emoji').value   = p.emoji || '';
        document.getElementById('pf-c1').value      = p.color_primary || '#fce4ec';
        document.getElementById('pf-c2').value      = p.color_secondary || '#f8bbd0';

        // Build size grid — try to parse size_range as JSON, fallback to empty
        let sizeJson = null;
        try {
          const parsed = JSON.parse(p.size_range);
          if (typeof parsed === 'object' && !Array.isArray(parsed)) sizeJson = p.size_range;
        } catch {}
        buildSizeGrid(sizeJson);
        loadColorSwatches(p.available_colors || null);

        // Load existing images into previews
        pendingImageUrls = [];
        try { pendingImageUrls = p.image_urls ? JSON.parse(p.image_urls) : (p.image_url ? [p.image_url] : []); } catch { pendingImageUrls = p.image_url ? [p.image_url] : []; }
        const previews = document.getElementById('pf-image-previews');
        previews.innerHTML = '';
        pendingImageUrls.forEach((url, idx) => {
          const wrap = document.createElement('div');
          wrap.style.cssText = 'position:relative;width:80px;height:80px;border-radius:.6rem;overflow:hidden;border:2px solid var(--rose)';
          const img = document.createElement('img');
          img.src   = resolveImg(url);
          img.style.cssText = 'width:100%;height:100%;object-fit:cover';
          const rm = document.createElement('button');
          rm.style.cssText = 'position:absolute;top:2px;right:2px;background:rgba(46,26,34,.7);color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:.7rem';
          rm.textContent = '×';
          rm.onclick = () => { pendingImageUrls = pendingImageUrls.filter(u => u !== url); wrap.remove(); };
          if (idx === 0) { const b = document.createElement('div'); b.style.cssText='position:absolute;bottom:0;left:0;right:0;background:var(--wine);color:white;font-size:.55rem;text-align:center;padding:1px'; b.textContent='MAIN'; wrap.appendChild(b); }
          wrap.appendChild(img); wrap.appendChild(rm); previews.appendChild(wrap);
        });
        document.getElementById('pf-badge').value   = p.badge || '';
        document.getElementById('pf-active').value  = p.is_active ? 'true' : 'false';
        const ageVals = (p.age_group || '').split(',').map(s => s.trim()).filter(Boolean);
        document.querySelectorAll('.pf-age-check').forEach(cb => cb.checked = ageVals.includes(cb.value));
        document.getElementById('pf-gender').value   = p.gender || '';
        document.getElementById('pf-season').value   = p.season || '';
        document.getElementById('pf-type').value     = p.product_type || '';
      });
  }
  document.getElementById('product-modal').classList.add('open');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('open');
  editingProductId = null;
}

function autoSlug() {
  const name = document.getElementById('pf-name').value;
  if (!editingProductId) {
    document.getElementById('pf-slug').value = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }
}

/* ══ IMAGE UPLOAD HANDLING ══ */
let pendingImageUrls = []; // final uploaded URLs for this product

async function handleImageFiles(files) {
  for (const file of files) {
    await uploadOneImage(file);
  }
}

function handleImageDrop(e) {
  e.preventDefault();
  document.getElementById('image-upload-area').style.borderColor = 'var(--rose)';
  handleImageFiles(e.dataTransfer.files);
}

async function uploadOneImage(file) {
  const area = document.getElementById('image-upload-area');
  const previews = document.getElementById('pf-image-previews');

  // Show uploading placeholder
  const placeholder = document.createElement('div');
  placeholder.style.cssText = 'width:80px;height:80px;border-radius:.6rem;background:var(--blush);display:flex;align-items:center;justify-content:center;font-size:.65rem;color:var(--muted)';
  placeholder.textContent = 'Uploading…';
  previews.appendChild(placeholder);

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res  = await fetch(`${API}/api/admin/upload-image`, { method:'POST', headers: authHeader(), body: formData });
    const data = await res.json();
    if (!res.ok) { toast(data.detail || 'Upload failed'); placeholder.remove(); return; }

    const url = data.url;
    pendingImageUrls.push(url);
    placeholder.remove();

    // Show preview with remove button
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:80px;height:80px;border-radius:.6rem;overflow:hidden;border:2px solid var(--rose)';
    const img = document.createElement('img');
    img.src   = resolveImg(url);
    img.style.cssText = 'width:100%;height:100%;object-fit:cover';
    const removeBtn = document.createElement('button');
    removeBtn.style.cssText = 'position:absolute;top:2px;right:2px;background:rgba(46,26,34,.7);color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:.7rem;display:flex;align-items:center;justify-content:center';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => {
      pendingImageUrls = pendingImageUrls.filter(u => u !== url);
      wrap.remove();
    };
    // Mark first image
    if (pendingImageUrls.length === 1) {
      const badge = document.createElement('div');
      badge.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:var(--wine);color:white;font-size:.55rem;text-align:center;padding:1px';
      badge.textContent = 'MAIN';
      wrap.appendChild(badge);
    }
    wrap.appendChild(img);
    wrap.appendChild(removeBtn);
    previews.appendChild(wrap);
    toast('Image uploaded!');
  } catch { toast('Upload error'); placeholder.remove(); }
}

async function saveProduct() {
  const name = document.getElementById('pf-name').value.trim();
  const slug = document.getElementById('pf-slug').value.trim();
  const price = parseFloat(document.getElementById('pf-price').value);
  if (!name || !slug || !price) { toast('Please fill in Name, Slug and Price'); return; }

  const productType = document.getElementById('pf-type').value;
  const ageGroup    = [...document.querySelectorAll('.pf-age-check:checked')].map(cb => cb.value).join(',');
  const gender      = document.getElementById('pf-gender').value;
  const season      = document.getElementById('pf-season').value;

  if (!productType) { toast('Please select a Product Type'); return; }
  if (!ageGroup)    { toast('Please select at least one Age Group'); return; }
  if (!gender)      { toast('Please select a Gender'); return; }
  if (!season)      { toast('Please select a Season'); return; }

  // Build image_url (first) and image_urls (JSON array of all)
  const allUrls   = pendingImageUrls.length ? pendingImageUrls : [];
  const imageUrl  = allUrls.length ? allUrls[0] : null;
  const imageUrls = allUrls.length ? JSON.stringify(allUrls) : null;

  // Read size data from grid
  const { sizeJson, total } = readSizeData();

  const body = {
    name, slug,
    description:     document.getElementById('pf-desc').value.trim() || null,
    price,
    compare_price:   parseFloat(document.getElementById('pf-compare').value) || null,
    stock:           total,
    sku:             null,
    size_range:      sizeJson,
    emoji:           document.getElementById('pf-emoji').value.trim() || '👶',
    color_primary:   document.getElementById('pf-c1').value,
    color_secondary: document.getElementById('pf-c2').value,
    image_url:       imageUrl,
    image_urls:      imageUrls,
    available_colors: document.getElementById('pf-colors').value || null,
    badge:           document.getElementById('pf-badge').value || null,
    category_id:     null,
    age_group:       ageGroup || null,
    gender:          gender || null,
    season:          season || null,
    product_type:    productType || null,
    is_active:       document.getElementById('pf-active').value === 'true',
  };

  const url    = editingProductId ? `${API}/api/admin/products/${editingProductId}` : `${API}/api/admin/products`;
  const method = editingProductId ? 'PUT' : 'POST';

  const res  = await fetch(url, { method, headers: { ...authHeader(), 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) { toast(data.detail || 'Error saving product'); return; }

  toast(editingProductId ? 'Product updated!' : 'Product created!');
  closeProductModal();
  loadAdminProducts();
}

async function hideProduct(id, name) {
  if (!confirm(`Hide "${name}" from the store? It will no longer be visible to customers.`)) return;
  const res = await fetch(`${API}/api/admin/products/${id}`, { method:'DELETE', headers: authHeader() });
  if (res.ok) { toast('Product hidden from store.'); loadAdminProducts(); }
}

async function permanentDeleteProduct(id, name) {
  if (!confirm(`⚠️ PERMANENTLY delete "${name}"?\n\nThis cannot be undone. All product data will be removed.`)) return;
  if (!confirm(`Are you 100% sure? Type OK to confirm deletion of "${name}".`)) return;
  const res = await fetch(`${API}/api/admin/products/${id}/permanent`, { method:'DELETE', headers: authHeader() });
  if (res.ok) { toast('Product permanently deleted.'); loadAdminProducts(); }
  else { const d = await res.json().catch(()=>({})); toast(d.detail||'Delete failed'); }
}

/* ══ ORDERS ══ */
async function loadAdminOrders() {
  const res  = await fetch(`${API}/api/admin/orders`, { headers: authHeader() });
  const data = await res.json();
  document.getElementById('orders-body').innerHTML = data.data.map(o => {

    // Build items HTML
    const itemsHtml = (o.items || []).map(it => {
      // Get image — try image_urls first, then image_url, then emoji
      let imgHtml = '';
      let imgSrc = '';
      try { if (it.image_urls) { const arr = JSON.parse(it.image_urls); if (arr.length) imgSrc = arr[0]; } } catch {}
      if (!imgSrc && it.image_url) imgSrc = it.image_url;
      if (imgSrc) {
        const fullSrc = imgSrc.startsWith('http') ? imgSrc : API + imgSrc;
        imgHtml = `<img src="${fullSrc}" style="width:40px;height:40px;object-fit:cover;border-radius:.5rem;border:1px solid var(--rose);flex-shrink:0" onerror="this.style.display='none'">`;
      } else {
        imgHtml = `<div style="width:40px;height:40px;border-radius:.5rem;background:var(--blush);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">${it.emoji||'👶'}</div>`;
      }

      // Extract size from product_name e.g. "Daisy Onesie Set (3-6M)"
      const sizeMatch = it.product_name.match(/\(([^)]+)\)$/);
      const size      = sizeMatch ? sizeMatch[1] : '—';
      const cleanName = it.product_name.replace(/\s*\([^)]+\)$/, '');

      return `
        <div style="display:flex;align-items:center;gap:.6rem;padding:.5rem 0;border-bottom:1px solid var(--rose)">
          ${imgHtml}
          <div style="flex:1;min-width:0">
            <div style="font-size:.78rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cleanName}</div>
            <div style="font-size:.68rem;color:var(--muted);margin-top:.1rem">
              Size: <strong style="color:var(--wine)">${size}</strong>
              &nbsp;·&nbsp; Qty: <strong style="color:var(--text)">${it.quantity}</strong>
              &nbsp;·&nbsp; $${parseFloat(it.unit_price).toFixed(2)}
            </div>
          </div>
        </div>`;
    }).join('') || '<div style="font-size:.72rem;color:var(--muted);padding:.3rem 0">No items</div>';

    return `
    <tr>
      <td><code style="font-size:.75rem;color:var(--wine)">#${o.id.substring(0,8).toUpperCase()}</code><br><span style="font-size:.68rem;color:var(--muted)">${o.email||''}</span></td>
      <td style="font-weight:500">${o.first_name||''} ${o.last_name||''}</td>
      <td style="color:var(--muted);font-size:.82rem">${o.shipping_phone||'—'}</td>
      <td style="color:var(--muted);font-size:.82rem;max-width:160px;word-break:break-word">
        ${o.shipping_street||'—'}
        ${o.shipping_building ? `<br><span style="font-size:.72rem">🏢 ${o.shipping_building}</span>` : ''}
        ${o.shipping_floor    ? `<br><span style="font-size:.72rem">🪜 Floor: ${o.shipping_floor}</span>` : ''}
        ${o.shipping_apartment? `<br><span style="font-size:.72rem">${o.shipping_apartment}</span>` : ''}
      </td>
      <td style="color:var(--muted)">${o.shipping_city||'—'}</td>
      <td style="min-width:180px;max-width:240px">${itemsHtml}</td>
      <td style="font-weight:500;color:var(--wine)">$${parseFloat(o.total).toFixed(2)}</td>
      <td>
        <select onchange="updateOrderStatus('${o.id}',this.value)" style="padding:.3rem .6rem;border:1.5px solid var(--rose);border-radius:.5rem;font-family:'DM Sans',sans-serif;font-size:.75rem;background:white;color:var(--text);cursor:pointer">
          ${['pending','confirmed','processing','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${s===o.status?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </td>
      <td style="color:var(--muted)">${new Date(o.created_at).toLocaleDateString()}</td>
    </tr>`;
  }).join('');
}

async function updateOrderStatus(orderId, status) {
  const res = await fetch(`${API}/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { ...authHeader(), 'Content-Type':'application/json' },
    body: JSON.stringify({ status })
  });
  if (res.ok) toast(`Order status updated to ${status}`);
  else toast('Failed to update status');
}

/* ══ USERS ══ */
async function loadAdminUsers() {
  const res  = await fetch(`${API}/api/admin/users`, { headers: authHeader() });
  const data = await res.json();
  document.getElementById('users-body').innerHTML = data.data.map(u => `
    <tr>
      <td style="font-weight:500">${u.first_name} ${u.last_name}</td>
      <td style="color:var(--muted)">${u.email}</td>
      <td><span class="badge ${u.role==='admin'?'badge-confirmed':'badge-pending'}">${u.role}</span></td>
      <td style="color:var(--muted)">${new Date(u.created_at).toLocaleDateString()}</td>
    </tr>`).join('');
}

/* ══ HELPERS ══ */
function toast(msg) {
  const t = document.getElementById('admin-toast');
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.opacity = '0', 2800);
}

/* Close modal on background click */
document.getElementById('product-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('product-modal')) closeProductModal();
});

/* ══ DISCOUNTS ══ */
async function loadDiscounts() {
  const res  = await fetch(`${API}/api/discounts/`, { headers: authHeader() });
  const data = await res.json();
  if (!res.ok) { toast('Failed to load discounts'); return; }
  document.getElementById('discounts-body').innerHTML = (data.data || []).map(d => `
    <tr>
      <td><code style="font-size:.85rem;font-weight:700;color:var(--wine);letter-spacing:.1em">${d.code}</code></td>
      <td style="font-weight:600;color:var(--wine)">${parseFloat(d.percentage).toFixed(0)}% off</td>
      <td style="color:var(--muted)">${d.uses_count}${d.uses_limit ? ' / ' + d.uses_limit : ' / ∞'}</td>
      <td><span class="badge ${d.is_active ? 'badge-confirmed' : 'badge-cancelled'}">${d.is_active ? 'Active' : 'Inactive'}</span></td>
      <td style="color:var(--muted)">${new Date(d.created_at).toLocaleDateString()}</td>
      <td style="display:flex;gap:.5rem">
        <button class="btn-sm" onclick="toggleDiscount('${d.id}')" style="background:var(--blush);color:var(--wine);border:none;padding:.3rem .8rem;border-radius:.5rem;cursor:pointer;font-size:.72rem">${d.is_active ? 'Disable' : 'Enable'}</button>
        <button class="btn-sm" onclick="deleteDiscount('${d.id}')" style="background:#ffeaea;color:#e74c3c;border:none;padding:.3rem .8rem;border-radius:.5rem;cursor:pointer;font-size:.72rem">Delete</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">No discount codes yet.</td></tr>';
}

async function createDiscount() {
  const code    = document.getElementById('dc-code').value.trim().toUpperCase();
  const percent = parseFloat(document.getElementById('dc-percent').value);
  const uses    = parseInt(document.getElementById('dc-uses').value) || null;
  if (!code) { toast('Please enter a code'); return; }
  if (!percent || percent < 1 || percent > 100) { toast('Percentage must be between 1-100'); return; }
  const res  = await fetch(`${API}/api/discounts/`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, percentage: percent, uses_limit: uses })
  });
  const data = await res.json();
  if (!res.ok) { toast(data.detail || 'Failed to create code'); return; }
  toast(`Code "${code}" created!`);
  document.getElementById('dc-code').value = '';
  document.getElementById('dc-percent').value = '';
  document.getElementById('dc-uses').value = '';
  loadDiscounts();
}

async function toggleDiscount(id) {
  const res = await fetch(`${API}/api/discounts/${id}/toggle`, { method: 'PATCH', headers: authHeader() });
  if (res.ok) { loadDiscounts(); } else { toast('Failed to update'); }
}

async function deleteDiscount(id) {
  if (!confirm('Delete this discount code?')) return;
  const res = await fetch(`${API}/api/discounts/${id}`, { method: 'DELETE', headers: authHeader() });
  if (res.ok) { toast('Code deleted'); loadDiscounts(); } else { toast('Failed to delete'); }
}
