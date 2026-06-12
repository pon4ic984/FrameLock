const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY = 'framelock.applications.v2';

const config = window.FRAMELOCK_CONFIG || {};

function getApps() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveApps(apps) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

function makeId() {
  return 'FL-' + Math.floor(100000 + Math.random() * 900000);
}

function makeSecret() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `${part()}-${part()}`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}

function download(name, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(apps) {
  const headers = ['id','createdAt','status','minecraft','discord','role','online','why','experience'];
  const cell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...apps.map(app => headers.map(h => cell(app[h])).join(','))].join('\n');
}

function renderLocalTable() {
  const target = $('[data-local-table]');
  if (!target) return;
  const apps = getApps().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (!apps.length) {
    target.innerHTML = '<p class="muted-text">Пока нет локальных заявок в этом браузере.</p>';
    return;
  }
  target.innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Ник</th><th>Роль</th><th>Статус</th><th>Дата</th></tr></thead>
      <tbody>${apps.map(app => `
        <tr>
          <td>${escapeHtml(app.id)}</td>
          <td>${escapeHtml(app.minecraft)}</td>
          <td>${escapeHtml(app.role)}</td>
          <td>${escapeHtml(app.status)}</td>
          <td>${new Date(app.createdAt).toLocaleString('ru-RU')}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function initNavigation() {
  const header = $('[data-header]');
  const nav = $('[data-nav]');
  const toggle = $('[data-nav-toggle]');
  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 18);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  toggle?.addEventListener('click', () => nav?.classList.toggle('open'));
  $$('a[href^="#"]').forEach(link => link.addEventListener('click', () => nav?.classList.remove('open')));
}

function initReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));
}

function initApplicationForm() {
  const form = $('[data-application-form]');
  const result = $('[data-result]');
  if (!form || !result) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const app = {
      id: makeId(),
      secret: makeSecret(),
      status: 'На рассмотрении',
      createdAt: new Date().toISOString(),
      minecraft: data.get('minecraft').trim(),
      discord: data.get('discord').trim(),
      online: data.get('online').trim(),
      role: data.get('role'),
      why: data.get('why').trim(),
      experience: data.get('experience').trim(),
      key: '',
      note: 'Заявка создана на статическом сайте. Для реальной обработки подключи backend.'
    };

    const apps = getApps();
    apps.push(app);
    saveApps(apps);
    renderLocalTable();

    if (config.submissionEndpoint) {
      try {
        await fetch(config.submissionEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(app)
        });
      } catch (err) {
        console.warn('FrameLock endpoint unavailable:', err);
      }
    }

    result.hidden = false;
    result.innerHTML = `
      <h3>Заявка создана</h3>
      <p>Сохрани эти данные. По ним ты сможешь проверить статус.</p>
      <p><b>Номер заявки:</b> <span class="ticket-code">${app.id}</span></p>
      <p><b>Секретный код:</b> <span class="ticket-code">${app.secret}</span></p>
      <p class="muted-text">Если админка будет подключена к backend, здесь позже появится настоящий статус и ключ.</p>`;
    form.reset();
    result.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function initStatusForm() {
  const form = $('[data-status-form]');
  const output = $('[data-status-output]');
  if (!form || !output) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const id = String(data.get('id') || '').trim().toUpperCase();
    const secret = String(data.get('secret') || '').trim().toUpperCase();
    const app = getApps().find(item => item.id.toUpperCase() === id && item.secret.toUpperCase() === secret);
    if (!app) {
      output.innerHTML = '<h3>Заявка не найдена</h3><p class="muted-text">Проверь номер и секретный код. На GitHub Pages статус работает только для заявок, созданных в этом же браузере.</p>';
      return;
    }
    output.innerHTML = `
      <h3>Статус: ${escapeHtml(app.status)}</h3>
      <p><b>Ник:</b> ${escapeHtml(app.minecraft)}</p>
      <p><b>Направление:</b> ${escapeHtml(app.role)}</p>
      ${app.key ? `<p><b>Ключ:</b> <span class="ticket-code">${escapeHtml(app.key)}</span></p><p>В игре введи <code>/key ${escapeHtml(app.key)}</code></p>` : '<p class="muted-text">Ключ появится после одобрения заявки администратором.</p>'}
    `;
  });
}

function initExports() {
  $('[data-export-json]')?.addEventListener('click', () => download('framelock-applications.json', JSON.stringify(getApps(), null, 2)));
  $('[data-export-csv]')?.addEventListener('click', () => download('framelock-applications.csv', toCsv(getApps()), 'text/csv'));
  $('[data-clear-local]')?.addEventListener('click', () => {
    if (!confirm('Очистить локальные заявки в этом браузере?')) return;
    saveApps([]);
    renderLocalTable();
  });
}

initNavigation();
initReveal();
initApplicationForm();
initStatusForm();
initExports();
renderLocalTable();
