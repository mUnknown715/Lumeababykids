/* ═══════════════════════════════════════════════
   Luméa — app.js
   All UI logic, no inline HTML strings
   ═══════════════════════════════════════════════ */

const API_URL = 'https://bilgy-stomatological-ryleigh.ngrok-free.dev';

/* Ensure uploaded images always get the full backend URL */
function resolveImg(url) {
  if (!url || url.trim() === '') return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return API_URL + url; // e.g. /uploads/abc.jpg → http://localhost:4000/uploads/abc.jpg
}

/* ── SVG ICONS ─────────────────────────────────── */
const SVG = {
  heart:       `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  heartFilled: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  eye:         `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff:      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  userSmall:   `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  chatSmall:   `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  user18:      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

/* ── STATE ──────────────────────────────────────── */
let cartItems = [];
let wishItems = new Set();
let products  = [];
let appliedDiscount = null; // { code, percentage }
let activeFilters = new Set(['all']); // multi-select filters
let currentUser   = null;
let addresses    = [];
let addrEditId   = null;
let selectedSavedAddrId    = null;
let checkoutSavedAddresses = [];
let chatHistory = [];
let chatBusy    = false;

/* ── TOAST ──────────────────────────────────────── */
function showToast(msg) {
  let t = document.getElementById('lumea-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'lumea-toast';
    t.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:var(--wine);color:white;padding:.75rem 1.6rem;border-radius:3rem;font-size:.82rem;font-weight:500;z-index:10000;box-shadow:0 8px 28px rgba(46,26,34,.25);transition:opacity .3s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.style.opacity = '0', 2600);
}

/* ── OVERLAY (cart / search / wishlist panels) ──── */
function showOverlay(el) {
  let ov = document.getElementById('lumea-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'lumea-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-start;justify-content:flex-end;padding-top:80px;padding-right:1.5rem;background:rgba(46,26,34,.45);backdrop-filter:blur(4px);animation:ovIn .2s ease';
    ov.addEventListener('click', e => { if (e.target === ov) closeOverlay(); });
    document.head.insertAdjacentHTML('beforeend', '<style>@keyframes ovIn{from{opacity:0}to{opacity:1}}@keyframes panelIn{from{transform:translateY(-12px);opacity:0}to{transform:translateY(0);opacity:1}}</style>');
    document.body.appendChild(ov);
  }
  ov.innerHTML = '';
  ov.appendChild(el);
  ov.style.display = 'flex';
}
function closeOverlay() {
  const ov = document.getElementById('lumea-overlay');
  if (ov) ov.style.display = 'none';
}
function makePanel(width) {
  const d = document.createElement('div');
  d.style.cssText = `background:var(--warm);border-radius:1.4rem;width:${width};max-height:80vh;overflow-y:auto;padding:1.6rem;box-shadow:0 20px 60px rgba(46,26,34,.2);animation:panelIn .25s ease`;
  return d;
}
function makePanelHeader(title) {
  const h = document.createElement('div');
  h.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem';
  const t = document.createElement('h3');
  t.style.cssText = "font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:400;color:var(--wine)";
  t.textContent = title;
  const x = document.createElement('button');
  x.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1.3rem;color:var(--muted)';
  x.textContent = '×';
  x.onclick = closeOverlay;
  h.appendChild(t);
  h.appendChild(x);
  return h;
}

/* ── CART ───────────────────────────────────────── */
function openCart() {
  const panel = makePanel('360px');
  panel.appendChild(makePanelHeader('Your Cart'));

  if (!cartItems.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:2rem;color:var(--muted);font-size:.9rem';
    empty.textContent = 'Your cart is empty';
    panel.appendChild(empty);
  } else {
    cartItems.forEach((it, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:.75rem 0;border-bottom:1px solid var(--blush)';
      row.innerHTML = `
        <div>
          <div style="font-size:.88rem;font-weight:500;color:var(--text)">${it.name}</div>
          <div style="font-size:.75rem;color:var(--muted);margin-top:.2rem">$${it.price} × ${it.qty}</div>
        </div>
        <div style="display:flex;align-items:center;gap:.6rem">
          <span style="font-size:.95rem;font-weight:500;color:var(--wine)">$${(it.price * it.qty).toFixed(2)}</span>
          <button data-idx="${i}" class="remove-cart-btn" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:1rem;line-height:1">×</button>
        </div>`;
      panel.appendChild(row);
    });

    const total = cartItems.reduce((s, it) => s + it.price * it.qty, 0);
    const totRow = document.createElement('div');
    totRow.style.cssText = 'display:flex;justify-content:space-between;padding:1rem 0;font-weight:500;color:var(--wine)';
    totRow.innerHTML = `<span>Total</span><span>$${total.toFixed(2)}</span>`;
    panel.appendChild(totRow);

    const btn = document.createElement('button');
    btn.style.cssText = 'width:100%;padding:.85rem;background:var(--wine);color:white;border:none;border-radius:3rem;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:.8rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;margin-top:.5rem';
    btn.textContent = 'Checkout';
    btn.onmouseover = () => btn.style.background = '#c55a78';
    btn.onmouseout  = () => btn.style.background = 'var(--wine)';
    btn.onclick = checkout;
    panel.appendChild(btn);
  }

  panel.addEventListener('click', e => {
    const btn = e.target.closest('.remove-cart-btn');
    if (btn) { removeCartItem(parseInt(btn.dataset.idx)); }
  });

  showOverlay(panel);
}
function removeCartItem(i) { cartItems.splice(i, 1); updateCartCount(); openCart(); }
function checkout() { closeOverlay(); refreshOrderSummary(); openPage('page-checkout'); loadCheckoutAddresses(); }
function updateCartCount() { document.getElementById('cart-count').textContent = cartItems.reduce((s, it) => s + it.qty, 0); }
function addToCartData(name, price) {
  const ex = cartItems.find(i => i.name === name);
  if (ex) ex.qty++;
  else cartItems.push({ name, price: parseFloat(price), qty: 1 });
  updateCartCount();
}

/* ── SEARCH ─────────────────────────────────────── */
function openSearch() {
  const panel = makePanel('420px');
  panel.style.maxHeight = 'none';
  panel.appendChild(makePanelHeader('Search'));

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.placeholder = 'Search products…';
  inp.style.cssText = 'width:100%;padding:.8rem 1rem;border:1.5px solid var(--rose);border-radius:3rem;font-family:\'DM Sans\',sans-serif;font-size:.88rem;color:var(--text);background:var(--warm);outline:none';
  inp.oninput = () => renderSearchResults(inp.value, results);
  panel.appendChild(inp);

  const results = document.createElement('div');
  results.style.marginTop = '1rem';
  panel.appendChild(results);

  showOverlay(panel);
  setTimeout(() => inp.focus(), 100);
}

function renderSearchResults(q, container) {
  container.innerHTML = '';
  if (!q.trim()) return;

  const loading = document.createElement('div');
  loading.style.cssText = 'color:var(--muted);font-size:.85rem;text-align:center;padding:.8rem';
  loading.textContent = 'Searching…';
  container.appendChild(loading);

  clearTimeout(renderSearchResults._debounce);
  renderSearchResults._debounce = setTimeout(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/products/?search=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      container.innerHTML = '';
      const found = data.data || [];
      if (!found.length) {
        const msg = document.createElement('div');
        msg.style.cssText = 'color:var(--muted);font-size:.85rem;text-align:center;padding:.8rem';
        msg.textContent = `No results for "${q}"`;
        container.appendChild(msg);
        return;
      }
      found.forEach(p => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:.9rem;padding:.6rem .5rem;border-radius:.7rem;cursor:pointer';
        row.onmouseover = () => row.style.background = 'var(--blush)';
        row.onmouseout  = () => row.style.background = 'transparent';
        row.onclick = () => { closeOverlay(); openProduct(p.id); };
        const thumb = p.image_url
          ? `<img src="${resolveImg(p.image_url)}" style="width:42px;height:42px;border-radius:.6rem;object-fit:cover;flex-shrink:0"/>`
          : `<div style="width:42px;height:42px;border-radius:.6rem;background:${p.color_primary||'#fce4ec'};display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">${p.emoji||'👶'}</div>`;
        row.innerHTML = `
          ${thumb}
          <div style="flex:1"><div style="font-size:.88rem;font-weight:500;color:var(--text)">${p.name}</div></div>
          <div style="font-size:.9rem;font-weight:500;color:var(--wine)">$${parseFloat(p.price).toFixed(2)}</div>`;
        container.appendChild(row);
      });
    } catch {
      container.innerHTML = '<div style="color:var(--muted);font-size:.85rem;text-align:center;padding:.8rem">Search failed. Try again.</div>';
    }
  }, 350);
}

/* ── WISHLIST ────────────────────────────────────── */
async function openWishlist() {
  const panel = makePanel('380px');
  panel.appendChild(makePanelHeader('Favourites'));

  const loading = document.createElement('div');
  loading.style.cssText = 'text-align:center;padding:2rem;color:var(--muted);font-size:.9rem';
  loading.textContent = 'Loading…';
  panel.appendChild(loading);
  showOverlay(panel);

  const token = localStorage.getItem('lumea_token');
  if (!token) {
    loading.textContent = 'Sign in to view your favourites.';
    return;
  }

  try {
    const res  = await fetch(`${API_URL}/api/wishlist/`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const wishList = data.data || [];
    loading.remove();

    if (!wishList.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:2rem;color:var(--muted);font-size:.9rem';
      empty.innerHTML = 'No favourites yet<br><small>Click the heart on any product.</small>';
      panel.appendChild(empty);
      return;
    }

    wishList.forEach(w => {
      const p = products.find(x => x.id === w.product_id) || w;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:.9rem;padding:.7rem 0;border-bottom:1px solid var(--blush)';
      const thumb = w.image_url
        ? `<img src="${resolveImg(w.image_url)}" style="width:46px;height:46px;border-radius:.7rem;object-fit:cover;flex-shrink:0"/>`
        : `<div style="width:46px;height:46px;border-radius:.7rem;background:${w.color_primary||'#fce4ec'};display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">${w.emoji||'👶'}</div>`;
      row.innerHTML = `${thumb}<div style="flex:1"><div style="font-size:.88rem;font-weight:500;color:var(--text)">${w.product_name||w.name||''}</div></div>`;
      const addBtn = document.createElement('button');
      addBtn.style.cssText = 'padding:.3rem .8rem;background:var(--wine);color:white;border:none;border-radius:3rem;cursor:pointer;font-size:.68rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase';
      addBtn.textContent = 'Add';
      addBtn.onclick = () => { openProduct(w.product_id); closeOverlay(); };
      row.appendChild(addBtn);
      panel.appendChild(row);
    });
  } catch {
    loading.textContent = 'Could not load favourites.';
  }
}

/* ── PRODUCTS ────────────────────────────────────── */
const PRODUCTS_PER_PAGE = 8;
let currentOffset  = 0;
let totalProducts  = 0;
let activePage = 'clothes';

const SIZE_ALIASES = { '2Y':'18-24M','18-24M':'2Y','3Y':'24-36M','24-36M':'3Y' };

async function loadProducts(filter, append = false) {
  if (filter && filter.startsWith('page:')) {
    activePage = filter.replace('page:', '');
    activeFilters = new Set(['all']);
    document.querySelectorAll('.f-btn').forEach(b => b.classList.toggle('active', b.dataset.f === 'all'));
    const subs = document.getElementById('filter-subs');
    if (subs) subs.style.display = activePage === 'clothes' ? 'flex' : 'none';
    filter = null;
  } else if (filter !== null && filter !== undefined) {
    if (filter === 'all') {
      activeFilters = new Set(['all']);
    } else {
      activeFilters.delete('all');
      if (activeFilters.has(filter)) {
        activeFilters.delete(filter);
        if (activeFilters.size === 0) activeFilters.add('all');
      } else {
        activeFilters.add(filter);
      }
    }
  }

  document.querySelectorAll('.f-btn').forEach(btn => {
    btn.classList.toggle('active', activeFilters.has(btn.dataset.f));
  });

  const grid    = document.getElementById('prod-grid');
  const loadBtn = document.getElementById('load-btn');

  if (!append) {
    currentOffset = 0;
    products      = [];
    grid.innerHTML = '';
    const loading = document.createElement('div');
    loading.id = 'prod-loading';
    loading.style.cssText = 'grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted);font-size:.9rem';
    loading.innerHTML = '<div class="spin-ring" style="width:36px;height:36px;border:3px solid var(--rose);border-top-color:var(--wine);border-radius:50%;margin:0 auto 1rem;animation:spin .8s linear infinite"></div>Loading products...';
    grid.appendChild(loading);
  } else {
    loadBtn.textContent = 'Loading…';
    loadBtn.disabled    = true;
  }

  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  try {
    let url = `${API_URL}/api/products/?limit=${PRODUCTS_PER_PAGE}&offset=${currentOffset}`;
    if (activePage === 'blankets' || activePage === 'accessories') {
      url += `&product_type=${activePage}`;
    } else {
      let filterList = [...activeFilters].filter(f => f !== 'all');
      if (filterList.includes('girl') && !filterList.includes('unisex')) filterList.push('unisex');
      if (filterList.includes('boy')  && !filterList.includes('unisex')) filterList.push('unisex');
      if (filterList.length === 1) url += `&category=${filterList[0]}`;
      else if (filterList.length > 1) url += '&' + filterList.map(f => `category=${f}`).join('&');
    }
    const res  = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.data) throw new Error();

    const spinner = document.getElementById('prod-loading');
    if (spinner) spinner.remove();

    totalProducts  = data.pagination?.total ?? data.data.length;
    const newBatch = data.data;
    currentOffset += newBatch.length;

    if (append) {
      products = [...products, ...newBatch];
      renderProds(newBatch);
    } else {
      products = newBatch;
      renderProds(null);
    }
    updateLoadMoreBtn();

  } catch {
    const spinner = document.getElementById('prod-loading');
    if (spinner) spinner.remove();
    if (!append) {
      grid.innerHTML = '';
      const err = document.createElement('div');
      err.style.cssText = 'grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)';
      err.innerHTML = `<p style="font-size:.9rem">Could not load products.</p><p style="font-size:.8rem;margin-top:.5rem">Make sure your backend server is running.</p>`;
      const retryBtn = document.createElement('button');
      retryBtn.style.cssText = 'margin-top:1rem;padding:.6rem 1.4rem;background:var(--wine);color:white;border:none;border-radius:3rem;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:.78rem';
      retryBtn.textContent = 'Retry';
      retryBtn.onclick = () => loadProducts(null);
      err.appendChild(retryBtn);
      grid.appendChild(err);
    }
    updateLoadMoreBtn();
  }
}

function updateLoadMoreBtn() {
  const btn = document.getElementById('load-btn');
  if (!btn) return;
  if (currentOffset >= totalProducts) {
    btn.textContent = 'All items shown';
    btn.disabled    = true;
    btn.style.opacity = '.5';
    btn.style.cursor  = 'not-allowed';
  } else {
    btn.textContent   = `Load More (${totalProducts - currentOffset} remaining)`;
    btn.disabled      = false;
    btn.style.opacity = '1';
    btn.style.cursor  = 'pointer';
  }
}

function renderProds(batch = null) {
  const grid = document.getElementById('prod-grid');

  // batch = null means fresh render (clear grid, render all products)
  // batch = array means append mode (only render these new items)
  const toRender = batch ?? products;
  const startIdx = batch ? (products.length - batch.length) : 0;

  if (!batch) grid.innerHTML = '';

  if (!products.length) {
    const msg = document.createElement('div');
    msg.style.cssText = 'grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted);font-size:.9rem';
    msg.textContent = 'No products found in this category yet.';
    grid.appendChild(msg);
    return;
  }

  toRender.forEach((p, idx) => {
    const i = startIdx + idx;
    const isWished  = wishItems.has(String(p.id));
    const c1        = p.color_primary  || '#fce4ec';
    const c2        = p.color_secondary|| '#f8bbd0';
    const emoji     = p.emoji          || '👶';
    const catLabel  = (p.category_slug || p.category_name || '').toUpperCase();
    const sizeRange = ''; // size shown in detail page only
    const hasImage  = p.image_url && p.image_url.trim() !== '';

    const isOutOfStock = !p.stock || p.stock <= 0;

    const card = document.createElement('div');
    card.className = `p-card${isOutOfStock ? ' p-card-oos' : ''}`;
    card.onclick = () => openProduct(p.id);

    // Image box
    const imgBox = document.createElement('div');
    imgBox.className = 'p-img-box';

    if (hasImage) {
      const img = document.createElement('img');
      img.src     = resolveImg(p.image_url);
      img.alt     = p.name;
      img.className = 'p-img';
      img.loading = 'lazy';
      img.onerror = () => { img.style.display = 'none'; svg.style.display = 'block'; };
      imgBox.appendChild(img);
      const svg = buildEmojiSVG(c1, c2, emoji, catLabel, `gf${i}`);
      svg.style.display = 'none';
      imgBox.appendChild(svg);
    } else {
      imgBox.appendChild(buildEmojiSVG(c1, c2, emoji, catLabel, `g${i}`));
    }

    // OOS strip
    if (isOutOfStock) {
      const oos = document.createElement('div');
      oos.className = 'p-oos-strip-row';
      oos.innerHTML = `<span>Out of Stock</span>`;
      imgBox.appendChild(oos);
    }

    // Badge (New / Sale / Bestseller)
    if (p.badge) {
      const badge = document.createElement('div');
      badge.className = `p-badge ${p.badge}`;
      const labels = { new: 'New', sale: 'Sale', bestseller: 'Best Seller' };
      badge.textContent = labels[p.badge] || p.badge;
      imgBox.appendChild(badge);
    }

    // Heart — always top-right of card, outside imgBox to avoid overflow:hidden
    const wishBtn = document.createElement('button');
    wishBtn.className = `p-wish-float${isWished ? ' wished' : ''}`;
    wishBtn.id = `wish-${p.id}`;
    wishBtn.innerHTML = isWished ? SVG.heartFilled : SVG.heart;
    wishBtn.onclick = e => { e.stopPropagation(); toggleWish(p.id, p.name); };
    card.appendChild(wishBtn);

    // Actions overlay — qty + add to cart only
    const acts = document.createElement('div');
    acts.className = 'p-acts';
    if (isOutOfStock) acts.style.display = 'none';

    let cardQty = 1;
    const qtyWrap = document.createElement('div');
    qtyWrap.className = 'p-card-qty';
    qtyWrap.innerHTML = `<button class="p-qty-btn p-qty-minus">−</button><span class="p-qty-num">1</span><button class="p-qty-btn p-qty-plus">+</button>`;

    const qtyMinus = qtyWrap.querySelector('.p-qty-minus');
    const qtyPlus  = qtyWrap.querySelector('.p-qty-plus');
    const qtyNum   = qtyWrap.querySelector('.p-qty-num');

    qtyMinus.onclick = e => { e.stopPropagation(); if (cardQty > 1) { cardQty--; qtyNum.textContent = cardQty; } };
    qtyPlus.onclick  = e => { e.stopPropagation(); if (cardQty < 10) { cardQty++; qtyNum.textContent = cardQty; } };

    const addBtn = document.createElement('button');
    addBtn.className = 'p-add';
    addBtn.textContent = 'Add to Cart';
    addBtn.onclick = e => { e.stopPropagation(); openProduct(p.id); };

    acts.appendChild(qtyWrap);
    acts.appendChild(addBtn);
    imgBox.appendChild(acts);

    // Sizes available — selectable
    let selectedSize  = null;
    let selectedColor = null;
    let sizeStockMap  = {};
    let colorOptions  = [];

    try {
      const sr = JSON.parse(p.size_range);
      if (sr && typeof sr === 'object' && !Array.isArray(sr)) sizeStockMap = sr;
    } catch {}

    try {
      if (p.available_colors) {
        const parsed = JSON.parse(p.available_colors);
        if (Array.isArray(parsed)) colorOptions = parsed;
      }
    } catch {}

    const availableSizes = Object.entries(sizeStockMap).filter(([,qty]) => Number(qty) > 0).map(([s]) => s);

    let sizesHtml = '';
    if (availableSizes.length) {
      const shown = availableSizes.slice(0, 4);
      const extra = availableSizes.length - shown.length;
      sizesHtml = `<div class="p-card-sizes" id="pcs-${p.id}">${shown.map(s => `<span class="p-card-size" data-size="${s}">${s}</span>`).join('')}${extra > 0 ? `<span class="p-card-size p-card-size-more">+${extra}</span>` : ''}</div>`;
    }

    let colorsHtml = '';
    if (colorOptions.length) {
      const shown = colorOptions.slice(0, 5);
      const extra = colorOptions.length - shown.length;
      colorsHtml = `<div class="p-card-colors" id="pcc-${p.id}">${shown.map(c => `<span class="p-card-swatch" data-color="${c.name||c}" style="background:${c.hex||c.color||c}" title="${c.name||''}"></span>`).join('')}${extra > 0 ? `<span class="p-card-swatch-more">+${extra}</span>` : ''}</div>`;
    }

    // Info
    const info = document.createElement('div');
    info.className = 'p-info';
    info.innerHTML = `
      <div class="p-name">${p.name}</div>
      ${sizesHtml}
      <div class="p-row">
        <div>
          <span class="p-price">$${parseFloat(p.price).toFixed(2)}</span>
          ${p.compare_price ? `<span class="p-old">$${parseFloat(p.compare_price).toFixed(2)}</span>` : ''}
        </div>
        ${colorsHtml}
      </div>`;

    // Wire up size selection
    info.querySelectorAll('.p-card-size[data-size]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const size = btn.dataset.size;
        if (selectedSize === size) {
          selectedSize = null;
          btn.classList.remove('active');
        } else {
          selectedSize = size;
          info.querySelectorAll('.p-card-size').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });

    // Wire up color selection
    info.querySelectorAll('.p-card-swatch[data-color]').forEach(sw => {
      sw.addEventListener('click', e => {
        e.stopPropagation();
        sw.blur();
        const color = sw.dataset.color;
        if (selectedColor === color) {
          selectedColor = null;
          sw.classList.remove('active');
        } else {
          selectedColor = color;
          info.querySelectorAll('.p-card-swatch').forEach(s => { s.classList.remove('active'); s.blur(); });
          sw.classList.add('active');
        }
      });
    });

    // Override add button to use selected size/color
    addBtn.onclick = e => {
      e.stopPropagation();
      if (p.stock <= 0) { showToast('Out of stock'); return; }
      if (availableSizes.length > 0 && !selectedSize) { showToast('Please select a size 🌸'); return; }
      if (colorOptions.length > 0 && !selectedColor)  { showToast('Please select a color 🌸'); return; }
      const sizePart  = selectedSize  ? ` (${selectedSize})` : '';
      const colorPart = selectedColor ? ` — ${selectedColor}` : '';
      const label = `${p.name}${sizePart}${colorPart}`;
      for (let i = 0; i < cardQty; i++) addToCartData(label, p.price);
      showToast(`${label} ×${cardQty} added to cart! 🌸`);
      // Flash the button green briefly
      addBtn.style.background = '#27ae60';
      addBtn.textContent = 'Added!';
      setTimeout(() => { addBtn.style.background = ''; addBtn.textContent = 'Add to Cart'; }, 1500);
    };

    card.appendChild(imgBox);
    card.appendChild(info);
    grid.appendChild(card);
  });
}

function buildEmojiSVG(c1, c2, emoji, catLabel, gradId) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'p-img');
  svg.setAttribute('viewBox', '0 0 280 340');
  svg.innerHTML = `
    <defs><linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="280" height="340" fill="url(#${gradId})"/>
    <text x="140" y="158" text-anchor="middle" font-size="76">${emoji}</text>
    <text x="140" y="212" text-anchor="middle" font-size="13" fill="rgba(139,51,82,.55)" font-family="DM Sans,sans-serif" font-weight="500" letter-spacing="1">${catLabel}</text>`;
  return svg;
}

async function toggleWish(id, name) {
  const token = localStorage.getItem('lumea_token');
  if (!token) { showToast('Please sign in to save favourites 🌸'); openPage('page-signin'); return; }

  const btn   = document.getElementById(`wish-${id}`);
  const pdBtn = document.getElementById('pd-wish-btn');

  if (wishItems.has(id)) {
    // Remove from wishlist
    try {
      const res = await fetch(`${API_URL}/api/wishlist/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        wishItems.delete(id);
        if (btn)   { btn.innerHTML = SVG.heart; btn.classList.remove('wished'); }
        if (pdBtn) { pdBtn.innerHTML = SVG.heart; pdBtn.classList.remove('wished'); }
      } else { showToast('Could not remove from wishlist'); }
    } catch { showToast('Connection error'); }
  } else {
    // Add to wishlist
    try {
      const res = await fetch(`${API_URL}/api/wishlist/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ product_id: id })
      });
      if (res.ok || res.status === 409) {
        wishItems.add(id);
        if (btn)   { btn.innerHTML = SVG.heartFilled; btn.classList.add('wished'); }
        if (pdBtn) { pdBtn.innerHTML = SVG.heartFilled; pdBtn.classList.add('wished'); }
        if (res.ok) showToast(`${name} saved to favourites! 🌸`);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.detail || 'Could not save to wishlist');
      }
    } catch { showToast('Connection error'); }
  }
}

/* ── SCROLL REVEAL ──────────────────────────────── */
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('on'); });
}, { threshold: 0.1 });
document.querySelectorAll('.rv').forEach(el => obs.observe(el));

/* ── MAMA AI ─────────────────────────────────────── */
const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtMsg  = t => '<p>' + escHtml(t).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';

function appendChatMsg(role, text) {
  const c   = document.getElementById('chat-msgs');
  const div = document.createElement('div');
  div.className = 'msg' + (role === 'user' ? ' user' : '');

  const av  = document.createElement('div');
  av.className = 'msg-av';
  av.innerHTML = role === 'user' ? SVG.userSmall : SVG.chatSmall;

  const body = document.createElement('div');
  const bub  = document.createElement('div');
  bub.className = 'bub';
  bub.innerHTML = role === 'user' ? escHtml(text) : fmtMsg(text);
  const ts   = document.createElement('div');
  ts.className = 'msg-t';
  ts.textContent = nowTime();

  body.appendChild(bub);
  body.appendChild(ts);
  div.appendChild(av);
  div.appendChild(body);
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}

function showTyping() {
  const c   = document.getElementById('chat-msgs');
  const div = document.createElement('div');
  div.className = 'msg';
  div.id = 'typing-indicator';
  div.innerHTML = `<div class="msg-av">${SVG.chatSmall}</div><div class="typing-wrap"><div class="typing-bub"><div class="t-dot"></div><div class="t-dot"></div><div class="t-dot"></div></div></div>`;
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}
function hideTyping() { const t = document.getElementById('typing-indicator'); if (t) t.remove(); }

async function sendMsg() {
  const inp = document.getElementById('chat-inp');
  const txt = inp.value.trim();
  if (!txt || chatBusy) return;
  inp.value = '';
  await doSend(txt);
}
function quickSend(txt) {
  if (chatBusy) return;
  document.getElementById('chat-inp').value = txt;
  sendMsg();
  document.getElementById('mama-ai').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function doSend(msg) {
  // If not signed in, show friendly prompt instead of 401 error
  const token = localStorage.getItem('lumea_token');
  if (!token) {
    appendChatMsg('ai', '💕 Please sign in to chat with Mama AI! Your conversations are private and personalized to you.');
    // Add a sign-in button inside the chat
    const c   = document.getElementById('chat-msgs');
    const btn = document.createElement('button');
    btn.style.cssText = 'margin:.5rem auto;display:block;padding:.5rem 1.4rem;background:var(--wine);color:white;border:none;border-radius:3rem;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:.78rem;font-weight:500';
    btn.textContent = 'Sign In →';
    btn.onclick = () => openPage('page-signin');
    c.appendChild(btn);
    c.scrollTop = c.scrollHeight;
    return;
  }
  chatBusy = true;
  document.getElementById('send-btn').disabled = true;
  appendChatMsg('user', msg);
  chatHistory.push({ role: 'user', content: msg });
  showTyping();
  try {
    const res = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ messages: chatHistory })
    });
    hideTyping();
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      appendChatMsg('ai', `I ran into a small issue (${res.status}). Please try again!`);
    } else {
      const data  = await res.json();
      const reply = data.reply || 'Please try again!';
      appendChatMsg('ai', reply);
      chatHistory.push({ role: 'assistant', content: reply });
    }
  } catch {
    hideTyping();
    appendChatMsg('ai', 'Connection issue — please check your internet and try again.');
  }
  chatBusy = false;
  document.getElementById('send-btn').disabled = false;
}

/* ── PAGE MODALS ─────────────────────────────────── */
/* ── Global fetch interceptor — timeout + auto-logout on 401 ── */
const _origFetch = window.fetch;
window.fetch = async (...args) => {
  // 10-second timeout — important for slow Lebanese internet
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 10000);

  // Inject abort signal unless caller already provided one
  let [resource, options = {}] = args;
  if (!options.signal) options = { ...options, signal: controller.signal };

  // Add ngrok bypass header (harmless in production, required for ngrok testing)
  options.headers = { 'ngrok-skip-browser-warning': 'true', ...options.headers };

  let res;
  try {
    res = await _origFetch(resource, options);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      showToast('Request timed out. Please check your connection and try again.');
      throw err;
    }
    throw err;
  }
  clearTimeout(timeout);

  if (res.status === 401) {
    const token = localStorage.getItem('lumea_token');
    if (token) {
      _forceSignOut('Your session has expired. Please sign in again.');
    }
  }
  return res;
};

function _forceSignOut(msg) {
  ['lumea_token','lumea_refresh_token','lumea_user'].forEach(k => localStorage.removeItem(k));
  currentUser = null;
  closeAllPages();
  if (msg) showToast(msg);
  setTimeout(() => openPage('page-signin'), 800);
}

/* Validate token with server on every page load — catches deleted accounts instantly */
async function validateSession() {
  const token = localStorage.getItem('lumea_token');
  if (!token) return;
  try {
    const res = await _origFetch(`${API_URL}/api/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 404) {
      _forceSignOut('Your account no longer exists. Please create a new one.');
    }
  } catch {
    // Network error — don't sign out, just let them continue
  }
}

/* ── FIX 2: History-aware page modals (browser back/forward) ── */
const ALL_PAGES = ['page-checkout','page-signin','page-register','page-account','page-product'];

function openPage(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
  history.pushState({ page: id }, '', '');
}

function closePage(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  const anyOpen = ALL_PAGES.some(p => document.getElementById(p)?.classList.contains('open'));
  if (!anyOpen) document.body.style.overflow = '';
}

function closeAllPages() {
  ALL_PAGES.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
  document.body.style.overflow = '';
}

// Back AND forward buttons — check the state to know which direction
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.page) {
    // Going FORWARD — re-open that page
    const el = document.getElementById(e.state.page);
    if (el) {
      el.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  } else {
    // Going BACK — close the top-most open page
    const open = ALL_PAGES.filter(id => document.getElementById(id)?.classList.contains('open'));
    if (open.length) closePage(open[open.length - 1]);
  }
});

function switchAuth(from, to) { closePage(from); setTimeout(() => openPage(to), 120); }

/* ── AUTH ────────────────────────────────────────── */
function updateAccountUI() {
  if (!currentUser) return;
  const name = `${currentUser.first_name} ${currentUser.last_name}`;
  ['acc-display-name', 'prof-name-display'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = name;
  });
  ['acc-display-email', 'prof-email-display'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = currentUser.email;
  });
  const nb = document.getElementById('nav-account-btn');
  if (nb) nb.innerHTML = SVG.user18;
  updateContactSection();
}

async function initAuth() {
  const saved = localStorage.getItem('lumea_user');
  const token = localStorage.getItem('lumea_token');
  if (saved && token) {
    currentUser = JSON.parse(saved);
    updateAccountUI();
    await loadWishlistFromDB();
  }
}

async function loadWishlistFromDB() {
  const token = localStorage.getItem('lumea_token');
  if (!token) return;
  try {
    const res  = await fetch(`${API_URL}/api/wishlist/`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    wishItems  = new Set((data.data || []).map(w => String(w.product_id)));
    // Refresh product card heart icons
    document.querySelectorAll('[id^="wish-"]').forEach(btn => {
      const pid = String(btn.id.replace('wish-', ''));
      if (wishItems.has(pid)) { btn.innerHTML = SVG.heartFilled; btn.classList.add('wished'); }
      else                    { btn.innerHTML = SVG.heart;       btn.classList.remove('wished'); }
    });
  } catch {}
}
/* Allowed real email providers — extend this list as needed */
const ALLOWED_DOMAINS = new Set([
  'gmail.com','googlemail.com',
  'outlook.com','hotmail.com','hotmail.fr','hotmail.co.uk','live.com','live.fr','live.co.uk','msn.com',
  'yahoo.com','yahoo.fr','yahoo.co.uk','yahoo.es','yahoo.de','yahoo.it','ymail.com','rocketmail.com',
  'icloud.com','me.com','mac.com',
  'proton.me','protonmail.com','protonmail.ch',
  'aol.com','aim.com',
  'zoho.com',
  'mail.com','email.com','gmx.com','gmx.net','gmx.de',
  'yandex.com','yandex.ru',
  'tutanota.com','tutamail.com',
  'fastmail.com','fastmail.fm',
  'pm.me',
  'hey.com',
  'duck.com',
  'virginmedia.com','btinternet.com','sky.com','talktalk.net',
  'orange.fr','sfr.fr','free.fr','laposte.net','wanadoo.fr',
  'libero.it','virgilio.it','tim.it',
  't-online.de','web.de','freenet.de',
  'lba.lb','cyberia.net.lb','terra.net.lb',
]);

function isValidEmail(e) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return false;
  const domain = e.split('@')[1].toLowerCase();
  return ALLOWED_DOMAINS.has(domain);
}

function emailDomainError(e) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'Please enter a valid email address.';
  const domain = e.split('@')[1].toLowerCase();
  if (!ALLOWED_DOMAINS.has(domain)) return `"@${domain}" is not supported. Please use Gmail, Outlook, Yahoo, iCloud, or another real email provider.`;
  return null;
}

async function doSignIn() {
  const email = document.getElementById('si-email').value.trim();
  const pass  = document.getElementById('si-pass').value;
  if (!email || !pass) { showToast('Please fill in all fields'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showToast('Please enter a valid email address.'); return; }
  try {
    const res  = await fetch(`${API_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
    const data = await res.json().catch(() => null);
    if (!res.ok)    { showToast(data?.detail || 'Login failed'); return; }
    if (!data?.data){ showToast('Invalid server response'); return; }
    localStorage.setItem('lumea_token',         data.data.access_token);
    localStorage.setItem('lumea_refresh_token', data.data.refresh_token);
    localStorage.setItem('lumea_user',          JSON.stringify(data.data.user));
    currentUser = data.data.user;
    updateAccountUI();
    closePage('page-signin');
    showToast(`Welcome back, ${currentUser.first_name}! 🌸`);
  } catch { showToast('Cannot connect to server'); }
}

async function sendVerificationCode() {
  const fname = document.getElementById('reg-fname').value.trim();
  const lname = document.getElementById('reg-lname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const terms = document.getElementById('reg-terms').checked;

  if (!fname || !lname || !email || !pass) { showToast('Please fill in all fields'); return; }
  const emailErr = emailDomainError(email);
  if (emailErr) { showToast(emailErr); return; }
  if (pass.length < 8) { showToast('Password must be at least 8 characters'); return; }
  if (!terms) { showToast('Please accept the terms'); return; }

  const btn = document.querySelector('#reg-step-1 button');
  btn.textContent = 'Sending…'; btn.disabled = true;

  try {
    const res  = await fetch(`${API_URL}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.detail || 'Could not send code. Try again.'); btn.textContent = 'Send Verification Code →'; btn.disabled = false; return; }

    // Show step 2
    document.getElementById('reg-email-display').textContent = email;
    document.getElementById('reg-step-1').style.display = 'none';
    document.getElementById('reg-step-2').style.display = 'block';
    document.getElementById('reg-code').focus();
    showToast('Code sent! Check your inbox 📧');
  } catch {
    showToast('Connection error. Try again.');
    btn.textContent = 'Send Verification Code →'; btn.disabled = false;
  }
}

async function resendVerificationCode() {
  const email = document.getElementById('reg-email').value.trim();
  try {
    await fetch(`${API_URL}/api/auth/send-code`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    showToast('New code sent! Check your inbox 📧');
  } catch { showToast('Connection error. Try again.'); }
}

async function doRegister() {
  const fname      = document.getElementById('reg-fname').value.trim();
  const lname      = document.getElementById('reg-lname').value.trim();
  const email      = document.getElementById('reg-email').value.trim();
  const pass       = document.getElementById('reg-pass').value;
  const code       = document.getElementById('reg-code').value.trim();
  const newsletter = document.getElementById('reg-newsletter').checked;

  if (!code || code.length !== 6) { showToast('Please enter the 6-digit code'); return; }

  try {
    const res  = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: fname, last_name: lname, email, password: pass, code, newsletter })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { showToast(data?.detail || 'Registration failed'); return; }
    if (!data?.data) { showToast('Invalid server response'); return; }
    localStorage.setItem('lumea_token',         data.data.access_token);
    localStorage.setItem('lumea_refresh_token', data.data.refresh_token);
    localStorage.setItem('lumea_user',          JSON.stringify(data.data.user));
    currentUser = data.data.user;
    updateAccountUI();
    closePage('page-register');
    // Reset register form
    document.getElementById('reg-step-1').style.display = 'block';
    document.getElementById('reg-step-2').style.display = 'none';
    document.getElementById('reg-code').value = '';
    showToast(`Welcome to Luméa, ${fname}! 🌸`);
  } catch { showToast('Cannot connect to server'); }
}

async function doSignOut() {
  try {
    const rt = localStorage.getItem('lumea_refresh_token');
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) });
  } catch {}
  ['lumea_token', 'lumea_refresh_token', 'lumea_user'].forEach(k => localStorage.removeItem(k));
  currentUser = null;
  closePage('page-account');
  showToast('Signed out. See you soon!');
  location.reload();
}

/* ── ACCOUNT TABS ────────────────────────────────── */
function accTab(btn, tabId) {
  document.querySelectorAll('.acc-menu-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#page-account [id^="tab-"]').forEach(t => t.style.display = 'none');
  document.getElementById(tabId).style.display = tabId === 'tab-profile' ? 'flex' : 'block';
  if (tabId === 'tab-wishlist')  renderAccWishlist();
  if (tabId === 'tab-addresses') { document.getElementById('addr-list-view').style.display = 'block'; document.getElementById('addr-form-view').style.display = 'none'; renderAddrCards(); }
  if (tabId === 'tab-orders')    loadOrders();
}

function renderAccWishlist() {
  const el     = document.getElementById('acc-wishlist-content');
  const wished = products.filter(p => wishItems.has(p.id));
  el.innerHTML = '';
  if (!wished.length) {
    el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.88rem">No saved favourites yet</div>';
    return;
  }
  wished.forEach(p => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:1rem;padding:.8rem;background:var(--blush);border-radius:.9rem';
    row.innerHTML = `
      <div style="width:48px;height:48px;border-radius:.7rem;background:${p.color_primary || '#fce4ec'};display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">${p.emoji || '👶'}</div>
      <div style="flex:1">
        <div style="font-size:.88rem;font-weight:500;color:var(--text)">${p.name}</div>

      </div>
      <span style="font-size:.95rem;font-weight:500;color:var(--wine);margin-right:.5rem">$${parseFloat(p.price).toFixed(2)}</span>`;
    const addBtn = document.createElement('button');
    addBtn.style.cssText = 'padding:.4rem 1rem;background:var(--wine);color:white;border:none;border-radius:3rem;cursor:pointer;font-size:.72rem;font-weight:500;font-family:\'DM Sans\',sans-serif';
    addBtn.textContent = 'Add';
    addBtn.onclick = () => { addToCartData(p.name, p.price); showToast('Added to cart!'); };
    row.appendChild(addBtn);
    el.appendChild(row);
  });
}

/* ── CHECKOUT ────────────────────────────────────── */
function refreshOrderSummary() {
  const el = document.getElementById('os-items');
  const st = document.getElementById('os-subtotal');
  const tt = document.getElementById('os-total');
  el.innerHTML = '';

  if (!cartItems.length) {
    const msg = document.createElement('div');
    msg.style.cssText = 'text-align:center;padding:1.5rem;color:var(--muted);font-size:.85rem';
    msg.textContent = 'Your cart is empty';
    el.appendChild(msg);
    if (st) st.textContent = '$0.00';
    if (tt) tt.textContent = '$4.00';
    return;
  }

  cartItems.forEach(it => {
    const baseName = it.name.replace(/\s*\(.*$/, '').replace(/\s*—.*$/, '').trim();
    const p     = products.find(x => x.name === baseName || x.name === it.name);
    const item  = document.createElement('div');
    item.className = 'os-item';

    const ico = document.createElement('div');
    ico.className = 'os-ico';

    // Try image_urls first, then image_url
    let imgSrc = '';
    try { if (p?.image_urls) { const arr = JSON.parse(p.image_urls); if (arr.length) imgSrc = resolveImg(arr[0]); } } catch {}
    if (!imgSrc && p?.image_url) imgSrc = resolveImg(p.image_url);

    if (imgSrc) {
      const img = document.createElement('img');
      img.src   = imgSrc;
      img.alt   = baseName;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:.7rem';
      ico.appendChild(img);
    } else {
      ico.textContent = p?.emoji || '🌸';
    }

    item.innerHTML = `<div><div class="os-name">${it.name}</div><div class="os-size">× ${it.qty}</div></div><div class="os-price">$${(it.price * it.qty).toFixed(2)}</div>`;
    item.insertBefore(ico, item.firstChild);
    el.appendChild(item);
  });

  const sub         = cartItems.reduce((s, it) => s + it.price * it.qty, 0);
  const discountAmt = appliedDiscount ? sub * (appliedDiscount.percentage / 100) : 0;
  const total       = sub - discountAmt + 4;

  if (st) st.textContent = `$${sub.toFixed(2)}`;
  if (tt) tt.textContent = `$${total.toFixed(2)}`;

  const discountRow = document.getElementById('os-discount-row');
  const discountVal = document.getElementById('os-discount-val');
  const discountLbl = document.getElementById('os-discount-label');
  if (discountRow) {
    if (appliedDiscount) {
      discountRow.style.display = '';
      if (discountLbl) discountLbl.textContent = `Discount (${appliedDiscount.code} −${appliedDiscount.percentage}%)`;
      if (discountVal) discountVal.textContent = `-$${discountAmt.toFixed(2)}`;
    } else {
      discountRow.style.display = 'none';
    }
  }
}

async function loadCheckoutAddresses() {
  selectedSavedAddrId = null;
  checkoutSavedAddresses = [];
  const oS  = document.getElementById('co-option-saved');
  const oN  = document.getElementById('co-option-new');
  const div = document.getElementById('co-divider');
  const nl  = document.getElementById('co-new-addr-label');
  const token = localStorage.getItem('lumea_token');

  if (!token || !currentUser) {
    oS.style.display = 'none'; div.style.display = 'none'; nl.style.display = 'none'; oN.style.display = 'block';
    return;
  }
  try {
    const res  = await fetch(`${API_URL}/api/addresses/`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    checkoutSavedAddresses = data.data || [];
  } catch { checkoutSavedAddresses = []; }

  if (!checkoutSavedAddresses.length) {
    oS.style.display = 'none'; div.style.display = 'none'; nl.style.display = 'none'; oN.style.display = 'block';
    return;
  }
  oS.style.display = 'block'; div.style.display = 'block'; nl.style.display = 'flex'; oN.style.display = 'block';
  const def = checkoutSavedAddresses.find(a => a.is_default) || checkoutSavedAddresses[0];
  selectedSavedAddrId = def.id;
  renderCheckoutAddrCards();
}

function renderCheckoutAddrCards() {
  const container = document.getElementById('co-addr-cards');
  container.innerHTML = '';
  checkoutSavedAddresses.forEach(a => {
    const sel  = a.id === selectedSavedAddrId;
    const card = document.createElement('div');
    card.style.cssText = `padding:1rem;border:2px solid ${sel ? 'var(--wine)' : 'var(--rose)'};border-radius:.9rem;cursor:pointer;background:${sel ? 'rgba(139,51,82,.04)' : 'white'};transition:all .2s`;
    card.onclick = () => selectSavedAddr(a.id);
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.4rem">
        <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${sel ? 'var(--wine)' : 'var(--rose)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${sel ? 'var(--wine)' : 'white'}">
          ${sel ? '<div style="width:8px;height:8px;border-radius:50%;background:white"></div>' : ''}
        </div>
        <span style="font-size:.9rem;font-weight:600;color:var(--text)">${a.first_name} ${a.last_name}</span>
        ${a.is_default ? '<span style="font-size:.6rem;background:var(--blush);color:var(--wine);padding:.15rem .55rem;border-radius:3rem;font-weight:500">Default</span>' : ''}
      </div>
      <div style="font-size:.82rem;color:var(--muted);padding-left:1.6rem;line-height:1.6">
        ${a.street}<br>
        ${a.building ? `🏢 ${a.building}` : ''}${a.building && a.floor ? ' · ' : ''}${a.floor ? `Floor: ${a.floor}` : ''}${(a.building || a.floor) ? '<br>' : ''}
        ${a.apartment ? a.apartment + '<br>' : ''}
        ${a.city}${a.state ? ', ' + a.state : ''}<br>
        ${a.country}
      </div>`;
    container.appendChild(card);
  });
}

function selectSavedAddr(id) {
  selectedSavedAddrId = id;
  renderCheckoutAddrCards();
  ['co-fname', 'co-lname', 'co-email', 'co-phone', 'co-street', 'co-city'].forEach(f => {
    const el = document.getElementById(f); if (el) el.value = '';
  });
}

function goToPayment() {
  const fname  = document.getElementById('co-fname').value.trim();
  const lname  = document.getElementById('co-lname').value.trim();
  const email  = document.getElementById('co-email').value.trim();
  const phone  = document.getElementById('co-phone').value.trim();
  const street = document.getElementById('co-street').value.trim();
  const city   = document.getElementById('co-city').value.trim();
  const newFormFilled = fname || lname || email || street || city;
  if (newFormFilled) {
    if (!fname || !lname || !email || !phone || !street || !city) { showToast('Please fill in all required fields'); return; }
    selectedSavedAddrId = null;
  } else if (!selectedSavedAddrId) { showToast('Please select an address or fill in a new one'); return; }
  placeOrder();
}

async function placeOrder() {
  const confirmBtn = document.querySelector('#panel-shipping .pm-btn');
  if (confirmBtn) { confirmBtn.textContent = 'Placing order…'; confirmBtn.disabled = true; }

  let ship = {};
  if (selectedSavedAddrId) {
    const a = checkoutSavedAddresses.find(x => x.id === selectedSavedAddrId);
    ship = { first_name: a.first_name, last_name: a.last_name, phone: a.phone || '', street: a.street, building: a.building || '', floor: a.floor || '', apartment: a.apartment || '', city: a.city, state: a.state || '', postal_code: '', country: 'Lebanon' };
  } else {
    ship = {
      first_name: document.getElementById('co-fname').value.trim(),
      last_name:  document.getElementById('co-lname').value.trim(),
      phone:      document.getElementById('co-phone').value.trim(),
      street:     document.getElementById('co-street').value.trim(),
      building:   document.getElementById('co-building')?.value.trim() || '',
      floor:      document.getElementById('co-floor')?.value.trim() || '',
      apartment:  '',
      city:       document.getElementById('co-city').value.trim(),
      state: '', postal_code: '', country: 'Lebanon'
    };
  }
  const orderBody = {
    shipping_first_name:  ship.first_name,
    shipping_last_name:   ship.last_name,
    shipping_phone:       ship.phone,
    shipping_street:      ship.street,
    shipping_building:    ship.building,
    shipping_floor:       ship.floor,
    shipping_apartment:   ship.apartment,
    shipping_city:        ship.city,
    shipping_state:       ship.state,
    shipping_postal_code: ship.postal_code,
    shipping_country:     'Lebanon',
    delivery_method: 'standard',
    discount_code:   appliedDiscount?.code || null,
    items: cartItems.map(it => {
      // Strip size + color suffixes: "Petal Smock Dress (3-6M) — Rose Pink" → "Petal Smock Dress"
      const baseName = it.name.replace(/\s*\(.*$/, '').replace(/\s*—.*$/, '').trim();
      const p = products.find(x => x.name === baseName || x.name === it.name);
      if (!p) console.warn('No product match for:', it.name, '→ baseName:', baseName);
      return { product_id: p?.id, quantity: it.qty };
    }).filter(it => it.product_id)
  };

  const token = localStorage.getItem('lumea_token');
  if (!token) { showToast('Please sign in to place an order.'); if (confirmBtn) { confirmBtn.textContent = 'Confirm Order →'; confirmBtn.disabled = false; } return; }

  try {
    const res = await fetch(`${API_URL}/api/orders/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(orderBody)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = Array.isArray(err.detail)
        ? err.detail.map(e => e.msg).join(', ')
        : (typeof err.detail === 'string' ? err.detail : 'Could not place order. Please try again.');
      showToast(msg);
      if (confirmBtn) { confirmBtn.textContent = 'Confirm Order →'; confirmBtn.disabled = false; }
      return;
    }
  } catch {
    showToast('Connection error. Please try again.');
    if (confirmBtn) { confirmBtn.textContent = 'Confirm Order →'; confirmBtn.disabled = false; }
    return;
  }

  document.getElementById('checkout-main').style.display    = 'none';
  document.getElementById('checkout-success').style.display = 'block';
  document.getElementById('step-2').classList.replace('active', 'done');
  document.getElementById('step-2').querySelector('.step-num').textContent = '✓';
  document.getElementById('step-3').classList.add('active');
}

async function applyDiscount() {
  const code = document.getElementById('co-discount-code')?.value.trim().toUpperCase();
  const msg  = document.getElementById('co-discount-msg');
  if (!code) { if (msg) { msg.textContent = 'Please enter a code.'; msg.style.color = '#e74c3c'; } return; }
  if (msg) { msg.textContent = 'Checking…'; msg.style.color = 'var(--muted)'; }

  try {
    const res  = await _origFetch(`${API_URL}/api/discounts/validate/${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!res.ok) {
      appliedDiscount = null;
      if (msg) { msg.textContent = data.detail || 'Invalid or expired code.'; msg.style.color = '#e74c3c'; }
      refreshOrderSummary();
      return;
    }
    const codeData = data.data || data;
    appliedDiscount = { code: codeData.code, percentage: codeData.percentage };
    if (msg) { msg.textContent = `✓ ${codeData.percentage}% discount applied!`; msg.style.color = '#27ae60'; }
    refreshOrderSummary();
  } catch (e) {
    console.error('Discount error:', e);
    if (msg) { msg.textContent = 'Could not apply code. Try again.'; msg.style.color = '#e74c3c'; }
  }
}

function resetCheckout() {
  cartItems = []; updateCartCount();
  appliedDiscount = null;
  const codeInput = document.getElementById('co-discount-code');
  const codeMsg   = document.getElementById('co-discount-msg');
  if (codeInput) codeInput.value = '';
  if (codeMsg)   codeMsg.textContent = '';
  document.getElementById('checkout-main').style.display    = 'grid';
  document.getElementById('checkout-success').style.display = 'none';
  document.getElementById('panel-shipping').style.display   = 'block';
  ['step-2', 'step-3'].forEach(s => {
    const el = document.getElementById(s); if (el) el.classList.remove('active', 'done');
  });
  const s2 = document.getElementById('step-2');
  if (s2) { s2.classList.add('active'); s2.querySelector('.step-num').textContent = '2'; }
  const s3 = document.getElementById('step-3');
  if (s3) s3.querySelector('.step-num').textContent = '3';
  selectedSavedAddrId = null; checkoutSavedAddresses = [];
  // Reset confirm button
  const confirmBtn = document.querySelector('#panel-shipping .pm-btn');
  if (confirmBtn) { confirmBtn.textContent = 'Confirm Order →'; confirmBtn.disabled = false; }
}

/* ── AUTH HELPERS ────────────────────────────────── */
function togglePw(id, btn) {
  const inp = document.getElementById(id);
  inp.type  = inp.type === 'password' ? 'text' : 'password';
  btn.innerHTML = inp.type === 'password' ? SVG.eye : SVG.eyeOff;
}
function checkPwStrength(pw) {
  const bars = ['pb1', 'pb2', 'pb3', 'pb4'].map(id => document.getElementById(id));
  bars.forEach(b => { if (b) b.className = 'pw-bar'; });
  const hint = document.getElementById('pw-hint');
  if (!pw) return;
  let score = 0;
  if (pw.length >= 8)        score++;
  if (/[A-Z]/.test(pw))     score++;
  if (/[0-9]/.test(pw))     score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const cls    = score <= 1 ? 'weak' : score <= 2 ? 'fair' : 'strong';
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  for (let i = 0; i < score; i++) if (bars[i]) bars[i].classList.add(cls);
  if (hint) { hint.textContent = labels[score] || ''; hint.style.color = score <= 1 ? '#ff6b6b' : score <= 2 ? '#c9a46a' : '#51cf66'; }
}

/* ── ADDRESSES ───────────────────────────────────── */
async function renderAddrCards() {
  const wrap  = document.getElementById('addr-cards-wrap'); if (!wrap) return;
  const token = localStorage.getItem('lumea_token');
  if (!token) { wrap.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted)">Please sign in to see your addresses.</div>'; return; }
  try {
    const res  = await fetch(`${API_URL}/api/addresses/`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    addresses  = data.data || [];
  } catch { showToast('Could not load addresses'); return; }

  wrap.innerHTML = '';
  if (!addresses.length) {
    wrap.innerHTML = '<div style="text-align:center;padding:2.5rem;color:var(--muted);font-size:.88rem">No saved addresses yet.<br><small>Add your first address to speed up checkout.</small></div>';
    return;
  }
  addresses.forEach(a => {
    const card = document.createElement('div');
    card.style.cssText = `background:${a.is_default ? 'linear-gradient(135deg,rgba(197,90,120,.07),rgba(139,51,82,.04))' : 'var(--blush)'};border:1.5px solid ${a.is_default ? 'var(--rose)' : 'transparent'};border-radius:1.1rem;padding:1.3rem;margin-bottom:.9rem`;
    card.innerHTML = `
      ${a.is_default ? '<div style="font-size:.6rem;letter-spacing:.18em;text-transform:uppercase;color:var(--wine);font-weight:600;margin-bottom:.5rem">Default Address</div>' : ''}
      <div style="font-size:.92rem;font-weight:600;color:var(--text);margin-bottom:.3rem">${a.first_name} ${a.last_name}</div>
      ${a.phone ? `<div style="font-size:.78rem;color:var(--muted);margin-bottom:.25rem">${a.phone}</div>` : ''}
      <div style="font-size:.84rem;color:var(--muted);line-height:1.65">
        ${a.street}<br>
        ${a.building ? `🏢 ${a.building}` : ''}${a.building && a.floor ? ' · ' : ''}${a.floor ? `Floor: ${a.floor}` : ''}${(a.building || a.floor) ? '<br>' : ''}
        ${a.apartment ? a.apartment + '<br>' : ''}
        ${a.city}${a.state ? ', ' + a.state : ''}<br>${a.country}
      </div>`;

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:.6rem;margin-top:1rem;flex-wrap:wrap';

    const editBtn = makeAddrBtn('Edit', 'var(--wine)', 'var(--rose)');
    editBtn.onclick = () => openAddrForm(a.id);
    btns.appendChild(editBtn);

    if (!a.is_default) {
      const defBtn = makeAddrBtn('Set Default', 'var(--muted)', 'var(--rose)');
      defBtn.onclick = () => setDefaultAddr(a.id);
      btns.appendChild(defBtn);
    }
    if (addresses.length > 1) {
      const delBtn = makeAddrBtn('Delete', '#e74c3c', '#ffbebe');
      delBtn.onclick = () => deleteAddr(a.id);
      btns.appendChild(delBtn);
    }
    card.appendChild(btns);
    wrap.appendChild(card);
  });
}

function makeAddrBtn(label, color, borderColor) {
  const btn = document.createElement('button');
  btn.style.cssText = `padding:.38rem 1rem;background:white;border:1.5px solid ${borderColor};border-radius:3rem;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:500;color:${color}`;
  btn.textContent = label;
  btn.onmouseover = () => btn.style.background = borderColor === '#ffbebe' ? '#ffeaea' : 'var(--blush)';
  btn.onmouseout  = () => btn.style.background = 'white';
  return btn;
}

function openAddrForm(id) {
  addrEditId = id;
  document.getElementById('addr-list-view').style.display = 'none';
  document.getElementById('addr-form-view').style.display = 'block';
  document.getElementById('addr-form-title').textContent  = id ? 'Edit Address' : 'New Address';
  ['fname','lname','phone','street','apt','city','state'].forEach(f => {
    const el = document.getElementById('af-' + f); if (el) el.value = '';
  });
  document.getElementById('af-default').checked = false;
  if (id) {
    const a = addresses.find(x => x.id === id); if (!a) return;
    document.getElementById('af-fname').value    = a.first_name  || '';
    document.getElementById('af-lname').value    = a.last_name   || '';
    document.getElementById('af-phone').value    = a.phone       || '';
    document.getElementById('af-street').value   = a.street      || '';
    document.getElementById('af-city').value     = a.city        || '';
    document.getElementById('af-state').value    = a.state       || '';
    document.getElementById('af-default').checked = !!a.is_default;
    // Split apartment back into building / floor / apt parts
    const parts = (a.apartment || '').split(',').map(s => s.trim());
    document.getElementById('af-building').value = parts[0] || '';
    document.getElementById('af-floor').value    = parts[1] || '';
    document.getElementById('af-apt').value      = parts.slice(2).join(', ') || '';
  } else { if (!addresses.length) document.getElementById('af-default').checked = true; }
}
function closeAddrForm() {
  document.getElementById('addr-form-view').style.display = 'none';
  document.getElementById('addr-list-view').style.display = 'block';
  renderAddrCards();
}

async function saveAddress() {
  const fname    = document.getElementById('af-fname').value.trim();
  const lname    = document.getElementById('af-lname').value.trim();
  const street   = document.getElementById('af-street').value.trim();
  const city     = document.getElementById('af-city').value.trim();
  const building = document.getElementById('af-building').value.trim();
  const floor    = document.getElementById('af-floor').value.trim();
  const aptExtra = document.getElementById('af-apt').value.trim();
  if (!fname || !lname || !street || !city || !building || !floor) {
    showToast('Please fill in all required fields'); return;
  }
  const token = localStorage.getItem('lumea_token');
  if (!token) { showToast('Please sign in first'); return; }
  const body = {
    first_name:  fname,
    last_name:   lname,
    phone:       document.getElementById('af-phone').value.trim(),
    street,
    building,
    floor,
    apartment:   aptExtra,
    city,
    state:       document.getElementById('af-state').value.trim(),
    postal_code: '',
    country:     'Lebanon',
    is_default:  document.getElementById('af-default').checked
  };
  try {
    const url    = addrEditId ? `${API_URL}/api/addresses/${addrEditId}` : `${API_URL}/api/addresses/`;
    const method = addrEditId ? 'PUT' : 'POST';
    const res    = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Handle FastAPI validation errors (detail can be array or string)
      if (Array.isArray(data.detail)) {
        showToast(data.detail.map(e => e.msg).join(', '));
      } else {
        showToast(typeof data.detail === 'string' ? data.detail : 'Failed to save address');
      }
      return;
    }
    showToast(addrEditId ? 'Address updated! 🌸' : 'New address saved! 🌸');
    closeAddrForm();
  } catch { showToast('Connection error. Please try again.'); }
}
async function setDefaultAddr(id) {
  const token = localStorage.getItem('lumea_token');
  try {
    await fetch(`${API_URL}/api/addresses/${id}/default`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
    // Update local addresses array
    addresses.forEach(a => a.is_default = (a.id === id) ? 1 : 0);
    renderAddrCards();
    showToast('Default address updated!');
    // Auto-fill checkout form with this address
    const a = addresses.find(x => x.id === id);
    if (a) {
      const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
      set('co-fname',  a.first_name);
      set('co-lname',  a.last_name);
      set('co-phone',  a.phone);
      set('co-street', a.street);
      set('co-city',   a.city);
    }
  }
  catch { showToast('Connection error'); }
}
async function deleteAddr(id) {
  const token = localStorage.getItem('lumea_token');
  try { await fetch(`${API_URL}/api/addresses/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); renderAddrCards(); showToast('Address removed.'); }
  catch { showToast('Connection error'); }
}

/* ── CHANGE PASSWORD ─────────────────────────────── */
async function doChangePassword() {
  const current = document.getElementById('pw-current').value;
  const newPw   = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;
  if (!current || !newPw || !confirm) { showToast('Please fill in all password fields'); return; }
  if (newPw.length < 8)               { showToast('New password must be at least 8 characters'); return; }
  if (newPw !== confirm)              { showToast('New passwords do not match'); return; }
  const token = localStorage.getItem('lumea_token');
  try {
    const res  = await fetch(`${API_URL}/api/users/me/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ current_password: current, new_password: newPw }) });
    const data = await res.json();
    if (!res.ok) { showToast(data.detail || 'Failed to update password'); return; }
    ['pw-current','pw-new','pw-confirm'].forEach(id => document.getElementById(id).value = '');
    showToast('Password updated successfully!');
  } catch { showToast('Connection error. Try again.'); }
}

/* ── ORDERS ──────────────────────────────────────── */
async function loadOrders() {
  const el    = document.getElementById('orders-list'); if (!el) return;
  const token = localStorage.getItem('lumea_token');
  if (!token) { el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.88rem">Please sign in to see your orders.</div>'; return; }

  el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.88rem"><div class="spin-ring" style="width:30px;height:30px;border:3px solid var(--rose);border-top-color:var(--wine);border-radius:50%;margin:0 auto 1rem;animation:spin .8s linear infinite"></div>Loading orders...</div>';

  try {
    const res    = await fetch(`${API_URL}/api/orders/?limit=20&offset=0`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data   = await res.json();
    if (!res.ok) { el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted)">Could not load orders.</div>'; return; }
    const orders = data.data || [];
    if (!orders.length) { el.innerHTML = '<div style="text-align:center;padding:2.5rem;color:var(--muted);font-size:.88rem">No orders yet.<br><small>Your orders will appear here after your first purchase.</small></div>'; return; }

    el.innerHTML = '';
    orders.forEach(o => {
      const statusCls = o.status === 'delivered' ? 'status-delivered' : 'status-transit';
      const statusLbl = o.status.charAt(0).toUpperCase() + o.status.slice(1);
      const date      = new Date(o.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const shortId   = '#LUM-' + o.id.substring(0, 8).toUpperCase();
      const card      = document.createElement('div');
      card.className  = 'order-card';
      card.innerHTML  = `
        <div class="order-header">
          <div><div class="order-id">${shortId}</div><div class="order-date">${date}</div></div>
          <span class="order-status ${statusCls}">${statusLbl}</span>
        </div>
        <div class="order-items">${o.shipping_city}, ${o.shipping_country}</div>
        <div class="order-total">$${parseFloat(o.total).toFixed(2)}</div>`;
      el.appendChild(card);
    });
  } catch { el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.88rem">Could not load orders. Make sure the server is running.</div>'; }
}

/* ── DELETE ACCOUNT ──────────────────────────────── */
async function doDeleteAccount() {
  const pw = document.getElementById('delete-confirm-pw').value;
  if (!pw) { showToast('Please enter your password to confirm'); return; }
  if (!confirm('Are you absolutely sure? This cannot be undone.')) return;
  const token = localStorage.getItem('lumea_token');
  try {
    const res  = await fetch(`${API_URL}/api/users/me`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ password: pw }) });
    const data = await res.json();
    if (!res.ok) { showToast(data.detail || 'Incorrect password'); return; }
    ['lumea_token','lumea_refresh_token','lumea_user'].forEach(k => localStorage.removeItem(k));
    currentUser = null;
    closePage('page-account');
    showToast('Your account has been deleted. Goodbye!');
    setTimeout(() => location.reload(), 2000);
  } catch { showToast('Connection error. Try again.'); }
}

/* ── CONTACT ─────────────────────────────────────── */
function updateContactSection() {
  const prompt = document.getElementById('contact-signin-prompt');
  const form   = document.getElementById('contact-form-wrap');
  if (!prompt || !form) return;
  if (currentUser) {
    prompt.style.display = 'none';
    form.style.display   = 'block';
    const n = document.getElementById('contact-user-name');
    const e = document.getElementById('contact-user-email');
    if (n) n.textContent = `${currentUser.first_name} ${currentUser.last_name}`;
    if (e) e.textContent = currentUser.email;
  } else {
    prompt.style.display = 'block';
    form.style.display   = 'none';
  }
}

async function sendContactMessage() {
  const subject = document.getElementById('contact-subject').value;
  const message = document.getElementById('contact-message').value.trim();
  if (!subject) { showToast('Please select a subject'); return; }
  if (!message) { showToast('Please write a message'); return; }
  const btn   = event.target;
  btn.textContent = 'Sending...'; btn.disabled = true;
  const token = localStorage.getItem('lumea_token');
  try {
    const res = await fetch(`${API_URL}/api/contact/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ subject, message, user_name: `${currentUser.first_name} ${currentUser.last_name}`, user_email: currentUser.email })
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); showToast(d.detail || 'Could not send message.'); btn.textContent = 'Send Message'; btn.disabled = false; return; }
    document.getElementById('contact-subject').value = '';
    document.getElementById('contact-message').value = '';
    showToast('Message sent! We will get back to you soon.');
  } catch { showToast('Connection error. Please try again.'); }
  btn.textContent = 'Send Message'; btn.disabled = false;
}

/* ── PRODUCT DETAIL ──────────────────────────────── */
function openProduct(productId) {
  const p = products.find(x => x.id === productId); if (!p) return;
  const isWished = wishItems.has(p.id);
  const c1    = p.color_primary   || '#fce4ec';
  const c2    = p.color_secondary || '#f8bbd0';
  const emoji = p.emoji           || '👶';

  // ── Build image list from image_urls (JSON array) or fall back to image_url ──
  let imageList = [];
  try { if (p.image_urls) imageList = JSON.parse(p.image_urls); } catch {}
  if (!imageList.length && p.image_url && p.image_url.trim()) imageList = [p.image_url];
  imageList = imageList.map(resolveImg).filter(Boolean);

  // ── Render image area ────────────────────────────────────────────────────────
  const imgBox = document.getElementById('pd-img-box');
  imgBox.innerHTML = '';
  imgBox.style.position = 'relative';

  if (!imageList.length) {
    // No image — show emoji SVG
    imgBox.appendChild(buildEmojiSVG(c1, c2, emoji, '', 'pdg'));

  } else if (imageList.length === 1) {
    // Single image
    const img = document.createElement('img');
    img.src   = imageList[0];
    img.alt   = p.name;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;cursor:zoom-in;display:block';
    img.onclick = () => openLightbox(imageList[0]);
    imgBox.appendChild(img);

  } else {
    // Multiple images — carousel
    let current = 0;

    const img = document.createElement('img');
    img.src   = imageList[0];
    img.alt   = p.name;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;cursor:zoom-in;display:block;transition:opacity .2s';
    img.onclick = () => openLightbox(imageList[current]);
    imgBox.appendChild(img);

    // Arrow helper
    const arrow = (side) => {
      const btn = document.createElement('button');
      btn.style.cssText = `position:absolute;top:50%;transform:translateY(-50%);${side}:.7rem;z-index:10;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.92);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.15);transition:background .2s`;
      btn.innerHTML = side === 'left'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b3352" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b3352" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
      btn.onmouseover = () => btn.style.background = '#fff';
      btn.onmouseout  = () => btn.style.background = 'rgba(255,255,255,.92)';
      return btn;
    };

    // Dots
    const dotsWrap = document.createElement('div');
    dotsWrap.style.cssText = 'position:absolute;bottom:.7rem;left:50%;transform:translateX(-50%);display:flex;gap:.45rem;z-index:10';
    const dots = imageList.map((_, i) => {
      const d = document.createElement('div');
      d.style.cssText = `width:7px;height:7px;border-radius:50%;cursor:pointer;transition:background .2s;background:${i === 0 ? 'white' : 'rgba(255,255,255,.45)'}`;
      dotsWrap.appendChild(d);
      return d;
    });

    // Counter
    const counter = document.createElement('div');
    counter.style.cssText = 'position:absolute;top:.7rem;right:.7rem;z-index:10;background:rgba(46,26,34,.55);color:white;font-size:.68rem;font-family:\'DM Sans\',sans-serif;padding:.2rem .65rem;border-radius:3rem';
    counter.textContent = `1 / ${imageList.length}`;
    counter.dataset.counter = '1';

    // Navigate function
    const goTo = (idx) => {
      current = (idx + imageList.length) % imageList.length;
      img.style.opacity = '0';
      setTimeout(() => {
        img.src = imageList[current];
        img.style.opacity = '1';
      }, 150);
      dots.forEach((d, i) => d.style.background = i === current ? 'white' : 'rgba(255,255,255,.45)');
      counter.textContent = `${current + 1} / ${imageList.length}`;
    };

    // Dot clicks
    dots.forEach((d, i) => { d.dataset.dot = i; d.onclick = (e) => { e.stopPropagation(); goTo(i); }; });

    const prevBtn = arrow('left');
    const nextBtn = arrow('right');
    prevBtn.dataset.arrow = 'left';
    nextBtn.dataset.arrow = 'right';
    prevBtn.onclick = (e) => { e.stopPropagation(); goTo(current - 1); };
    nextBtn.onclick = (e) => { e.stopPropagation(); goTo(current + 1); };

    imgBox.appendChild(prevBtn);
    imgBox.appendChild(nextBtn);
    imgBox.appendChild(dotsWrap);
    imgBox.appendChild(counter);
  }

  document.getElementById('pd-name').textContent     = p.name;
  document.getElementById('pd-size-tag').textContent = '';
  document.getElementById('pd-price').textContent    = `$${parseFloat(p.price).toFixed(2)}`;
  document.getElementById('pd-category').textContent = p.category_name || '';
  document.getElementById('pd-desc').textContent     = p.description || 'Premium organic baby clothing crafted with the softest materials for your little one.';
  document.getElementById('pd-breadcrumb-name').textContent = p.name;

  // ── Stock status ─────────────────────────────────────────────────────────────
  const stockEl  = document.getElementById('pd-stock');
  const stockRow = document.getElementById('pd-stock-row');
  const stockSvgCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#27ae60" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const stockSvgX     = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  if (p.stock <= 0) {
    stockRow.innerHTML = `${stockSvgX} <span id="pd-stock" style="color:#e74c3c;font-weight:500">Out of Stock</span>`;
  } else if (p.stock <= 5) {
    stockRow.innerHTML = `${stockSvgCheck} <span id="pd-stock" style="color:#e67e22;font-weight:500">Only ${p.stock} left!</span>`;
  } else {
    stockRow.innerHTML = `${stockSvgCheck} <span id="pd-stock" style="color:#27ae60;font-weight:500">In Stock (${p.stock} available)</span>`;
  }

  const oldEl = document.getElementById('pd-old-price');
  if (p.compare_price) { oldEl.textContent = `$${parseFloat(p.compare_price).toFixed(2)}`; oldEl.style.display = 'inline'; }
  else oldEl.style.display = 'none';

  // ── Size selector ────────────────────────────────────────────────────────────
  const existingSelectors = document.getElementById('pd-selectors');
  if (existingSelectors) existingSelectors.remove();

  const selectorsWrap = document.createElement('div');
  selectorsWrap.id = 'pd-selectors';
  selectorsWrap.style.cssText = 'margin:1rem 0';

  // Full kids size chart
  const ALL_SIZES = [
    { label: '0-1M',   sub: '0–1 mo' },
    { label: '0-3M',   sub: 'Newborn' },
    { label: '3-6M',   sub: '3–6 mo' },
    { label: '6-9M',   sub: '6–9 mo' },
    { label: '9-12M',  sub: '9–12 mo' },
    { label: '6-12M',  sub: '6–12 mo' },
    { label: '12-18M', sub: '12–18 mo' },
    { label: '18-24M', sub: '18–24 mo' },
    { label: '24-36M', sub: '24–36 mo' },
    { label: '2Y',     sub: '2 years' },
    { label: '3Y',     sub: '3 years' },
    { label: '4Y',     sub: '4 years' },
    { label: '5Y',     sub: '5 years' },
    { label: '6Y',     sub: '6 years' },
  ];

  // Parse size_range — can be JSON {"0-3M":10,"3-6M":5} or plain text
  let sizeStockMap = null; // null = no per-size stock info
  let sizeList = ALL_SIZES;

  try {
    const parsed = JSON.parse(p.size_range);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      sizeStockMap = parsed;
      // Only show sizes defined by admin, mark out-of-stock ones
      sizeList = ALL_SIZES.filter(s => parsed.hasOwnProperty(s.label));
    }
  } catch {
    // Not JSON — strip display text and show all sizes
    sizeList = ALL_SIZES;
  }

  let selectedSize = null;

  // Size header
  const sizeHeader = document.createElement('div');
  sizeHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:.7rem';
  sizeHeader.innerHTML = `
    <div style="font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Select Size</div>
    <div id="pd-size-hint" style="font-size:.72rem;color:var(--wine);font-weight:500"></div>`;
  selectorsWrap.appendChild(sizeHeader);

  const sizeBtns = document.createElement('div');
  sizeBtns.style.cssText = 'display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.2rem';

  sizeList.forEach(s => {
    const sizeStock   = sizeStockMap ? (sizeStockMap[s.label] || 0) : null;
    const outOfStock  = sizeStock !== null && sizeStock <= 0;
    const lowStock    = sizeStock !== null && sizeStock > 0 && sizeStock <= 3;

    const btn = document.createElement('button');
    btn.style.cssText = `display:flex;flex-direction:column;align-items:center;padding:.45rem .7rem;min-width:52px;border:1.5px solid ${outOfStock ? '#ddd' : 'var(--rose)'};border-radius:.7rem;background:${outOfStock ? 'var(--blush)' : 'var(--warm)'};cursor:${outOfStock ? 'not-allowed' : 'pointer'};font-family:'DM Sans',sans-serif;transition:all .15s;gap:.1rem;opacity:${outOfStock ? '.5' : '1'}`;
    btn.disabled = outOfStock;
    btn.innerHTML = `
      <span style="font-size:.82rem;font-weight:600;color:${outOfStock ? '#aaa' : 'var(--text)'}">${s.label}</span>
      <span style="font-size:.58rem;color:${outOfStock ? '#bbb' : lowStock ? '#e67e22' : 'var(--muted)'}">${outOfStock ? 'sold out' : lowStock ? `only ${sizeStock} left` : s.sub}</span>`;

    if (!outOfStock) {
      btn.onclick = () => {
        sizeBtns.querySelectorAll('button:not(:disabled)').forEach(b => {
          b.classList.remove('size-selected');
          b.style.background = 'var(--warm)'; b.style.borderColor = 'var(--rose)';
          b.querySelectorAll('span')[0].style.color = 'var(--text)';
          b.querySelectorAll('span')[1].style.color = 'var(--muted)';
        });
        btn.classList.add('size-selected');
        btn.style.background = '#e096a8'; btn.style.borderColor = '#e096a8';
        btn.querySelectorAll('span')[0].style.color = 'white';
        btn.querySelectorAll('span')[1].style.color = 'rgba(255,255,255,.8)';
        selectedSize = s.label;
        const hint = document.getElementById('pd-size-hint');
        if (hint) hint.textContent = `${s.label} selected ✓`;
      };
    }
    sizeBtns.appendChild(btn);
  });
  selectorsWrap.appendChild(sizeBtns);

  // ── Color selector ────────────────────────────────────────────────────────────
  let selectedColor = null;
  let colorOptions = [];
  try { if (p.available_colors) colorOptions = JSON.parse(p.available_colors); } catch {}

  if (colorOptions.length > 0) {
    const colorHeader = document.createElement('div');
    colorHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:.7rem';
    colorHeader.innerHTML = `
      <div style="font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Select Color</div>
      <div id="pd-color-hint" style="font-size:.72rem;color:var(--wine);font-weight:500"></div>`;
    selectorsWrap.appendChild(colorHeader);

    const colorRow = document.createElement('div');
    colorRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:.6rem;margin-bottom:1.2rem';

    colorOptions.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'color-circle';
      btn.title = c.name;
      // Use a wrapping div for the color so CSS can't override it
      btn.style.cssText = `width:34px;height:34px;border-radius:50%;border:3px solid transparent;cursor:pointer;transition:all .15s;padding:0;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.25)`;
      // Inner div holds the actual color — immune to button CSS overrides
      const inner = document.createElement('div');
      inner.style.cssText = `width:100%;height:100%;background:${c.hex};border-radius:50%`;
      btn.appendChild(inner);
      btn.onclick = () => {
        // Deselect all
        colorRow.querySelectorAll('button').forEach(b => {
          b.style.border = '3px solid transparent';
          b.style.transform = 'scale(1)';
        });
        // Select this one
        btn.style.border = '3px solid var(--wine)';
        btn.style.transform = 'scale(1.15)';
        selectedColor = c.name;
        const hint = document.getElementById('pd-color-hint');
        if (hint) hint.textContent = `${c.name} ✓`;

        // ── Swap images if this color has its own images ──
        const colorImgs = (c.images || []).map(resolveImg).filter(Boolean);
        if (colorImgs.length > 0) {
          swapProductImages(colorImgs);
        } else if (imageList.length > 0) {
          swapProductImages(imageList); // revert to default images
        }
      };
      colorRow.appendChild(btn);
    });
    selectorsWrap.appendChild(colorRow);
  }

  // ── Quantity picker ──────────────────────────────────────────────────────────
  let qty = 1;
  const qtyLabel = document.createElement('div');
  qtyLabel.style.cssText = 'font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:.6rem';
  qtyLabel.textContent = 'Quantity';
  selectorsWrap.appendChild(qtyLabel);

  const qtyWrap = document.createElement('div');
  qtyWrap.style.cssText = 'display:flex;align-items:center;gap:.8rem';

  const qtyBtnStyle = 'width:30px;height:30px;aspect-ratio:1/1;border-radius:50%;border:1.5px solid var(--rose);background:transparent;cursor:pointer;font-size:1rem;line-height:28px;text-align:center;color:var(--wine);padding:0;flex-shrink:0;-webkit-appearance:none;appearance:none;font-family:inherit;box-sizing:border-box;overflow:hidden';

  const qtyMinus = document.createElement('button');
  qtyMinus.textContent = '−';
  qtyMinus.className = 'qty-btn';
  qtyMinus.style.cssText = qtyBtnStyle;

  const qtyDisplay = document.createElement('div');
  qtyDisplay.textContent = '1';
  qtyDisplay.style.cssText = 'font-size:1.1rem;font-weight:500;color:var(--text);min-width:24px;text-align:center';

  const qtyPlus = document.createElement('button');
  qtyPlus.textContent = '+';
  qtyPlus.className = 'qty-btn';
  qtyPlus.style.cssText = qtyBtnStyle;

  qtyMinus.onclick = () => { if (qty > 1) { qty--; qtyDisplay.textContent = qty; } };
  qtyPlus.onclick  = () => { if (qty < Math.min(p.stock, 20)) { qty++; qtyDisplay.textContent = qty; } };

  qtyWrap.appendChild(qtyMinus);
  qtyWrap.appendChild(qtyDisplay);
  qtyWrap.appendChild(qtyPlus);
  selectorsWrap.appendChild(qtyWrap);

  // Insert before pd-actions
  const pdActions = document.querySelector('.pd-actions');
  pdActions.parentNode.insertBefore(selectorsWrap, pdActions);

  const wb = document.getElementById('pd-wish-btn');
  wb.innerHTML = isWished ? SVG.heartFilled : SVG.heart;
  wb.classList.toggle('wished', isWished);
  wb.onclick = () => toggleWish(p.id, p.name);

  // ── Clear selection button ────────────────────────────────────────────────────
  const existingClear = document.getElementById('pd-clear-btn');
  if (existingClear) existingClear.remove();

  if (sizeList.length > 0 || colorOptions.length > 0) {
    const clearSelBtn = document.createElement('button');
    clearSelBtn.id = 'pd-clear-btn';
    clearSelBtn.textContent = '✕ Clear selection';
    clearSelBtn.style.cssText = 'display:none;background:none;border:none;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:.72rem;color:var(--muted);text-decoration:underline;padding:0;margin-bottom:.8rem';
    clearSelBtn.onclick = () => {
      // Clear size
      selectedSize = null;
      selectorsWrap.querySelectorAll('button.size-selected').forEach(b => {
        b.classList.remove('size-selected');
        b.style.background = 'var(--warm)';
        b.style.borderColor = 'var(--rose)';
        b.querySelectorAll('span')[0].style.color = 'var(--text)';
        b.querySelectorAll('span')[1].style.color = 'var(--muted)';
      });
      const sizeHint = document.getElementById('pd-size-hint');
      if (sizeHint) sizeHint.textContent = '';

      // Clear color
      selectedColor = null;
      selectorsWrap.querySelectorAll('button.color-circle').forEach(b => {
        b.style.border = '3px solid transparent';
        b.style.transform = 'scale(1)';
      });
      const colorHint = document.getElementById('pd-color-hint');
      if (colorHint) colorHint.textContent = '';

      clearSelBtn.style.display = 'none';

      // Revert to default images
      if (imageList.length > 0) swapProductImages(imageList);
    };

    // Show clear button whenever a size or color is selected
    const origSizeClick = selectorsWrap.onclick;
    selectorsWrap.addEventListener('click', () => {
      if (selectedSize || selectedColor) clearSelBtn.style.display = 'inline-block';
    });

    const pdActions = document.querySelector('.pd-actions');
    pdActions.parentNode.insertBefore(clearSelBtn, pdActions);
  }

  const addBtn = document.getElementById('pd-add-btn');
  addBtn.textContent      = p.stock <= 0 ? 'Out of Stock' : 'Add to Cart';
  addBtn.style.background = p.stock <= 0 ? '#ccc' : '';
  addBtn.style.cursor     = p.stock <= 0 ? 'not-allowed' : '';
  addBtn.disabled         = p.stock <= 0;

  // Disable qty controls if out of stock
  if (p.stock <= 0) {
    qtyMinus.disabled = true; qtyMinus.style.opacity = '.4';
    qtyPlus.disabled  = true; qtyPlus.style.opacity  = '.4';
    if (sizeList.length > 1) {
      selectorsWrap.querySelectorAll('button').forEach(b => { b.disabled = true; b.style.opacity = '.4'; b.style.cursor = 'not-allowed'; });
    }
  }

  addBtn.onclick = () => {
    if (p.stock <= 0) return;
    if (sizeList.length > 0 && !selectedSize) { showToast('Please select a size first 🌸'); return; }
    if (colorOptions.length > 0 && !selectedColor) { showToast('Please select a color first 🌸'); return; }
    const sizePart  = selectedSize  ? ` (${selectedSize})` : '';
    const colorPart = selectedColor ? ` — ${selectedColor}` : '';
    const label = `${p.name}${sizePart}${colorPart}`;
    for (let i = 0; i < qty; i++) addToCartData(label, p.price);
    addBtn.textContent = `Added ${qty > 1 ? qty + 'x ' : ''}to Cart!`;
    addBtn.style.background = '#27ae60';
    setTimeout(() => { addBtn.textContent = 'Add to Cart'; addBtn.style.background = ''; }, 1600);
    showToast(`${label} × ${qty} added to cart! 🌸`);
  };
  openPage('page-product');
}

// Swaps the product image carousel with a new set of images
function swapProductImages(newImages) {
  const imgBox = document.getElementById('pd-img-box');
  if (!imgBox || !newImages.length) return;

  // Find the main img element
  const img = imgBox.querySelector('img');
  if (img) {
    img.src = newImages[0];
    img.onclick = () => openLightbox(newImages[0]);
  }

  // Update dots
  const dots = imgBox.querySelectorAll('[data-dot]');
  dots.forEach((dot, i) => {
    dot.style.background = i === 0 ? 'white' : 'rgba(255,255,255,.45)';
  });

  // Update counter
  const counter = imgBox.querySelector('[data-counter]');
  if (counter) counter.textContent = `1 / ${newImages.length}`;

  // Rebuild arrow navigation for new images
  let currentIdx = 0;
  const leftBtn  = imgBox.querySelector('[data-arrow="left"]');
  const rightBtn = imgBox.querySelector('[data-arrow="right"]');

  if (leftBtn && rightBtn) {
    leftBtn.onclick = () => {
      currentIdx = (currentIdx - 1 + newImages.length) % newImages.length;
      if (img) { img.style.opacity = '0'; setTimeout(() => { img.src = newImages[currentIdx]; img.onclick = () => openLightbox(newImages[currentIdx]); img.style.opacity = '1'; }, 150); }
      if (counter) counter.textContent = `${currentIdx + 1} / ${newImages.length}`;
      dots.forEach((d, i) => d.style.background = i === currentIdx ? 'white' : 'rgba(255,255,255,.45)');
    };
    rightBtn.onclick = () => {
      currentIdx = (currentIdx + 1) % newImages.length;
      if (img) { img.style.opacity = '0'; setTimeout(() => { img.src = newImages[currentIdx]; img.onclick = () => openLightbox(newImages[currentIdx]); img.style.opacity = '1'; }, 150); }
      if (counter) counter.textContent = `${currentIdx + 1} / ${newImages.length}`;
      dots.forEach((d, i) => d.style.background = i === currentIdx ? 'white' : 'rgba(255,255,255,.45)');
    };
  }
}

function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lumea-lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lumea-lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── EVENT LISTENERS & INIT ──────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Smooth scroll only for anchor links — not global (global smooth scroll causes filter jump)
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
  // Set eye icons on password inputs
  document.querySelectorAll('.eye-btn').forEach(b => b.innerHTML = SVG.eye);

  document.getElementById('cart-btn').addEventListener('click', openCart);
  document.getElementById('nav-search-btn').addEventListener('click', openSearch);
  document.getElementById('nav-wish-btn').addEventListener('click', openWishlist);
  document.getElementById('nav-account-btn').addEventListener('click', () => {
    if (currentUser) { openPage('page-account'); loadOrders(); }
    else openPage('page-signin');
  });
  // Password strength checker
  const regPass = document.getElementById('reg-pass');
  if (regPass) regPass.addEventListener('input', () => checkPwStrength(regPass.value));

  // Verification code — numbers only
  const regCode = document.getElementById('reg-code');
  if (regCode) regCode.addEventListener('input', () => { regCode.value = regCode.value.replace(/[^0-9]/g, ''); });
  document.getElementById('chat-inp').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeAllPages(); }
  });

  // ── Dark mode toggle ─────────────────────────────────────────────────────────
  const themeBtn = document.getElementById('theme-btn');
  const moonIcon = document.getElementById('theme-icon-moon');
  const sunIcon  = document.getElementById('theme-icon-sun');

  function applyTheme(isDark) {
    document.body.classList.toggle('dark', isDark);
    moonIcon.style.display = isDark ? 'none'  : 'block';
    sunIcon.style.display  = isDark ? 'block' : 'none';
  }

  const savedTheme = localStorage.getItem('lumea_theme');
  // Always default to light — only go dark if user explicitly chose dark
  const isDarkMode = savedTheme === 'dark';
  applyTheme(isDarkMode);

  // Do NOT listen to system theme changes — website is always light by default

  themeBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    moonIcon.style.display = isDark ? 'none'  : 'block';
    sunIcon.style.display  = isDark ? 'block' : 'none';
    localStorage.setItem('lumea_theme', isDark ? 'dark' : 'light');
  });

  // ── HORIZONTAL FILTER ────────────────────────────────────────────────────────

  const fcState = { type:'all', age:'all', gender:'all', season:'all', size:'all', badge:'all' };
  let filterDebounce;

  document.querySelectorAll('.fc').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      const val   = btn.dataset.val;
      fcState[group] = val;
      // Update active state
      document.querySelectorAll(`.fc[data-group="${group}"]`).forEach(b => b.classList.toggle('active', b.dataset.val === val));
      // Debounce reload
      clearTimeout(filterDebounce);
      filterDebounce = setTimeout(() => runFilteredLoad(false), 200);
    });
  });

  const fcPriceMin   = document.getElementById('fc-price-min');
  const fcPriceMax   = document.getElementById('fc-price-max');
  const fcPriceLabel = document.getElementById('fc-price-label');
  const fcPriceFill  = document.getElementById('fc-price-fill');
  let   fcPriceDebounce;

  function updateFcPriceFill() {
    if (!fcPriceMin || !fcPriceMax || !fcPriceFill) return;
    const min = parseInt(fcPriceMin.value);
    const max = parseInt(fcPriceMax.value);
    fcPriceFill.style.left  = (min / 50 * 100) + '%';
    fcPriceFill.style.width = ((max - min) / 50 * 100) + '%';
  }

  window.updateFcPrice = function() {
    let min = parseInt(fcPriceMin.value);
    let max = parseInt(fcPriceMax.value);
    if (min > max) { fcPriceMin.value = max; min = max; }
    fcPriceLabel.textContent = `$${min} — ${max >= 50 ? '$50+' : '$' + max}`;
    updateFcPriceFill();
    clearTimeout(fcPriceDebounce);
    fcPriceDebounce = setTimeout(() => runFilteredLoad(false), 500);
  };

  updateFcPriceFill();

  window.clearAllFilters = function() {
    Object.keys(fcState).forEach(k => fcState[k] = 'all');
    document.querySelectorAll('.fc').forEach(b => b.classList.toggle('active', b.dataset.val === 'all'));
    if (fcPriceMin) fcPriceMin.value = 0;
    if (fcPriceMax) fcPriceMax.value = 50;
    if (fcPriceLabel) fcPriceLabel.textContent = '$0 — $50+';
    updateFcPriceFill();
    runFilteredLoad(false);
  };

  window.toggleFilters = function() {
    const body = document.getElementById('filters-body');
    const btn  = document.getElementById('fc-toggle-btn');
    const hidden = body.classList.toggle('hidden');
    btn.textContent = hidden ? 'Show ▼' : 'Hide ▲';
  };

  async function runFilteredLoad(append = false) {
    const grid    = document.getElementById('prod-grid');
    const loadBtn = document.getElementById('load-btn');

    if (!append) {
      currentOffset = 0; products = [];
      grid.style.opacity = '0.4';
      grid.style.pointerEvents = 'none';
    } else {
      if (loadBtn) { loadBtn.textContent = 'Loading…'; loadBtn.disabled = true; }
    }

    try {
      const params = new URLSearchParams();
      params.append('limit', PRODUCTS_PER_PAGE);
      params.append('offset', currentOffset);

      if (fcState.type !== 'all')   params.append('product_type', fcState.type);
      if (fcState.age  !== 'all')   params.append('age_group', fcState.age);
      if (fcState.season !== 'all') params.append('season', fcState.season);
      if (fcState.badge !== 'all')  params.append('badge', fcState.badge);
      if (fcState.gender !== 'all') {
        params.append('gender', fcState.gender);
        if (fcState.gender === 'girl' || fcState.gender === 'boy') params.append('gender', 'unisex');
      }
      const minP = fcPriceMin ? parseInt(fcPriceMin.value) : 0;
      const maxP = fcPriceMax ? parseInt(fcPriceMax.value) : 50;
      if (minP > 0)  params.append('min_price', minP);
      if (maxP < 50) params.append('max_price', maxP);

      const res  = await fetch(`${API_URL}/api/products/?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.data) throw new Error();

      totalProducts = data.pagination?.total ?? data.data.length;
      let newBatch  = data.data;

      // Client-side size filter
      if (fcState.size !== 'all') {
        const aliases = { '2Y':'18-24M','18-24M':'2Y','3Y':'24-36M','24-36M':'3Y' };
        const target = new Set([fcState.size, aliases[fcState.size]].filter(Boolean));
        newBatch = newBatch.filter(p => {
          try { const sr = JSON.parse(p.size_range); return [...target].some(s => sr[s] > 0); }
          catch { return true; }
        });
      }

      currentOffset += data.data.length;

      grid.style.opacity = '';
      grid.style.pointerEvents = '';

      if (append) { products = [...products, ...newBatch]; renderProds(newBatch); }
      else { products = newBatch; grid.innerHTML = ''; renderProds(null); }

      // Refresh wish hearts after render
      document.querySelectorAll('[id^="wish-"]').forEach(btn => {
        const pid = String(btn.id.replace('wish-', ''));
        if (wishItems.has(pid)) { btn.innerHTML = SVG.heartFilled; btn.classList.add('wished'); }
        else                    { btn.innerHTML = SVG.heart;       btn.classList.remove('wished'); }
      });

      if (!newBatch.length && !append) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted);font-size:.9rem">No products found.</div>';
      updateLoadMoreBtn();

    } catch(err) {
      console.error('Filter load error:', err);
      grid.style.opacity = '';
      grid.style.pointerEvents = '';
      if (!append) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted);font-size:.9rem">Could not load products.</div>';
      updateLoadMoreBtn();
    }
  }

  document.getElementById('load-btn').addEventListener('click', () => runFilteredLoad(true));

  // Init
  await initAuth();
  validateSession();
  runFilteredLoad(false);
  updateContactSection();
  renderAddrCards();
});
