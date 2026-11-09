// ============================================================
//  EventDesk · administrace agentury (hash router, bez frameworku)
//  Všechna data přes API.call → v demu localStorage, naostro Apps Script.
// ============================================================
(() => {
  const { $, $$, esc } = UI;
  const P = window.PLATFORM, F = API.fmt;
  const view = $('#view');
  if (!API.demo) {
    // Ostrá verze (fáze 1): seznam účastníků je jen v Google Sheetu za přihlášením Google účtem.
    document.querySelector('.app').innerHTML = '<div style="max-width:560px;margin:12vh auto;padding:24px;font:15px/1.6 Inter,sans-serif"><h1 style="font-size:24px">Administrace je v Google Sheetu</h1><p>V ostré verzi se účastníci, stavy, filtry, export a přehled e-mailů spravují v Google tabulce akce. Přístup mají jen organizátoři přihlášení svým Google účtem.</p></div>';
    return;
  }

  // ---------- ikony ----------
  const I = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    building: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    users: '<path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 19v-1a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    down: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    desktop: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  };
  const ic = (n, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 1.9}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
  const real = (t) => `<span class="tag real" title="Tahle funkce v demu skutečně funguje">${t || 'Funguje'}</span>`;
  const sim = (t) => `<span class="tag sim" title="V demu jen simulace">${t || 'Simulace'}</span>`;
  const plural = (n, a, b, c) => n === 1 ? a : n > 1 && n < 5 ? b : c;
  const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;
  const ATT = { ANO: ['ok', 'Přijde'], NE: ['err', 'Nepřijde'], 'čeká': ['warn', 'Čeká'] };
  const attTag = (a) => `<span class="tag ${ATT[a] ? ATT[a][0] : 'mute'}">${ATT[a] ? ATT[a][1] : esc(a)}</span>`;
  const absUrl = (u) => new URL(u, document.baseURI).href;

  // ---------- stav ----------
  let OV = null; // overview cache (klienti, akce)
  const clientOf = (ev) => OV.clients.find((c) => c.id === ev.clientId) || {};
  const eventOf = (id) => (OV.events.find((x) => x.event.id === id) || {}).event;

  async function refreshOverview() { OV = await API.call('overview'); return OV; }

  // ---------- shell ----------
  $('#pfName').textContent = P.NAME;
  $('#wsName').textContent = P.AGENCY;
  $('#wsAv').textContent = (P.AGENCY || 'A')[0];
  if (API.demo) $('#legend').hidden = false;
  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  document.addEventListener('click', (e) => { if (document.body.classList.contains('nav-open') && !e.target.closest('.side') && !e.target.closest('#menuBtn')) document.body.classList.remove('nav-open'); });
  $('#resetDemo').addEventListener('click', () => {
    if (!confirm('Obnovit výchozí demo data? Vaše testovací registrace a změny se smažou.')) return;
    API.resetDemo(); location.hash = '#/'; route(true);
  });

  function renderNav(r) {
    const evLinks = OV.clients.map((c) => {
      const evs = OV.events.filter((x) => x.event.clientId === c.id);
      return evs.map(({ event: ev, stats }) => {
        const active = r.eventId === ev.id;
        return `<a class="ev-link" style="--c:${esc(c.colors.primary)}" href="#/akce/${ev.id}" ${active && !r.sub ? 'aria-current="page"' : ''}><span class="dot"></span><span>${esc(ev.name)}</span><span class="cnt">${stats.registered}</span></a>
          ${active ? `<div class="sub">${[
            ['', 'Dashboard'], ['ucastnici', 'Účastníci'], ['komunikace', 'Komunikace'], ['checkin', 'Check-in'], ['landing', 'Landing page'], ['nastaveni', 'Nastavení'],
          ].map(([s, l]) => `<a href="#/akce/${ev.id}${s ? '/' + s : ''}" ${r.sub === s && s ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</div>` : ''}`;
      }).join('');
    }).join('');
    $('#nav').innerHTML = `
      <a href="#/" ${r.name === 'home' ? 'aria-current="page"' : ''}>${ic('home')}Přehled</a>
      <a href="#/klienti" ${r.name === 'clients' ? 'aria-current="page"' : ''}>${ic('building')}Klienti<span class="cnt">${OV.clients.length}</span></a>
      <div class="nav-sec">Akce</div>
      ${evLinks || '<p class="muted" style="padding:0 10px">Zatím žádné akce</p>'}`;
  }

  function crumbs(items) {
    $('#crumbs').innerHTML = items.map((x, i) => i < items.length - 1
      ? `<a href="${x[1]}">${esc(x[0])}</a>${ic('chev')}` : `<b>${esc(x[0])}</b>`).join('');
  }

  // ---------- demo hodiny ----------
  function renderClock() {
    if (!API.demo) { $('#topR').innerHTML = ''; return; }
    const now = new Date(OV.now);
    const real = Math.abs(+now - Date.now()) < 6e4;
    const opts = [['Skutečné dnešní datum', '', null]];
    OV.events.forEach(({ event: ev }) => {
      ['rsvp', 'remind'].forEach((k) => {
        const at = API.automationAt(ev, k);
        if (at) opts.push([(k === 'rsvp' ? 'Výzva k potvrzení' : 'Připomínka') + ' · ' + ev.name, F.date(at.toISOString()), new Date(+at + 5 * 60e3)]);
      });
      const d = API.dayDate(ev.date); d.setHours(17, 30);
      opts.push(['Den akce · ' + ev.name, F.date(ev.date), d]);
    });
    $('#topR').innerHTML = `
      <div class="clock">
        <button class="clock-btn" id="clockBtn" type="button" aria-haspopup="true">${ic('clock')}Datum v demu: ${F.stamp(OV.now)}${real ? '' : ' · posunuto'}</button>
        <div class="pop" id="clockPop" hidden>
          <h5>Posunout čas (simulace)</h5>
          <p>Automatizace se spustí, jakmile čas dosáhne jejich termínu. E-maily se jen zapíšou do odeslaných.</p>
          ${opts.map((o, i) => `<button type="button" data-i="${i}">${esc(o[0])}<span>${o[1]}</span></button>`).join('')}
        </div>
      </div>`;
    $('#clockBtn').addEventListener('click', (e) => { e.stopPropagation(); $('#clockPop').hidden = !$('#clockPop').hidden; });
    $('#clockPop').addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-i]'); if (!b) return;
      const o = opts[+b.dataset.i];
      await API.call('setClock', { date: o[2] ? o[2].toISOString() : null });
      UI.toast(o[2] ? 'Čas posunut na ' + F.stamp(o[2].toISOString()) : 'Zpět na skutečné datum');
      route(true);
    });
  }
  document.addEventListener('click', (e) => { const p = $('#clockPop'); if (p && !p.hidden && !e.target.closest('.clock')) p.hidden = true; });

  // ---------- router ----------
  function parse() {
    const h = location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
    if (!h.length) return { name: 'home' };
    if (h[0] === 'klienti') return { name: 'clients' };
    if (h[0] === 'nova-akce') return { name: 'new' };
    if (h[0] === 'akce' && h[1]) return { name: 'event', eventId: h[1], sub: h[2] || '' };
    return { name: 'home' };
  }
  let routeToken = 0, cleanup = null;
  async function route(reload) {
    const my = ++routeToken;
    if (cleanup) { cleanup(); cleanup = null; }
    closeLayer();
    document.body.classList.remove('nav-open');
    const r = parse();
    if (reload || !OV) { try { await refreshOverview(); } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; } }
    if (my !== routeToken) return;
    renderNav(r); renderClock();
    window.scrollTo(0, 0);
    try {
      if (r.name === 'home') return pageHome();
      if (r.name === 'clients') return pageClients();
      if (r.name === 'new') return pageEventForm(null);
      const ev = eventOf(r.eventId);
      if (!ev) { crumbs([['Akce nenalezena']]); view.innerHTML = '<div class="empty">Tahle akce neexistuje.</div>'; return; }
      const pages = { '': pageDashboard, ucastnici: pageParticipants, komunikace: pageComms, checkin: pageCheckin, landing: pageLanding, nastaveni: (e) => pageEventForm(e) };
      return (pages[r.sub] || pageDashboard)(ev);
    } catch (e) { console.error(e); view.innerHTML = `<div class="empty">Chyba: ${esc(e.message)}</div>`; }
  }
  window.addEventListener('hashchange', () => route(false));
  // změna dat v jiné kartě (skener, landing) → obnovit
  document.addEventListener('demo:changed', () => { if (!$('#layer').children.length && document.visibilityState === 'visible') route(true); });

  // ============================================================
  //  PŘEHLED
  // ============================================================
  function pageHome() {
    crumbs([['Přehled']]);
    const all = OV.events;
    const now = new Date(OV.now);
    const upcoming = all.filter((x) => API.dayDate(x.event.date) >= new Date(now).setHours(0, 0, 0, 0));
    const tot = all.reduce((a, x) => ({ reg: a.reg + x.stats.registered, yes: a.yes + x.stats.yes, arr: a.arr + x.stats.arrived }), { reg: 0, yes: 0, arr: 0 });
    const next = upcoming[0] && upcoming[0].event;
    const days = next ? Math.ceil((API.dayDate(next.date) - new Date(now).setHours(0, 0, 0, 0)) / 864e5) : null;
    view.innerHTML = `
      <div class="page-h">
        <div><div class="eyebrow">${esc(P.AGENCY)} · ${F.long(OV.now.slice(0, 10))}</div><h1>Přehled akcí</h1><p>Všichni klienti a jejich akce na jednom místě.</p></div>
        <div class="acts"><a class="btn" href="index.html">${ic('eye')}Průvodce demem</a><a class="btn btn-primary" href="#/nova-akce">${ic('plus', 2.2)}Nová akce</a></div>
      </div>
      <div class="kpis">
        ${kpi('Aktivní akce', upcoming.length, `${OV.clients.length} ${plural(OV.clients.length, 'klient', 'klienti', 'klientů')}`)}
        ${kpi('Registrace celkem', F.num(tot.reg), 'napříč všemi akcemi')}
        ${kpi('Potvrzená účast', F.num(tot.yes), 'osob včetně doprovodu')}
        ${kpi('Nejbližší akce', next ? (days === 0 ? 'Dnes' : days) : '—', next ? (days ? plural(days, 'den', 'dny', 'dní') + ' · ' : '') + esc(next.name) : 'žádná naplánovaná')}
      </div>
      <div class="grid g3" id="evGrid">
        ${all.map(({ event: ev, stats }) => evCard(ev, stats)).join('')}
        <a class="new-card" href="#/nova-akce"><div>${ic('plus', 1.6).replace('<svg', '<svg style="width:28px;height:28px;margin:0 auto"')}<b>Založit novou akci</b><span>Vlastní branding, registrace a automatizace</span></div></a>
      </div>
      <div class="grid g-main mt">
        <div class="card"><div class="card-h"><div><h3>Klienti</h3><p>Branding se automaticky propisuje do landing pages i e-mailů</p></div><a class="btn btn-sm" href="#/klienti">Spravovat</a></div>
          <div class="card-b" style="padding:0">${OV.clients.map(clientRow).join('')}</div></div>
        <div class="card"><div class="card-h"><h3>Poslední aktivita</h3></div>${feed(OV.activity, true)}</div>
      </div>`;
  }
  function kpi(k, v, s, bar, tag) {
    return `<div class="card kpi"><div class="k">${k}${tag || ''}</div><div class="v tnum">${v}</div>${s ? `<div class="s">${s}</div>` : ''}${bar != null ? `<div class="bar"><i style="width:${Math.min(100, bar)}%"></i></div>` : ''}</div>`;
  }
  function evCard(ev, st) {
    const c = clientOf(ev);
    const total = st.registered || 1;
    return `
      <a class="card ev-card" href="#/akce/${ev.id}" style="--c:${esc(c.colors.primary)};--cdark:${esc(c.colors.dark)}">
        <div class="cover">${c.logoNegative ? `<img src="${esc(c.logoNegative)}" alt="">` : `<b style="position:absolute;left:22px;top:34px;color:#fff">${esc(c.name)}</b>`}
          <div class="date"><small>${F.weekday(ev.date)}</small>${F.day(ev.date)}</div></div>
        <div class="body"><h3>${esc(ev.name)}</h3><div class="meta">${esc(ev.city || 'Lokalita neuvedena')} · ${F.date(ev.date)}${ev.status === 'draft' ? ' · <span class="tag mute plain">Koncept</span>' : ''}</div></div>
        <div class="nums">
          <div><b class="tnum">${F.num(st.registered)}</b><span>${ev.invited ? 'z ' + F.num(ev.invited) + ' pozv.' : 'registrací'}</span></div>
          <div><b class="tnum">${F.num(st.yes)}</b><span>přijde</span></div>
          <div><b class="tnum">${F.num(st.arrived)}</b><span>odbaveno</span></div>
        </div>
        <div class="prog" title="Přijde / čeká / nepřijde"><i style="width:${pct(st.yesPeople, total)}%;background:var(--ok)"></i><i style="width:${pct(st.pendingPeople, total)}%;background:#F2C14E"></i><i style="width:${pct(st.noPeople, total)}%;background:#E8A39D"></i></div>
      </a>`;
  }
  function clientRow(c) {
    const evs = OV.events.filter((x) => x.event.clientId === c.id);
    return `<div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--line)">
      <div style="width:110px;height:44px;border:1px solid var(--line);border-radius:9px;display:grid;place-items:center;padding:8px;background:#fff">${c.logo ? `<img src="${esc(c.logo)}" alt="" style="max-width:100%;max-height:100%">` : `<b>${esc(c.name)}</b>`}</div>
      <div style="flex:1;min-width:0"><b>${esc(c.name)}</b><div class="muted" style="font-size:12.5px">${evs.length} ${plural(evs.length, 'akce', 'akce', 'akcí')} · <code style="color:var(--accent)">/${esc(c.slug)}</code></div></div>
      <div class="row">${['primary', 'dark', 'light'].map((k) => `<span title="${k}" style="width:18px;height:18px;border-radius:5px;background:${esc(c.colors[k])};border:1px solid var(--line)"></span>`).join('')}</div>
      <a class="btn btn-sm" href="${esc(API.urls.client(c))}" target="_blank" rel="noopener">${ic('ext')}Stránka</a>
    </div>`;
  }
  function feed(list, withEvent) {
    if (!list || !list.length) return '<div class="empty" style="padding:28px">Zatím žádná aktivita.</div>';
    return `<ul class="feed">${list.map((a) => {
      const ev = eventOf(a.event); const c = ev ? clientOf(ev) : {};
      return `<li style="--c:${esc((c.colors || {}).primary || '#4F5BFF')}"><span>${esc(a.text)}${withEvent && ev ? `<br><span class="muted" style="font-size:12px">${esc(ev.name)}</span>` : ''}</span><time>${F.stamp(a.at)}</time></li>`;
    }).join('')}</ul>`;
  }

  // ============================================================
  //  KLIENTI
  // ============================================================
  function pageClients() {
    crumbs([['Přehled', '#/'], ['Klienti']]);
    view.innerHTML = `
      <div class="page-h"><div><h1>Klienti</h1><p>Každý klient má vlastní branding a veřejnou stránku <code>/klient</code> s přehledem svých akcí.</p></div>
        <div class="acts"><a class="btn btn-primary" href="#/nova-akce">${ic('plus', 2.2)}Nový klient a akce</a></div></div>
      <div class="grid g2">${OV.clients.map((c) => {
        const evs = OV.events.filter((x) => x.event.clientId === c.id);
        return `<div class="card" style="--c:${esc(c.colors.primary)}">
          <div class="card-b" style="display:flex;gap:18px;align-items:center">
            <div style="width:160px;height:64px;border:1px solid var(--line);border-radius:10px;display:grid;place-items:center;padding:10px;background:#fff">${c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.name)}" style="max-width:100%;max-height:100%">` : `<b>${esc(c.name)}</b>`}</div>
            <div style="min-width:0"><h3 style="margin:0;font-size:17px">${esc(c.name)}</h3>
              <div class="muted" style="font-size:13px">${c.web ? `<a href="${esc(c.web)}" target="_blank" rel="noopener">${esc(c.web.replace(/^https?:\/\//, ''))}</a> · ` : ''}písmo ${esc(c.font || '—')}</div>
              <div class="row" style="margin-top:8px">${['primary', 'dark', 'light'].map((k) => `<span class="tag plain" style="background:#fff;border:1px solid var(--line)"><span style="width:12px;height:12px;border-radius:3px;background:${esc(c.colors[k])};border:1px solid var(--line)"></span>${esc(c.colors[k])}</span>`).join('')}</div></div>
          </div>
          ${c.brandNote ? `<div style="padding:0 20px 16px"><div class="sim-box">ℹ️ <span>${esc(c.brandNote)}</span></div></div>` : ''}
          <div style="border-top:1px solid var(--line)">
            <div class="link-row" style="border:0;border-radius:0;border-bottom:1px solid var(--line)"><span class="lbl"><b>Společná stránka klienta</b><code>${esc(API.urls.client(c))}</code></span>${copyBtn(API.urls.client(c))}<a class="btn btn-sm" target="_blank" rel="noopener" href="${esc(API.urls.client(c))}">${ic('ext')}</a></div>
            ${evs.map(({ event: ev, stats }) => `<a href="#/akce/${ev.id}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);text-decoration:none">
              <span style="width:8px;height:8px;border-radius:50%;background:var(--c)"></span><span style="flex:1"><b>${esc(ev.name)}</b><br><span class="muted" style="font-size:12.5px">${F.date(ev.date)} · /${esc(c.slug)}/${esc(ev.slug)}</span></span>
              <span class="tag acc plain">${stats.registered} registrací</span>${ic('chev')}</a>`).join('')}
            <div style="padding:12px 16px"><a class="btn btn-sm" href="#/nova-akce?client=${esc(c.id)}">${ic('plus')}Přidat akci pro ${esc(c.name)}</a></div>
          </div>
        </div>`;
      }).join('')}</div>`;
  }
  function copyBtn(text) { return `<button class="btn btn-sm btn-icon" type="button" data-copy="${esc(text)}" title="Kopírovat odkaz">${ic('copy')}</button>`; }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); UI.toast('Odkaz zkopírován'); } catch (x) { prompt('Zkopírujte odkaz:', b.dataset.copy); }
  });

  // ============================================================
  //  AKCE – společná hlavička
  // ============================================================
  function evHeader(ev, title) {
    const c = clientOf(ev);
    crumbs([['Přehled', '#/'], [c.name, '#/klienti'], [ev.name, '#/akce/' + ev.id]].concat(title ? [[title]] : []).map((x, i, a) => i === a.length - 1 ? [x[0]] : x));
    return `<div class="card ev-head" style="--c:${esc(c.colors.primary)}">
      <div class="logo-box">${c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.name)}">` : esc(c.name)}</div>
      <div style="min-width:0">
        <h1>${esc(ev.name)}</h1>
        <div class="facts">
          <span>${ic('cal')}${F.long(ev.date)}</span>
          <span>${ic('pin')}${esc(ev.city || '—')}${ev.venue ? ' · ' + esc(ev.venue) : ' · <span class="tbd">místo neupřesněno</span>'}</span>
          <span>${ic('clock')}${ev.time ? esc(ev.time) : '<span class="tbd">čas neupřesněn</span>'}</span>
          <span>${ic('users')}${esc(ev.audience || '—')}</span>
        </div>
      </div>
      <div class="acts">
        <a class="btn" target="_blank" rel="noopener" href="${esc(API.urls.event(c, ev))}">${ic('ext')}Landing page</a>
        <a class="btn btn-primary" target="_blank" rel="noopener" href="scanner.html?e=${encodeURIComponent(ev.id)}">${ic('scan')}Skener</a>
      </div>
    </div>`;
  }

  // ============================================================
  //  DASHBOARD AKCE
  // ============================================================
  async function pageDashboard(ev) {
    view.innerHTML = evHeader(ev) + '<div class="loading"><span class="spinner"></span></div>';
    const d = await API.call('dashboard', { event: ev.id });
    const st = d.stats, c = d.client;
    const invited = ev.invited;
    view.innerHTML = evHeader(d.event) + `
      <div class="kpis" style="--c:${esc(c.colors.primary)}">
        ${kpi('Pozváno', invited ? F.num(invited) : '—', invited ? 'přibližný počet' : 'počet zatím nezadán')}
        ${kpi('Registrace', F.num(st.registered), invited ? pct(st.registered, invited) + ' % z pozvaných' : F.num(st.persons) + ' osob vč. doprovodu', invited ? pct(st.registered, invited) : null)}
        ${kpi('Přijde', F.num(st.yes), st.yesPeople + ' zaměstnanců + ' + (st.yes - st.yesPeople) + ' doprovod')}
        ${kpi('Čeká na odpověď', F.num(st.pending), st.pendingPeople + ' zaměstnanců')}
        ${kpi('Nepřijde', F.num(st.no), st.noPeople + ' zaměstnanců')}
        ${kpi('Odbaveno', F.num(st.arrived), st.expected ? pct(st.arrived, st.expected) + ' % z potvrzených' : '', st.expected ? pct(st.arrived, st.expected) : null)}
      </div>
      <div class="grid g-main" style="--c:${esc(c.colors.primary)}">
        <div class="grid" style="align-content:start">
          <div class="card"><div class="card-h"><div><h3>Registrace v čase</h3><p>Denní počet a kumulativní součet</p></div>${real('Živá data')}</div><div class="card-b">${regChart(d.byDay, ev, d.now)}</div></div>
          <div class="grid g2">
            <div class="card"><div class="card-h"><div><h3>Catering</h3><p>Porce podle stravy · jen „Přijde“</p></div></div><div class="card-b">${hbars(st.diets, ev.registration.diets)}${st.allergies ? `<p class="muted" style="margin:14px 0 0;font-size:12.5px">⚠ ${st.allergies} ${plural(st.allergies, 'osoba uvádí', 'osoby uvádějí', 'osob uvádí')} alergii</p>` : ''}</div></div>
            <div class="card"><div class="card-h"><div><h3>Doprava</h3><p>Osoby · jen „Přijde“</p></div></div><div class="card-b">${(ev.registration.transport || []).length ? hbars(st.transport, ev.registration.transport) : '<p class="muted">Na dopravu se neptáme.</p>'}</div></div>
          </div>
        </div>
        <div class="grid" style="align-content:start">
          <div class="card"><div class="card-h"><div><h3>Účast</h3><p>Zaměstnanci podle odpovědi</p></div></div><div class="card-b">${donut([[st.yesPeople, '#12A36B', 'Přijde'], [st.pendingPeople, '#F2C14E', 'Čeká'], [st.noPeople, '#E8A39D', 'Nepřijde'], [st.arrivedPeople, c.colors.primary, 'Z toho odbaveno']])}</div></div>
          <div class="card"><div class="card-h"><div><h3>Automatizace</h3><p>E-mailová komunikace</p></div><a class="btn btn-sm" href="#/akce/${ev.id}/komunikace">Detail</a></div>
            <div class="flow">${d.campaigns.map((x) => `<div class="flow-item ${x.enabled ? '' : 'off'}" style="grid-template-columns:32px 1fr auto;padding:12px 16px"><span class="ic" style="width:32px;height:32px">${ic(x.key === 'confirm' ? 'send' : x.key === 'rsvp' ? 'check' : 'bell')}</span><div><h4 style="font-size:13px">${esc(x.title)}</h4><p style="font-size:12px">${esc(x.trigger)}</p></div>${campaignState(x)}</div>`).join('')}</div></div>
          <div class="card"><div class="card-h"><h3>Aktivita</h3></div>${feed(d.activity)}</div>
        </div>
      </div>`;
  }
  function campaignState(x) {
    if (!x.enabled) return '<span class="tag mute">Vypnuto</span>';
    if (x.key === 'confirm') return `<span class="tag ok">Aktivní · ${F.num(x.sent)}</span>`;
    if (x.state === 'done') return `<span class="tag ok">Odesláno · ${F.num(x.sent)}</span>`;
    if (x.state === 'scheduled') return `<span class="tag acc">Naplánováno</span>`;
    return `<span class="tag warn">Čeká na spuštění</span>`;
  }
  function regChart(byDay, ev, nowIso) {
    const start = API.dayDate((ev.createdAt || nowIso).slice(0, 10));
    const end = new Date(Math.min(+new Date(nowIso), +API.dayDate(ev.date)));
    const days = [];
    for (let d = new Date(start); d <= end && days.length < 90; d.setDate(d.getDate() + 1)) {
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      days.push([k, 0]);
    }
    days.forEach((d) => (d[1] = byDay[d[0]] || 0));
    if (!days.length) return '<div class="empty">Zatím žádné registrace.</div>';
    const W = 640, H = 200, pl = 34, pb = 22, pt = 8;
    const max = Math.max(1, ...days.map((d) => d[1]));
    let cum = 0; const cums = days.map((d) => (cum += d[1]));
    const cmax = Math.max(1, cum);
    const bw = (W - pl) / days.length;
    const y = (v, m) => pt + (H - pb - pt) * (1 - v / m);
    const bars = days.map((d, i) => `<rect class="bar" x="${(pl + i * bw + bw * 0.18).toFixed(1)}" y="${y(d[1], max).toFixed(1)}" width="${Math.max(1, bw * 0.64).toFixed(1)}" height="${(H - pb - y(d[1], max)).toFixed(1)}" rx="2"><title>${F.day(d[0])}: ${d[1]}</title></rect>`).join('');
    const pts = cums.map((v, i) => `${(pl + i * bw + bw / 2).toFixed(1)},${y(v, cmax).toFixed(1)}`);
    const grid = [0, .5, 1].map((t) => `<line class="grid-l" x1="${pl}" x2="${W}" y1="${y(max * t, max)}" y2="${y(max * t, max)}"/><text x="${pl - 6}" y="${y(max * t, max) + 4}" text-anchor="end">${Math.round(max * t)}</text>`).join('');
    const step = Math.ceil(days.length / 7);
    const labels = days.map((d, i) => i % step === 0 ? `<text x="${pl + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${F.day(d[0])}</text>` : '').join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Registrace v čase">
      <defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0F1222" stop-opacity=".08"/><stop offset="1" stop-color="#0F1222" stop-opacity="0"/></linearGradient></defs>
      ${grid}${bars}<polygon class="area" points="${pl + bw / 2},${H - pb} ${pts.join(' ')} ${pl + (days.length - .5) * bw},${H - pb}"/><polyline class="line" points="${pts.join(' ')}"/>${labels}</svg>
      <div class="row muted" style="font-size:12px;margin-top:8px"><span style="display:inline-flex;align-items:center;gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:var(--c)"></i>Registrace za den</span><span style="display:inline-flex;align-items:center;gap:6px"><i style="width:14px;height:2px;background:var(--ink)"></i>Celkem (${F.num(cum)})</span></div>`;
  }
  function hbars(map, order) {
    const keys = (order || []).concat(Object.keys(map).filter((k) => (order || []).indexOf(k) < 0));
    const max = Math.max(1, ...keys.map((k) => map[k] || 0));
    return `<div class="hbars">${keys.map((k) => `<div class="hbar"><span>${esc(k)}</span><b>${F.num(map[k] || 0)}</b><div class="tr"><i style="width:${pct(map[k] || 0, max)}%"></i></div></div>`).join('')}</div>`;
  }
  function donut(parts) {
    const main = parts.slice(0, 3), total = main.reduce((a, p) => a + p[0], 0) || 1;
    let off = 0;
    const R = 52, C = 2 * Math.PI * R;
    const arcs = main.map((p) => { const l = (p[0] / total) * C; const s = `<circle r="${R}" cx="66" cy="66" fill="none" stroke="${p[1]}" stroke-width="16" stroke-dasharray="${l} ${C - l}" stroke-dashoffset="${-off}" transform="rotate(-90 66 66)"/>`; off += l; return s; }).join('');
    return `<div class="donut-wrap"><svg class="donut" viewBox="0 0 132 132">${arcs}<text x="66" y="64" text-anchor="middle" style="font:700 22px var(--sans);fill:var(--ink)">${F.num(total)}</text><text x="66" y="82" text-anchor="middle" style="font:500 11px var(--sans);fill:var(--muted)">registrací</text></svg>
      <div class="donut-legend">${parts.map((p) => `<div><i style="background:${p[1]}"></i>${p[2]}<b>${F.num(p[0])}</b></div>`).join('')}</div></div>`;
  }

  // ============================================================
  //  ÚČASTNÍCI
  // ============================================================
  const PS = {}; // stav filtru podle akce
  async function pageParticipants(ev) {
    const c = clientOf(ev);
    const s = PS[ev.id] || (PS[ev.id] = { q: '', status: '', diet: '', page: 0, sort: 'registered', dir: 'desc' });
    const st = (await API.call('dashboard', { event: ev.id })).stats;
    view.innerHTML = evHeader(ev, 'Účastníci') + `
      <div class="card" style="--c:${esc(c.colors.primary)}">
        <div class="toolbar">
          <label class="search">${ic('search')}<input class="input" id="q" type="search" placeholder="Hledat jméno, e-mail, útvar…" value="${esc(s.q)}"></label>
          <div class="seg" id="statusSeg">${[['', 'Vše', st.registered], ['ANO', 'Přijde', st.yesPeople], ['čeká', 'Čeká', st.pendingPeople], ['NE', 'Nepřijde', st.noPeople], ['arrived', 'Odbaveno', st.arrivedPeople]]
            .map(([v, l, n]) => `<button type="button" data-v="${v}" aria-pressed="${s.status === v}">${l}<span class="n">${n}</span></button>`).join('')}</div>
          <select class="select" id="dietSel"><option value="">Všechny stravy</option>${ev.registration.diets.map((x) => `<option ${s.diet === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
          <span class="sp"></span>
          ${real('Funguje')}
          <button class="btn btn-sm" id="exportBtn" type="button">${ic('down')}Export CSV</button>
        </div>
        <div class="table-wrap"><table class="t"><thead><tr>
          ${th('name', 'Účastník')}${th('dept', 'Útvar')}${th('attendance', 'Účast')}<th class="num">Doprovod</th>${th('diet', 'Strava')}${(ev.registration.transport || []).length ? th('transport', 'Doprava') : ''}${th('registered', 'Registrace')}${th('arrivedAt', 'Příchod')}
        </tr></thead><tbody id="tbody"><tr><td colspan="8" class="empty"><span class="spinner"></span></td></tr></tbody></table></div>
        <div class="pager" id="pager"></div>
      </div>`;
    function th(k, l) { return `<th><button type="button" data-sort="${k}">${l}${s.sort === k ? (s.dir === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>`; }
    let qT = 0;
    $('#q').addEventListener('input', (e) => { clearTimeout(qT); qT = setTimeout(() => { s.q = e.target.value; s.page = 0; load(); }, 200); });
    $('#statusSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; s.status = b.dataset.v; s.page = 0; $$('#statusSeg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); load(); });
    $('#dietSel').addEventListener('change', (e) => { s.diet = e.target.value; s.page = 0; load(); });
    $$('[data-sort]').forEach((b) => b.addEventListener('click', () => { if (s.sort === b.dataset.sort) s.dir = s.dir === 'asc' ? 'desc' : 'asc'; else { s.sort = b.dataset.sort; s.dir = 'asc'; } pageParticipants(ev); }));
    $('#exportBtn').addEventListener('click', async () => {
      const r = await API.call('participants', Object.assign({ event: ev.id, all: true }, s));
      const head = ['Jméno', 'E-mail', 'Útvar', 'Účast', 'Doprovod', 'Strava', 'Strava doprovodu', 'Alergie', 'Doprava', 'Registrace', 'Příchod'];
      const rows = r.rows.map((p) => [p.name, p.email, p.dept, p.attendance, p.guests, p.diet, (p.guestDiets || []).join('; '), p.allergies, p.transport, F.stamp(p.registered), F.stamp(p.arrivedAt)]);
      const csv = '﻿' + [head].concat(rows).map((r) => r.map((x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(';')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = ev.slug + '-ucastnici.csv'; document.body.appendChild(a); a.click(); a.remove();
      UI.toast('Exportováno ' + r.rows.length + ' řádků');
    });
    async function load() {
      const r = await API.call('participants', Object.assign({ event: ev.id, size: 25 }, s));
      const hasT = (ev.registration.transport || []).length;
      $('#tbody').innerHTML = r.rows.length ? r.rows.map((p) => `<tr data-t="${esc(p.token)}">
        <td class="who"><b>${esc(p.name)}</b><span>${esc(p.email || '—')}</span></td>
        <td>${esc(p.dept || '—')}</td><td>${attTag(p.attendance)}</td><td class="num">${p.guests ? '+' + p.guests : '—'}</td>
        <td>${esc(p.diet)}${p.allergies ? ' <span class="tag warn plain" title="Alergie">⚠ ' + esc(p.allergies) + '</span>' : ''}</td>
        ${hasT ? `<td>${esc(p.transport || '—')}</td>` : ''}
        <td class="muted tnum">${F.stamp(p.registered)}</td>
        <td>${p.arrivedAt ? `<span class="tag dark plain">✓ ${F.time(p.arrivedAt)}</span>` : '<span class="muted">—</span>'}</td></tr>`).join('')
        : `<tr><td colspan="8" class="empty">Nikoho takového jsme nenašli.</td></tr>`;
      const from = s.page * 25;
      $('#pager').innerHTML = `<span>${r.total ? (from + 1) + '–' + Math.min(r.total, from + 25) + ' z ' + F.num(r.total) : '0 záznamů'}</span>
        <span class="row"><button class="btn btn-sm" ${s.page ? '' : 'disabled'} data-p="-1">Předchozí</button><button class="btn btn-sm" ${from + 25 < r.total ? '' : 'disabled'} data-p="1">Další</button></span>`;
    }
    $('#pager').addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return; s.page += +b.dataset.p; load(); });
    $('#tbody').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-t]'); if (tr) openPerson(tr.dataset.t, ev, load); });
    await load();
  }

  async function openPerson(token, ev, onChange) {
    const c = clientOf(ev);
    const { person: p } = await API.call('participant', { token });
    const ticketUrl = API.urls.ticket(p.token);
    openLayer(`
      <div class="drawer" role="dialog" aria-label="${esc(p.name)}">
        <div class="drawer-h"><div style="flex:1;min-width:0"><h2>${esc(p.name)}</h2><p>${esc(p.email || '—')}${p.dept ? ' · ' + esc(p.dept) : ''}</p></div><button class="btn btn-ghost btn-icon" data-close aria-label="Zavřít">${ic('x')}</button></div>
        <div class="drawer-b">
          <div class="ticket-mini"><div class="qr" id="pQr"></div><div><div class="muted" style="font-size:12px">QR pro odbavení ${real()}</div><b style="display:block;margin:6px 0 2px">${esc(ev.name)}</b><span class="muted" style="font-size:13px">${F.date(ev.date)}</span>
            <div class="row" style="margin-top:10px"><a class="btn btn-sm" target="_blank" rel="noopener" href="${esc(ticketUrl)}">${ic('ext')}Vstupenka</a></div></div></div>
          <div><div class="row" style="margin-bottom:8px"><b>Účast</b>${attTag(p.attendance)}${p.attendanceAt ? `<span class="muted" style="font-size:12px">změna ${F.stamp(p.attendanceAt)}</span>` : ''}</div>
            <div class="seg" id="attSeg">${[['ANO', 'Přijde'], ['čeká', 'Čeká'], ['NE', 'Nepřijde']].map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${p.attendance === v}">${l}</button>`).join('')}</div></div>
          <dl class="dl">
            <dt>Doprovod</dt><dd>${p.guests ? '+' + p.guests + (p.guestNames.length ? ' · ' + esc(p.guestNames.join(', ')) : '') : 'bez doprovodu'}</dd>
            <dt>Strava</dt><dd>${esc(p.diet)}${p.guests ? ' · doprovod: ' + esc(p.guestDiets.join(', ')) : ''}</dd>
            <dt>Alergie</dt><dd>${esc(p.allergies || '—')}</dd>
            ${(ev.registration.transport || []).length ? `<dt>Doprava</dt><dd>${esc(p.transport || '—')}</dd>` : ''}
            <dt>Registrace</dt><dd>${F.stamp(p.registered)}${p.source === 'demo' ? ' <span class="tag mute plain">fiktivní</span>' : ''}</dd>
            <dt>Příchod</dt><dd>${p.arrivedAt ? '✓ ' + F.stamp(p.arrivedAt) : '—'}</dd>
          </dl>
          <div><div class="row" style="margin-bottom:8px"><b>E-maily</b>${sim()}</div>
            <div class="card" style="box-shadow:none">${p.mails.slice().reverse().map((m, i) => `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line);font-size:13px">${ic('mail')}<span style="flex:1">${esc(EMAILS.LABELS[m.kind] || m.kind)}${m.resend ? ' (znovu)' : ''}<br><span class="muted" style="font-size:12px">${F.stamp(m.at)}</span></span><button class="btn btn-sm" type="button" data-mail="${m.kind}">Náhled</button></div>`).join('') || '<div class="empty" style="padding:16px">Žádné e-maily</div>'}</div></div>
        </div>
        <div class="drawer-f">
          ${p.arrivedAt ? `<button class="btn" id="undoBtn">Zrušit příchod</button>` : `<button class="btn btn-primary" id="inBtn">${ic('scan')}Odbavit ručně</button>`}
          <button class="btn" id="resendBtn">${ic('send')}Poslat vstupenku znovu</button>
        </div>
      </div>`);
    UI.qr($('#pQr'), API.qrText(p), { size: 240 });
    const after = async (msg) => { UI.toast(msg); await refreshOverview(); renderNav(parse()); if (onChange) onChange(); openPerson(token, ev, onChange); };
    $('#attSeg').addEventListener('click', async (e) => { const b = e.target.closest('button'); if (!b || b.getAttribute('aria-pressed') === 'true') return; await API.call('setAttendance', { token, attend: b.dataset.v }); after('Účast změněna'); });
    const inB = $('#inBtn'); if (inB) inB.addEventListener('click', async () => { await API.call('checkin', { pin: P.DEMO_SCANNER_PIN, qr: p.qr, event: ev.id }); after('Příchod zapsán'); });
    const unB = $('#undoBtn'); if (unB) unB.addEventListener('click', async () => { await API.call('undo', { pin: P.DEMO_SCANNER_PIN, qr: p.qr, event: ev.id }); after('Příchod zrušen'); });
    $('#resendBtn').addEventListener('click', async () => { await API.call('resend', { token }); after('Vstupenka „odeslána“ znovu (simulace)'); });
    $$('[data-mail]').forEach((b) => b.addEventListener('click', () => mailPreview(b.dataset.mail, p, ev)));
  }

  function mailPreview(kind, person, ev) {
    const c = clientOf(ev);
    const ticketUrl = API.urls.ticket(person.token);
    const out = EMAILS.render(kind, {
      person, event: ev, client: c, ticketUrl, agency: P.AGENCY,
      qrSrc: UI.qrDataUrl(person.qr ? API.qrText(person) : 'EVT1.ukazka'), logoSrc: c.logo ? absUrl(c.logo) : '',
    });
    openLayer(`
      <div class="modal" role="dialog" aria-label="Náhled e-mailu" style="--mw:720px">
        <div class="drawer-h"><div style="flex:1"><h2>Náhled e-mailu</h2><p>${esc(EMAILS.LABELS[kind] || kind)} · ${sim('Neodesílá se')}</p></div><button class="btn btn-ghost btn-icon" data-close aria-label="Zavřít">${ic('x')}</button></div>
        <dl class="mail-meta"><dt>Komu</dt><dd>${esc(person.name)} &lt;${esc(person.email || 'adresa skryta')}&gt;</dd><dt>Od</dt><dd>${esc(P.AGENCY)} · ${esc(ev.name)}</dd><dt>Předmět</dt><dd>${esc(out.subject)}</dd></dl>
        <div class="drawer-b"><iframe class="mail-frame" title="Náhled e-mailu" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe></div>
      </div>`, true);
    $('.mail-frame').srcdoc = out.html;
  }

  // ============================================================
  //  KOMUNIKACE
  // ============================================================
  async function pageComms(ev) {
    const c = clientOf(ev);
    view.innerHTML = evHeader(ev, 'Komunikace') + '<div class="loading"><span class="spinner"></span></div>';
    const [cp, ob, sample] = await Promise.all([
      API.call('campaigns', { event: ev.id }),
      API.call('outbox', { event: ev.id, limit: 40 }),
      API.call('participants', { event: ev.id, size: 1, sort: 'registered', dir: 'asc' }),
    ]);
    const samplePerson = sample.rows[0] || { token: 'ukazka', name: 'Jana Ukázková', email: 'jana.ukazkova@example.com', diet: ev.registration.diets[0], guests: 0, guestDiets: [], guestNames: [], attendance: 'ANO', transport: '' };
    view.innerHTML = evHeader(ev, 'Komunikace') + `
      <div class="sim-box" style="margin-bottom:16px">🧪 <span><b>Simulace e-mailů.</b> V demu se nic neodesílá. Automatizace se spouští podle (posunutelného) data v demu a e-maily se jen zapíšou do „Odeslaných“. Tlačítka Přijdu / Nepřijdu v náhledech ale opravdu uloží odpověď. Naostro odesílá Google Workspace přes Apps Script (fronta, denní limit cca 1 500).</span></div>
      <div class="grid g-main" style="--c:${esc(c.colors.primary)}">
        <div class="card"><div class="card-h"><div><h3>Automatizace</h3><p>Nastavení platí jen pro tuto akci</p></div>${real('Nastavení funguje')}</div>
          <div class="flow">${cp.campaigns.map((x) => `
            <div class="flow-item ${x.enabled ? '' : 'off'}">
              <span class="ic">${ic(x.key === 'confirm' ? 'send' : x.key === 'rsvp' ? 'check' : 'bell')}</span>
              <div><h4>${esc(x.title)}</h4><p>${esc(x.audience)}</p>
                <div class="meta"><span class="tag plain">${ic('clock').replace('<svg', '<svg style="width:12px;height:12px"')}${esc(x.trigger)}</span>${campaignState(x)}${x.willSend && x.state !== 'done' ? `<span class="tag mute plain">≈ ${F.num(x.willSend)} příjemců</span>` : ''}${x.note ? `<span class="tag mute plain">${esc(x.note)}</span>` : ''}</div></div>
              <div class="r">${x.key === 'confirm' ? '' : `<label class="switch" title="Zapnout / vypnout"><input type="checkbox" data-auto="${x.key}" ${x.enabled ? 'checked' : ''}><span></span></label>`}
                <button class="btn btn-sm" type="button" data-prev="${x.key}">${ic('eye')}Náhled</button></div>
            </div>`).join('')}</div></div>
        <div class="card"><div class="card-h"><div><h3>Jak to funguje</h3></div></div><div class="card-b" style="font-size:13.5px;line-height:1.6">
          <p style="margin-top:0"><b>Přijdu / Nepřijdu jedním klikem.</b> Tlačítka v e-mailu vedou na vstupenku s parametrem odpovědi. Ta se hned uloží a účastník vidí potvrzení.</p>
          <p><b>Odpovědi se evidují</b> ve sloupci Účast (ANO / NE / čeká) a promítají se do cateringu, dopravy i počtů na skeneru.</p>
          <p style="margin-bottom:0"><b>Kdo klikne Nepřijdu,</b> další výzvy už nedostane.</p></div></div>
      </div>
      <div class="card mt"><div class="card-h"><div><h3>Odeslané e-maily</h3><p>${F.num(ob.total)} celkem · posledních ${ob.mails.length}</p></div>${sim()}</div>
        <div class="table-wrap"><table class="t"><thead><tr><th>Příjemce</th><th>E-mail</th><th>Odesláno</th><th></th></tr></thead><tbody>
          ${ob.mails.map((m) => `<tr data-t="${esc(m.token)}" data-k="${m.kind}"><td class="who"><b>${esc(m.name)}</b><span>${esc(m.email)}</span></td><td>${esc(EMAILS.LABELS[m.kind] || m.kind)}${m.resend ? ' <span class="tag mute plain">znovu</span>' : ''}</td><td class="muted tnum">${F.stamp(m.at)}</td><td class="num"><span class="btn btn-sm">Náhled</span></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Zatím nic.</td></tr>'}
        </tbody></table></div></div>`;
    $$('[data-auto]').forEach((x) => x.addEventListener('change', async () => {
      const autos = JSON.parse(JSON.stringify(ev.automations));
      autos[x.dataset.auto].enabled = x.checked;
      await API.call('saveEvent', { event: Object.assign({}, ev, { automations: autos }) });
      UI.toast(x.checked ? 'Automatizace zapnuta' : 'Automatizace vypnuta');
      await refreshOverview(); pageComms(eventOf(ev.id));
    }));
    $$('[data-prev]').forEach((b) => b.addEventListener('click', async () => {
      let p = samplePerson;
      if (p.token !== 'ukazka') p = (await API.call('participant', { token: p.token })).person;
      mailPreview(b.dataset.prev === 'remind' ? 'remind' : b.dataset.prev, Object.assign({}, p, b.dataset.prev === 'remind' ? { attendance: 'ANO' } : {}), ev);
    }));
    view.querySelectorAll('tr[data-k]').forEach((tr) => tr.addEventListener('click', async () => {
      const { person } = await API.call('participant', { token: tr.dataset.t });
      mailPreview(tr.dataset.k, person, ev);
    }));
  }

  // ============================================================
  //  CHECK-IN
  // ============================================================
  async function pageCheckin(ev) {
    const c = clientOf(ev);
    const scanUrl = absUrl('scanner.html?e=' + encodeURIComponent(ev.id));
    view.innerHTML = evHeader(ev, 'Check-in') + `
      <div class="grid g-main" style="--c:${esc(c.colors.primary)}">
        <div class="card"><div class="card-b checkin-hero">
          <div>
            <div class="row" style="margin-bottom:12px"><b style="font-size:15px">Odbavení u vstupu</b>${real('Kamera a QR fungují')}</div>
            <div class="big-num tnum" id="ciNum">—</div>
            <div class="progress"><i id="ciBar" style="width:0"></i></div>
            <div class="muted" id="ciSub"></div>
            <div class="row" style="margin-top:20px">
              <a class="btn btn-primary" href="${esc(scanUrl)}" target="_blank" rel="noopener">${ic('scan')}Otevřít skener</a>
              <button class="btn" id="simArrival" type="button">Simulovat příchod</button>${sim()}
            </div>
            <p class="muted" style="font-size:12.5px;margin:14px 0 0">PIN v demu: <b>${esc(P.DEMO_SCANNER_PIN)}</b>. Na telefonu načtěte QR vpravo. Živá kamera potřebuje https, bez něj funguje „Vyfotit QR“ a „Hledat jménem“. Skener ve stejném prohlížeči se sem propisuje živě.</p>
          </div>
          <div><div class="qrbox" id="scanQr"></div><p class="muted" style="font-size:12px;text-align:center;margin:8px 0 0">Skener pro tuto akci</p></div>
        </div></div>
        <div class="card"><div class="card-h"><h3>Poslední příchody</h3><span class="tag acc plain" id="liveTag">Živě</span></div><div id="arrivals"></div></div>
      </div>
      <div class="card mt"><div class="card-h"><div><h3>Jak vypadá skener</h3><p>Výsledek skenu na telefonu obsluhy</p></div></div>
        <div class="card-b grid g3" style="font-size:13px">
          <div style="border-radius:12px;padding:16px;background:#2DB36F;color:#0F1222"><b style="font-size:15px">✓ PŘÍCHOD ZAPSÁN</b><br>Jméno, doprovod (± upravit), strava, alergie</div>
          <div style="border-radius:12px;padding:16px;background:#F5B800;color:#0F1222"><b style="font-size:15px">! UŽ JE UVNITŘ</b><br>Duplicitní sken, ukáže čas prvního příchodu</div>
          <div style="border-radius:12px;padding:16px;background:#E0362C;color:#fff"><b style="font-size:15px">✕ NEPLATNÁ / JINÁ AKCE</b><br>Neznámý kód nebo vstupenka na jinou akci klienta</div>
        </div></div>`;
    UI.qr($('#scanQr'), scanUrl, { size: 300 });
    async function load() {
      const d = await API.call('dashboard', { event: ev.id });
      const st = d.stats;
      $('#ciNum').innerHTML = `${F.num(st.arrived)} <small>/ ${F.num(st.expected)} osob</small>`;
      $('#ciBar').style.width = pct(st.arrived, st.expected) + '%';
      $('#ciSub').textContent = `${st.arrivedPeople} zaměstnanců odbaveno · ${pct(st.arrived, st.expected)} % z potvrzených`;
      $('#arrivals').innerHTML = d.recentArrivals.length ? `<ul class="feed">${d.recentArrivals.map((a) => `<li style="--c:${esc(c.colors.primary)}"><span><b>${esc(a.name)}</b>${a.guests ? ' +' + a.guests : ''}</span><time>${F.stamp(a.at)}</time></li>`).join('')}</ul>` : '<div class="empty" style="padding:28px">Zatím nikdo neodbaven. Otevřete skener nebo zkuste „Simulovat příchod“.</div>';
    }
    $('#simArrival').addEventListener('click', async () => {
      const r = await API.call('participants', { event: ev.id, status: 'ANO', all: true });
      const left = r.rows.filter((p) => !p.arrivedAt);
      if (!left.length) return UI.toast('Všichni potvrzení už jsou odbavení');
      const p = left[Math.floor(Math.random() * left.length)];
      await API.call('checkin', { pin: P.DEMO_SCANNER_PIN, qr: p.qr, event: ev.id });
      UI.toast('Odbaven: ' + p.name); load();
    });
    await load();
    const t = setInterval(load, 4000);
    cleanup = () => clearInterval(t);
  }

  // ============================================================
  //  LANDING PAGE
  // ============================================================
  function pageLanding(ev) {
    const c = clientOf(ev);
    const url = API.urls.event(c, ev), curl = API.urls.client(c);
    view.innerHTML = evHeader(ev, 'Landing page') + `
      <div class="grid g-main">
        <div class="card"><div class="device-bar">
            <div class="url">${ic('globe')}<span><b>${esc(url.replace(/^https?:\/\//, ''))}</b></span></div>
            <div class="seg" id="dev"><button type="button" data-d="desktop" aria-pressed="true">${ic('desktop').replace('<svg', '<svg style="width:15px;height:15px"')}</button><button type="button" data-d="mobile" aria-pressed="false">${ic('phone').replace('<svg', '<svg style="width:15px;height:15px"')}</button></div>
            <a class="btn btn-sm" href="${esc(url)}" target="_blank" rel="noopener">${ic('ext')}Otevřít</a>
          </div>
          <div class="stage" id="stage"><iframe src="${esc(url)}" title="Náhled landing page" loading="lazy"></iframe></div></div>
        <div class="grid" style="align-content:start">
          <div class="card"><div class="card-h"><div><h3>Odkazy</h3><p>Zaměstnancům posílejte přímý odkaz na jejich akci</p></div></div><div class="card-b links">
            <div class="link-row"><span class="lbl"><b>Registrace na tuto akci</b><code>${esc(url)}</code></span>${copyBtn(url)}</div>
            <div class="link-row"><span class="lbl"><b>Společná stránka klienta</b><code>${esc(curl)}</code></span>${copyBtn(curl)}</div>
          </div></div>
          <div class="card"><div class="card-h"><div><h3>Branding</h3><p>Přebírá se z klienta ${esc(c.name)}</p></div></div><div class="card-b">
            <div class="row">${['primary', 'dark', 'light'].map((k) => `<span class="tag plain" style="background:#fff;border:1px solid var(--line)"><span style="width:12px;height:12px;border-radius:3px;background:${esc(c.colors[k])};border:1px solid var(--line)"></span>${esc(c.colors[k])}</span>`).join('')}</div>
            <p class="muted" style="font-size:12.5px;margin:12px 0 0">Jedna šablona pro všechny akce. Liší se jen data akce (název, datum, lokalita, formulář). ${c.brandNote ? esc(c.brandNote) : ''}</p>
          </div></div>
        </div>
      </div>`;
    $('#dev').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#dev button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); $('#stage').classList.toggle('mobile', b.dataset.d === 'mobile'); });
  }

  // ============================================================
  //  NOVÁ AKCE / NASTAVENÍ
  // ============================================================
  function pageEventForm(existing) {
    const isNew = !existing;
    const pre = new URLSearchParams(location.hash.split('?')[1] || '').get('client');
    const baseClient = existing ? clientOf(existing) : OV.clients.find((c) => c.id === pre) || null;
    const f = {
      clientMode: baseClient ? 'existing' : (OV.clients.length ? 'existing' : 'new'),
      clientId: baseClient ? baseClient.id : (OV.clients[0] || {}).id,
      client: { name: '', slug: '', web: '', logo: '', logoNegative: '', colors: { primary: '#2F5BEA', dark: '#151827', light: '#F4F5F8' }, font: 'Inter' },
      event: existing ? JSON.parse(JSON.stringify(existing)) : {
        name: '', audience: '', city: '', venue: '', date: '', time: '', invited: '', slug: '', status: 'published',
        registration: { maxGuests: 1, diets: ['Klasická', 'Vegetariánská', 'Veganská', 'Bez lepku', 'Bez laktózy'], transport: [], emailDomains: [], deadline: null },
        automations: { confirm: { enabled: true, confirmsAttendance: false }, rsvp: { enabled: true, daysBefore: 14 }, remind: { enabled: true, daysBefore: 7 } },
      },
    };
    let step = 0;
    const STEPS = isNew ? ['Klient', 'Akce', 'Registrace', 'Automatizace'] : ['Akce', 'Registrace', 'Automatizace'];
    if (isNew) crumbs([['Přehled', '#/'], ['Nová akce']]);
    const head = existing ? evHeader(existing, 'Nastavení') : `<div class="page-h"><div><h1>Nová akce</h1><p>Akce dostane vlastní landing page, evidenci účastníků, QR vstupenky, automatizace a statistiky.</p></div></div>`;
    const curClient = () => f.clientMode === 'new' ? f.client : OV.clients.find((c) => c.id === f.clientId) || f.client;

    function draw() {
      const name = STEPS[step];
      view.innerHTML = head + `
        <div class="steps-nav">${STEPS.map((s, i) => `<button type="button" data-step="${i}" ${i === step ? 'aria-current="step"' : ''} class="${i < step ? 'done' : ''}"><i>${i < step ? '✓' : i + 1}</i>${s}</button>`).join('')}</div>
        <div class="grid g-main">
          <form class="card" id="evForm" novalidate><div class="card-b">${({ Klient: stepClient, Akce: stepEvent, Registrace: stepReg, Automatizace: stepAuto })[name]()}</div>
            <div class="drawer-f" style="justify-content:space-between"><span class="muted" id="formErr" style="color:var(--err)"></span><span class="row">
              ${step ? '<button class="btn" type="button" id="prevBtn">Zpět</button>' : ''}
              ${step < STEPS.length - 1 ? '<button class="btn btn-primary" type="submit">Pokračovat</button>' : `<button class="btn btn-accent" type="submit">${isNew ? 'Vytvořit akci' : 'Uložit změny'}</button>`}
            </span></div></form>
          <div class="grid" style="align-content:start">${preview()}</div>
        </div>`;
      bind(name);
    }
    function preview() {
      const c = curClient(), e = f.event, col = c.colors || {};
      const url = c.slug && (e.slug || e.city || e.name) ? '/' + slugify(c.slug) + '/' + slugify(e.slug || e.city || e.name) : '/klient/akce';
      return `<div class="card"><div class="card-h"><div><h3>Náhled brandingu</h3><p>Landing page a e-maily</p></div></div><div class="card-b">
        <div class="preview-mini" style="--pc:${esc(col.primary)};--pdark:${esc(col.dark)};--plight:${esc(col.light)}">
          <div class="ph">${c.logoNegative || c.logo ? `<img src="${esc(c.logoNegative || c.logo)}" alt="" style="height:22px;width:auto">` : `<span style="font-weight:700">${esc(c.name || 'Logo klienta')}</span>`}<b>${esc(e.name || 'Název akce')}</b></div>
          <div class="pb"><span class="pbtn">Registrovat se</span><span style="font-size:12px;color:#6B7183">${e.date ? F.date(e.date) : 'datum'} · ${esc(e.city || 'lokalita')}</span></div>
        </div>
        <div class="link-row" style="margin-top:12px"><span class="lbl"><b>Adresa registrace</b><code>${esc(url)}</code></span></div>
      </div></div>`;
    }
    const v = (x) => esc(x == null ? '' : x);
    function stepClient() {
      const c = f.client;
      return `
        <div class="seg" id="cMode" style="margin-bottom:18px"><button type="button" data-m="existing" aria-pressed="${f.clientMode === 'existing'}" ${OV.clients.length ? '' : 'disabled'}>Stávající klient</button><button type="button" data-m="new" aria-pressed="${f.clientMode === 'new'}">Nový klient</button></div>
        ${f.clientMode === 'existing' ? `<label class="fld"><span>Klient</span><select class="select" name="clientId">${OV.clients.map((x) => `<option value="${x.id}" ${x.id === f.clientId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><span class="hint">Branding, logo a adresa se převezmou z klienta.</span></label>` : `
        <div class="form-grid">
          <label class="fld"><span>Název klienta</span><input class="input" name="cname" value="${v(c.name)}" placeholder="Např. Firma a.s."></label>
          <label class="fld"><span>Adresa <small>(slug)</small></span><input class="input" name="cslug" value="${v(c.slug)}" placeholder="firma"><span class="hint">Stránka klienta bude /<b>${v(slugify(c.slug || c.name) || 'firma')}</b></span></label>
          <label class="fld full"><span>Web klienta <small>(nepovinné)</small></span><input class="input" name="cweb" value="${v(c.web)}" placeholder="https://"></label>
          <div class="fld full"><span>Logo <small>(SVG nebo PNG, ideálně oficiální podklady)</small></span>
            <div class="logo-drop"><div class="pv" id="logoPv">${c.logo ? `<img src="${esc(c.logo)}" alt="">` : 'bez loga'}</div><div><input type="file" id="logoFile" accept="image/svg+xml,image/png,image/jpeg"><div class="hint" style="margin-top:6px">V demu se uloží jen v tomto prohlížeči ${sim()}</div></div></div></div>
          <div class="fld full"><span>Barvy</span><div class="colors">${[['primary', 'Hlavní'], ['dark', 'Tmavá'], ['light', 'Světlá']].map(([k, l]) => `<label class="color"><input type="color" data-col="${k}" value="${esc(c.colors[k])}"><span>${l}<b>${esc(c.colors[k])}</b></span></label>`).join('')}</div></div>
          <label class="fld"><span>Písmo</span><select class="select" name="cfont">${['Inter', 'Instrument Sans', 'Manrope', 'Work Sans', 'IBM Plex Sans', 'Source Sans 3', 'Montserrat', 'Lato'].map((x) => `<option ${x === c.font ? 'selected' : ''}>${x}</option>`).join('')}</select><span class="hint">Google Fonts. Firemní písmo lze doplnit naostro.</span></label>
        </div>`}`;
    }
    function stepEvent() {
      const e = f.event;
      return `<div class="form-grid">
        <label class="fld full"><span>Název akce</span><input class="input" name="name" value="${v(e.name)}" placeholder="Např. Firma, pobočka Brno"></label>
        <label class="fld"><span>Cílová skupina</span><input class="input" name="audience" value="${v(e.audience)}" placeholder="Např. Zaměstnanci pobočky Brno"></label>
        <label class="fld"><span>Lokalita</span><input class="input" name="city" value="${v(e.city)}" placeholder="Město"></label>
        <label class="fld"><span>Datum</span><input class="input" type="date" name="date" value="${v(e.date)}"></label>
        <label class="fld"><span>Čas <small>(nepovinné)</small></span><input class="input" name="time" value="${v(e.time)}" placeholder="Zatím neupřesněno"></label>
        <label class="fld"><span>Místo konání <small>(nepovinné)</small></span><input class="input" name="venue" value="${v(e.venue)}" placeholder="Zatím neupřesněno"></label>
        <label class="fld"><span>Počet pozvaných <small>(nepovinné)</small></span><input class="input" type="number" min="0" name="invited" value="${v(e.invited)}"></label>
        <label class="fld"><span>Adresa akce <small>(slug)</small></span><input class="input" name="slug" value="${v(e.slug)}" placeholder="${v(slugify(e.city || e.name) || 'brno')}"><span class="hint">/${v(slugify(curClient().slug || curClient().name) || 'klient')}/<b>${v(slugify(e.slug || e.city || e.name) || 'akce')}</b></span></label>
        <label class="fld"><span>Stav</span><select class="select" name="status"><option value="published" ${e.status === 'published' ? 'selected' : ''}>Zveřejněno (registrace otevřená)</option><option value="draft" ${e.status === 'draft' ? 'selected' : ''}>Koncept (neveřejné)</option></select></label>
      </div>`;
    }
    function stepReg() {
      const r = f.event.registration;
      return `<div class="form-grid">
        <label class="fld"><span>Doprovod</span><select class="select" name="maxGuests">${[0, 1, 2, 3].map((n) => `<option value="${n}" ${r.maxGuests === n ? 'selected' : ''}>${n ? 'max. +' + n : 'bez doprovodu'}</option>`).join('')}</select></label>
        <label class="fld"><span>Uzávěrka registrací <small>(nepovinné)</small></span><input class="input" type="date" name="deadline" value="${v((r.deadline || '').slice(0, 10))}"></label>
        <label class="fld full"><span>Možnosti stravy <small>(oddělte čárkou)</small></span><input class="input" name="diets" value="${v(r.diets.join(', '))}"></label>
        <label class="fld full"><span>Doprava <small>(oddělte čárkou, prázdné = neptat se)</small></span><input class="input" name="transport" value="${v((r.transport || []).join(', '))}" placeholder="Např. Vlastní doprava, Svozový autobus"></label>
        <label class="fld full"><span>Povolené domény e-mailu <small>(prázdné = jakýkoliv e-mail)</small></span><input class="input" name="domains" value="${v((r.emailDomains || []).join(', '))}" placeholder="firma.cz"></label>
      </div>`;
    }
    function stepAuto() {
      const a = f.event.automations;
      return `<div class="flow" style="margin:-20px">
        <div class="flow-item"><span class="ic">${ic('send')}</span><div><h4>Potvrzení registrace a QR vstupenka</h4><p>Odejde ihned po registraci.</p>
          <label class="row" style="margin-top:10px;font-size:13px"><span class="switch"><input type="checkbox" name="confirmsAttendance" ${a.confirm.confirmsAttendance ? 'checked' : ''}><span></span></span>Registrace zároveň potvrzuje účast</label></div><span class="tag ok">Vždy</span></div>
        <div class="flow-item"><span class="ic">${ic('check')}</span><div><h4>Opětovné potvrzení účasti + QR znovu</h4><p>Tlačítka Přijdu / Nepřijdu, všem kromě „Nepřijdu“.</p>
          <label class="row" style="margin-top:10px;font-size:13px"><input class="input" type="number" min="1" max="60" name="rsvpDays" value="${a.rsvp.daysBefore}" style="width:80px"> dní před akcí</label></div><label class="switch"><input type="checkbox" name="rsvpOn" ${a.rsvp.enabled ? 'checked' : ''}><span></span></label></div>
        <div class="flow-item"><span class="ic">${ic('bell')}</span><div><h4>Připomínka před akcí</h4><p>Potvrzeným „kdyby cokoliv, dejte vědět“, ostatním výzva k odpovědi.</p>
          <label class="row" style="margin-top:10px;font-size:13px"><input class="input" type="number" min="1" max="60" name="remindDays" value="${a.remind.daysBefore}" style="width:80px"> dní před akcí</label></div><label class="switch"><input type="checkbox" name="remindOn" ${a.remind.enabled ? 'checked' : ''}><span></span></label></div>
      </div>`;
    }
    function collect(name) {
      const fm = $('#evForm'), g = (n) => fm.elements[n];
      const list = (x) => String(x || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (name === 'Klient') {
        if (f.clientMode === 'existing') f.clientId = g('clientId').value;
        else Object.assign(f.client, { name: g('cname').value.trim(), slug: g('cslug').value.trim(), web: g('cweb').value.trim(), font: g('cfont').value });
      }
      if (name === 'Akce') ['name', 'audience', 'city', 'date', 'time', 'venue', 'invited', 'slug', 'status'].forEach((k) => (f.event[k] = g(k).value.trim()));
      if (name === 'Registrace') {
        const r = f.event.registration;
        r.maxGuests = +g('maxGuests').value; r.deadline = g('deadline').value ? g('deadline').value + 'T23:59:59' : null;
        r.diets = list(g('diets').value); if (!r.diets.length) r.diets = ['Klasická'];
        r.transport = list(g('transport').value); r.emailDomains = list(g('domains').value).map((d) => d.replace(/^@/, ''));
      }
      if (name === 'Automatizace') {
        const a = f.event.automations;
        a.confirm.confirmsAttendance = g('confirmsAttendance').checked;
        a.rsvp = { enabled: g('rsvpOn').checked, daysBefore: Math.max(1, +g('rsvpDays').value || 14) };
        a.remind = { enabled: g('remindOn').checked, daysBefore: Math.max(1, +g('remindDays').value || 7) };
      }
    }
    function validate(name) {
      if (name === 'Klient' && f.clientMode === 'new' && !f.client.name) return 'Zadejte název klienta.';
      if (name === 'Akce') { if (!f.event.name) return 'Zadejte název akce.'; if (!f.event.date) return 'Zadejte datum akce.'; }
      return '';
    }
    function bind(name) {
      const fm = $('#evForm');
      $$('[data-step]').forEach((b) => b.addEventListener('click', () => { collect(name); const i = +b.dataset.step; if (i < step || !validate(name)) { step = i; draw(); } }));
      const pb = $('#prevBtn'); if (pb) pb.addEventListener('click', () => { collect(name); step--; draw(); });
      fm.addEventListener('input', () => { collect(name); const pv = view.querySelector('.g-main > .grid'); if (pv) pv.innerHTML = preview(); });
      const cm = $('#cMode'); if (cm) cm.addEventListener('click', (e) => { const b = e.target.closest('button[data-m]'); if (!b || b.disabled) return; collect(name); f.clientMode = b.dataset.m; draw(); });
      $$('[data-col]').forEach((x) => x.addEventListener('input', () => { f.client.colors[x.dataset.col] = x.value; x.nextElementSibling.querySelector('b').textContent = x.value; const pv = view.querySelector('.g-main > .grid'); if (pv) pv.innerHTML = preview(); }));
      const lf = $('#logoFile');
      if (lf) lf.addEventListener('change', () => {
        const file = lf.files[0]; if (!file) return;
        if (file.size > 400e3) return UI.toast('Logo je moc velké (max. 400 kB)', 'err');
        const rd = new FileReader();
        rd.onload = () => { f.client.logo = f.client.logoNegative = rd.result; $('#logoPv').innerHTML = `<img src="${rd.result}" alt="">`; const pv = view.querySelector('.g-main > .grid'); if (pv) pv.innerHTML = preview(); };
        rd.readAsDataURL(file);
      });
      fm.addEventListener('submit', async (e) => {
        e.preventDefault(); collect(name);
        const err = validate(name); if (err) { $('#formErr').textContent = err; return; }
        if (step < STEPS.length - 1) { step++; return draw(); }
        try {
          let clientId = f.clientId;
          if (isNew && f.clientMode === 'new') clientId = (await API.call('saveClient', { client: f.client })).client.id;
          const ev = (await API.call('saveEvent', { event: Object.assign({}, f.event, { clientId: existing ? existing.clientId : clientId, id: existing ? existing.id : undefined }) })).event;
          UI.toast(isNew ? 'Akce vytvořena' : 'Uloženo');
          await refreshOverview();
          location.hash = '#/akce/' + ev.id + (isNew ? '/landing' : '');
          if (!isNew) route(false);
        } catch (x) { $('#formErr').textContent = x.message; }
      });
    }
    function slugify(x) { return String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
    draw();
  }

  // ---------- vrstva (drawer / modal) ----------
  function openLayer(html, keep) {
    if (!keep) closeLayer();
    const l = $('#layer');
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="overlay" data-close></div>${html}`;
    l.appendChild(wrap);
    wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { wrap.remove(); } });
  }
  function closeLayer() { $('#layer').innerHTML = ''; }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const l = $('#layer'); if (l.lastElementChild) l.lastElementChild.remove(); } });

  route(true);
})();
