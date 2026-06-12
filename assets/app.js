const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const dialog = $('#resultDialog');
const dialogContent = $('#dialogContent');
const nav = $('[data-nav]');

$('[data-nav-toggle]')?.addEventListener('click', () => nav.classList.toggle('open'));
$$('.nav a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
$('[data-dialog-close]')?.addEventListener('click', () => dialog.close());

function uid(prefix = 'FL') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${out}`;
}

function secret() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let a = '', b = '';
  for (let i = 0; i < 4; i++) a += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 4; i++) b += chars[Math.floor(Math.random() * chars.length)];
  return `${a}-${b}`;
}

function getStore() {
  try { return JSON.parse(localStorage.getItem('framelockApplications') || '[]'); }
  catch { return []; }
}
function setStore(items) { localStorage.setItem('framelockApplications', JSON.stringify(items)); }

function show(html) {
  dialogContent.innerHTML = html;
  if (dialog.showModal) dialog.showModal(); else alert(dialogContent.textContent);
}

$('#applicationForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const app = {
    id: uid(),
    secret: secret(),
    status: 'На рассмотрении',
    createdAt: new Date().toISOString(),
    minecraft: data.minecraft.trim(),
    discord: data.discord.trim(),
    age: data.age.trim(),
    online: data.online.trim(),
    why: data.why.trim(),
    experience: data.experience.trim(),
    extra: data.extra.trim(),
    key: null
  };
  const items = getStore();
  items.unshift(app);
  setStore(items);
  form.reset();
  show(`
    <div class="result-box">
      <p class="status-pill">Заявка создана</p>
      <h2>Сохрани эти данные</h2>
      <p>Это статическая GitHub Pages-версия сайта. Данные заявки сохранены в твоём браузере. Для настоящей обработки админкой нужен backend.</p>
      <div><b>Номер заявки</b><code>${app.id}</code></div>
      <div><b>Секретный код</b><code>${app.secret}</code></div>
      <p>Проверить можно в разделе “Статус”.</p>
    </div>
  `);
});

$('#statusForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const app = getStore().find((x) => x.id.toUpperCase() === data.id.trim().toUpperCase() && x.secret.toUpperCase() === data.secret.trim().toUpperCase());
  if (!app) {
    show(`<div class="result-box"><p class="status-pill">Не найдено</p><h2>Заявка не найдена</h2><p>Проверь номер и секретный код. В GitHub Pages-версии видны только заявки, созданные в этом же браузере.</p></div>`);
    return;
  }
  const keyHtml = app.key ? `<div><b>Ключ</b><code>${app.key}</code></div><p>В игре введи: <code>/key ${app.key}</code></p>` : '<p>Ключ появится после одобрения администратором.</p>';
  show(`
    <div class="result-box">
      <p class="status-pill">${app.status}</p>
      <h2>${app.minecraft}</h2>
      <p><b>Discord:</b> ${app.discord}</p>
      <p><b>Создана:</b> ${new Date(app.createdAt).toLocaleString('ru-RU')}</p>
      ${keyHtml}
    </div>
  `);
});
