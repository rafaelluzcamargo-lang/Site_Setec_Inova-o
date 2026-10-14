/* ============================================
   RotinaPro — JavaScript Completo
   ============================================ */

const App = (() => {
  // ---------- State ----------
  const STORAGE_KEY = 'rotinapro_data';
  let data = {
    tasks: [],
    events: [],
    routines: [],
    habits: [],
    goals: [],
    notes: [],
    categories: [],
    activity: [],
    mood: null,
    settings: {
      theme: 'system',
      reduceMotion: false,
      defaultPriority: 'medium',
      weekStart: 0,
      confirmDelete: true
    }
  };

  let currentSection = 'dashboard';
  let calDate = new Date();
  let calView = 'month';
  let selectedCalDay = null;
  let editingId = null;
  let confirmCallback = null;

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayStr() {
    return formatDate(new Date());
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatDateBR(str) {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }

  function formatTime(str) {
    return str || '';
  }

  function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function daysDiff(a, b) {
    const ms = parseLocalDate(b) - parseLocalDate(a);
    return Math.round(ms / 86400000);
  }

  function startOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay();
    const start = data.settings.weekStart || 0;
    const diff = (day - start + 7) % 7;
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // ---------- Storage ----------
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        data = {
          tasks: parsed.tasks || [],
          events: parsed.events || [],
          routines: parsed.routines || [],
          habits: parsed.habits || [],
          goals: parsed.goals || [],
          notes: parsed.notes || [],
          categories: parsed.categories || [],
          activity: parsed.activity || [],
          mood: parsed.mood || null,
          settings: Object.assign({
            theme: 'system',
            reduceMotion: false,
            defaultPriority: 'medium',
            weekStart: 0,
            confirmDelete: true
          }, parsed.settings || {})
        };
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      toast('Erro ao carregar dados salvos.', 'error');
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao salvar:', e);
      toast('Erro ao salvar dados. Verifique o espaço disponível.', 'error');
    }
  }

  // ---------- Theme ----------
  function applyTheme(theme) {
    data.settings.theme = theme;
    saveData();
    let effective = theme;
    if (theme === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effective === 'dark' ? 'dark' : 'light');
    document.body.classList.toggle('reduce-motion', !!data.settings.reduceMotion);
    const icon = $('.theme-icon');
    const label = $('.theme-label');
    if (icon && label) {
      if (effective === 'dark') {
        icon.textContent = '☀';
        label.textContent = 'Modo claro';
      } else {
        icon.textContent = '☾';
        label.textContent = 'Modo escuro';
      }
    }
    $$('.theme-opt').forEach(btn => {
      btn.classList.toggle('active-theme', btn.dataset.themeBtn === theme);
    });
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  // ---------- Toast ----------
  function toast(msg, type = 'info') {
    const container = $('#toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }


  function logActivity(text, type) {
    if (!data.activity) data.activity = [];
    data.activity.unshift({
      id: uid(),
      text: text,
      type: type || 'task',
      at: new Date().toISOString()
    });
    data.activity = data.activity.slice(0, 30);
    saveData();
  }

  function renderActivityFeed() {
    const feed = $('#activityFeed');
    if (!feed) return;
    const items = data.activity || [];
    if (items.length === 0) {
      feed.innerHTML = '<p class="empty" style="padding:1rem 0">Suas ações aparecerão aqui.</p>';
      return;
    }
    feed.innerHTML = items.slice(0, 8).map(a => {
      const d = new Date(a.at);
      const time = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
      return `<div class="activity-item">
        <span class="activity-led ${esc(a.type)}"></span>
        <div><div>${esc(a.text)}</div><div style="font-size:0.72rem;color:var(--muted);margin-top:2px">${time}</div></div>
      </div>`;
    }).join('');
  }

  function updateLiveClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const hms = $('#clockHMS');
    const sec = $('#clockSec');
    if (hms) hms.textContent = h + ':' + m;
    if (sec) sec.textContent = ':' + s;
    const dl = $('#clockDateLabel');
    if (dl) {
      dl.textContent = DAY_NAMES_FULL[now.getDay()] + ', ' + now.getDate() + ' de ' + MONTH_NAMES[now.getMonth()];
    }
    const sc = $('#statusClock');
    if (sc) sc.textContent = h + ':' + m + ':' + s;
    const si = $('#statusItems');
    if (si) {
      const n = data.tasks.length + data.events.length + data.habits.length + data.goals.length + data.notes.length;
      si.textContent = n + ' itens';
    }
  }

  function initParticles() {
    const layer = $('#lifeLayer');
    if (!layer || data.settings.reduceMotion) return;
    layer.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (12 + Math.random() * 18) + 's';
      p.style.animationDelay = (Math.random() * 15) + 's';
      p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
      layer.appendChild(p);
    }
  }

  function renderMood() {
    $$('.mood-btn').forEach(btn => {
      btn.classList.toggle('active', String(data.mood) === btn.dataset.mood);
    });
  }

  // ---------- Confirm ----------
  function confirm(msg, callback) {
    if (data.settings.confirmDelete === false) {
      callback();
      return;
    }
    $('#confirmMessage').textContent = msg;
    confirmCallback = callback;
    $('#confirmOverlay').classList.add('open');
  }

  // ---------- Modal ----------
  function openModal(title, bodyHTML, footerHTML) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = bodyHTML;
    $('#modalFooter').innerHTML = footerHTML;
    $('#modalOverlay').classList.add('open');
  }

  function closeModal() {
    $('#modalOverlay').classList.remove('open');
    editingId = null;
  }

  // ---------- Navigation ----------
  function navigate(section) {
    currentSection = section;
    $$('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === section);
    });
    $$('.sec').forEach(sec => {
      sec.classList.toggle('active', sec.id === `section-${section}`);
    });
    const titles = {
      dashboard: 'Dashboard',
      tasks: 'Tarefas',
      calendar: 'Calendário',
      routines: 'Rotinas',
      habits: 'Hábitos',
      goals: 'Metas',
      notes: 'Anotações',
      stats: 'Estatísticas',
      settings: 'Configurações'
    };
    $('#pageTitle').textContent = titles[section] || section;
    // Close mobile sidebar
    $('#sidebar').classList.remove('open');
    const backdrop = $('.sidebar-backdrop');
    if (backdrop) backdrop.classList.remove('show');

    renderSection(section);
  }

  function renderSection(section) {
    switch (section) {
      case 'dashboard': renderDashboard(); break;
      case 'tasks': renderTasks(); break;
      case 'calendar': renderCalendar(); break;
      case 'routines': renderRoutines(); break;
      case 'habits': renderHabits(); break;
      case 'goals': renderGoals(); break;
      case 'notes': renderNotes(); break;
      case 'stats': renderStats(); break;
      case 'settings': renderSettings(); break;
    }
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    const today = todayStr();
    const pending = data.tasks.filter(t => !t.completed);
    const completedToday = data.tasks.filter(t => t.completed && t.completedAt === today);
    const todayTasks = data.tasks.filter(t => !t.completed && (t.date === today || !t.date));
    const todayEvents = data.events.filter(e => e.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const habitsDone = data.habits.filter(h => (h.history || []).includes(today)).length;

    const totalToday = todayTasks.length + data.habits.length;
    const doneToday = completedToday.length + habitsDone;
    const progress = totalToday > 0 ? Math.round((doneToday / (totalToday + completedToday.length)) * 100) : (completedToday.length > 0 ? 100 : 0);

    $('#dashPendingTasks').textContent = pending.length;
    $('#dashCompletedToday').textContent = completedToday.length;
    $('#dashHabitsToday').textContent = `${habitsDone}/${data.habits.length}`;
    $('#dashProgress').textContent = progress + '%';

    // Tasks
    const tasksList = $('#dashTasksList');
    const tasksEmpty = $('#dashTasksEmpty');
    tasksList.innerHTML = '';
    if (todayTasks.length === 0) {
      tasksEmpty.style.display = 'block';
    } else {
      tasksEmpty.style.display = 'none';
      todayTasks.slice(0, 5).forEach(t => {
        tasksList.appendChild(createTaskListItem(t, true));
      });
    }

    // Events
    const eventsList = $('#dashEventsList');
    const eventsEmpty = $('#dashEventsEmpty');
    eventsList.innerHTML = '';
    if (todayEvents.length === 0) {
      eventsEmpty.style.display = 'block';
    } else {
      eventsEmpty.style.display = 'none';
      todayEvents.forEach(e => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
          <div class="item-content">
            <div class="item-title">${esc(e.title)}</div>
            <div class="item-meta">${e.time ? e.time + ' · ' : ''}${esc(e.description || '')}</div>
          </div>`;
        li.addEventListener('click', () => openEventForm(e.id));
        eventsList.appendChild(li);
      });
    }

    // Habits
    const habitsList = $('#dashHabitsList');
    const habitsEmpty = $('#dashHabitsEmpty');
    habitsList.innerHTML = '';
    if (data.habits.length === 0) {
      habitsEmpty.style.display = 'block';
    } else {
      habitsEmpty.style.display = 'none';
      data.habits.forEach(h => {
        const done = (h.history || []).includes(today);
        const li = document.createElement('li');
        li.className = 'list-item' + (done ? ' completed' : '');
        li.innerHTML = `
          <button class="item-check ${done ? 'checked' : ''}" data-id="${h.id}">${done ? '✓' : ''}</button>
          <div class="item-content">
            <div class="item-title">${esc(h.name)}</div>
            <div class="item-meta">🔥 ${getStreak(h)} dias</div>
          </div>`;
        li.querySelector('.item-check').addEventListener('click', (ev) => {
          ev.stopPropagation();
          toggleHabitDay(h.id, today);
          renderDashboard();
        });
        habitsList.appendChild(li);
      });
    }

    // Goals
    const goalsList = $('#dashGoalsList');
    const goalsEmpty = $('#dashGoalsEmpty');
    goalsList.innerHTML = '';
    const activeGoals = data.goals.filter(g => g.progress < 100);
    if (activeGoals.length === 0) {
      goalsEmpty.style.display = 'block';
    } else {
      goalsEmpty.style.display = 'none';
      activeGoals.slice(0, 4).forEach(g => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
          <div class="item-content" style="width:100%">
            <div class="item-title">${esc(g.title)}</div>
            <div class="progress-bar" style="margin-top:6px"><div class="progress-fill" style="width:${g.progress}%"></div></div>
            <div class="item-meta">${g.progress}%</div>
          </div>`;
        li.addEventListener('click', () => openGoalForm(g.id));
        goalsList.appendChild(li);
      });
    }

    // Quick stats
    const qsT = $('#qsTotalTasks');
    if (qsT) {
      qsT.textContent = data.tasks.length;
      $('#qsRoutines').textContent = data.routines.length;
      $('#qsNotes').textContent = data.notes.length;
      let best = 0;
      data.habits.forEach(h => { best = Math.max(best, getStreak(h)); });
      $('#qsBestStreak').textContent = best + ' dias';
    }

    const tips = [
      'Reserve 10 minutos pela manhã para revisar tarefas e priorizar o que realmente importa.',
      'Hábitos pequenos e consistentes superam esforços esporádicos.',
      'Se uma tarefa parece grande, divida em passos menores.',
      'Proteja blocos de foco: silencie notificações por 25 minutos.',
      'Revise suas metas uma vez por semana e ajuste o progresso.',
      'Anote ideias na hora — a memória é traiçoeira quando você está ocupado.'
    ];
    const tipEl = $('#dailyTip');
    if (tipEl) {
      const dayIndex = Math.floor(Date.now() / 86400000) % tips.length;
      tipEl.textContent = tips[dayIndex];
    }
  }

  function createTaskListItem(t, compact) {
    const li = document.createElement('li');
    li.className = 'list-item' + (t.completed ? ' completed' : '');
    const priorityLabel = { high: 'Alta', medium: 'Média', low: 'Baixa' };
    li.innerHTML = `
      <button class="item-check ${t.completed ? 'checked' : ''}" data-id="${t.id}">${t.completed ? '✓' : ''}</button>
      <div class="item-content">
        <div class="item-title">${esc(t.title)}</div>
        <div class="item-meta">
          ${t.priority ? `<span class="priority-badge priority-${t.priority}">${priorityLabel[t.priority]}</span> ` : ''}
          ${t.category ? `<span class="category-tag">${esc(t.category)}</span> ` : ''}
          ${t.date ? formatDateBR(t.date) : ''}
          ${t.time ? ' ' + t.time : ''}
        </div>
      </div>`;
    li.querySelector('.item-check').addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleTask(t.id);
    });
    if (!compact) {
      // full version handled elsewhere
    }
    return li;
  }

  // ---------- Tasks ----------
  function getCategories() {
    const cats = new Set(data.categories || []);
    data.tasks.forEach(t => { if (t.category) cats.add(t.category); });
    return Array.from(cats).sort();
  }

  function renderTasks() {
    const search = ($('#taskSearch')?.value || '').toLowerCase();
    const statusFilter = $('#taskFilterStatus')?.value || 'all';
    const priorityFilter = $('#taskFilterPriority')?.value || 'all';
    const categoryFilter = $('#taskFilterCategory')?.value || 'all';

    // Update category select
    const catSelect = $('#taskFilterCategory');
    if (catSelect) {
      const current = catSelect.value;
      catSelect.innerHTML = '<option value="all">Todas categorias</option>';
      getCategories().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        catSelect.appendChild(opt);
      });
      catSelect.value = current || 'all';
    }

    let filtered = data.tasks.slice();
    if (search) {
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(search) ||
        (t.description || '').toLowerCase().includes(search) ||
        (t.category || '').toLowerCase().includes(search)
      );
    }
    if (statusFilter === 'pending') filtered = filtered.filter(t => !t.completed);
    if (statusFilter === 'completed') filtered = filtered.filter(t => t.completed);
    if (priorityFilter !== 'all') filtered = filtered.filter(t => t.priority === priorityFilter);
    if (categoryFilter !== 'all') filtered = filtered.filter(t => t.category === categoryFilter);

    const prioOrder = { high: 0, medium: 1, low: 2 };
    const sortMode = $('#taskSort')?.value || 'default';
    filtered.sort((a, b) => {
      if (sortMode === 'title') return a.title.localeCompare(b.title, 'pt-BR');
      if (sortMode === 'priority') return (prioOrder[a.priority] || 3) - (prioOrder[b.priority] || 3);
      if (sortMode === 'date') {
        if (a.date && b.date) return a.date.localeCompare(b.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
      }
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return (prioOrder[a.priority] || 3) - (prioOrder[b.priority] || 3);
    });

    const countEl = $('#taskCountLabel');
    if (countEl) {
      const n = filtered.length;
      countEl.textContent = n + (n === 1 ? ' tarefa' : ' tarefas');
    }

    const list = $('#tasksList');
    const empty = $('#tasksEmpty');
    list.innerHTML = '';
    if (filtered.length === 0) {
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      const priorityLabel = { high: 'Alta', medium: 'Média', low: 'Baixa' };
      filtered.forEach(t => {
        const li = document.createElement('li');
        li.className = 'task-item' + (t.completed ? ' completed' : '');
        li.innerHTML = `
          <button class="item-check ${t.completed ? 'checked' : ''}" data-id="${t.id}">${t.completed ? '✓' : ''}</button>
          <div class="item-content">
            <div class="item-title">${esc(t.title)}</div>
            <div class="item-meta">
              ${t.priority ? `<span class="priority-badge priority-${t.priority}">${priorityLabel[t.priority]}</span> ` : ''}
              ${t.category ? `<span class="category-tag">${esc(t.category)}</span> ` : ''}
              ${t.date ? formatDateBR(t.date) : 'Sem data'}
              ${t.time ? ' · ' + t.time : ''}
              ${t.description ? ' · ' + esc(t.description.substring(0, 40)) + (t.description.length > 40 ? '…' : '') : ''}
            </div>
          </div>
          <div class="task-actions">
            <button class="btn-icon" title="Editar" data-edit="${t.id}">✏️</button>
            <button class="btn-icon danger" title="Excluir" data-del="${t.id}">🗑️</button>
          </div>`;
        li.querySelector('.item-check').addEventListener('click', () => toggleTask(t.id));
        li.querySelector('[data-edit]').addEventListener('click', () => openTaskForm(t.id));
        li.querySelector('[data-del]').addEventListener('click', () => {
          confirm('Excluir esta tarefa?', () => {
            data.tasks = data.tasks.filter(x => x.id !== t.id);
            saveData();
            toast('Tarefa excluída.', 'success');
            renderTasks();
            if (currentSection === 'dashboard') renderDashboard();
          });
        });
        list.appendChild(li);
      });
    }
  }

  function toggleTask(id) {
    const t = data.tasks.find(x => x.id === id);
    if (!t) return;
    t.completed = !t.completed;
    t.completedAt = t.completed ? todayStr() : null;
    saveData();
    if (t.completed) logActivity('Concluiu: ' + t.title, 'task');
    toast(t.completed ? 'Tarefa concluída!' : 'Tarefa reaberta.', 'success');
    renderSection(currentSection);
  }

  function openTaskForm(id) {
    editingId = id || null;
    const t = id ? data.tasks.find(x => x.id === id) : null;
    const cats = getCategories();
    openModal(
      t ? 'Editar Tarefa' : 'Nova Tarefa',
      `<div class="form-group">
        <label for="fTitle">Título *</label>
        <input type="text" id="fTitle" value="${esc(t?.title || '')}" maxlength="120" required>
      </div>
      <div class="form-group">
        <label for="fDesc">Descrição</label>
        <textarea id="fDesc" rows="3">${esc(t?.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="fDate">Data</label>
          <input type="date" id="fDate" value="${t?.date || ''}">
        </div>
        <div class="form-group">
          <label for="fTime">Horário</label>
          <input type="time" id="fTime" value="${t?.time || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="fPriority">Prioridade</label>
          <select id="fPriority">
            <option value="low" ${(t ? t.priority === 'low' : data.settings.defaultPriority === 'low') ? 'selected' : ''}>Baixa</option>
            <option value="medium" ${(t ? t.priority === 'medium' : data.settings.defaultPriority === 'medium') ? 'selected' : ''}>Média</option>
            <option value="high" ${(t ? t.priority === 'high' : data.settings.defaultPriority === 'high') ? 'selected' : ''}>Alta</option>
          </select>
        </div>
        <div class="form-group">
          <label for="fCategory">Categoria</label>
          <input type="text" id="fCategory" list="catList" value="${esc(t?.category || '')}" placeholder="Ex: Trabalho, Pessoal">
          <datalist id="catList">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
        </div>
      </div>`,
      `<button class="btn btn-outline" id="modalCancel">Cancelar</button>
       <button class="btn btn-fill" id="modalSave">Salvar</button>`
    );
    $('#modalCancel').onclick = closeModal;
    $('#modalSave').onclick = saveTask;
    $('#fTitle').focus();
  }

  function saveTask() {
    const title = $('#fTitle').value.trim();
    if (!title) {
      toast('O título é obrigatório.', 'error');
      $('#fTitle').classList.add('error');
      return;
    }
    const obj = {
      title,
      description: $('#fDesc').value.trim(),
      date: $('#fDate').value || null,
      time: $('#fTime').value || null,
      priority: $('#fPriority').value,
      category: $('#fCategory').value.trim() || null,
      completed: false,
      completedAt: null
    };
    if (editingId) {
      const idx = data.tasks.findIndex(x => x.id === editingId);
      if (idx >= 0) {
        obj.completed = data.tasks[idx].completed;
        obj.completedAt = data.tasks[idx].completedAt;
        obj.id = editingId;
        data.tasks[idx] = obj;
        toast('Tarefa atualizada!', 'success');
      }
    } else {
      obj.id = uid();
      data.tasks.push(obj);
      logActivity('Nova tarefa: ' + obj.title, 'task');
      toast('Tarefa criada!', 'success');
    }
    saveData();
    closeModal();
    renderSection(currentSection);
  }

  // ---------- Calendar / Events ----------
  function renderCalendar() {
    const container = $('#calendarContainer');
    const title = $('#calTitle');
    if (calView === 'month') {
      title.textContent = `${MONTH_NAMES[calDate.getMonth()]} ${calDate.getFullYear()}`;
      renderMonthView(container);
    } else if (calView === 'week') {
      const start = startOfWeek(calDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      title.textContent = `${formatDateBR(formatDate(start))} — ${formatDateBR(formatDate(end))}`;
      renderWeekView(container);
    } else {
      title.textContent = `${DAY_NAMES_FULL[calDate.getDay()]}, ${calDate.getDate()} de ${MONTH_NAMES[calDate.getMonth()]} ${calDate.getFullYear()}`;
      renderDayView(container);
    }
    renderDayEvents();
  }

  function renderMonthView(container) {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();
    const today = new Date();

    let html = '<div class="cal-month">';
    DAY_NAMES.forEach(d => { html += `<div class="cal-header">${d}</div>`; });

    // Previous month days
    const prevLast = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevLast - i;
      const d = new Date(year, month - 1, day);
      html += buildDayCell(d, true, today);
    }
    // Current month
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day);
      html += buildDayCell(d, false, today);
    }
    // Next month
    const filled = startDay + totalDays;
    const remaining = (7 - (filled % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      html += buildDayCell(d, true, today);
    }
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.cal-day').forEach(el => {
      el.addEventListener('click', () => {
        selectedCalDay = el.dataset.date;
        calDate = parseLocalDate(selectedCalDay);
        renderCalendar();
      });
    });
  }

  function buildDayCell(d, other, today) {
    const ds = formatDate(d);
    const isToday = sameDay(d, today);
    const isSelected = selectedCalDay === ds || (!selectedCalDay && isToday);
    const events = data.events.filter(e => e.date === ds);
    let cls = 'cal-day';
    if (other) cls += ' other-month';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';
    let dots = events.slice(0, 3).map(e =>
      `<span class="cal-event-dot">${esc(e.title)}</span>`
    ).join('');
    if (events.length > 3) dots += `<span class="cal-event-dot">+${events.length - 3}</span>`;
    return `<div class="${cls}" data-date="${ds}"><div class="cal-day-num">${d.getDate()}</div>${dots}</div>`;
  }

  function renderWeekView(container) {
    const start = startOfWeek(calDate);
    let html = '<div class="cal-week">';
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const ds = formatDate(d);
      const events = data.events.filter(e => e.date === ds).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      const isToday = sameDay(d, new Date());
      html += `<div class="cal-time-slot" style="${isToday ? 'background:rgba(59,130,246,0.05)' : ''}">
        <div class="cal-time-label" style="width:100px;font-weight:600">${DAY_NAMES[i]} ${d.getDate()}/${d.getMonth() + 1}</div>
        <div class="cal-time-content">`;
      if (events.length === 0) {
        html += `<span style="color:var(--text-light);font-size:0.85rem">Sem compromissos</span>`;
      } else {
        events.forEach(e => {
          html += `<div class="cal-event-block" data-id="${e.id}">
            <div class="event-title">${esc(e.title)}</div>
            <div class="event-time">${e.time || 'Dia todo'}${e.description ? ' · ' + esc(e.description.substring(0, 40)) : ''}</div>
          </div>`;
        });
      }
      html += '</div></div>';
    }
    html += '</div>';
    container.innerHTML = html;
    container.querySelectorAll('.cal-event-block').forEach(el => {
      el.addEventListener('click', () => openEventForm(el.dataset.id));
    });
  }

  function renderDayView(container) {
    const ds = formatDate(calDate);
    const events = data.events.filter(e => e.date === ds).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    let html = '<div class="cal-day-view">';
    if (events.length === 0) {
      html += '<p class="empty">Nenhum compromisso neste dia.</p>';
    } else {
      events.forEach(e => {
        html += `<div class="cal-event-block" data-id="${e.id}">
          <div class="event-title">${esc(e.title)}</div>
          <div class="event-time">${e.time || 'Dia todo'}${e.description ? ' · ' + esc(e.description) : ''}</div>
        </div>`;
      });
    }
    html += '</div>';
    container.innerHTML = html;
    container.querySelectorAll('.cal-event-block').forEach(el => {
      el.addEventListener('click', () => openEventForm(el.dataset.id));
    });
  }

  function renderDayEvents() {
    const ds = selectedCalDay || formatDate(calDate);
    const events = data.events.filter(e => e.date === ds).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const list = $('#dayEventsList');
    const empty = $('#dayEventsEmpty');
    list.innerHTML = '';
    if (events.length === 0) {
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      events.forEach(e => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
          <div class="item-content">
            <div class="item-title">${esc(e.title)}</div>
            <div class="item-meta">${e.time || 'Dia todo'}${e.description ? ' · ' + esc(e.description) : ''}</div>
          </div>
          <div class="task-actions">
            <button class="btn-icon" data-edit="${e.id}">✏️</button>
            <button class="btn-icon danger" data-del="${e.id}">🗑️</button>
          </div>`;
        li.querySelector('[data-edit]').addEventListener('click', () => openEventForm(e.id));
        li.querySelector('[data-del]').addEventListener('click', () => {
          confirm('Excluir este compromisso?', () => {
            data.events = data.events.filter(x => x.id !== e.id);
            saveData();
            toast('Compromisso excluído.', 'success');
            renderCalendar();
          });
        });
        list.appendChild(li);
      });
    }
  }

  function openEventForm(id) {
    editingId = id || null;
    const e = id ? data.events.find(x => x.id === id) : null;
    const defaultDate = selectedCalDay || formatDate(calDate);
    openModal(
      e ? 'Editar Compromisso' : 'Novo Compromisso',
      `<div class="form-group">
        <label for="fTitle">Título *</label>
        <input type="text" id="fTitle" value="${esc(e?.title || '')}" maxlength="120" required>
      </div>
      <div class="form-group">
        <label for="fDesc">Descrição</label>
        <textarea id="fDesc" rows="2">${esc(e?.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="fDate">Data *</label>
          <input type="date" id="fDate" value="${e?.date || defaultDate}" required>
        </div>
        <div class="form-group">
          <label for="fTime">Horário</label>
          <input type="time" id="fTime" value="${e?.time || ''}">
        </div>
      </div>`,
      `<button class="btn btn-outline" id="modalCancel">Cancelar</button>
       <button class="btn btn-fill" id="modalSave">Salvar</button>`
    );
    $('#modalCancel').onclick = closeModal;
    $('#modalSave').onclick = saveEvent;
    $('#fTitle').focus();
  }

  function saveEvent() {
    const title = $('#fTitle').value.trim();
    const date = $('#fDate').value;
    if (!title || !date) {
      toast('Título e data são obrigatórios.', 'error');
      return;
    }
    const obj = {
      title,
      description: $('#fDesc').value.trim(),
      date,
      time: $('#fTime').value || null
    };
    if (editingId) {
      const idx = data.events.findIndex(x => x.id === editingId);
      if (idx >= 0) {
        obj.id = editingId;
        data.events[idx] = obj;
        toast('Compromisso atualizado!', 'success');
      }
    } else {
      obj.id = uid();
      data.events.push(obj);
      toast('Compromisso criado!', 'success');
    }
    saveData();
    closeModal();
    renderCalendar();
  }

  // ---------- Routines ----------
  function renderRoutines() {
    const grid = $('#routinesGrid');
    const empty = $('#routinesEmpty');
    grid.innerHTML = '';
    if (data.routines.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    data.routines.forEach(r => {
      const card = document.createElement('div');
      card.className = 'routine-card';
      const days = [0, 1, 2, 3, 4, 5, 6].map(i =>
        `<span class="day-chip ${(r.days || []).includes(i) ? 'active' : ''}">${DAY_NAMES[i]}</span>`
      ).join('');
      card.innerHTML = `
        <h3>${esc(r.name)}</h3>
        <p style="font-size:0.85rem;color:var(--text-secondary)">${esc(r.description || '')}</p>
        <div class="routine-days">${days}</div>
        <div class="routine-time">🕐 ${r.time || 'Sem horário'}</div>
        <div class="routine-actions">
          <button class="btn-sm btn-outline" data-edit="${r.id}">Editar</button>
          <button class="btn-sm btn-danger" data-del="${r.id}">Excluir</button>
        </div>`;
      card.querySelector('[data-edit]').addEventListener('click', () => openRoutineForm(r.id));
      card.querySelector('[data-del]').addEventListener('click', () => {
        confirm('Excluir esta rotina?', () => {
          data.routines = data.routines.filter(x => x.id !== r.id);
          saveData();
          toast('Rotina excluída.', 'success');
          renderRoutines();
        });
      });
      grid.appendChild(card);
    });
  }

  function openRoutineForm(id) {
    editingId = id || null;
    const r = id ? data.routines.find(x => x.id === id) : null;
    const days = r?.days || [];
    openModal(
      r ? 'Editar Rotina' : 'Nova Rotina',
      `<div class="form-group">
        <label for="fTitle">Nome *</label>
        <input type="text" id="fTitle" value="${esc(r?.name || '')}" maxlength="80" required>
      </div>
      <div class="form-group">
        <label for="fDesc">Descrição</label>
        <textarea id="fDesc" rows="2">${esc(r?.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label for="fTime">Horário</label>
        <input type="time" id="fTime" value="${r?.time || ''}">
      </div>
      <div class="form-group">
        <label>Dias da semana *</label>
        <div class="form-checkboxes" id="fDays">
          ${DAY_NAMES.map((d, i) => `
            <label><input type="checkbox" value="${i}" ${days.includes(i) ? 'checked' : ''}> ${d}</label>
          `).join('')}
        </div>
      </div>`,
      `<button class="btn btn-outline" id="modalCancel">Cancelar</button>
       <button class="btn btn-fill" id="modalSave">Salvar</button>`
    );
    $('#modalCancel').onclick = closeModal;
    $('#modalSave').onclick = saveRoutine;
    $('#fTitle').focus();
  }

  function saveRoutine() {
    const name = $('#fTitle').value.trim();
    if (!name) {
      toast('O nome é obrigatório.', 'error');
      return;
    }
    const dayChecks = $$('#fDays input:checked');
    const days = Array.from(dayChecks).map(c => parseInt(c.value));
    if (days.length === 0) {
      toast('Selecione pelo menos um dia.', 'error');
      return;
    }
    const obj = {
      name,
      description: $('#fDesc').value.trim(),
      time: $('#fTime').value || null,
      days
    };
    if (editingId) {
      const idx = data.routines.findIndex(x => x.id === editingId);
      if (idx >= 0) {
        obj.id = editingId;
        data.routines[idx] = obj;
        toast('Rotina atualizada!', 'success');
      }
    } else {
      obj.id = uid();
      data.routines.push(obj);
      toast('Rotina criada!', 'success');
    }
    saveData();
    closeModal();
    renderRoutines();
  }

  // ---------- Habits ----------
  function getStreak(habit) {
    const history = (habit.history || []).slice().sort().reverse();
    if (history.length === 0) return 0;
    let streak = 0;
    let check = todayStr();
    // If today not done, start from yesterday
    if (!history.includes(check)) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      check = formatDate(y);
    }
    for (let i = 0; i < 365; i++) {
      if (history.includes(check)) {
        streak++;
        const d = parseLocalDate(check);
        d.setDate(d.getDate() - 1);
        check = formatDate(d);
      } else break;
    }
    return streak;
  }

  function renderHabits() {
    const grid = $('#habitsGrid');
    const empty = $('#habitsEmpty');
    grid.innerHTML = '';
    if (data.habits.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    const today = todayStr();

    data.habits.forEach(h => {
      const card = document.createElement('div');
      card.className = 'habit-card';
      // Last 7 days tracker
      let tracker = '';
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = formatDate(d);
        const done = (h.history || []).includes(ds);
        const isToday = ds === today;
        tracker += `<button class="habit-day ${done ? 'done' : ''} ${isToday ? 'today-mark' : ''}" data-date="${ds}" title="${formatDateBR(ds)}">${d.getDate()}</button>`;
      }
      card.innerHTML = `
        <div class="habit-header">
          <h3>${esc(h.name)}</h3>
          <span class="habit-streak">🔥 ${getStreak(h)} dias</span>
        </div>
        <p style="font-size:0.85rem;color:var(--text-secondary)">${esc(h.description || '')}</p>
        <div class="habit-tracker">${tracker}</div>
        <div class="habit-actions">
          <button class="btn-sm btn-outline" data-edit="${h.id}">Editar</button>
          <button class="btn-sm btn-danger" data-del="${h.id}">Excluir</button>
        </div>`;
      card.querySelectorAll('.habit-day').forEach(btn => {
        btn.addEventListener('click', () => {
          toggleHabitDay(h.id, btn.dataset.date);
          renderHabits();
        });
      });
      card.querySelector('[data-edit]').addEventListener('click', () => openHabitForm(h.id));
      card.querySelector('[data-del]').addEventListener('click', () => {
        confirm('Excluir este hábito? O histórico será perdido.', () => {
          data.habits = data.habits.filter(x => x.id !== h.id);
          saveData();
          toast('Hábito excluído.', 'success');
          renderHabits();
        });
      });
      grid.appendChild(card);
    });
  }

  function toggleHabitDay(id, date) {
    const h = data.habits.find(x => x.id === id);
    if (!h) return;
    if (!h.history) h.history = [];
    const idx = h.history.indexOf(date);
    if (idx >= 0) {
      h.history.splice(idx, 1);
      toast('Registro removido.', 'info');
    } else {
      h.history.push(date);
      logActivity('Hábito: ' + h.name, 'habit');
      toast('Hábito registrado!', 'success');
    }
    saveData();
  }

  function openHabitForm(id) {
    editingId = id || null;
    const h = id ? data.habits.find(x => x.id === id) : null;
    openModal(
      h ? 'Editar Hábito' : 'Novo Hábito',
      `<div class="form-group">
        <label for="fTitle">Nome *</label>
        <input type="text" id="fTitle" value="${esc(h?.name || '')}" maxlength="80" required>
      </div>
      <div class="form-group">
        <label for="fDesc">Descrição</label>
        <textarea id="fDesc" rows="2">${esc(h?.description || '')}</textarea>
      </div>`,
      `<button class="btn btn-outline" id="modalCancel">Cancelar</button>
       <button class="btn btn-fill" id="modalSave">Salvar</button>`
    );
    $('#modalCancel').onclick = closeModal;
    $('#modalSave').onclick = saveHabit;
    $('#fTitle').focus();
  }

  function saveHabit() {
    const name = $('#fTitle').value.trim();
    if (!name) {
      toast('O nome é obrigatório.', 'error');
      return;
    }
    if (editingId) {
      const idx = data.habits.findIndex(x => x.id === editingId);
      if (idx >= 0) {
        data.habits[idx].name = name;
        data.habits[idx].description = $('#fDesc').value.trim();
        toast('Hábito atualizado!', 'success');
      }
    } else {
      data.habits.push({
        id: uid(),
        name,
        description: $('#fDesc').value.trim(),
        history: []
      });
      toast('Hábito criado!', 'success');
    }
    saveData();
    closeModal();
    renderHabits();
  }

  // ---------- Goals ----------
  function renderGoals() {
    const grid = $('#goalsGrid');
    const empty = $('#goalsEmpty');
    grid.innerHTML = '';
    if (data.goals.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    data.goals.forEach(g => {
      const card = document.createElement('div');
      card.className = 'goal-card';
      card.innerHTML = `
        <h3>${esc(g.title)}</h3>
        <p class="goal-desc">${esc(g.description || '')}</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${g.progress}%"></div></div>
        <div class="progress-text">
          <span>${g.progress}%</span>
          <span>${g.targetDate ? 'Meta: ' + formatDateBR(g.targetDate) : ''}</span>
        </div>
        <div class="goal-actions">
          <button class="btn-sm btn-fill" data-progress="${g.id}">Atualizar</button>
          <button class="btn-sm btn-outline" data-edit="${g.id}">Editar</button>
          <button class="btn-sm btn-danger" data-del="${g.id}">Excluir</button>
        </div>`;
      card.querySelector('[data-progress]').addEventListener('click', () => openProgressForm(g.id));
      card.querySelector('[data-edit]').addEventListener('click', () => openGoalForm(g.id));
      card.querySelector('[data-del]').addEventListener('click', () => {
        confirm('Excluir esta meta?', () => {
          data.goals = data.goals.filter(x => x.id !== g.id);
          saveData();
          toast('Meta excluída.', 'success');
          renderGoals();
        });
      });
      grid.appendChild(card);
    });
  }

  function openGoalForm(id) {
    editingId = id || null;
    const g = id ? data.goals.find(x => x.id === id) : null;
    openModal(
      g ? 'Editar Meta' : 'Nova Meta',
      `<div class="form-group">
        <label for="fTitle">Título *</label>
        <input type="text" id="fTitle" value="${esc(g?.title || '')}" maxlength="100" required>
      </div>
      <div class="form-group">
        <label for="fDesc">Descrição</label>
        <textarea id="fDesc" rows="2">${esc(g?.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="fProgress">Progresso (%)</label>
          <input type="number" id="fProgress" min="0" max="100" value="${g?.progress ?? 0}">
        </div>
        <div class="form-group">
          <label for="fTarget">Data alvo</label>
          <input type="date" id="fTarget" value="${g?.targetDate || ''}">
        </div>
      </div>`,
      `<button class="btn btn-outline" id="modalCancel">Cancelar</button>
       <button class="btn btn-fill" id="modalSave">Salvar</button>`
    );
    $('#modalCancel').onclick = closeModal;
    $('#modalSave').onclick = saveGoal;
    $('#fTitle').focus();
  }

  function openProgressForm(id) {
    const g = data.goals.find(x => x.id === id);
    if (!g) return;
    editingId = id;
    openModal(
      'Atualizar Progresso',
      `<p style="margin-bottom:1rem"><strong>${esc(g.title)}</strong></p>
      <div class="form-group">
        <label for="fProgress">Progresso atual (%)</label>
        <input type="number" id="fProgress" min="0" max="100" value="${g.progress}">
      </div>
      <div class="progress-bar" style="margin-top:0.5rem"><div class="progress-fill" id="previewBar" style="width:${g.progress}%"></div></div>`,
      `<button class="btn btn-outline" id="modalCancel">Cancelar</button>
       <button class="btn btn-fill" id="modalSave">Salvar</button>`
    );
    $('#fProgress').addEventListener('input', () => {
      const v = Math.min(100, Math.max(0, parseInt($('#fProgress').value) || 0));
      $('#previewBar').style.width = v + '%';
    });
    $('#modalCancel').onclick = closeModal;
    $('#modalSave').onclick = () => {
      const v = Math.min(100, Math.max(0, parseInt($('#fProgress').value) || 0));
      g.progress = v;
      saveData();
      toast(v >= 100 ? 'Meta concluída! 🎉' : 'Progresso atualizado!', 'success');
      closeModal();
      renderGoals();
    };
  }

  function saveGoal() {
    const title = $('#fTitle').value.trim();
    if (!title) {
      toast('O título é obrigatório.', 'error');
      return;
    }
    let progress = parseInt($('#fProgress').value) || 0;
    progress = Math.min(100, Math.max(0, progress));
    const obj = {
      title,
      description: $('#fDesc').value.trim(),
      progress,
      targetDate: $('#fTarget').value || null
    };
    if (editingId) {
      const idx = data.goals.findIndex(x => x.id === editingId);
      if (idx >= 0) {
        obj.id = editingId;
        data.goals[idx] = obj;
        toast('Meta atualizada!', 'success');
      }
    } else {
      obj.id = uid();
      data.goals.push(obj);
      logActivity('Nova meta: ' + obj.title, 'goal');
      toast('Meta criada!', 'success');
    }
    saveData();
    closeModal();
    renderGoals();
  }

  // ---------- Notes ----------
  function renderNotes() {
    const search = ($('#noteSearch')?.value || '').toLowerCase();
    let filtered = data.notes.slice();
    if (search) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(search) ||
        (n.content || '').toLowerCase().includes(search)
      );
    }
    filtered.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));

    const grid = $('#notesGrid');
    const empty = $('#notesEmpty');
    grid.innerHTML = '';
    if (filtered.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    filtered.forEach(n => {
      const card = document.createElement('div');
      card.className = 'note-card';
      const preview = (n.content || '').substring(0, 150);
      card.innerHTML = `
        <h3>${esc(n.title)}</h3>
        <div class="note-preview">${esc(preview)}${(n.content || '').length > 150 ? '…' : ''}</div>
        <div class="note-date">${n.updatedAt ? formatDateBR(n.updatedAt) : formatDateBR(n.createdAt)}</div>
        <div class="note-actions">
          <button class="btn-sm btn-outline" data-edit="${n.id}">Editar</button>
          <button class="btn-sm btn-danger" data-del="${n.id}">Excluir</button>
        </div>`;
      card.querySelector('[data-edit]').addEventListener('click', (ev) => {
        ev.stopPropagation();
        openNoteForm(n.id);
      });
      card.querySelector('[data-del]').addEventListener('click', (ev) => {
        ev.stopPropagation();
        confirm('Excluir esta anotação?', () => {
          data.notes = data.notes.filter(x => x.id !== n.id);
          saveData();
          toast('Anotação excluída.', 'success');
          renderNotes();
        });
      });
      card.addEventListener('click', () => openNoteForm(n.id));
      grid.appendChild(card);
    });
  }

  function openNoteForm(id) {
    editingId = id || null;
    const n = id ? data.notes.find(x => x.id === id) : null;
    openModal(
      n ? 'Editar Anotação' : 'Nova Anotação',
      `<div class="form-group">
        <label for="fTitle">Título *</label>
        <input type="text" id="fTitle" value="${esc(n?.title || '')}" maxlength="120" required>
      </div>
      <div class="form-group">
        <label for="fContent">Conteúdo</label>
        <textarea id="fContent" rows="8">${esc(n?.content || '')}</textarea>
      </div>`,
      `<button class="btn btn-outline" id="modalCancel">Cancelar</button>
       <button class="btn btn-fill" id="modalSave">Salvar</button>`
    );
    $('#modalCancel').onclick = closeModal;
    $('#modalSave').onclick = saveNote;
    $('#fTitle').focus();
  }

  function saveNote() {
    const title = $('#fTitle').value.trim();
    if (!title) {
      toast('O título é obrigatório.', 'error');
      return;
    }
    const now = todayStr();
    if (editingId) {
      const idx = data.notes.findIndex(x => x.id === editingId);
      if (idx >= 0) {
        data.notes[idx].title = title;
        data.notes[idx].content = $('#fContent').value;
        data.notes[idx].updatedAt = now;
        toast('Anotação atualizada!', 'success');
      }
    } else {
      data.notes.push({
        id: uid(),
        title,
        content: $('#fContent').value,
        createdAt: now,
        updatedAt: now
      });
      logActivity('Nota: ' + title, 'note');
      toast('Anotação criada!', 'success');
    }
    saveData();
    closeModal();
    renderNotes();
  }

  // ---------- Statistics ----------
  function renderStats() {
    const total = data.tasks.length;
    const completed = data.tasks.filter(t => t.completed).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    $('#statTotalTasks').textContent = total;
    $('#statCompletedTasks').textContent = completed;
    $('#statCompletionRate').textContent = rate + '%';
    $('#statTotalHabits').textContent = data.habits.length;

    // Priority chart
    const priorities = { high: 0, medium: 0, low: 0 };
    data.tasks.filter(t => !t.completed).forEach(t => {
      if (priorities[t.priority] !== undefined) priorities[t.priority]++;
    });
    renderBarChart('#chartPriority', [
      { label: 'Alta', value: priorities.high, color: 'var(--high)' },
      { label: 'Média', value: priorities.medium, color: 'var(--medium)' },
      { label: 'Baixa', value: priorities.low, color: 'var(--low)' }
    ]);

    // Category chart
    const cats = {};
    data.tasks.forEach(t => {
      const c = t.category || 'Sem categoria';
      cats[c] = (cats[c] || 0) + 1;
    });
    const catEntries = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 6);
    renderBarChart('#chartCategory', catEntries.map(([label, value]) => ({ label, value })));

    // Habits last 7 days
    const habitDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = formatDate(d);
      const count = data.habits.filter(h => (h.history || []).includes(ds)).length;
      habitDays.push({ label: DAY_NAMES[d.getDay()], value: count });
    }
    renderBarChart('#chartHabits', habitDays);

    // Goals progress
    renderBarChart('#chartGoals', data.goals.slice(0, 6).map(g => ({
      label: g.title.substring(0, 12) + (g.title.length > 12 ? '…' : ''),
      value: g.progress
    })), 100);

    // Weekly activity (tasks completed)
    const weekly = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = formatDate(d);
      const count = data.tasks.filter(t => t.completedAt === ds).length;
      weekly.push({ label: DAY_NAMES[d.getDay()], value: count });
    }
    renderBarChart('#chartWeekly', weekly);
  }

  function renderBarChart(selector, items, maxOverride) {
    const el = $(selector);
    if (!el) return;
    if (items.length === 0 || items.every(i => i.value === 0)) {
      el.innerHTML = '<p class="empty" style="padding:1rem">Sem dados ainda.</p>';
      return;
    }
    const max = maxOverride || Math.max(...items.map(i => i.value), 1);
    el.innerHTML = items.map(item => {
      const pct = Math.round((item.value / max) * 100);
      const color = item.color || '';
      return `<div class="chart-bar-row">
        <span class="chart-label" title="${esc(item.label)}">${esc(item.label)}</span>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${pct}%;${color ? 'background:' + color : ''}">
            ${pct > 15 ? `<span class="chart-bar-value">${item.value}</span>` : ''}
          </div>
        </div>
        ${pct <= 15 ? `<span class="chart-bar-value outside">${item.value}</span>` : ''}
      </div>`;
    }).join('');
  }

  // ---------- Settings ----------

  // ---------- Settings UI ----------
  function renderSettings() {
    const s = data.settings;
    const rm = $('#prefReduceMotion');
    if (rm) rm.checked = !!s.reduceMotion;
    const dp = $('#prefDefaultPriority');
    if (dp) dp.value = s.defaultPriority || 'medium';
    const ws = $('#prefWeekStart');
    if (ws) ws.value = String(s.weekStart ?? 0);
    const cd = $('#prefConfirmDelete');
    if (cd) cd.checked = s.confirmDelete !== false;

    $$('.theme-opt').forEach(btn => {
      btn.classList.toggle('active-theme', btn.dataset.themeBtn === s.theme);
    });

    document.body.classList.toggle('reduce-motion', !!s.reduceMotion);

    renderCategoryList();
    updateStorageInfo();
  }

  function renderCategoryList() {
    const list = $('#categoryList');
    const empty = $('#categoryEmpty');
    if (!list) return;
    list.innerHTML = '';
    const cats = data.categories || [];
    if (cats.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    cats.forEach(c => {
      const li = document.createElement('li');
      li.className = 'cat-item';
      li.innerHTML = `<span>${esc(c)}</span><button class="btn-icon danger" title="Remover">🗑️</button>`;
      li.querySelector('button').addEventListener('click', () => {
        confirm('Remover a categoria "' + c + '"?', () => {
          data.categories = data.categories.filter(x => x !== c);
          saveData();
          renderCategoryList();
          toast('Categoria removida.', 'info');
        });
      });
      list.appendChild(li);
    });
  }

  function addCategory() {
    const input = $('#newCategoryInput');
    if (!input) return;
    const name = input.value.trim();
    if (!name) {
      toast('Digite um nome para a categoria.', 'error');
      return;
    }
    if (!data.categories) data.categories = [];
    if (data.categories.some(c => c.toLowerCase() === name.toLowerCase())) {
      toast('Essa categoria já existe.', 'error');
      return;
    }
    data.categories.push(name);
    saveData();
    input.value = '';
    renderCategoryList();
    toast('Categoria adicionada!', 'success');
  }

  function updateStorageInfo() {
    const el = $('#storageInfo');
    if (!el) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '';
      const bytes = new Blob([raw]).size;
      const kb = (bytes / 1024).toFixed(1);
      const items = data.tasks.length + data.events.length + data.routines.length +
        data.habits.length + data.goals.length + data.notes.length;
      el.textContent = kb + ' KB · ' + items + ' itens salvos';
    } catch (e) {
      el.textContent = 'Indisponível';
    }
  }

  function clearCompletedTasks() {
    const n = data.tasks.filter(t => t.completed).length;
    if (n === 0) {
      toast('Não há tarefas concluídas.', 'info');
      return;
    }
    confirm('Remover ' + n + ' tarefa(s) concluída(s)?', () => {
      data.tasks = data.tasks.filter(t => !t.completed);
      saveData();
      toast('Concluídas removidas.', 'success');
      renderTasks();
    });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rotinapro_backup_${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Dados exportados!', 'success');
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported || typeof imported !== 'object') throw new Error('Formato inválido');
        confirm('Importar dados irá substituir todos os dados atuais. Continuar?', () => {
          data = {
            tasks: imported.tasks || [],
            events: imported.events || [],
            routines: imported.routines || [],
            habits: imported.habits || [],
            goals: imported.goals || [],
            notes: imported.notes || [],
            categories: imported.categories || [],
            activity: imported.activity || [],
            mood: imported.mood || null,
            settings: Object.assign({}, data.settings, imported.settings || {})
          };
          saveData();
          applyTheme(data.settings.theme);
          toast('Dados importados com sucesso!', 'success');
          renderSection(currentSection);
        });
      } catch (err) {
        toast('Arquivo inválido. Use um JSON exportado pelo RotinaPro.', 'error');
      }
    };
    reader.readAsText(file);
  }

  function clearAllData() {
    confirm('Tem certeza? Todos os dados serão apagados permanentemente.', () => {
      data = {
        tasks: [], events: [], routines: [], habits: [], goals: [], notes: [],
        categories: [], activity: [], mood: null,
        settings: data.settings
      };
      saveData();
      toast('Todos os dados foram apagados.', 'info');
      renderSection(currentSection);
    });
  }

  // ---------- Escape HTML ----------
  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Init ----------
  function init() {
    loadData();
    applyTheme(data.settings.theme);

    // Date display + greeting
    const now = new Date();
    $('#currentDate').textContent = `${DAY_NAMES_FULL[now.getDay()]}, ${now.getDate()} de ${MONTH_NAMES[now.getMonth()]} de ${now.getFullYear()}`;
    const hour = now.getHours();
    let greet = 'Boa noite';
    if (hour < 12) greet = 'Bom dia';
    else if (hour < 18) greet = 'Boa tarde';
    const gEl = $('#heroGreeting');
    if (gEl) gEl.textContent = greet + '!';

    // Navigation
    $$('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.section));
    });

    // Theme toggle
    $('#themeToggle').addEventListener('click', toggleTheme);
    $('#setThemeLight')?.addEventListener('click', () => applyTheme('light'));
    $('#setThemeDark')?.addEventListener('click', () => applyTheme('dark'));
    $('#setThemeSystem')?.addEventListener('click', () => applyTheme('system'));

    // Mobile menu
    $('#mobileMenuBtn').addEventListener('click', () => {
      $('#sidebar').classList.add('open');
      let backdrop = $('.sidebar-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        document.body.appendChild(backdrop);
        backdrop.addEventListener('click', () => {
          $('#sidebar').classList.remove('open');
          backdrop.classList.remove('show');
        });
      }
      backdrop.classList.add('show');
    });

    // Modal close
    $('#modalClose').addEventListener('click', closeModal);
    $('#modalOverlay').addEventListener('click', (e) => {
      if (e.target === $('#modalOverlay')) closeModal();
    });

    // Confirm
    $('#confirmCancel').addEventListener('click', () => {
      $('#confirmOverlay').classList.remove('open');
      confirmCallback = null;
    });
    $('#confirmOk').addEventListener('click', () => {
      $('#confirmOverlay').classList.remove('open');
      if (confirmCallback) confirmCallback();
      confirmCallback = null;
    });

    // Tasks
    $('#btnNewTask')?.addEventListener('click', () => openTaskForm());
    $('#taskSearch')?.addEventListener('input', () => renderTasks());
    $('#taskFilterStatus')?.addEventListener('change', () => renderTasks());
    $('#taskFilterPriority')?.addEventListener('change', () => renderTasks());
    $('#taskFilterCategory')?.addEventListener('change', () => renderTasks());
    $('#taskSort')?.addEventListener('change', () => renderTasks());
    $('#btnClearCompleted')?.addEventListener('click', clearCompletedTasks);
    $('#btnAddCategory')?.addEventListener('click', addCategory);
    $('#newCategoryInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addCategory();
    });
    $('#prefReduceMotion')?.addEventListener('change', (e) => {
      data.settings.reduceMotion = e.target.checked;
      document.body.classList.toggle('reduce-motion', e.target.checked);
      if (e.target.checked) {
        const layer = $('#lifeLayer');
        if (layer) layer.innerHTML = '';
      } else {
        initParticles();
      }
      saveData();
      toast('Preferência salva.', 'success');
    });
    $('#prefDefaultPriority')?.addEventListener('change', (e) => {
      data.settings.defaultPriority = e.target.value;
      saveData();
      toast('Prioridade padrão atualizada.', 'success');
    });
    $('#prefWeekStart')?.addEventListener('change', (e) => {
      data.settings.weekStart = parseInt(e.target.value, 10);
      saveData();
      toast('Início da semana atualizado.', 'success');
    });
    $('#prefConfirmDelete')?.addEventListener('change', (e) => {
      data.settings.confirmDelete = e.target.checked;
      saveData();
      toast('Preferência salva.', 'success');
    });

    // Calendar
    $('#btnNewEvent')?.addEventListener('click', () => openEventForm());
    $('#calPrev')?.addEventListener('click', () => {
      if (calView === 'month') calDate.setMonth(calDate.getMonth() - 1);
      else if (calView === 'week') calDate.setDate(calDate.getDate() - 7);
      else calDate.setDate(calDate.getDate() - 1);
      selectedCalDay = null;
      renderCalendar();
    });
    $('#calNext')?.addEventListener('click', () => {
      if (calView === 'month') calDate.setMonth(calDate.getMonth() + 1);
      else if (calView === 'week') calDate.setDate(calDate.getDate() + 7);
      else calDate.setDate(calDate.getDate() + 1);
      selectedCalDay = null;
      renderCalendar();
    });
    $('#calToday')?.addEventListener('click', () => {
      calDate = new Date();
      selectedCalDay = todayStr();
      renderCalendar();
    });
    $$('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        calView = btn.dataset.view;
        renderCalendar();
      });
    });

    // Routines
    $('#btnNewRoutine')?.addEventListener('click', () => openRoutineForm());

    // Habits
    $('#btnNewHabit')?.addEventListener('click', () => openHabitForm());

    // Goals
    $('#btnNewGoal')?.addEventListener('click', () => openGoalForm());

    // Notes
    $('#btnNewNote')?.addEventListener('click', () => openNoteForm());
    $('#noteSearch')?.addEventListener('input', () => renderNotes());

    // Settings
    $('#btnExport')?.addEventListener('click', exportData);
    $('#btnImport')?.addEventListener('click', () => $('#importFile').click());
    $('#importFile')?.addEventListener('change', (e) => {
      if (e.target.files[0]) importData(e.target.files[0]);
      e.target.value = '';
    });
    $('#btnClearData')?.addEventListener('click', clearAllData);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        $('#confirmOverlay').classList.remove('open');
      }
    });

    // System theme change
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (data.settings.theme === 'system') applyTheme('system');
    });

    // Life systems
    initParticles();
    updateLiveClock();
    setInterval(updateLiveClock, 1000);
    $$('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        data.mood = parseInt(btn.dataset.mood, 10);
        saveData();
        renderMood();
        const labels = {1:'energia baixa',2:'ok',3:'boa',4:'ótima'};
        logActivity('Humor: ' + (labels[data.mood] || ''), 'habit');
        toast('Humor registrado.', 'success');
        if (currentSection === 'dashboard') renderActivityFeed();
      });
    });

    // Initial render
    selectedCalDay = todayStr();
    renderDashboard();
  }

  // Public API
  return { init, navigate };
})();

document.addEventListener('DOMContentLoaded', App.init);