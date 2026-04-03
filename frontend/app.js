/* ═══════════════════════════════════════════════════════
   ToDoApp Frontend — Spring Boot REST API Client
   Base URL: http://localhost:8080
   Endpoints:
     GET    /tasks         → getAllTasks
     GET    /tasks/{id}    → getTaskById
     POST   /tasks         → createTask
     PUT    /tasks/{id}    → updateTask
     DELETE /tasks/{id}    → deleteTask
   ═══════════════════════════════════════════════════════ */

const BASE_URL = 'http://localhost:8081';

// ── State ──────────────────────────────────────────────
let tasks        = [];
let editingId    = null;
let statusValue  = false;   // false = pending, true = completed
let currentFilter = 'all';

// ── DOM refs ───────────────────────────────────────────
const taskList   = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const logEntry   = document.getElementById('logEntry');
const panelTag   = document.querySelector('.panel-tag');
const panelTitle = document.getElementById('formTitle');
const submitBtn  = document.getElementById('submitBtn');
const cancelBtn  = document.getElementById('cancelBtn');
const statusDot  = document.getElementById('statusDot');
const statusLbl  = document.getElementById('statusLabel');
const toast      = document.getElementById('toast');

// ── Init ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadTasks();
});

// ── API Helpers ─────────────────────────────────────────

async function apiFetch(method, path, body = null) {
  const url = BASE_URL + path;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  setLog(`${method} ${path}`, body);

  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    // DELETE may return 204 No Content
    if (res.status === 204 || res.headers.get('content-length') === '0') return null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return await res.json();
    return null;
  } catch (err) {
    throw err;
  }
}

// ── Load All Tasks (GET /tasks) ─────────────────────────
async function loadTasks() {
  const btn = document.querySelector('.btn-refresh');
  btn.classList.add('spinning');

  try {
    tasks = await apiFetch('GET', '/tasks') || [];
    setOnline(true);
    renderTasks();
    updateStats();
  } catch (err) {
    setOnline(false);
    showToast('Cannot reach API at ' + BASE_URL, 'error');
  } finally {
    btn.classList.remove('spinning');
  }
}

// ── Create Task (POST /tasks) ───────────────────────────
async function createTask(data) {
  panelTag.textContent = 'POST /tasks';
  const task = await apiFetch('POST', '/tasks', data);
  showToast('Task created ✓', 'success');
  return task;
}

// ── Update Task (PUT /tasks/{id}) ───────────────────────
async function updateTask(id, data) {
  panelTag.textContent = `PUT /tasks/${id}`;
  const task = await apiFetch('PUT', `/tasks/${id}`, data);
  showToast('Task updated ✓', 'success');
  return task;
}

// ── Delete Task (DELETE /tasks/{id}) ───────────────────
async function deleteTask(id) {
  await apiFetch('DELETE', `/tasks/${id}`);
  showToast('Task deleted', 'error');
}

// ── Toggle Status (PUT /tasks/{id}) ────────────────────
async function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const updated = { ...task, completed: !task.completed };
  try {
    await apiFetch('PUT', `/tasks/${id}`, updated);
    task.completed = !task.completed;
    renderTasks();
    updateStats();
    showToast(task.completed ? 'Marked complete ✓' : 'Marked pending', 'success');
  } catch (err) {
    showToast('Update failed: ' + err.message, 'error');
  }
}

// ── Submit Form (Create or Update) ─────────────────────
async function submitTask() {
  const title = document.getElementById('taskTitle').value.trim();

  if (!title) {
    shakeInput('taskTitle');
    showToast('Title is required', 'error');
    return;
  }

  const payload = {
    taskName: title,
    completed: statusValue,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = editingId ? 'Saving…' : 'Adding…';

  try {
    if (editingId) {
      const updated = await updateTask(editingId, { taskName: payload.taskName, completed: payload.completed, id: editingId });
      const idx = tasks.findIndex(t => t.id === editingId);
      if (idx !== -1) tasks[idx] = updated || { ...payload, id: editingId };
    } else {
      const created = await createTask(payload);
      if (created) tasks.unshift(created);
    }

    resetForm();
    renderTasks();
    updateStats();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = editingId
      ? '<span class="btn-icon">✓</span> Save'
      : '<span class="btn-icon">+</span> Add Task';
  }
}

// ── Edit Task ──────────────────────────────────────────
function startEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingId = id;

  document.getElementById('taskTitle').value = task.taskName || '';
  document.getElementById('taskDesc').value  = '';
  setStatus(task.completed || false);

  panelTitle.textContent   = 'Edit Task';
  panelTag.textContent     = `PUT /tasks/${id}`;
  submitBtn.innerHTML      = '<span class="btn-icon">✓</span> Save';
  cancelBtn.style.display  = 'inline-flex';

  document.getElementById('taskTitle').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Cancel Edit ────────────────────────────────────────
function cancelEdit() {
  editingId = null;
  resetForm();
}

function resetForm() {
  editingId = null;
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value  = '';
  setStatus(false);
  panelTitle.textContent  = 'New Task';
  panelTag.textContent    = 'POST /tasks';
  submitBtn.innerHTML     = '<span class="btn-icon">+</span> Add Task';
  cancelBtn.style.display = 'none';
}

// ── Delete with confirm ────────────────────────────────
async function confirmDelete(id) {
  try {
    await deleteTask(id);
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
    updateStats();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ── Render ─────────────────────────────────────────────
function renderTasks() {
  const filtered = tasks.filter(t => {
    if (currentFilter === 'pending') return !t.completed;
    if (currentFilter === 'done')    return t.completed;
    return true;
  });

  taskList.innerHTML = '';

  if (filtered.length === 0) {
    const msg = currentFilter === 'all'
      ? 'No tasks yet. Add one!'
      : currentFilter === 'done'
        ? 'No completed tasks.'
        : 'No pending tasks.';
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◎</div>
        <p>${msg}</p>
      </div>`;
    return;
  }

  filtered.forEach((task, i) => {
    const card = document.createElement('div');
    card.className = `task-card ${task.completed ? 'done' : ''}`;
    card.style.animationDelay = `${i * 0.04}s`;

    card.innerHTML = `
      <div class="task-check" onclick="toggleTask(${task.id})" title="Toggle status">
        ${task.completed ? '✓' : ''}
      </div>
      <div class="task-body">
        <div class="task-title">${escHtml(task.taskName || 'Untitled')}</div>
        <div class="task-meta">
          <span class="task-id">#${task.id}</span>
          <span class="task-badge ${task.completed ? 'done' : 'pending'}">
            ${task.completed ? 'Completed' : 'Pending'}
          </span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon-sm" onclick="startEdit(${task.id})" title="Edit">✎</button>
        <button class="btn-icon-sm del" onclick="confirmDelete(${task.id})" title="Delete">✕</button>
      </div>
    `;
    taskList.appendChild(card);
  });
}

// ── Stats ──────────────────────────────────────────────
function updateStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.completed).length;
  const pending = total - done;

  animateNum('statTotal',   total);
  animateNum('statPending', pending);
  animateNum('statDone',    done);
}

function animateNum(id, target) {
  const el = document.getElementById(id);
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;
  const diff = target - current;
  const steps = 12;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    el.textContent = Math.round(current + diff * (step / steps));
    if (step >= steps) clearInterval(interval);
  }, 20);
}

// ── Filter ─────────────────────────────────────────────
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

// ── Status Toggle ──────────────────────────────────────
function setStatus(completed) {
  statusValue = completed;
  document.getElementById('togglePending').classList.toggle('active', !completed);
  document.getElementById('toggleDone').classList.toggle('active', completed);
}

// ── Utilities ──────────────────────────────────────────
function setOnline(online) {
  statusDot.className = 'status-dot ' + (online ? 'online' : 'offline');
  statusLbl.textContent = online ? 'API Connected' : 'API Offline';
}

function setLog(endpoint, body = null) {
  let text = endpoint;
  if (body) text += ` · ${JSON.stringify(body).slice(0, 80)}`;
  logEntry.textContent = text;
}

let toastTimer;
function showToast(msg, type = '') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className   = `toast show ${type}`;
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 2800);
}

function shakeInput(id) {
  const el = document.getElementById(id);
  el.style.borderColor = 'var(--red)';
  el.style.boxShadow   = '0 0 0 3px var(--red-dim)';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow   = '';
  }, 1200);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}