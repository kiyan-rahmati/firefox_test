(() => {
  'use strict';

  // ---------- Config ----------
  const API_URL = 'api/verify.php';
  const XP_PER_QUEST = 10;
  const XP_PER_LEVEL = 50;

  const QUESTIONS = [
    { q: 'Which of these is NOT a game console?', options: ['PlayStation', 'Nintendo Switch', 'Xbox', 'Toaster'] },
    { q: 'Finish the classic cheat code: Up, Up, Down, Down, Left, Right, Left, Right, B, ...', options: ['A', 'X', 'Start', 'Select'] },
    { q: 'Which Minecraft mob explodes when it gets close to you?', options: ['Zombie', 'Skeleton', 'Creeper', 'Villager'] }
  ];

  // Only used when the PHP file can't be reached (offline demo mode).
  const OFFLINE_ANSWERS = [3, 0, 2];

  const SITES = [
    { name: 'YouTube',   url: 'https://www.youtube.com',   glyph: 'Y', color: '#ff5577' },
    { name: 'Facebook',  url: 'https://www.facebook.com',  glyph: 'F', color: '#5aa2ff' },
    { name: 'Wikipedia', url: 'https://www.wikipedia.org', glyph: 'W', color: '#efeaff' },
    { name: 'Twitter',   url: 'https://www.twitter.com',   glyph: 'T', color: '#2ff3ff' },
    { name: 'Reddit',    url: 'https://www.reddit.com',    glyph: 'R', color: '#ff9a3e' }
  ];

  const DROPS = [
    { type: 'Joke',  text: 'Why do programmers prefer dark mode? Because light attracts bugs.' },
    { type: 'Joke',  text: 'There are 10 kinds of people: those who get binary and those who don\'t.' },
    { type: 'Joke',  text: 'My code works and I have no idea why. My code breaks and I have no idea why.' },
    { type: 'Joke',  text: 'Why was the JavaScript developer sad? He didn\'t Node how to Express himself.' },
    { type: 'Joke',  text: 'A SQL query walks into a bar, sees two tables and asks: "Can I join you?"' },
    { type: 'Quote', text: 'First, solve the problem. Then, write the code. (John Johnson)' },
    { type: 'Quote', text: 'Talk is cheap. Show me the code. (Linus Torvalds)' },
    { type: 'Quote', text: 'Any fool can write code a computer understands. Good programmers write code humans understand. (Martin Fowler)' },
    { type: 'Quote', text: 'The best way to predict the future is to invent it. (Alan Kay)' },
    { type: 'Quote', text: 'Make it work, make it right, make it fast. (Kent Beck)' }
  ];

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ }
    }
  };

  const session = {
    get(key) {
      try { return sessionStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { sessionStorage.setItem(key, value); } catch { /* storage blocked */ }
    },
    remove(key) {
      try { sessionStorage.removeItem(key); } catch { /* storage blocked */ }
    }
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function callApi(payload) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('API ' + res.status);
    return res.json();
  }

  // ---------- Gate (fake verification game) ----------
  const gate = $('#gate');
  const app = $('#app');
  const state = { nick: '', round: 0, lives: 3, offline: false, busy: false };

  function renderHearts() {
    const hearts = $('#hearts');
    hearts.textContent = '';
    for (let i = 0; i < 3; i++) {
      const span = document.createElement('span');
      span.textContent = '\u2764\uFE0F';
      if (i >= state.lives) span.className = 'heart-off';
      hearts.appendChild(span);
    }
    hearts.setAttribute('aria-label', state.lives + ' of 3 lives left');
  }

  function renderRound() {
    const item = QUESTIONS[state.round];
    $('#roundLabel').textContent = 'Round ' + (state.round + 1) + ' of ' + QUESTIONS.length;
    $('#roundBar').style.width = (state.round / QUESTIONS.length) * 100 + '%';
    $('#qText').textContent = item.q;
    $('#gateMsg').textContent = '';
    renderHearts();

    const box = $('#options');
    box.textContent = '';
    item.options.forEach((label, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-option';
      btn.textContent = label;
      btn.addEventListener('click', () => pick(index, btn));
      box.appendChild(btn);
    });
  }

  async function checkAnswer(round, choice) {
    try {
      const data = await callApi({ action: 'check', round, choice });
      return data.correct === true;
    } catch {
      state.offline = true;
      $('#offlineNote').hidden = false;
      return OFFLINE_ANSWERS[round] === choice;
    }
  }

  async function pick(index, btn) {
    if (state.busy) return;
    state.busy = true;
    const buttons = [...document.querySelectorAll('#options .btn-option')];
    buttons.forEach((b) => { b.disabled = true; });

    const correct = await checkAnswer(state.round, index);
    btn.classList.add(correct ? 'is-correct' : 'is-wrong');

    if (correct) {
      $('#gateMsg').textContent = 'Nice one!';
    } else {
      state.lives -= 1;
      renderHearts();
      $('#gateMsg').textContent = 'Nope, you lost a life.';
    }

    await wait(900);

    if (state.lives === 0) {
      $('#options').textContent = '';
      $('#qText').textContent = 'Game over';
      $('#gateMsg').textContent = 'No lives left. Hit try again to restart the rounds.';
      $('#retryBtn').hidden = false;
      $('#retryBtn').focus();
      state.busy = false;
      return;
    }

    state.round += 1;
    if (state.round === QUESTIONS.length) {
      await finishGame();
    } else {
      renderRound();
    }
    state.busy = false;
  }

  async function finishGame() {
    $('#roundBar').style.width = '100%';
    $('#options').textContent = '';
    $('#qText').textContent = 'You are human. Probably.';
    $('#gateMsg').textContent = 'Opening your start page...';

    let token = 'offline-demo-token';
    try {
      const data = await callApi({ action: 'pass', nick: state.nick });
      if (data.verified) {
        token = data.token;
        if (data.nick) state.nick = data.nick;
      }
    } catch {
      state.offline = true;
    }

    store.set('neon_nick', state.nick);
    session.set('neon_token', token);
    await wait(700);
    showApp();
  }

  function startGame() {
    state.round = 0;
    state.lives = 3;
    state.busy = false;
    $('#nickForm').hidden = true;
    $('#game').hidden = false;
    $('#retryBtn').hidden = true;
    renderRound();
  }

  $('#nickForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const value = $('#nick').value.trim();
    const bad = value.length < 2 || value.length > 16;
    $('#nickHelp').hidden = !bad;
    if (bad) { $('#nick').focus(); return; }
    state.nick = value;
    startGame();
  });

  $('#retryBtn').addEventListener('click', startGame);

  // ---------- Start page ----------
  let clockTimer = null;

  function greetingFor(hour) {
    if (hour < 5) return 'Still up';
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Hey';
    return 'Good evening';
  }

  function tickClock() {
    const now = new Date();
    $('#clock').textContent = now.toLocaleTimeString([], { hour12: false });
    $('#date').textContent = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
    $('#greeting').textContent = greetingFor(now.getHours()) + ', ' + (store.get('neon_nick', 'Player')) + '!';
  }

  function renderTiles() {
    const list = $('#tiles');
    list.textContent = '';
    SITES.forEach((site) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'tile';
      a.href = site.url;
      a.title = site.name;
      a.style.setProperty('--tile-color', site.color);

      const icon = document.createElement('span');
      icon.className = 'tile-icon';
      icon.textContent = site.glyph;
      icon.setAttribute('aria-hidden', 'true');

      const name = document.createElement('span');
      name.className = 'tile-name';
      name.textContent = site.name;

      a.append(icon, name);
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  // Daily drop (joke or quote)
  let dropIndex = 0;

  function showDrop(index) {
    dropIndex = index;
    $('#dropType').textContent = DROPS[index].type;
    $('#dropText').textContent = DROPS[index].text;
  }

  function dayOfYearIndex() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const day = Math.floor((now - start) / 86400000);
    return day % DROPS.length;
  }

  $('#dropBtn').addEventListener('click', () => {
    let next = dropIndex;
    while (next === dropIndex) next = Math.floor(Math.random() * DROPS.length);
    showDrop(next);
  });

  // XP and level
  function renderXp() {
    const xp = store.get('neon_xp', 0);
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    const into = xp % XP_PER_LEVEL;
    $('#levelText').textContent = 'Level ' + level + ' \u2022 ' + xp + ' XP';
    $('#xpBar').style.width = (into / XP_PER_LEVEL) * 100 + '%';
    document.querySelector('.xp').setAttribute('aria-valuenow', String(into));
  }

  function popXp() {
    const pop = document.createElement('div');
    pop.className = 'xp-pop';
    pop.setAttribute('role', 'status');
    pop.textContent = '+' + XP_PER_QUEST + ' XP';
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1400);
  }

  // Quests (to-do list)
  let todos = [];

  function saveTodos() { store.set('neon_todos', todos); }

  function renderTodos() {
    const list = $('#todoList');
    list.textContent = '';
    $('#todoEmpty').hidden = todos.length > 0;

    todos.forEach((todo) => {
      const li = document.createElement('li');
      if (todo.done) li.className = 'todo-done';

      const box = document.createElement('input');
      box.type = 'checkbox';
      box.className = 'form-check-input';
      box.checked = todo.done;
      box.id = 'todo-' + todo.id;
      box.addEventListener('change', () => toggleTodo(todo.id));

      const label = document.createElement('label');
      label.className = 'todo-label';
      label.htmlFor = box.id;
      label.textContent = todo.text;

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-sm btn-ghost todo-del';
      del.textContent = 'Delete';
      del.setAttribute('aria-label', 'Delete quest: ' + todo.text);
      del.addEventListener('click', () => removeTodo(todo.id));

      li.append(box, label, del);
      list.appendChild(li);
    });
  }

  function toggleTodo(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    todo.done = !todo.done;
    if (todo.done && !todo.rewarded) {
      todo.rewarded = true;
      store.set('neon_xp', store.get('neon_xp', 0) + XP_PER_QUEST);
      renderXp();
      popXp();
    }
    saveTodos();
    renderTodos();
  }

  function removeTodo(id) {
    todos = todos.filter((t) => t.id !== id);
    saveTodos();
    renderTodos();
  }

  $('#todoForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#todoInput');
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    todos.unshift({ id: Date.now(), text, done: false, rewarded: false });
    input.value = '';
    saveTodos();
    renderTodos();
  });

  // Search
  $('#searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const value = $('#query').value.trim();
    if (!value) return;
    const looksLikeUrl = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(value);
    if (looksLikeUrl) {
      window.location.href = /^https?:\/\//i.test(value) ? value : 'https://' + value;
    } else {
      window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(value);
    }
  });

  // Show / hide
  function showApp() {
    gate.hidden = true;
    app.hidden = false;
    renderTiles();
    renderXp();
    showDrop(dayOfYearIndex());
    todos = store.get('neon_todos', []);
    renderTodos();
    tickClock();
    clearInterval(clockTimer);
    clockTimer = setInterval(tickClock, 1000);
    $('#query').focus();
  }

  $('#logoutBtn').addEventListener('click', () => {
    session.remove('neon_token');
    clearInterval(clockTimer);
    app.hidden = true;
    gate.hidden = false;
    $('#game').hidden = true;
    $('#nickForm').hidden = false;
    $('#nick').value = store.get('neon_nick', '');
    $('#nick').focus();
  });

  // Boot: skip the gate if this tab is already verified
  if (session.get('neon_token')) {
    showApp();
  } else {
    $('#nick').value = store.get('neon_nick', '');
  }
})();
