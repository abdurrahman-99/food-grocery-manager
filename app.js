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

function getStatus(item) {
  return item.quantity < item.minimumQuantity ? 'LOW_STOCK' : 'OK';
}

function getLowStock() {
  return items.filter((item) => getStatus(item) === 'LOW_STOCK');
}

function switchScreen(screenId) {
  currentScreen = screenId;

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

  dashboardLowList.innerHTML = '';
  const lowItems = getLowStock();

  if (!lowItems.length) {
    dashboardEmpty.style.display = 'block';
    return;
  }

  dashboardEmpty.style.display = 'none';
  lowItems.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'item-card';
    li.innerHTML = `
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
    li.innerHTML = `
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

searchInput.addEventListener('input', () => {
  renderInventory(searchInput.value);
});

markAllOrderedBtn.addEventListener('click', markAllOrdered);
el('markOrderedBtn').addEventListener('click', markOrdered);

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
switchScreen('dashboard');
