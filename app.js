const SUPABASE_URL = "https://mssjazycznwxnqhxrbuv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iO5wNMRbtTnq7LttphegXA_zXB6rgaP";

let state = {
  habits: [
    { id: "tez", title: "Doktora Tezi" },
    { id: "makale", title: "Dergi & Makale" },
    { id: "akreditasyon", title: "Akreditasyon Dosyaları" },
    { id: "okuma", title: "Literatür & Okuma" }
  ],
  activeHabitId: "tez",
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
  displayCurrentDate();
  populateHabitSelect();
  loadLocalState();
  initSupabase();
  renderAll();
};

function displayCurrentDate() {
  const d = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('current-date-label').innerText = d.toLocaleDateString('tr-TR', options);
}

function populateHabitSelect() {
  const sel = document.getElementById('habit-select');
  sel.innerHTML = state.habits.map(h => `<option value="${h.id}">${h.title}</option>`).join('');
  sel.value = state.activeHabitId;
}

function changeHabit(val) {
  state.activeHabitId = val;
  renderAll();
}

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
    authBtn.innerHTML = `<i class="fas fa-user-check text-emerald-600"></i> ${session.user.email.split('@')[0]}`;
    authBtn.classList.replace('bg-slate-100', 'bg-emerald-50');
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
    state.tasks = tasks.map(t => ({ id: t.id, text: t.title, done: t.is_completed }));
  }
  renderAll();
}

function renderAll() {
  renderMetrics();
  renderCalendar();
  renderTasks();
  renderHabitHistory();
}

function renderMetrics() {
  let totalMins = 0;
  let activeDays = 0;
  const days = getLast30Days();

  days.forEach(d => {
    const key = `${state.activeHabitId}_${d}`;
    if (state.logs[key] && state.logs[key].minutes > 0) {
      totalMins += state.logs[key].minutes;
      activeDays++;
    }
  });

  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  document.getElementById('metric-total-time').innerText = `${hours} sa ${mins} dk`;
  document.getElementById('metric-streak').innerText = `${activeDays} Gün`;

  const doneTasks = state.tasks.filter(t => t.done).length;
  document.getElementById('metric-completed-tasks').innerText = `${doneTasks} Adet`;

  const rhythm = Math.round((activeDays / 30) * 100);
  document.getElementById('metric-rhythm').innerText = `%${rhythm}`;
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  const days = getLast30Days();

  days.forEach((d, idx) => {
    const key = `${state.activeHabitId}_${d}`;
    const rec = state.logs[key];
    const dayNum = idx + 1;

    let bgClass = "bg-[#fbfaf8] hover:bg-slate-100 border-[#e5e2da]";
    let textClass = "text-slate-400";
    let badgeHtml = `<span class="text-[10px] text-slate-300 font-medium">+ Ekle</span>`;

    if (rec && rec.minutes > 0) {
      const m = rec.minutes;
      if (m <= 30) bgClass = "bg-blue-100 border-blue-200 text-blue-900";
      else if (m <= 60) bgClass = "bg-blue-300 border-blue-400 text-blue-950";
      else if (m <= 90) bgClass = "bg-blue-500 border-blue-600 text-white";
      else bgClass = "bg-blue-700 border-blue-800 text-white";

      const sub = rec.subtopic ? `<p class="text-[10px] truncate max-w-full opacity-90">${rec.subtopic}</p>` : '';
      badgeHtml = `
        <span class="text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/15">${m} dk</span>
        ${sub}
      `;
      textClass = (m > 60) ? "text-white/80" : "text-blue-900/80";
    }

    grid.innerHTML += `
      <div onclick="openLogModal('${state.activeHabitId}', '${d}')" 
           class="border rounded-xl p-2.5 h-20 flex flex-col justify-between cursor-pointer transition transform hover:scale-[1.02] shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${bgClass}">
        <div class="flex justify-between items-center text-xs font-bold ${textClass}">
          <span>${dayNum}</span>
          <span class="text-[9px] font-mono opacity-60">${d.slice(5)}</span>
        </div>
        <div class="flex flex-col gap-0.5 items-start">
          ${badgeHtml}
        </div>
      </div>
    `;
  });
}

function renderHabitHistory() {
  const list = document.getElementById('habit-history-list');
  list.innerHTML = '';
  const days = getLast30Days().reverse();

  let hasItems = false;
  days.forEach((d) => {
    const key = `${state.activeHabitId}_${d}`;
    const rec = state.logs[key];
    if (rec && rec.minutes > 0) {
      hasItems = true;
      list.innerHTML += `
        <li class="flex items-center justify-between text-xs p-2 rounded-xl bg-[#fbfaf8] border border-[#e5e2da]">
          <span class="text-slate-700 truncate font-medium">${d}: ${rec.subtopic || 'Çalışma'}</span>
          <span class="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg text-[10px]">${rec.minutes} dk</span>
        </li>
      `;
    }
  });

  if (!hasItems) {
    list.innerHTML = `<span class="text-xs text-slate-400">Bu göreve ait kayıt yok.</span>`;
  }
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

  state.logs[key] = { minutes, subtopic };
  localStorage.setItem('sumen_logs', JSON.stringify(state.logs));

  if (state.supabaseClient) {
    const { data: { session } } = await state.supabaseClient.auth.getSession();
    if (session) {
      await state.supabaseClient.from('habit_logs').upsert({
        habit_id: state.selectedHabit,
        user_id: session.user.id,
        log_date: state.selectedDate,
        duration_minutes: minutes,
        subtopic: subtopic
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

function addTask() {
  const input = document.getElementById('input-task');
  if (!input.value.trim()) return;
  const newTask = { id: Date.now().toString(), text: input.value.trim(), done: false };
  state.tasks.push(newTask);
  localStorage.setItem('sumen_tasks', JSON.stringify(state.tasks));

  if (state.supabaseClient) {
    state.supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        state.supabaseClient.from('tasks').insert({
          title: newTask.text,
          category: 'is',
          is_completed: false,
          user_id: session.user.id
        });
      }
    });
  }

  input.value = '';
  renderTasks();
  renderMetrics();
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
    renderMetrics();
  }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(x => x.id !== id);
  localStorage.setItem('sumen_tasks', JSON.stringify(state.tasks));
  if (state.supabaseClient) {
    state.supabaseClient.from('tasks').delete().eq('id', id);
  }
  renderTasks();
  renderMetrics();
}

function renderTasks() {
  const list = document.getElementById('list-tasks');
  list.innerHTML = '';
  document.getElementById('task-badge').innerText = `${state.tasks.length} Adet`;

  state.tasks.forEach(t => {
    list.innerHTML += `
      <li class="flex items-center justify-between text-xs p-2 rounded-xl bg-[#fbfaf8] border border-[#e5e2da]">
        <div class="flex items-center gap-2 flex-1">
          <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTask('${t.id}')" class="rounded accent-blue-600 cursor-pointer">
          <span class="${t.done ? 'line-through text-slate-400' : 'text-slate-700'} font-medium truncate">${t.text}</span>
        </div>
        <button onclick="deleteTask('${t.id}')" class="text-slate-300 hover:text-rose-500 text-[11px] ml-2"><i class="fas fa-trash"></i></button>
      </li>
    `;
  });
}
