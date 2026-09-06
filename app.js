let items = [];
let nextId = 1;

const screenIds = ['dashboard', 'inventory', 'reorder', 'message'];
let currentScreen = 'dashboard';

const el = (id) => document.getElementById(id);

const navLinks = document.querySelectorAll('.nav-link');
const screens = screenIds.map((id) => el(`screen-${id}`));
const formScreen = el('screen-form');

const inventoryList = el('inventoryList');
const inventoryEmpty = el('inventoryEmpty');
const searchInput = el('searchInput');

const reorderList = el('reorderList');
const reorderEmpty = el('reorderEmpty');
const markAllOrderedBtn = el('markAllOrderedBtn');

const dashboardLowList = el('dashboardLowList');
const dashboardEmpty = el('dashboardEmpty');

const messageText = el('messageText');
const copyStatus = el('copyStatus');

const itemForm = el('itemForm');
const formTitle = el('formTitle');
const editIdInput = el('editId');
const nameInput = el('name');
const categoryInput = el('category');
const quantityInput = el('quantity');
const unitInput = el('unit');
const minimumQuantityInput = el('minimumQuantity');
const cancelFormBtn = el('cancelFormBtn');
const suggestDetailsBtn = el('suggestDetailsBtn');
const aiBeam = el('aiBeam');
const aiBeamNode = el('aiBeamNode');

function getStatus(item) {
  return item.quantity < item.minimumQuantity ? 'LOW_STOCK' : 'OK';
}

const tickerAnimations = new WeakMap();

function animateNumberTicker(node, value, options = {}) {
  if (!node) return;
  const { startValue = 0, direction = 'up', delay = 0, decimalPlaces = 0, duration = 1200 } = options;

  const previous = tickerAnimations.get(node);
  if (previous) {
    cancelAnimationFrame(previous.raf);
    clearTimeout(previous.timeout);
  }

  node.textContent = Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(startValue);

  const run = () => {
    const begin = performance.now();
    const from = direction === 'down' ? value : startValue;
    const to = direction === 'down' ? startValue : value;

    function step(now) {
      const t = Math.min((now - begin) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      node.textContent = Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(Number(current.toFixed(decimalPlaces)));
      if (t < 1) {
        const raf = requestAnimationFrame(step);
        tickerAnimations.set(node, { ...tickerAnimations.get(node), raf });
      } else {
        tickerAnimations.delete(node);
      }
    }

    const raf = requestAnimationFrame(step);
    tickerAnimations.set(node, { raf });
  };

  const timeout = setTimeout(run, delay * 1000);
  tickerAnimations.set(node, { timeout });
}

function getLowStock() {
  return items.filter((item) => getStatus(item) === 'LOW_STOCK');
}

function switchScreen(screenId) {
  currentScreen = screenId;

function handleMagicCardMove(e) {
  const card = e.target.closest('.item-card');
  if (!card) return;
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--magic-x', e.clientX - rect.left + 'px');
  card.style.setProperty('--magic-y', e.clientY - rect.top + 'px');
}

function handleMagicCardLeave(e) {
  const card = e.target.closest('.item-card');
  if (!card) return;
  card.style.setProperty('--magic-x', '-200px');
  card.style.setProperty('--magic-y', '-200px');
}

document.addEventListener('mousemove', handleMagicCardMove);
document.addEventListener('mouseleave', handleMagicCardLeave, true);

navLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.screen === screenId);
  });

  screens.forEach((screen) => {
    screen.classList.remove('active');
  });

  const target = el(`screen-${screenId}`);
  if (target) target.classList.add('active');

  if (screenId === 'dashboard') renderDashboard();
  if (screenId === 'inventory') renderInventory();
  if (screenId === 'reorder') renderReorder();
  if (screenId === 'message') renderMessage();
}

function renderDashboard() {
  const total = items.length;
  const low = getLowStock().length;
  const pending = reorderItems().length;

  el('statTotal').textContent = total;
  el('statLow').textContent = low;
  el('statPending').textContent = pending;

  animateNumberTicker(el('statTotal'), total);
  animateNumberTicker(el('statLow'), low);
  animateNumberTicker(el('statPending'), pending);

  dashboardLowList.innerHTML = '';
  const lowItems = getLowStock();

  if (!lowItems.length) {
    dashboardEmpty.style.display = 'block';
    return;
  }

  dashboardEmpty.style.display = 'none';
  lowItems.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'item-card animated-list-item';
    li.style.setProperty('--stagger-i', String(index));
    li.innerHTML = `
      <div class="border-beam" aria-hidden="true"></div>
      <div class="item-main">
        <div class="item-title">${escapeHtml(item.name)}</div>
        <div class="item-meta">${escapeHtml(item.category || '')} · ${escapeHtml(item.unit || '')} · ${item.quantity} / min ${item.minimumQuantity}</div>
      </div>
      <div class="item-actions">
        <button class="icon-btn add-to-reorder" data-id="${item.id}">Add to Reorder</button>
      </div>
    `;
    dashboardLowList.appendChild(li);
  });

  dashboardLowList.querySelectorAll('.add-to-reorder').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const item = items.find((i) => i.id === id);
      if (item) addToReorder(item);
    });
  });
}

function renderInventory(filterText = '') {
  inventoryList.innerHTML = '';
  const query = filterText.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (!query) return true;
    return (
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  if (!filtered.length) {
    inventoryEmpty.style.display = 'block';
  } else {
    inventoryEmpty.style.display = 'none';
  }

  filtered.forEach((item) => {
    const status = getStatus(item);
    const li = document.createElement('li');
    li.className = 'item-card';
    const beam = status === 'LOW_STOCK' ? '<div class="border-beam" aria-hidden="true"></div>' : '';
    li.innerHTML = `
      ${beam}
      <div class="item-main">
        <div class="item-title">${escapeHtml(item.name)}</div>
        <div class="item-meta">${escapeHtml(item.category || '')} · ${escapeHtml(item.unit || '')} · Qty: ${item.quantity} / Min: ${item.minimumQuantity}</div>
      </div>
      <div class="item-actions">
        <span class="badge ${status === 'LOW_STOCK' ? 'badge-low' : 'badge-ok'}">${status === 'LOW_STOCK' ? 'Low Stock' : 'OK'}</span>
        <button class="icon-btn edit-item" data-id="${item.id}">Edit</button>
        <button class="icon-btn danger delete-item" data-id="${item.id}">Delete</button>
      </div>
    `;
    inventoryList.appendChild(li);
  });

  inventoryList.querySelectorAll('.edit-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      openEditForm(id);
    });
  });

  inventoryList.querySelectorAll('.delete-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      deleteItem(id);
    });
  });
}

function renderReorder() {
  reorderList.innerHTML = '';
  const pending = reorderItems();

  if (!pending.length) {
    reorderEmpty.style.display = 'block';
    markAllOrderedBtn.classList.add('hidden');
  } else {
    reorderEmpty.style.display = 'none';
    markAllOrderedBtn.classList.remove('hidden');
  }

  pending.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'item-card';
    li.dataset.id = item.id;
    li.innerHTML = `
      <div class="item-main">
        <div class="item-title">${escapeHtml(item.name)}</div>
        <div class="item-meta">${escapeHtml(item.unit || '')} · ${item.quantity}</div>
      </div>
      <div class="item-actions">
        <button class="icon-btn danger remove-reorder" data-id="${item.id}">Remove</button>
      </div>
    `;
    reorderList.appendChild(li);
  });

  reorderList.querySelectorAll('.remove-reorder').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      removeFromReorder(id);
    });
  });
}

function renderMessage() {
  const pending = reorderItems();
  if (!pending.length) {
    messageText.textContent = 'No items pending reorder.';
    return;
  }

  const lines = pending.map(
    (item) => `- ${item.name} — ${item.quantity} ${item.unit || ''}`.trim()
  );
  const message = `Hi, I'd like to reorder:\n${lines.join('\n')}\nPlease confirm availability.`;
  messageText.textContent = message;
}

function reorderItems() {
  return items.filter((item) => item.inReorder);
}

function addToReorder(item) {
  item.inReorder = true;
  refreshAll();
}

function removeFromReorder(id) {
  const item = items.find((i) => i.id === id);
  if (item) item.inReorder = false;
  renderReorder();
  renderDashboard();
}

function markOrdered() {
  items.forEach((item) => {
    if (item.inReorder) {
      item.inReorder = false;
      item.quantity = item.quantity + item.minimumQuantity;
    }
  });
  renderReorder();
  renderDashboard();
  renderMessage();
  renderInventory();
}

function markAllOrdered() {
  markOrdered();
}

function openAddForm() {
  formTitle.textContent = 'Add Item';
  editIdInput.value = '';
  itemForm.reset();
  clearFormNote();
  formScreen.classList.add('active');
  screens.forEach((screen) => screen.classList.remove('active'));
  navLinks.forEach((link) => link.classList.remove('active'));
}

function openEditForm(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;

  formTitle.textContent = 'Edit Item';
  editIdInput.value = item.id;
  nameInput.value = item.name;
  categoryInput.value = item.category || '';
  quantityInput.value = item.quantity;
  unitInput.value = item.unit || '';
  minimumQuantityInput.value = item.minimumQuantity;
  clearFormNote();

  formScreen.classList.add('active');
  screens.forEach((screen) => screen.classList.remove('active'));
  navLinks.forEach((link) => link.classList.remove('active'));
}

function saveItem(e) {
  e.preventDefault();

  const name = nameInput.value.trim();
  if (!name) return;

  const payload = {
    name,
    category: categoryInput.value.trim(),
    quantity: Number(quantityInput.value),
    unit: unitInput.value.trim(),
    minimumQuantity: Number(minimumQuantityInput.value),
  };

  const existingId = editIdInput.value ? Number(editIdInput.value) : null;

  if (existingId) {
    const item = items.find((i) => i.id === existingId);
    if (item) {
      Object.assign(item, payload);
    }
  } else {
    items.push({
      id: nextId++,
      ...payload,
      inReorder: false,
    });
  }

  itemForm.reset();
  editIdInput.value = '';
  switchScreen('inventory');
}

function deleteItem(id) {
  items = items.filter((i) => i.id !== id);
  renderInventory(searchInput.value);
  renderDashboard();
}

function cancelForm() {
  itemForm.reset();
  editIdInput.value = '';
  switchScreen('inventory');
}

function clearFormNote() {
  const existing = itemForm.querySelector('.suggest-note');
  if (existing) existing.remove();
}

const AI_BEAM_GRADIENT_ID = 'aiBeamGradient';

function renderAiBeam() {
  if (!aiBeam) return;
  const formRect = itemForm.getBoundingClientRect();
  const fromRect = suggestDetailsBtn.getBoundingClientRect();
  const toRect = aiBeamNode.getBoundingClientRect();

  const startX = fromRect.right - formRect.left;
  const startY = fromRect.top + fromRect.height / 2 - formRect.top;
  const endX = toRect.left - formRect.left;
  const endY = toRect.top + toRect.height / 2 - formRect.top;

  const curvature = -110;
  const controlY = startY + curvature;
  const midX = (startX + endX) / 2;
  const d = `M ${startX},${startY} Q ${midX},${controlY} ${endX},${endY}`;

  aiBeam.setAttribute('viewBox', `0 0 ${formRect.width} ${aiBeam.parentElement.clientHeight}`);
  aiBeam.innerHTML = `
    <defs>
      <linearGradient id="${AI_BEAM_GRADIENT_ID}" gradientUnits="userSpaceOnUse" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}">
        <stop offset="0%" stop-color="#ffaa40" stop-opacity="0" />
        <stop offset="10%" stop-color="#ffaa40" stop-opacity="1" />
        <stop offset="50%" stop-color="#9c40ff" stop-opacity="1" />
        <stop offset="90%" stop-color="#9c40ff" stop-opacity="0" />
      </linearGradient>
      <radialGradient id="aiBeamDotGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffd9a8" />
        <stop offset="40%" stop-color="#ffaa40" />
        <stop offset="100%" stop-color="#9c40ff" />
      </radialGradient>
      <path id="aiBeamMotionPath" d="${d}" />
    </defs>
    <path class="beam-path-bg" d="${d}" />
    <path class="beam-path-fg" d="${d}" />
    <circle class="beam-dot" r="4">
      <animateMotion dur="1.6s" repeatCount="indefinite" rotate="auto">
        <mpath href="#aiBeamMotionPath" />
      </animateMotion>
    </circle>
  `;
}

function startAiBeam() {
  if (!aiBeam) return;
  renderAiBeam();
  aiBeam.classList.add('active');
  if (aiBeamNode) aiBeamNode.classList.add('active');
  window.addEventListener('resize', renderAiBeam);
}

function stopAiBeam() {
  if (!aiBeam) return;
  aiBeam.classList.remove('active');
  if (aiBeamNode) aiBeamNode.classList.remove('active');
  window.removeEventListener('resize', renderAiBeam);
}

function showFormNote(message, type = 'error') {
  clearFormNote();
  const note = document.createElement('p');
  note.className = `suggest-note ${type}`;
  note.textContent = message;
  const actionsEl = el('itemForm').querySelector('.form-actions');
  actionsEl.insertAdjacentElement('beforebegin', note);
}

const ALLOWED_CATEGORIES = ['Dairy', 'Grains', 'Bakery', 'Vegetables', 'Fruits', 'Other'];

async function suggestDetails() {
  const itemName = nameInput.value.trim();
  if (!itemName) {
    showFormNote('Please enter an item name first.', 'error');
    nameInput.focus();
    return;
  }

  clearFormNote();
  suggestDetailsBtn.disabled = true;
  suggestDetailsBtn.textContent = 'Thinking...';
  startAiBeam();

  const prompt = `Given a single grocery item name, suggest its category, its usual unit, and a reasonable minimum stock threshold for a household.

Item name: "${itemName}"

Rules:
- category must be exactly one of: "Dairy", "Grains", "Bakery", "Vegetables", "Fruits", "Other"
- unit must be a short string (e.g. "L", "kg", "pcs", "loaf")
- suggestedMinimum must be a positive number
- confidence must be a number between 0 and 1

Output: Respond with ONLY valid JSON, no extra text, in exactly this shape:
{"category": "...", "unit": "...", "suggestedMinimum": 0, "confidence": 0.0}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rawText) {
      throw new Error('Empty response from Gemini API.');
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error('Could not parse Gemini response as JSON. Please fill in manually.');
    }

    if (!ALLOWED_CATEGORIES.includes(parsed.category)) {
      throw new Error(`Invalid category "${parsed.category}". Allowed: ${ALLOWED_CATEGORIES.join(', ')}.`);
    }

    const confidence = Number(parsed.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      throw new Error('Invalid confidence value from Gemini.');
    }

    categoryInput.value = parsed.category;
    unitInput.value = parsed.unit || '';
    minimumQuantityInput.value = parsed.suggestedMinimum;

    if (confidence < 0.5) {
      showFormNote('Low confidence — please double-check the suggested values.', 'warning');
    } else {
      showFormNote('Details suggested — please review and click Save.', 'success');
    }
  } catch (err) {
    showFormNote(err.message || 'Failed to get suggestions. Please fill in manually.', 'error');
  } finally {
    suggestDetailsBtn.disabled = false;
    suggestDetailsBtn.textContent = 'Suggest details';
    stopAiBeam();
  }
}

function refreshAll() {
  if (currentScreen === 'dashboard') renderDashboard();
  if (currentScreen === 'inventory') renderInventory(searchInput.value);
  if (currentScreen === 'reorder') renderReorder();
  if (currentScreen === 'message') renderMessage();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const screen = link.dataset.screen;
    if (screen) switchScreen(screen);
  });
});

el('addItemNavBtn').addEventListener('click', openAddForm);
itemForm.addEventListener('submit', saveItem);
cancelFormBtn.addEventListener('click', cancelForm);
suggestDetailsBtn.addEventListener('click', suggestDetails);

el('dashboardActionBtn').addEventListener('click', () => {
  alert('Dashboard action button clicked!');
});

searchInput.addEventListener('input', () => {
  renderInventory(searchInput.value);
});

markAllOrderedBtn.addEventListener('click', (e) => {
  fireMiniConfetti(e.currentTarget);
  markAllOrdered();
});
el('markOrderedBtn').addEventListener('click', (e) => {
  fireMiniConfetti(e.currentTarget);
  markOrdered();
});

el('copyMessageBtn').addEventListener('click', async () => {
  const text = messageText.textContent || '';
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = 'Copied to clipboard.';
    setTimeout(() => {
      copyStatus.textContent = '';
    }, 2000);
  } catch (err) {
    copyStatus.textContent = 'Unable to copy automatically.';
  }
});

function seedData() {
  const sampleItems = [
    { name: 'Milk', category: 'Dairy', quantity: 2, unit: 'L', minimumQuantity: 3 },
    { name: 'Rice', category: 'Grains', quantity: 1.5, unit: 'kg', minimumQuantity: 2 },
    { name: 'Eggs', category: 'Dairy', quantity: 6, unit: 'pcs', minimumQuantity: 12 },
    { name: 'Bread', category: 'Bakery', quantity: 1, unit: 'loaf', minimumQuantity: 1 },
    { name: 'Tomatoes', category: 'Vegetables', quantity: 0.5, unit: 'kg', minimumQuantity: 1 },
  ];

  sampleItems.forEach((item) => {
    items.push({
      id: nextId++,
      ...item,
      inReorder: false,
    });
  });
}

seedData();
function applyShimmerToHeadings() {
  const targets = document.querySelectorAll(
    '#screen-dashboard h2, #screen-inventory h2, #screen-reorder h2, #screen-message h2'
  );
  targets.forEach((h) => h.classList.add('text-shimmer'));
}

function fireMiniConfetti(button) {
  if (!button) return;
  const rect = button.getBoundingClientRect();
  const origin = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };

  const colors = ['#ffaa40', '#9c40ff', '#FE8BBB', '#ffd166', '#4ade80'];
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const particles = [];
  const count = 60;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 4;
    particles.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      gravity: 0.16,
      size: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 0,
      maxLife: 70 + Math.random() * 30,
    });
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach((p) => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vr;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (alpha > 0) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (alive) requestAnimationFrame(frame);
    else canvas.remove();
  }
  frame();
}

applyShimmerToHeadings();
switchScreen('dashboard');
