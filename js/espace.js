/* ==========================================================================
   Loc'N'Joy — Espace (portail, compte particulier, espace admin)
   Vanilla JS, stockage local. Aucune donnée n'est envoyée sur un serveur.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const EUR = n => Math.round(n).toLocaleString('fr-FR') + ' €';
  const frDate = s => s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
  const frWhen = (d, t) => frDate(d) + (t ? ' ' + t.replace(':', 'h') : '');

  /* ======================================================================
     Accès admin
     Attention : une page statique ne peut pas garder un secret. Le contrôle
     ci-dessous filtre les visiteurs, il ne protège pas des données sensibles.
     Pour un vrai verrou, il faut une authentification côté serveur.
  ====================================================================== */
  const ADMIN_USER = 'locnjoy75@gmail.com';
  const ADMIN_HASH = 'h1c2yfrg';   // empreinte du mot de passe, jamais en clair

  const digest = s => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'h' + (h >>> 0).toString(36);
  };

  /* ======================================================================
     Stockage
  ====================================================================== */
  const K = { users: 'lnj_users', session: 'lnj_session', res: 'lnj_reservations', admin: 'lnj_admin' };
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
  const drop = k => { try { localStorage.removeItem(k); } catch { /* idem */ } };

  const Store = {
    users: () => read(K.users, []),
    findUser: email => Store.users().find(u => u.email === String(email || '').toLowerCase()),
    addUser(u) { const l = Store.users(); l.push(u); write(K.users, l); },
    session: () => read(K.session, null),
    login: email => write(K.session, String(email).toLowerCase()),
    logout: () => drop(K.session),
    isAdmin: () => read(K.admin, false) === true,
    adminLogin: () => write(K.admin, true),
    adminLogout: () => drop(K.admin),
    reservations: () => read(K.res, []),
    update(id, patch) {
      const l = Store.reservations();
      const i = l.findIndex(r => r.id === id);
      if (i > -1) { l[i] = { ...l[i], ...patch }; write(K.res, l); }
    },
    remove(id) { write(K.res, Store.reservations().filter(r => r.id !== id)); },
    mine(email) { const e = String(email || '').toLowerCase(); return Store.reservations().filter(r => (r.email || '').toLowerCase() === e); },
  };

  /* ======================================================================
     Toast
  ====================================================================== */
  const toast = $('#toast');
  let toastTimer;
  function showToast(html) {
    if (!toast) return;
    toast.innerHTML = html;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
  }

  /* ======================================================================
     Navigation entre les vues
  ====================================================================== */
  const VIEWS = {
    portal: '#view-portal',
    'client-auth': '#view-client-auth',
    'client-dash': '#view-client-dash',
    'admin-auth': '#view-admin-auth',
    'admin-dash': '#view-admin-dash',
  };

  function show(name) {
    Object.entries(VIEWS).forEach(([k, sel]) => { $(sel).hidden = k !== name; });
    window.scrollTo({ top: 0, behavior: 'auto' });
    const first = $(`${VIEWS[name]} input, ${VIEWS[name]} button`);
    if (first && name.endsWith('auth')) setTimeout(() => first.focus(), 120);
  }

  function route(target) {
    if (target === 'client') {
      if (Store.session()) return renderClient();
      setTab('login');
      ['#l-email', '#l-pass', '#s-name', '#s-email', '#s-phone', '#s-pass'].forEach(id => { $(id).value = ''; });
      return show('client-auth');
    }
    if (target === 'admin') {
      if (Store.isAdmin()) return renderAdmin();
      $('#a-user').value = '';
      $('#a-pass').value = '';
      return show('admin-auth');
    }
    show('portal');
  }

  $$('[data-go]').forEach(b => b.addEventListener('click', () => route(b.dataset.go)));

  /* ======================================================================
     Compte particulier
  ====================================================================== */
  function setTab(name) {
    $$('.auth-tabs button').forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on);
    });
    $('#loginForm').hidden = name !== 'login';
    $('#signupForm').hidden = name === 'login';
  }
  $$('.auth-tabs button').forEach(tab =>
    tab.addEventListener('click', () => setTab(tab.dataset.tab)));

  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#l-email').value.trim().toLowerCase();
    const user = Store.findUser(email);
    if (!user || user.pass !== digest($('#l-pass').value)) {
      showToast('Email ou mot de passe incorrect.');
      return;
    }
    Store.login(email);
    showToast(`Bonjour <b>${user.name.split(' ')[0]}</b>, content de vous revoir.`);
    renderClient();
  });

  $('#signupForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#s-email').value.trim().toLowerCase();
    if (Store.findUser(email)) {
      showToast('Un compte existe déjà avec cet email. Connectez-vous.');
      return;
    }
    Store.addUser({
      name: $('#s-name').value.trim(),
      email,
      phone: $('#s-phone').value.trim(),
      pass: digest($('#s-pass').value),
      created: new Date().toISOString().slice(0, 10),
    });
    Store.login(email);
    showToast('Compte créé. Bienvenue chez <b>Loc\'N\'Joy</b>.');
    renderClient();
  });

  $('#clientLogout').addEventListener('click', () => {
    Store.logout();
    showToast('Vous êtes déconnecté.');
    route('portal');
  });

  function renderClient() {
    const user = Store.findUser(Store.session());
    if (!user) { Store.logout(); return route('client'); }

    $('#dashName').textContent = user.name.split(' ')[0] || user.name;
    $('#dashEmail').textContent = user.email;

    const list = Store.mine(user.email);
    const today = new Date().toISOString().slice(0, 10);
    const days = list.reduce((s, r) => s + (r.days || 0), 0);

    $('#kTotal').textContent = list.length;
    $('#kUp').textContent = list.filter(r => (r.from || '') >= today && r.status !== 'no').length;
    $('#kDays').textContent = days;
    $('#kKm').textContent = (days * 200).toLocaleString('fr-FR');

    const box = $('#clientRes');
    box.innerHTML = list.length
      ? list.map(resCard).join('')
      : `<div class="empty-state">
           <p>Aucune réservation pour le moment.</p>
           <a href="index.html#flotte" class="btn btn-sm">
             <span class="btn-fill"></span>
             <span class="btn-label"><span>Voir la flotte</span><span aria-hidden="true">Voir la flotte</span></span>
           </a>
         </div>`;
    show('client-dash');
  }

  const STATUS = { wait: ['wait', 'En attente'], ok: ['ok', 'Confirmée'], no: ['no', 'Refusée'], done: ['done', 'Terminée'] };

  function resCard(r) {
    const [cls, label] = STATUS[r.status] || STATUS.wait;
    return `
      <article class="res-card">
        <div class="res-main">
          <span class="res-ref">${r.id}</span>
          <h3>${r.car || 'Demande de réservation'}</h3>
          <p class="res-meta">${frWhen(r.from, r.fromTime)} → ${frWhen(r.to, r.toTime)} · ${r.days || 0} jour${(r.days || 0) > 1 ? 's' : ''} · ${r.pickup || 'Aubervilliers'}</p>
          ${r.options && r.options.length ? `<p class="res-opts">Options : ${r.options.join(', ')}</p>` : ''}
        </div>
        <div class="res-side">
          <span class="badge ${cls}">${label}</span>
          <b class="res-total">${EUR(r.total || 0)}</b>
        </div>
      </article>`;
  }

  /* ======================================================================
     Espace admin
  ====================================================================== */
  let filter = 'all', search = '';

  $('#adminForm').addEventListener('submit', e => {
    e.preventDefault();
    const u = $('#a-user').value.trim().toLowerCase();
    const p = $('#a-pass').value;
    if (u === ADMIN_USER && digest(p) === ADMIN_HASH) {
      Store.adminLogin();
      showToast('Accès autorisé.');
      renderAdmin();
    } else {
      showToast('Identifiant ou mot de passe incorrect.');
      $('#a-pass').value = '';
      $('#a-pass').focus();
    }
  });

  $('#adminLogout').addEventListener('click', () => {
    Store.adminLogout();
    showToast('Session admin fermée.');
    route('portal');
  });

  $('#adminFilters').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filter = chip.dataset.f;
    $$('#adminFilters .chip').forEach(c => {
      c.classList.toggle('is-on', c === chip);
      c.setAttribute('aria-selected', c === chip);
    });
    renderRows();
  });

  $('#adminSearch').addEventListener('input', e => {
    search = e.target.value.trim().toLowerCase();
    renderRows();
  });

  function renderAdmin() {
    const all = Store.reservations();
    $('#kpTotal').textContent = all.length;
    $('#kpWait').textContent = all.filter(r => r.status === 'wait').length;
    $('#kpOk').textContent = all.filter(r => r.status === 'ok').length;
    $('#kpRev').textContent = EUR(all.filter(r => r.status === 'ok' || r.status === 'done').reduce((s, r) => s + (r.total || 0), 0));
    renderRows();
    show('admin-dash');
  }

  function filtered() {
    let list = Store.reservations();
    if (filter !== 'all') list = list.filter(r => r.status === filter);
    if (search) list = list.filter(r => [r.name, r.email, r.car, r.id].join(' ').toLowerCase().includes(search));
    return list;
  }

  function renderRows() {
    const list = filtered();
    const rows = $('#adminRows');
    $('#adminEmpty').hidden = list.length > 0;
    rows.innerHTML = list.map(r => {
      const [cls, label] = STATUS[r.status] || STATUS.wait;
      return `
      <tr>
        <td><b>${r.id}</b><span class="sub">${frDate(r.created)}</span></td>
        <td><b>${r.name || '—'}</b><span class="sub">${r.email || ''}</span></td>
        <td>${r.car || '—'}<span class="sub">${r.cat || ''}</span></td>
        <td>${frWhen(r.from, r.fromTime)} → ${frWhen(r.to, r.toTime)}<span class="sub">${r.days || 0} jour${(r.days || 0) > 1 ? 's' : ''}</span></td>
        <td class="num">${EUR(r.total || 0)}</td>
        <td><span class="badge ${cls}">${label}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-act="view" data-id="${r.id}" title="Voir le détail" aria-label="Voir le détail">👁</button>
            <button class="icon-btn ok" data-act="ok" data-id="${r.id}" title="Confirmer" aria-label="Confirmer">✓</button>
            <button class="icon-btn" data-act="done" data-id="${r.id}" title="Marquer terminée" aria-label="Marquer terminée">🏁</button>
            <button class="icon-btn danger" data-act="no" data-id="${r.id}" title="Refuser" aria-label="Refuser">✕</button>
            <button class="icon-btn danger" data-act="del" data-id="${r.id}" title="Supprimer" aria-label="Supprimer">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');
    $$('button[data-act]', rows).forEach(b => b.addEventListener('click', () => action(b.dataset.act, b.dataset.id)));
  }

  function action(act, id) {
    if (act === 'view') return showDetail(id);
    if (act === 'del') {
      if (!confirm('Supprimer définitivement cette réservation ?')) return;
      Store.remove(id);
      showToast('Réservation supprimée.');
      return renderAdmin();
    }
    const labels = { ok: 'confirmée', no: 'refusée', done: 'marquée terminée' };
    Store.update(id, { status: act });
    showToast(`Réservation <b>${id}</b> ${labels[act]}.`);
    renderAdmin();
  }

  /* ---- modale détail ---- */
  const detail = $('#detailModal');
  function closeDetail() { detail.hidden = true; document.body.classList.remove('no-scroll'); }
  $('#detailClose').addEventListener('click', closeDetail);
  $('#detailBackdrop').addEventListener('click', closeDetail);
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

  function info(label, value) {
    return `<div class="d-info"><span>${label}</span><b>${value || '—'}</b></div>`;
  }

  function showDetail(id) {
    const r = Store.reservations().find(x => x.id === id);
    if (!r) return;
    const [cls, label] = STATUS[r.status] || STATUS.wait;
    $('#detailBody').innerHTML = `
      <span class="badge ${cls}">${label}</span>
      <h3 class="modal-title" id="detailTitle">${r.car || 'Demande de réservation'}</h3>
      <p class="d-ref">${r.id} · reçue le ${frDate(r.created)}</p>
      <div class="d-grid">
        ${info('Client', r.name)}${info('Email', r.email)}
        ${info('Téléphone', r.phone)}${info('Catégorie', r.cat)}
        ${info('Retrait', r.pickup)}${info('Période', frWhen(r.from, r.fromTime) + ' → ' + frWhen(r.to, r.toTime))}
        ${info('Durée', (r.days || 0) + ' jour(s)')}${info('Prix par jour', r.price ? EUR(r.price) : '—')}
      </div>
      ${r.options && r.options.length ? `<div class="d-block">${info('Options', r.options.join(', '))}</div>` : ''}
      ${r.notes ? `<div class="d-block">${info('Message du client', r.notes)}</div>` : ''}
      <div class="d-total"><span>Total</span><b>${EUR(r.total || 0)}</b></div>
      <div class="d-actions">
        <button class="btn-ghost ok" data-d="ok">Confirmer</button>
        <button class="btn-ghost" data-d="done">Terminer</button>
        <button class="btn-ghost danger" data-d="no">Refuser</button>
      </div>`;
    $$('#detailBody [data-d]').forEach(b => b.addEventListener('click', () => {
      action(b.dataset.d, id);
      closeDetail();
    }));
    detail.hidden = false;
    document.body.classList.add('no-scroll');
    $('#detailClose').focus();
  }

  /* ---- export CSV ---- */
  $('#adminExport').addEventListener('click', () => {
    const list = Store.reservations();
    if (!list.length) { showToast('Aucune réservation à exporter.'); return; }
    const head = ['Reference', 'Recue le', 'Client', 'Email', 'Telephone', 'Voiture', 'Categorie', 'Retrait', 'Du', 'Au', 'Jours', 'Prix jour', 'Total', 'Statut', 'Options', 'Message'];
    const rows = list.map(r => [
      r.id, r.created, r.name, r.email, r.phone, r.car, r.cat, r.pickup,
      r.from + (r.fromTime ? ' ' + r.fromTime : ''), r.to + (r.toTime ? ' ' + r.toTime : ''), r.days, r.price, r.total,
      (STATUS[r.status] || [])[1] || r.status, (r.options || []).join(' | '), r.notes,
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['﻿' + [head.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `locnjoy-reservations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Export CSV téléchargé.');
  });

  /* ======================================================================
     Chrome commun : logo, horloge, menu, header
  ====================================================================== */
  const logo = $('.brand-file');
  if (logo) {
    logo.addEventListener('load', () => {
      if (logo.naturalWidth > 0) {
        logo.hidden = false;
        $$('.brand-mark, .brand-text').forEach(el => el.remove());
      }
    });
    logo.addEventListener('error', () => logo.remove());
  }

  const clock = $('#clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tick = () => { clock.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 1000);
  }

  const burger = $('#burger'), menu = $('#menu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      document.body.classList.toggle('no-scroll', open);
    });
    $$('#menu a').forEach(a => a.addEventListener('click', () => {
      menu.classList.remove('open');
      burger.classList.remove('open');
      document.body.classList.remove('no-scroll');
    }));
  }

  /* ======================================================================
     Démarrage : on reprend là où l'on s'était arrêté
  ====================================================================== */
  const wanted = new URLSearchParams(location.search).get('espace');
  if (wanted === 'admin' || Store.isAdmin()) route('admin');
  else if (wanted === 'client' || Store.session()) route('client');
  else show('portal');
})();
