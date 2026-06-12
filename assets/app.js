(() => {
  const cfg = window.FRAMELOCK_CONFIG || {};
  const storageKey = 'framelock.requests.v3';
  const sessionKey = 'framelock.admin.session';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const labels = cfg.statusLabels || {};

  function uid() {
    const all = loadRequests();
    const next = String(all.length + 1).padStart(6, '0');
    return `FL-${next}`;
  }

  function secret() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    crypto.getRandomValues(new Uint32Array(10)).forEach((n, i) => {
      out += alphabet[n % alphabet.length];
      if (i === 3 || i === 6) out += '-';
    });
    return out;
  }

  function keyCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const groups = [];
    for (let g = 0; g < 3; g++) {
      let part = '';
      crypto.getRandomValues(new Uint32Array(4)).forEach(n => part += alphabet[n % alphabet.length]);
      groups.push(part);
    }
    return groups.join('-');
  }

  function now() { return new Date().toISOString(); }

  function loadRequests() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  }

  function saveRequests(items) {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }

  function upsert(req) {
    const all = loadRequests();
    const i = all.findIndex(x => x.id === req.id);
    if (i >= 0) all[i] = req; else all.unshift(req);
    saveRequests(all);
  }

  function toast(text) {
    let el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function label(status) { return labels[status] || status || '—'; }
  function esc(s) { return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function fmt(iso) { return iso ? new Date(iso).toLocaleString('ru-RU') : '—'; }

  function showCreated(req) {
    $('#createdId').textContent = req.id;
    $('#createdSecret').textContent = req.secret;
    const d = $('#createdDialog');
    if (d && d.showModal) d.showModal(); else alert(`Заявка: ${req.id}\nСекрет: ${req.secret}`);
  }

  function statusHtml(req) {
    const keyBlock = req.key ? `
      <div class="detail-field full"><span>Ваш ключ</span><b>${esc(req.key)}</b></div>
      <div class="detail-field full"><span>Как активировать</span><p>Зайдите на lobby и введите <code>/key ${esc(req.key)}</code>. После этого портал на Serial должен пустить вас в студию.</p></div>` : '';

    const reason = req.rejectReason ? `<div class="detail-field full"><span>Причина</span><p>${esc(req.rejectReason)}</p></div>` : '';

    return `
      <span class="badge ${esc(req.status)}">${esc(label(req.status))}</span>
      <h3>${esc(req.id)} · ${esc(req.minecraft)}</h3>
      <div class="detail-grid">
        <div class="detail-field"><span>Discord</span>${esc(req.discord)}</div>
        <div class="detail-field"><span>Сервер</span>${esc(cfg.targetServer || 'Serial')}</div>
        <div class="detail-field"><span>Создана</span>${fmt(req.createdAt)}</div>
        <div class="detail-field"><span>Обновлена</span>${fmt(req.updatedAt)}</div>
        ${reason}
        ${keyBlock}
      </div>
    `;
  }

  function renderStatus(req) {
    $('#statusResult').innerHTML = statusHtml(req);
  }

  function isAdmin() { return sessionStorage.getItem(sessionKey) === '1'; }
  function setAdmin(v) { v ? sessionStorage.setItem(sessionKey, '1') : sessionStorage.removeItem(sessionKey); }

  function renderAdmin() {
    const login = $('#adminLogin');
    const board = $('#adminBoard');
    if (!login || !board) return;
    login.hidden = isAdmin();
    board.hidden = !isAdmin();
    if (!isAdmin()) return;

    const all = loadRequests().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const counts = ['new','review','waiting_lobby','key_issued'].map(st => [st, all.filter(r => r.status === st).length]);
    $('#adminStats').innerHTML = `
      <div class="stat"><b>${all.length}</b><span>Всего заявок</span></div>
      <div class="stat"><b>${counts[0][1] + counts[1][1]}</b><span>На проверке</span></div>
      <div class="stat"><b>${counts[2][1]}</b><span>Ждут lobby</span></div>
      <div class="stat"><b>${counts[3][1]}</b><span>Ключей выдано</span></div>`;

    const list = $('#requestList');
    list.innerHTML = all.length ? all.map(r => `
      <button class="request-card" data-id="${esc(r.id)}" type="button">
        <span class="badge ${esc(r.status)}">${esc(label(r.status))}</span>
        <b>${esc(r.minecraft)}</b>
        <small>${esc(r.id)} · ${fmt(r.createdAt)}</small>
      </button>`).join('') : '<span class="empty-state">Заявок пока нет.</span>';
    $$('.request-card', list).forEach(btn => btn.addEventListener('click', () => selectRequest(btn.dataset.id)));
  }

  function selectRequest(id) {
    const req = loadRequests().find(r => r.id === id);
    if (!req) return;
    $$('.request-card').forEach(x => x.classList.toggle('active', x.dataset.id === id));
    $('#requestDetail').innerHTML = `
      <span class="badge ${esc(req.status)}">${esc(label(req.status))}</span>
      <h3>${esc(req.minecraft)} · ${esc(req.id)}</h3>
      <div class="detail-grid">
        <div class="detail-field"><span>Discord</span>${esc(req.discord)}</div>
        <div class="detail-field"><span>Возраст</span>${esc(req.age)}</div>
        <div class="detail-field"><span>Онлайн</span>${esc(req.availability)}</div>
        <div class="detail-field"><span>Секрет</span>${esc(req.secret)}</div>
        <div class="detail-field full"><span>Опыт</span><p>${esc(req.experience)}</p></div>
        <div class="detail-field full"><span>Почему хочет</span><p>${esc(req.why)}</p></div>
        <div class="detail-field full"><span>Дополнительно</span><p>${esc(req.extra || '—')}</p></div>
        <div class="detail-field full"><span>Ключ</span><p>${req.key ? `<code>${esc(req.key)}</code>` : '—'}</p></div>
      </div>
      <div class="detail-actions">
        <button class="btn ghost" data-action="waiting">Ждёт входа на lobby</button>
        <button class="btn ghost" data-action="review">На рассмотрении</button>
        <button class="btn primary" data-action="approve">Одобрить и выдать ключ</button>
        <button class="btn danger" data-action="reject">Отклонить</button>
        <button class="btn ghost" data-action="copy">Копировать данные</button>
        <button class="btn danger" data-action="delete">Удалить</button>
      </div>`;
    $$('[data-action]', $('#requestDetail')).forEach(btn => btn.addEventListener('click', () => action(req.id, btn.dataset.action)));
  }

  function action(id, type) {
    const all = loadRequests();
    const req = all.find(r => r.id === id);
    if (!req) return;
    if (type === 'waiting') req.status = 'waiting_lobby';
    if (type === 'review') req.status = 'review';
    if (type === 'approve') { req.status = 'key_issued'; req.key = req.key || keyCode(); }
    if (type === 'reject') { req.status = 'rejected'; req.rejectReason = prompt('Причина отказа:', 'Заявка заполнена недостаточно подробно.') || 'Заявка отклонена.'; }
    if (type === 'delete') {
      if (!confirm('Удалить заявку?')) return;
      saveRequests(all.filter(r => r.id !== id));
      renderAdmin();
      $('#requestDetail').innerHTML = '<span class="empty-state">Заявка удалена.</span>';
      return;
    }
    if (type === 'copy') {
      navigator.clipboard?.writeText(JSON.stringify(req, null, 2));
      toast('Данные скопированы');
      return;
    }
    req.updatedAt = now();
    saveRequests(all);
    renderAdmin();
    selectRequest(id);
    toast('Заявка обновлена');
  }

  function download(name, type, data) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  function toCsv(items) {
    const cols = ['id','secret','status','minecraft','discord','age','availability','experience','why','extra','key','createdAt','updatedAt','rejectReason'];
    const q = v => '"' + String(v ?? '').replaceAll('"','""') + '"';
    return [cols.join(','), ...items.map(r => cols.map(c => q(r[c])).join(','))].join('\n');
  }

  function bind() {
    $('.hamb')?.addEventListener('click', () => $('.nav')?.classList.toggle('open'));
    $$('.nav a').forEach(a => a.addEventListener('click', () => $('.nav')?.classList.remove('open')));
    $$('[data-close-dialog]').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog')?.close()));

    $('#applicationForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const req = {
        id: uid(),
        secret: secret(),
        status: 'new',
        minecraft: fd.get('minecraft').trim(),
        discord: fd.get('discord').trim(),
        age: fd.get('age').trim(),
        availability: fd.get('availability').trim(),
        experience: fd.get('experience').trim(),
        why: fd.get('why').trim(),
        extra: fd.get('extra').trim(),
        key: '', rejectReason: '', createdAt: now(), updatedAt: now()
      };
      upsert(req);
      e.currentTarget.reset();
      showCreated(req);
      renderAdmin();
      if (cfg.backendEndpoint) {
        try {
          await fetch(cfg.backendEndpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(req) });
        } catch { console.warn('Backend endpoint недоступен'); }
      }
    });

    $('#statusForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const id = String(fd.get('id') || '').trim().toUpperCase();
      const sec = String(fd.get('secret') || '').trim().toUpperCase();
      const req = loadRequests().find(r => r.id.toUpperCase() === id && r.secret.toUpperCase() === sec);
      if (!req) { $('#statusResult').innerHTML = '<span class="empty-state">Заявка не найдена. Проверь номер и секретный код.</span>'; return; }
      renderStatus(req);
    });

    $('#adminLoginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      if (fd.get('login') === (cfg.adminLogin || 'admin') && fd.get('password') === (cfg.adminPassword || 'framelock')) {
        setAdmin(true); renderAdmin(); toast('Вход выполнен');
      } else toast('Неверный логин или пароль');
    });
    $('#logoutBtn')?.addEventListener('click', () => { setAdmin(false); renderAdmin(); });
    $('#exportJsonBtn')?.addEventListener('click', () => download('framelock-requests.json','application/json',JSON.stringify(loadRequests(), null, 2)));
    $('#exportCsvBtn')?.addEventListener('click', () => download('framelock-requests.csv','text/csv;charset=utf-8',toCsv(loadRequests())));

    renderAdmin();
  }

  bind();
})();
