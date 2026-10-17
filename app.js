// Supabase Entegrasyonu - Sabit Değerler
const SUPABASE_URL = "https://mssjazycznwxnqhxrbuv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iO5wNMRbtTnq7LttphegXA_zXB6rgaP";

let state = {
  habits: [
    { id: "tez", title: "Tez Yazımı & Araştırma", color: "#ef4444" },
    { id: "akreditasyon", title: "Akreditasyon Dosyaları", color: "#10b981" },
    { id: "dergi", title: "Dergi Hakem Revizyonu", color: "#ec4899" },
    { id: "okuma", title: "Literatür & Okuma", color: "#8b5cf6" }
  ],
  logs: {},
  tasks: [],
  selectedHabit: null,
  selectedDate: null,
  supabaseClient: null
};

function getLast30Days() {
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

window.onload = () => {
  loadLocalState();
  initSupabase();
  renderAll();
};

function loadLocalState() {
  const savedLogs = localStorage.getItem('sumen_logs');
  if (savedLogs) state.logs = JSON.parse(savedLogs);
  const savedTasks = localStorage.getItem('sumen_tasks');
  if (savedTasks) state.tasks = JSON.parse(savedTasks);
}

function initSupabase() {
  if (window.supabase) {
    state.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    checkUserSession();
  }
}

async function checkUserSession() {
  if (!state.supabaseClient) return;
  const { data: { session } } = await state.supabaseClient.auth.getSession();
  const authBtn = document.getElementById('auth-btn');
  if (session) {
    authBtn.innerHTML = `<i class="fas fa-user-check text-emerald-400"></i> ${session.user.email.split('@')[0]}`;
    authBtn.classList.replace('bg-indigo-600', 'bg-slate-700');
    pullCloudData();
  }
}

async function handleAuthClick() {
  if (!state.supabaseClient) return;
  await state.supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
}

async function pullCloudData() {
  if (!state.supabaseClient) return;
  const { data: logs } = await state.supabaseClient.from('habit_logs').select('*');
  if (logs) {
    logs.forEach(l => {
      state.logs[`${l.habit_id}_${l.log_date}`] = {
        minutes: l.duration_minutes,
        subtopic: l.subtopic,
        notes: l.notes
      };
    });
  }
  const { data: tasks } = await state.supabaseClient.from('tasks').select('*');
  if (tasks) {
    state.tasks = tasks.map(t => ({ id: t.id, text: t.title, category: t.category, done: t.is_completed }));
  }
  renderAll();
}

function renderAll() {
  renderMetrics();
  renderMatrix();
  renderTasks();
  renderSubtopicAnalysis();
}

function renderMetrics() {
  const bar = document.getElementById('metrics-bar');
  bar.innerHTML = '';
  state.habits.forEach(h => {
    let totalMins = 0;
    let count = 0;
    Object.keys(state.logs).forEach(k => {
      if (k.startsWith(h.id + '_')) {
        count++;
        totalMins += (state.logs[k].minutes || 0);
      }
    });
    const hours = (totalMins / 60).toFixed(1);
    bar.innerHTML += `
      <div class="bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex flex-col justify-between" style="border-left: 4px solid ${h.color}">
        <span class="text-xs text-slate-400 font-semibold">${h.title}</span>
        <div class="flex items-baseline gap-2 mt-1">
          <span class="text-2xl font-bold">${count} Gün</span>
          <span class="text-xs text-slate-400">(${hours} Saat)</span>
        </div>
      </div>
    `;
  });
}

function renderMatrix() {
  const days = getLast30Days();
  const header = document.getElementById('matrix-header');
  const rows = document.getElementById('matrix-rows');

  header.innerHTML = days.map(d => {
    const parts = d.split('-');
    return `<div class="w-8 text-center text-[10px] text-slate-400 font-mono">${parts[2]}<br>${parts[1]}</div>`;
  }).join('');

  rows.innerHTML = '';
  state.habits.forEach(h => {
    let rowHtml = `<div class="flex items-center gap-2">
      <div class="w-32 text-xs font-bold truncate text-slate-200" title="${h.title}">${h.title}</div>
      <div class="flex gap-2">`;

    days.forEach(d => {
      const key = `${h.id}_${d}`;
      const rec = state.logs[key];
      const hasRecord = !!rec;
      const bg = hasRecord ? h.color : '#1e293b';
      const title = hasRecord ? `${d} | ${rec.minutes} dk | ${rec.subtopic || ''}` : `${d}`;

      rowHtml += `
        <button onclick="openLogModal('${h.id}', '${d}')" 
                title="${title}"
                style="background-color: ${bg};" 
                class="w-8 h-8 rounded-md transition transform hover:scale-110 border border-slate-700/60 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
          ${hasRecord ? (rec.minutes || '') : ''}
        </button>
      `;
    });

    rowHtml += `</div></div>`;
    rows.innerHTML += rowHtml;
  });
}

function openLogModal(habitId, dateStr) {
  state.selectedHabit = habitId;
  state.selectedDate = dateStr;
  const habit = state.habits.find(h => h.id === habitId);
  const rec = state.logs[`${habitId}_${dateStr}`] || {};

  document.getElementById('modal-habit-title').innerText = `${habit.title} Kaydı`;
  document.getElementById('modal-date-label').innerText = dateStr;
  document.getElementById('modal-duration').value = rec.minutes || 30;
  document.getElementById('modal-subtopic').value = rec.subtopic || '';
  document.getElementById('modal-notes').value = rec.notes || '';

  const delBtn = document.getElementById('btn-delete-log');
  if (rec.minutes) delBtn.classList.remove('hidden'); else delBtn.classList.add('hidden');

  const modal = document.getElementById('log-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeModal() {
  const modal = document.getElementById('log-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function setMinutes(m) {
  document.getElementById('modal-duration').value = m;
}

async function saveCurrentLog() {
  const key = `${state.selectedHabit}_${state.selectedDate}`;
  const minutes = parseInt(document.getElementById('modal-duration').value) || 30;
  const subtopic = document.getElementById('modal-subtopic').value;
  const notes = document.getElementById('modal-notes').value;

  state.logs[key] = { minutes, subtopic, notes };
  localStorage.setItem('sumen_logs', JSON.stringify(state.logs));

  if (state.supabaseClient) {
    const { data: { session } } = await state.supabaseClient.auth.getSession();
    if (session) {
      await state.supabaseClient.from('habit_logs').upsert({
        habit_id: state.selectedHabit,
        user_id: session.user.id,
        log_date: state.selectedDate,
        duration_minutes: minutes,
        subtopic: subtopic,
        notes: notes
      }, { onConflict: 'habit_id,log_date' });
    }
  }

  closeModal();
  renderAll();
}

async function deleteCurrentLog() {
  const key = `${state.selectedHabit}_${state.selectedDate}`;
  delete state.logs[key];
  localStorage.setItem('sumen_logs', JSON.stringify(state.logs));

  if (state.supabaseClient) {
    await state.supabaseClient.from('habit_logs')
      .delete()
      .match({ habit_id: state.selectedHabit, log_date: state.selectedDate });
  }

  closeModal();
  renderAll();
}

function addTask(cat) {
  const input = document.getElementById(cat === 'is' ? 'input-task' : 'input-home');
  if (!input.value.trim()) return;
  const newTask = { id: Date.now().toString(), text: input.value.trim(), category: cat, done: false };
  state.tasks.push(newTask);
  localStorage.setItem('sumen_tasks', JSON.stringify(state.tasks));

  if (state.supabaseClient) {
    state.supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        state.supabaseClient.from('tasks').insert({
          title: newTask.text,
          category: cat,
          is_completed: false,
          user_id: session.user.id
        });
      }
    });
  }

  input.value = '';
  renderTasks();
}

function toggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (t) {
    t.done = !t.done;
    localStorage.setItem('sumen_tasks', JSON.stringify(state.tasks));
    if (state.supabaseClient) {
      state.supabaseClient.from('tasks').update({ is_completed: t.done }).eq('id', id);
    }
    renderTasks();
  }
}

function renderTasks() {
  const listTasks = document.getElementById('list-tasks');
  const listHome = document.getElementById('list-home');
  listTasks.innerHTML = '';
  listHome.innerHTML = '';

  state.tasks.forEach(t => {
    const item = `
      <li class="flex items-center justify-between text-xs p-2 rounded bg-slate-900 border border-slate-700/50">
        <span class="${t.done ? 'line-through text-slate-500' : 'text-slate-200'}">${t.text}</span>
        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTask('${t.id}')" class="rounded accent-amber-500">
      </li>
    `;
    if (t.category === 'is') listTasks.innerHTML += item;
    else listHome.innerHTML += item;
  });
}

function renderSubtopicAnalysis() {
  const container = document.getElementById('subtopics-summary');
  container.innerHTML = '';
  const breakdown = {};

  Object.entries(state.logs).forEach(([k, val]) => {
    const habitId = k.split('_')[0];
    const sub = val.subtopic ? val.subtopic.trim() : 'Genel Çalışma';
    if (!breakdown[habitId]) breakdown[habitId] = {};
    breakdown[habitId][sub] = (breakdown[habitId][sub] || 0) + (val.minutes || 0);
  });

  state.habits.forEach(h => {
    const items = breakdown[h.id] || {};
    let listHtml = '';
    Object.entries(items).forEach(([sub, mins]) => {
      listHtml += `<li class="flex justify-between text-xs py-1 border-b border-slate-700/40">
        <span class="text-slate-300">${sub}</span>
        <span class="font-bold text-slate-400">${(mins/60).toFixed(1)} sa (${mins} dk)</span>
      </li>`;
    });

    container.innerHTML += `
      <div class="bg-slate-900/60 p-4 rounded-lg border border-slate-700/60">
        <h4 class="text-xs font-bold uppercase tracking-wider mb-2" style="color: ${h.color}">${h.title}</h4>
        <ul class="flex flex-col">${listHtml || '<span class="text-xs text-slate-500">Kayıt girilmedi</span>'}</ul>
      </div>
    `;
  });
}
