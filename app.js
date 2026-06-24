const API_BASE = 'http://localhost:4000/api';

let currentTab = 'not-started';
let activeModalId = null;
let queries = [];

const UNITS = [
  { name: 'Elevator Car B - North Wing', id: 'VTS-9921-X' },
  { name: 'Freight Lift - Block C',      id: 'VTS-3312-F' },
  { name: 'Elevator Car A - South Wing', id: 'VTS-7741-A' },
  { name: 'Passenger Lift - Tower 2',    id: 'VTS-5582-P' },
];

const formFields = ['f-name', 'f-address', 'f-mobile', 'f-query'];
const GOOGLE_FORM_URL = 'https://forms.gle/NhoWsyT5PyNg7Pma6';
const AUTO_REFRESH_MS = 20000;

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  return response.json();
}

function parseQuery(query) {
  return {
    ...query,
    time: typeof query.time === 'number' ? new Date(query.time) : new Date(query.time),
  };
}

async function loadQueries() {
  try {
    const data = await fetchJson('/queries');
    queries = data.map(parseQuery);
    renderQueries();
  } catch (error) {
    console.error(error);
    showToast('Unable to load queries from server.', 'error');
  }
}

async function createQueryOnServer(payload) {
  return fetchJson('/queries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function updateQueryOnServer(id, body) {
  return fetchJson(`/queries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function openQrForm() {
  if (!GOOGLE_FORM_URL || GOOGLE_FORM_URL.includes('your-google-form-url') || GOOGLE_FORM_URL.includes('YOUR_FORM_ID')) {
    // If no external Google Form is set, fallback to the built-in submit page
    switchPage('submit');
    showToast('No external Google Form configured — using internal form.', 'info');
    return;
  }
  window.open(GOOGLE_FORM_URL, '_blank');
}

function startAutoRefresh() {
  setInterval(async () => {
    if (document.getElementById('page-dashboard').classList.contains('active')) {
      await loadQueries();
    }
  }, AUTO_REFRESH_MS);
}

function genId() { return Math.random().toString(36).slice(2, 10); }
function genRef() { return 'QY-' + Math.floor(Math.random() * 9000 + 1000); }
function minsAgo(m) { return new Date(Date.now() - m * 60000); }
function timeAgo(date) {
  const dt = typeof date === 'number' ? new Date(date) : date;
  const diff = Math.floor((Date.now() - dt) / 60000);
  if (diff < 1)  return 'Just now';
  if (diff < 60) return diff + 'm ago';
  const h = Math.floor(diff / 60);
  if (h < 24)    return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const tabs = document.querySelectorAll('.nav-tab');
  tabs[page === 'submit' ? 0 : 1].classList.add('active');
  if (page === 'dashboard') {
    renderQueries();
  }
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  renderQueries();
}

async function handleSubmit() {
  const name    = document.getElementById('f-name').value.trim();
  const address = document.getElementById('f-address').value.trim();
  const mobile  = document.getElementById('f-mobile').value.trim();
  const query   = document.getElementById('f-query').value.trim();

  let valid = true;
  formFields.forEach(id => {
    const val = document.getElementById(id).value.trim();
    const err = document.getElementById('err-' + id.replace('f-', ''));
    if (!val) {
      document.getElementById(id).classList.add('error');
      err.classList.add('show');
      valid = false;
    } else {
      document.getElementById(id).classList.remove('error');
      err.classList.remove('show');
    }
  });

  if (!valid) return;

  const btn = document.getElementById('submit-btn');
  btn.classList.add('loading');
  btn.innerHTML = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="animation:spin .8s linear infinite"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Submitting...';

  try {
    const unitCard = document.getElementById('scanned-unit-card');
    const unitName = unitCard.querySelector('.unit-name').textContent;
    const unitId   = unitCard.querySelector('.unit-id').textContent.replace('ID: ', '');

    const created = await createQueryOnServer({
      name,
      address,
      mobile,
      unit: unitName,
      building: 'Submitted via Portal',
      description: query,
      priority: 'normal',
    });

    queries.unshift(parseQuery(created));
    document.getElementById('success-ref').textContent = 'REF: ' + created.ref;
    document.getElementById('query-form-inner').style.display = 'none';
    document.getElementById('success-overlay').classList.add('show');
    showToast('Query ' + created.ref + ' submitted successfully!', 'success');
  } catch (error) {
    console.error(error);
    showToast('Submit failed. Please try again.', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.innerHTML = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg> Submit Query';
  }
}

function resetForm() {
  formFields.forEach(id => {
    document.getElementById(id).value = '';
    document.getElementById(id).classList.remove('error');
  });
  document.querySelectorAll('.error-msg').forEach(e => e.classList.remove('show'));
  document.getElementById('query-form-inner').style.display = '';
  document.getElementById('success-overlay').classList.remove('show');
}

function updateStats() {
  document.getElementById('stat-total').textContent    = queries.length;
  document.getElementById('stat-critical').textContent = queries.filter(q => q.priority === 'critical').length;
  document.getElementById('stat-progress').textContent = queries.filter(q => q.status === 'in-progress').length;
  document.getElementById('stat-done').textContent     = queries.filter(q => q.status === 'done').length;

  document.getElementById('count-not-started').textContent = queries.filter(q => q.status === 'not-started').length;
  document.getElementById('count-in-progress').textContent = queries.filter(q => q.status === 'in-progress').length;
  document.getElementById('count-done').textContent        = queries.filter(q => q.status === 'done').length;
}

function renderQueries() {
  updateStats();
  const search   = document.getElementById('search-input').value.toLowerCase();
  const priority = document.getElementById('priority-filter').value;

  const filtered = queries.filter(q => {
    const matchTab      = q.status === currentTab;
    const matchSearch   = !search ||
      q.name.toLowerCase().includes(search) ||
      q.unit.toLowerCase().includes(search) ||
      q.ref.toLowerCase().includes(search) ||
      q.building.toLowerCase().includes(search);
    const matchPriority = !priority || q.priority === priority;
    return matchTab && matchSearch && matchPriority;
  });

  const list  = document.getElementById('queries-list');
  const empty = document.getElementById('empty-state');
  list.innerHTML = '';

  if (!filtered.length) {
    empty.classList.add('show');
    return;
  }
  empty.classList.remove('show');

  filtered.forEach(q => {
    const card = document.createElement('div');
    card.className = `query-card priority-${q.priority}`;
    card.innerHTML = `
      <div>
        <div class="qc-top">
          <span class="qc-ref">${q.ref}</span>
          <span class="pill ${q.status === 'not-started' ? 'not-started' : q.status === 'in-progress' ? 'in-progress' : 'done'}">
            ${q.status === 'not-started' ? 'Not Started' : q.status === 'in-progress' ? 'In Progress' : 'Done'}
          </span>
          ${q.priority === 'critical' ? '<span class="priority-badge critical">Critical</span>' : q.priority === 'high' ? '<span class="priority-badge high">High</span>' : ''}
        </div>
        <div class="qc-building">${q.building}</div>
        <div class="qc-unit">${q.unit}</div>
        <div class="qc-desc">"${q.description}"</div>
        <div class="qc-meta">
          <span class="qc-person">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            ${q.name}
          </span>
          <span class="qc-time">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            ${timeAgo(q.time)}
          </span>
        </div>
      </div>
      <div class="qc-actions">
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
          <div class="action-row">
            <button class="btn-xs primary" onclick="openModal('${q.id}')">View</button>
          </div>
          <div class="action-row">
            ${q.status !== 'in-progress' ? `<button class="btn-xs" onclick="setStatus('${q.id}','in-progress',event)">Start</button>` : ''}
            ${q.status !== 'done' ? `<button class="btn-xs" onclick="setStatus('${q.id}','done',event)">Resolve</button>` : ''}
          </div>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

async function setStatus(id, status, e) {
  if (e) e.stopPropagation();
  const q = queries.find(q => q.id === id);
  if (!q) return;

  try {
    const updated = await updateQueryOnServer(id, { status });
    const index = queries.findIndex(item => item.id === id);
    if (index !== -1) queries[index] = parseQuery(updated);
    renderQueries();
    showToast('Query ' + q.ref + ' marked as ' + (status === 'in-progress' ? 'In Progress' : 'Done') + '.', 'success');
  } catch (error) {
    console.error(error);
    showToast('Unable to update status.', 'error');
  }
}

function openModal(id) {
  const q = queries.find(q => q.id === id);
  if (!q) return;
  activeModalId = id;

  document.getElementById('modal-title').textContent = q.building;
  document.getElementById('modal-subtitle').textContent = q.unit + ' · ' + q.ref;

  document.getElementById('modal-body').innerHTML = `
    <div class="detail-row"><span class="detail-label">Submitted by</span><span class="detail-value">${q.name}</span></div>
    <div class="detail-row"><span class="detail-label">Mobile</span><span class="detail-value">${q.mobile}</span></div>
    <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${q.address}</span></div>
    <div class="detail-row"><span class="detail-label">Unit</span><span class="detail-value">${q.unit}</span></div>
    <div class="detail-row"><span class="detail-label">Priority</span><span class="detail-value"><span class="priority-badge ${q.priority}">${q.priority.charAt(0).toUpperCase()+q.priority.slice(1)}</span></span></div>
    <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">${q.description}</span></div>
    <div class="detail-row"><span class="detail-label">Received</span><span class="detail-value">${timeAgo(q.time)}</span></div>
    <div class="detail-row" style="border-bottom:none;margin-top:4px;">
      <span class="detail-label">Status</span>
      <span class="detail-value">
        <select class="status-select" id="modal-status-select">
          <option value="not-started" ${q.status==='not-started'?'selected':''}>Not Started</option>
          <option value="in-progress" ${q.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="done" ${q.status==='done'?'selected':''}>Done</option>
        </select>
      </span>
    </div>
  `;
  document.getElementById('modal-bg').classList.add('open');
}

function closeModal(e) {
  if (e.target === document.getElementById('modal-bg')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('modal-bg').classList.remove('open');
  activeModalId = null;
}

async function saveModalStatus() {
  if (!activeModalId) return;
  const q = queries.find(q => q.id === activeModalId);
  if (!q) return;
  const newStatus = document.getElementById('modal-status-select').value;

  try {
    const updated = await updateQueryOnServer(activeModalId, { status: newStatus });
    const index = queries.findIndex(item => item.id === activeModalId);
    if (index !== -1) queries[index] = parseQuery(updated);
    closeModalDirect();
    renderQueries();
    showToast('Status updated to "' + (newStatus === 'not-started' ? 'Not Started' : newStatus === 'in-progress' ? 'In Progress' : 'Done') + '".', 'success');
  } catch (error) {
    console.error(error);
    showToast('Unable to save status.', 'error');
  }
}

function showToast(msg, type = '') {
  const tc = document.getElementById('toast-container');
  const t  = document.createElement('div');
  t.className = 'toast ' + type;
  const icon = type === 'success'
    ? '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
    : '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/></svg>';
  t.innerHTML = icon + msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function init() {
  loadQueries();
  startAutoRefresh();
}

init();
