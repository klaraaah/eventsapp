/**
 * ============================================================
 *  EVENTDESK · backend ostré verze (MVP pro první akci)
 *  Google Apps Script nad Google Sheetem. Podpora více akcí zůstává.
 * ============================================================
 *
 *  API (stejné názvy jako demo adaptér ve web/js/api.js):
 *   veřejné:  site, register, ticket, rsvp
 *     – ticket/rsvp vyžadují tajný odkaz účastníka (token, 122 bitů náhody)
 *   skener:   scannerEvents, checkin, undo, setGuests, search, stats
 *     – vyžadují klíč skeneru (Script Properties → SCANNER_KEY, v kódu není)
 *   administrace: NENÍ přes API. Organizátoři pracují přímo v Google Sheetu
 *     (přihlášení Google účtem, sdílení jen konkrétním lidem).
 *
 *  Dva oddělené identifikátory na každou registraci:
 *   • Token (tajný odkaz) – správa registrace, jen v e-mailu účastníka
 *   • QR kód – jen pro odbavení; QR obsahuje „EVT1.<náhodný kód>“, žádná osobní data
 *  Kompromitovanou vstupenku lze zneplatnit a vystavit novou (menu).
 *
 *  Nasazení: NAVOD.md · Bezpečnost: BEZPECNOST.md
 */

// ============================================================
//  NASTAVENÍ
//  Nepotvrzené údaje nechte null (na webu se ukáže „Upřesníme“).
//  Tajné údaje sem NEPATŘÍ – klíč skeneru je ve Script Properties.
// ============================================================
const CONFIG = {
  AGENCY: 'Yashica',
  WEB_URL: 'https://VASE-ADRESA.cz/',      // kde běží web, s lomítkem na konci
  PRETTY_URLS: true,                       // /cez/dukovany (vyžaduje přesměrování na hostingu, viz web/_redirects)

  CLIENTS: [
    {
      id: 'cez-energoservis', slug: 'cez', name: 'ČEZ ENERGOSERVIS',
      logo: 'img/clients/cez/logo.svg', logoNegative: 'img/clients/cez/logo-negative.svg',
      logoEmail: '',                       // URL PNG loga pro e-maily (SVG e-mailoví klienti nezobrazí); prázdné = textové logo
      colors: { primary: '#F15A22', dark: '#1E1F2E', light: '#F3F4F6' },
      font: 'Instrument Sans', contact: '',
    },
  ],

  EVENTS: [
    {
      id: 'cez-dukovany', slug: 'dukovany', clientId: 'cez-energoservis',
      name: 'ČEZ Energoservis, Dukovany', audience: 'Zaměstnanci Dukovan',
      city: 'Rouchovany', venue: null, date: '2026-12-04', time: null, invited: 600, status: 'published',
      registration: {
        maxGuests: 1, diets: ['Klasická', 'Vegetariánská', 'Veganská', 'Bez lepku', 'Bez laktózy'],
        transport: ['Vlastní doprava', 'Svozový autobus'],
        emailDomains: [],                  // např. ['cez.cz', 'cezenergoservis.cz'] – silná ochrana proti spamu
        deadline: null,
      },
      // registrace = potvrzená účast · 20. 11. opětovné potvrzení + QR · 27. 11. připomínka
      automations: { confirm: { enabled: true, confirmsAttendance: true }, rsvp: { enabled: true, daysBefore: 14 }, remind: { enabled: true, daysBefore: 7 } },
    },
    {
      // Druhá akce je připravená, ale skrytá (status 'draft'). Zveřejnění = 'published'.
      id: 'cez-temelin', slug: 'temelin', clientId: 'cez-energoservis',
      name: 'ČEZ Energoservis, Temelín', audience: 'Zaměstnanci Temelína',
      city: 'České Budějovice', venue: null, date: '2027-01-15', time: null, invited: null, status: 'draft',
      registration: { maxGuests: 1, diets: ['Klasická', 'Vegetariánská', 'Veganská', 'Bez lepku', 'Bez laktózy'], transport: ['Vlastní doprava', 'Svozový autobus'], emailDomains: [], deadline: null },
      automations: { confirm: { enabled: true, confirmsAttendance: false }, rsvp: { enabled: true, daysBefore: 14 }, remind: { enabled: true, daysBefore: 7 } },
    },
  ],

  SENDER_NAME: 'Yashica · firemní akce',
  REPLY_TO: '',                 // adresa pro odpovědi (prázdné = odesílající účet)

  BATCH_SIZE: 40,               // max. e-mailů na jedno spuštění fronty (běží každých 5 min → max. 480/h)
  QUOTA_RESERVE: 20,            // kolik denní kvóty nechat v rezervě (ruční e-maily, testy)
  MAIL_ATTEMPTS: 3,             // kolikrát zkusit e-mail při chybě, pak ruční kontrola
  MAX_REG_PER_MINUTE: 60,       // ochrana proti hromadným registracím (celkově za minutu)
  RESEND_COOLDOWN_MIN: 15,      // opakovaná registrace stejného e-mailu pošle vstupenku nejvýš 1× za 15 min
  BACKUP_KEEP: 14,              // kolik denních záloh tabulky držet
};

// ============================================================
//  Struktura tabulky
// ============================================================
const SHEET_REG = 'Registrace';
const SHEET_SUM = 'Přehled';
const SHEET_LOG = 'Log';
const HEADERS = [
  'Odkaz (tajný)', 'Akce', 'Jméno', 'E-mail', 'Útvar', 'Strava', 'Alergie', 'Doprovod', 'Doprovod – jména', 'Doprovod – strava',
  'Doprava', 'Registrováno', 'E-mail s QR', 'Výzva k potvrzení', 'Připomínka', 'Účast', 'Účast změněna', 'Příchod', 'Doprovodu přišlo', 'QR kód',
];
const COL = {
  token: 0, event: 1, name: 2, email: 3, dept: 4, diet: 5, allergies: 6, guests: 7, guestNames: 8, guestDiets: 9,
  transport: 10, registered: 11, ticketMail: 12, rsvpMail: 13, remindMail: 14, attendance: 15, attendanceAt: 16, arrivedAt: 17, guestsArrived: 18, qr: 19,
};
const MAIL_COLS = { ticket: COL.ticketMail, rsvp: COL.rsvpMail, remind: COL.remindMail };
const PENDING = 'čeká', YES = 'ANO', NO = 'NE';
const QUEUED = 'fronta', SENDING = 'odesílám…';
const QR_PREFIX = 'EVT1.';

// ============================================================
//  WEB API
// ============================================================
const ACTIONS = {
  site: site_, register: register_, ticket: ticket_, rsvp: rsvp_,
  scannerEvents: scannerEvents_, checkin: checkin_, undo: undoCheckin_, setGuests: setGuests_, search: search_, stats: statsAction_,
};

function doGet() { return ContentService.createTextOutput('OK'); }

function doPost(e) {
  let out;
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > 20000) throw fail_('Požadavek je příliš velký.');
    let d;
    try { d = JSON.parse(raw || '{}'); } catch (x) { throw fail_('Neplatný požadavek.'); }
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw fail_('Neplatný požadavek.');
    const handler = Object.prototype.hasOwnProperty.call(ACTIONS, d.action) ? ACTIONS[d.action] : null;
    if (!handler) throw fail_('Neznámá operace.', 'UNSUPPORTED');
    out = Object.assign({ ok: true }, handler(d));
  } catch (err) {
    if (!err.userMessage) console.error('API chyba: ' + (err && err.message)); // bez tokenů a osobních údajů
    out = { ok: false, error: err.userMessage || 'Něco se pokazilo na serveru. Zkuste to prosím za chvíli znovu.', code: err.code || 'SERVER' };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- veřejné ----------
function site_(d) {
  const c = CONFIG.CLIENTS.filter(function (x) { return x.slug === str_(d.client, 40).toLowerCase(); })[0];
  if (!c) throw fail_('Tuhle stránku jsme nenašli.', 'NOT_FOUND');
  const events = CONFIG.EVENTS.filter(function (e) { return e.clientId === c.id && e.status === 'published'; })
    .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  let event = null;
  if (d.event) {
    event = events.filter(function (e) { return e.slug === str_(d.event, 40).toLowerCase(); })[0];
    if (!event) throw fail_('Tuhle akci jsme nenašli. Zkontrolujte prosím odkaz.', 'NOT_FOUND');
  }
  return { client: c, events: events, event: event, now: now_().toISOString() };
}

function register_(d) {
  const ev = event_(str_(d.event, 80));
  if (!ev || ev.status !== 'published') throw fail_('Registrace na tuto akci není otevřená.');
  if (ev.registration.deadline && now_() > date_(ev.registration.deadline)) throw fail_('Registrace na tuto akci je už uzavřená.');
  if (now_() > endOfDay_(ev.date)) throw fail_('Akce už proběhla.');
  // ochrana proti robotům: skryté pole musí zůstat prázdné (tváříme se, že je vše v pořádku)
  if (str_(d.website, 200)) return {};
  if (d.consent !== true) throw fail_('Potvrďte prosím souhlas se zpracováním údajů.');
  const name = clean_(d.name, 80);
  const email = str_(d.email, 120).trim().toLowerCase();
  if (name.split(' ').length < 2 || !/^[\p{L}][\p{L} .'\-]+$/u.test(name)) throw fail_('Napište jméno i příjmení.');
  if (!/^[a-z0-9_][a-z0-9._%+\-]*@[a-z0-9.\-]+\.[a-z]{2,}$/.test(email)) throw fail_('Zkontrolujte e-mail.');
  const doms = ev.registration.emailDomains || [];
  if (doms.length && !doms.some(function (x) { return email.endsWith('@' + x); })) {
    throw fail_('Registrovat se můžete jen s firemním e-mailem (@' + doms.join(', @') + ').');
  }
  rateLimit_('reg', CONFIG.MAX_REG_PER_MINUTE, 60, 'Právě se registruje hodně lidí najednou. Zkuste to prosím za minutu.');
  const det = details_(ev, d);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw fail_('Server je teď vytížený. Zkuste to prosím za chvíli znovu.', 'BUSY');
  let row, existing = false, resend = true;
  try {
    const sh = regSheet_();
    row = findEmailRow_(sh, email, ev.id);
    if (row) {
      existing = true;
      // ochrana proti zahlcení cizí schránky: vstupenku znovu nejvýš 1× za RESEND_COOLDOWN_MIN
      const cache = CacheService.getScriptCache(), key = 'resend:' + ev.id + ':' + row;
      if (cache.get(key)) resend = false;
      else { cache.put(key, '1', CONFIG.RESEND_COOLDOWN_MIN * 60); sh.getRange(row, COL.ticketMail + 1).setValue(QUEUED); }
    } else {
      const r = new Array(HEADERS.length).fill('');
      const confirmed = ev.automations.confirm.confirmsAttendance;
      r[COL.token] = newToken_(); r[COL.qr] = newToken_();
      r[COL.event] = ev.id; r[COL.name] = name; r[COL.email] = email;
      r[COL.dept] = clean_(d.dept, 60); r[COL.diet] = det.diet; r[COL.allergies] = det.allergies;
      r[COL.guests] = det.guests; r[COL.guestNames] = det.guestNames.join('; '); r[COL.guestDiets] = det.guestDiets.join('; ');
      r[COL.transport] = det.transport; r[COL.registered] = now_();
      r[COL.ticketMail] = ev.automations.confirm.enabled ? QUEUED : '';
      r[COL.attendance] = confirmed ? YES : PENDING;
      if (confirmed) r[COL.attendanceAt] = now_();
      sh.appendRow(r);
      row = sh.getLastRow();
      CacheService.getScriptCache().put('resend:' + ev.id + ':' + row, '1', CONFIG.RESEND_COOLDOWN_MIN * 60);
    }
  } finally { lock.releaseLock(); }
  log_(ev.id, email, existing ? 'registrace (opakovaná)' : 'registrace', existing && !resend ? 'vstupenka neposlána – odesláno nedávno' : '');
  if (resend) { try { sendQueued_(row, 'ticket'); } catch (x) { /* zůstane ve frontě, zkusí se znovu */ } }
  return {}; // stejná odpověď pro novou i opakovanou registraci (neprozradí, kdo je přihlášený)
}

function ticket_(d) {
  const sh = regSheet_();
  const row = findRow_(sh, COL.token, token_(d.token));
  if (!row) throw fail_('Vstupenku jsme nenašli. Zkontrolujte odkaz z e-mailu.', 'NOT_FOUND');
  return ticketOut_(rowPerson_(sh, row));
}
function ticketOut_(p) {
  const ev = event_(p.event);
  const t = publicPerson_(p);
  t.qrText = QR_PREFIX + p.qr; // jen pro držitele tajného odkazu
  return { ticket: t, event: ev, client: client_(ev.clientId), now: now_().toISOString() };
}

function rsvp_(d) {
  const attend = [YES, NO].indexOf(d.attend) >= 0 ? d.attend : null;
  const tok = token_(d.token);
  if (!tok) throw fail_('Vstupenku jsme nenašli.', 'NOT_FOUND');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw fail_('Server je teď vytížený. Zkuste to prosím za chvíli znovu.', 'BUSY');
  let sh, row, changed = '';
  try {
    sh = regSheet_();
    row = findRow_(sh, COL.token, tok);
    if (!row) throw fail_('Vstupenku jsme nenašli.', 'NOT_FOUND');
    const ev = event_(sh.getRange(row, COL.event + 1).getValue());
    if (!ev || now_() > endOfDay_(ev.date)) throw fail_('Akce už proběhla.');
    if (attend !== NO && d.guests != null) {
      const det = details_(ev, d);
      sh.getRange(row, COL.diet + 1, 1, 6).setValues([[det.diet, det.allergies, det.guests, det.guestNames.join('; '), det.guestDiets.join('; '), det.transport]]);
      changed = 'údaje upraveny';
    }
    if (attend && sh.getRange(row, COL.attendance + 1).getValue() !== attend) {
      sh.getRange(row, COL.attendance + 1, 1, 2).setValues([[attend, now_()]]);
      changed = 'odpověď ' + attend;
    }
  } finally { lock.releaseLock(); }
  const p = rowPerson_(sh, row);
  if (changed) log_(p.event, p.email, 'účast', changed);
  return ticketOut_(p);
}

// ---------- skener (klíč skeneru) ----------
function scannerEvents_(d) {
  requireScanner_(d);
  return {
    events: CONFIG.EVENTS.filter(function (e) { return e.status !== 'draft'; }).map(function (e) {
      return { id: e.id, name: e.name, city: e.city, date: e.date, maxGuests: e.registration.maxGuests || 0, client: (client_(e.clientId) || {}).name };
    }),
  };
}

function checkin_(d) {
  requireScanner_(d);
  const qr = qr_(d.qr);
  if (!qr) return { result: 'unknown', stats: stats_(d.event) };
  // zámek: dva telefony se stejným QR ve stejnou chvíli → jen jeden zápis, druhý dostane „už je uvnitř“
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw fail_('Server je vytížený, zkuste to znovu.', 'BUSY');
  let res, p = null;
  try {
    const sh = regSheet_();
    const row = findRow_(sh, COL.qr, qr);
    if (!row) res = { result: 'unknown' };
    else {
      p = rowPerson_(sh, row);
      if (d.event && p.event !== d.event) res = { result: 'other', person: scanPerson_(p), otherEvent: publicEvent_(event_(p.event)) };
      else if (p.arrivedAt) res = { result: 'duplicate', person: scanPerson_(p) };
      else {
        const t = now_();
        sh.getRange(row, COL.arrivedAt + 1, 1, 2).setValues([[t, p.guests]]);
        p.arrivedAt = t.toISOString(); p.guestsArrived = p.guests;
        res = { result: 'ok', person: scanPerson_(p) };
      }
    }
  } finally { lock.releaseLock(); }
  if (p && res.result === 'ok') log_(p.event, p.email, 'příchod', '');
  res.stats = stats_(d.event);
  return res;
}
/** Skener dostane jen to, co obsluha u vstupu potřebuje (bez e-mailu a tajného odkazu). */
function scanPerson_(p) {
  return {
    qr: p.qr, event: p.event, name: p.name, dept: p.dept, guests: p.guests, guestNames: p.guestNames, guestDiets: p.guestDiets,
    diet: p.diet, allergies: p.allergies, attendance: p.attendance, guestsArrived: p.guestsArrived,
    arrivedAt: p.arrivedAt ? hhmm_(new Date(p.arrivedAt)) : '',
  };
}

function undoCheckin_(d) {
  requireScanner_(d);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw fail_('Server je vytížený, zkuste to znovu.', 'BUSY');
  let p = null;
  try {
    const sh = regSheet_();
    const row = findRow_(sh, COL.qr, qr_(d.qr));
    if (row) { sh.getRange(row, COL.arrivedAt + 1, 1, 2).setValues([['', '']]); p = rowPerson_(sh, row); }
  } finally { lock.releaseLock(); }
  if (p) log_(p.event, p.email, 'příchod zrušen', '');
  return { stats: stats_(d.event) };
}

function setGuests_(d) {
  requireScanner_(d);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw fail_('Server je vytížený, zkuste to znovu.', 'BUSY');
  try {
    const sh = regSheet_();
    const row = findRow_(sh, COL.qr, qr_(d.qr));
    if (row) {
      const ev = event_(sh.getRange(row, COL.event + 1).getValue());
      const n = Math.max(0, Math.min((ev && ev.registration.maxGuests) || 0, parseInt(d.n, 10) || 0));
      sh.getRange(row, COL.guestsArrived + 1).setValue(n);
    }
  } finally { lock.releaseLock(); }
  return { stats: stats_(d.event) };
}

function search_(d) {
  requireScanner_(d);
  const q = normalize_(str_(d.q, 60)).trim();
  if (q.length < 2) return { results: [] };
  const results = allPeople_()
    .filter(function (p) { return (!d.event || p.event === d.event) && normalize_(p.name).indexOf(q) >= 0; })
    .slice(0, 8)
    .map(function (p) { return { qr: p.qr, name: p.name, dept: p.dept, guests: p.guests, attendance: p.attendance, arrivedAt: p.arrivedAt ? hhmm_(new Date(p.arrivedAt)) : '' }; });
  return { results: results };
}

function statsAction_(d) { requireScanner_(d); return { stats: stats_(d.event) }; }

// ============================================================
//  E-MAILY: plánovač + fronta + opakování při chybě
// ============================================================

/** Časovač každých 5 minut: zkontroluje plán akcí a odešle, co čeká ve frontě. */
function zpracujFrontu() {
  planovac_();
  if (!webUrlReady_()) return 0; // bez skutečné adresy webu by odkazy v e-mailech vedly na cizí doménu
  const lock = LockService.getUserLock();
  if (!lock.tryLock(2000)) return -1;
  try {
    const sh = regSheet_();
    const n = sh.getLastRow() - 1;
    if (n < 1) return 0;
    const data = sh.getRange(2, 1, n, HEADERS.length).getValues();
    let sent = 0;
    for (let i = 0; i < n && sent < CONFIG.BATCH_SIZE; i++) {
      for (const kind in MAIL_COLS) {
        if (!sendable_(data[i][MAIL_COLS[kind]])) continue;
        if (!hasQuota_()) return sent;
        if (sendQueued_(i + 2, kind)) sent++;
        if (sent >= CONFIG.BATCH_SIZE) break;
      }
    }
    return sent;
  } finally { lock.releaseLock(); }
}
/** Odeslat lze „fronta“ nebo chybu s pokusy pod limitem. „odesílám…“ se NIKDY neopakuje automaticky (mohl odejít). */
function sendable_(v) {
  v = String(v);
  if (v === QUEUED) return true;
  const m = v.match(/^chyba \((\d+)\/(\d+)\)/);
  return !!m && Number(m[1]) < CONFIG.MAIL_ATTEMPTS;
}

/** Kdy se spustí automatizace „X dní před akcí“ (v 9:00 času skriptu). */
function automationAt_(ev, kind) {
  const a = ev.automations[kind];
  if (!a || !a.enabled || !a.daysBefore) return null;
  const d = dayStart_(ev.date);
  d.setDate(d.getDate() - a.daysBefore);
  d.setHours(9, 0, 0, 0);
  return d;
}

/** Když nastal čas výzvy / připomínky některé akce, zařadí e-maily do fronty (každou kampaň jen jednou). */
function planovac_() {
  const props = PropertiesService.getScriptProperties();
  CONFIG.EVENTS.forEach(function (ev) {
    if (ev.status !== 'published') return;
    ['rsvp', 'remind'].forEach(function (kind) {
      const at = automationAt_(ev, kind);
      if (!at || now_() < at || now_() > endOfDay_(ev.date)) return;
      const key = 'done_' + kind + '_' + ev.id;
      if (props.getProperty(key)) return;
      props.setProperty(key, stamp_());
      const n = zaraditKampan_(ev.id, kind);
      log_(ev.id, '', 'kampaň ' + kind, n + ' e-mailů do fronty');
    });
  });
}

/** Zařadí do fronty e-maily jedné akce všem, kdo neodpověděli „Nepřijdu“. Už odeslaným znovu ne. */
function zaraditKampan_(eventId, kind) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let queued = 0;
  try {
    const sh = regSheet_();
    const n = sh.getLastRow() - 1;
    if (n < 1) return 0;
    const col = MAIL_COLS[kind];
    const data = sh.getRange(2, 1, n, HEADERS.length).getValues();
    sh.getRange(2, col + 1, n, 1).setValues(data.map(function (v) {
      const cur = String(v[col]);
      const already = cur === QUEUED || cur === SENDING || /^odesláno/.test(cur);
      if (v[COL.token] && v[COL.event] === eventId && v[COL.attendance] !== NO && !already) { queued++; return [QUEUED]; }
      return [cur];
    }));
  } finally { lock.releaseLock(); }
  return queued;
}

/** Odešle jeden e-mail z fronty. Vrací true, když e-mail odešel. */
function sendQueued_(row, kind) {
  if (!hasQuota_() || !webUrlReady_()) return false;
  const sh = regSheet_();
  const cell = sh.getRange(row, MAIL_COLS[kind] + 1);
  const status = String(cell.getValue());
  if (!sendable_(status)) return false;
  const attempt = (status.match(/^chyba \((\d+)/) ? Number(status.match(/^chyba \((\d+)/)[1]) : 0) + 1;
  const p = rowPerson_(sh, row);
  if (kind !== 'ticket' && p.attendance === NO) { cell.setValue('nebylo třeba (nepřijde)'); return false; }
  cell.setValue(SENDING);
  SpreadsheetApp.flush(); // stav „odesílám…“ se uloží dřív, než e-mail odejde → žádné dvojité odeslání
  const mailKind = kind === 'remind' && p.attendance !== YES ? 'nudge' : kind === 'ticket' ? 'confirm' : kind;
  try {
    sendMail_(mailKind, p);
  } catch (err) {
    const msg = String(err && err.message || err).slice(0, 120);
    cell.setValue('chyba (' + attempt + '/' + CONFIG.MAIL_ATTEMPTS + '): ' + msg + (attempt >= CONFIG.MAIL_ATTEMPTS ? ' – zkontrolujte' : ''));
    log_(p.event, p.email, 'e-mail chyba', mailKind + ' · pokus ' + attempt);
    return false;
  }
  cell.setValue('odesláno · ' + stamp_());
  log_(p.event, p.email, 'e-mail odeslán', mailKind);
  return true;
}

// ---------- šablony (stejný obsah jako web/js/emails.js) ----------
function sendMail_(kind, p) {
  const ev = event_(p.event), c = client_(ev.clientId);
  const url = ticketUrl_(p.token);
  const qr = qrBlob_(QR_PREFIX + p.qr);
  const out = renderMail_(kind, p, ev, c, url, 'cid:qr');
  const opts = { to: p.email, subject: out.subject, htmlBody: out.html, body: out.text + '\n\nVaše vstupenka a potvrzení účasti: ' + url, name: CONFIG.SENDER_NAME, inlineImages: { qr: qr } };
  if (CONFIG.REPLY_TO) opts.replyTo = CONFIG.REPLY_TO;
  MailApp.sendEmail(opts);
}

function renderMail_(kind, p, ev, c, url, qrSrc) {
  const col = c.colors, muted = '#667481', line = '#E6E8EC';
  const first = p.name.split(' ')[0];
  const when = longDay_(ev.date) + (ev.time ? ', ' + ev.time : '');
  const sep = url.indexOf('?') >= 0 ? '&' : '?';
  const hero = function (k, title, text) {
    return '<tr><td style="padding:32px 32px 8px;"><div style="font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:' + col.primary + ';">' + esc_(k) + '</div>' +
      '<div style="font-size:28px;line-height:34px;font-weight:bold;margin:10px 0 0;">' + esc_(title) + '</div>' +
      '<p style="font-size:16px;line-height:25px;color:' + muted + ';margin:12px 0 0;">' + text + '</p></td></tr>';
  };
  const box = function (html) { return '<tr><td style="padding:24px 32px 0;"><div style="background:' + col.light + ';border-left:3px solid ' + col.primary + ';padding:16px 18px;font-size:15px;line-height:23px;">' + html + '</div></td></tr>'; };
  const btn = function (href, label, bg, fg, border) {
    return '<td style="padding:6px;"><a href="' + href + '" style="display:block;background:' + bg + ';color:' + fg + ';border:2px solid ' + border + ';text-decoration:none;font-weight:bold;font-size:16px;padding:14px 22px;text-align:center;">' +
      '<span style="display:inline-block;width:16px;height:16px;line-height:16px;border:2px solid ' + fg + ';margin-right:10px;vertical-align:-3px;font-size:13px;">✓</span>' + esc_(label) + '</a></td>';
  };
  // Tlačítko vede na stránku vstupenky s předvybranou odpovědí; uloží se až po potvrzení na stránce.
  const buttons = function (yes, no) {
    return '<tr><td align="center" style="padding:20px 26px 8px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
      (yes ? btn(url + sep + 'a=ano', yes, col.primary, '#FFFFFF', col.primary) : '') + (no ? btn(url + sep + 'a=ne', no, '#FFFFFF', col.dark, col.dark) : '') + '</tr></table></td></tr>';
  };
  const qr = '<tr><td align="center" style="padding:24px 32px 8px;"><img src="' + qrSrc + '" width="200" height="200" alt="QR kód vstupenky" style="display:block;width:200px;height:200px;border:1px solid ' + line + ';padding:10px;background:#FFFFFF;">' +
    '<div style="font-size:13px;color:' + muted + ';margin-top:10px;">Ukažte u vstupu. Doprovod odbavíme spolu s vámi. Kód nikomu nepřeposílejte.</div></td></tr>';
  const row = function (k, v) { return '<tr><td style="padding:10px 0;border-bottom:1px solid ' + line + ';font-size:14px;color:' + muted + ';">' + k + '</td><td style="padding:10px 0;border-bottom:1px solid ' + line + ';font-size:15px;font-weight:bold;text-align:right;">' + v + '</td></tr>'; };
  const info = '<tr><td style="padding:16px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    row('Jméno', esc_(p.name)) + row('Akce', esc_(ev.name)) + row('Kdy', esc_(when)) + row('Kde', esc_(ev.city || '') + (ev.venue ? ' · ' + esc_(ev.venue) : ' · místo upřesníme')) +
    (ev.registration.maxGuests ? row('Doprovod', p.guests ? '+' + p.guests : 'bez doprovodu') : '') + row('Strava', esc_(p.diet)) + (p.transport ? row('Doprava', esc_(p.transport)) : '') + '</table></td></tr>';
  const cta = '<tr><td style="padding:24px 32px 32px;font-size:14px;line-height:21px;color:' + muted + ';">Vstupenku, účast i údaje najdete tady: <a href="' + url + '" style="color:' + col.primary + ';font-weight:bold;">otevřít moji vstupenku</a>. Odkaz je jen váš, nepřeposílejte ho.</td></tr>';
  const shell = function (pre, inner) {
    return '<!doctype html><html><body style="margin:0;padding:0;background:' + col.light + ';"><span style="display:none;max-height:0;overflow:hidden;opacity:0;">' + esc_(pre) + '</span>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + col.light + ';"><tr><td align="center" style="padding:24px 12px;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;font-family:Arial,Helvetica,sans-serif;color:' + col.dark + ';border-top:4px solid ' + col.primary + ';">' +
      '<tr><td style="padding:20px 32px;border-bottom:1px solid ' + line + ';">' + (c.logoEmail ? '<img src="' + c.logoEmail + '" alt="' + esc_(c.name) + '" height="34" style="display:block;height:34px;width:auto;">' : '<b style="font-size:17px;letter-spacing:1px;color:' + col.primary + ';">' + esc_(c.name) + '</b>') + '</td></tr>' +
      inner +
      '<tr><td style="padding:28px 32px;background:' + col.dark + ';font-size:13px;line-height:20px;color:#AEB4BD;">' + esc_(ev.name) + ' · akce pro zaměstnance ' + esc_(c.name) + ' · pořádá <b style="color:#FFFFFF;">' + esc_(CONFIG.AGENCY) + '</b></td></tr>' +
      '</table></td></tr></table></body></html>';
  };
  const rsvpAt = automationAt_(ev, 'rsvp');
  if (kind === 'confirm') {
    const confirmed = ev.automations.confirm.confirmsAttendance || p.attendance === YES;
    const asked = !rsvpAt || now_() >= rsvpAt;
    const next = confirmed
      ? box('<b>Účast máte potvrzenou.</b> Kdyby vám do toho cokoliv přišlo, klikněte prosím na tlačítko. Uvolníte místo a nebudeme pro vás chystat jídlo.') + buttons(null, 'Nepřijdu')
      : !asked
      ? box('<b>' + day_(rsvpAt) + ' vás požádáme o potvrzení účasti</b> a pošleme vám QR kód znovu. Už teď víte, jak to bude? Stačí kliknout:') + buttons('Přijdu', 'Nepřijdu')
      : box('<b>Přijdete?</b> Dejte nám prosím vědět jedním kliknutím.') + buttons('Přijdu', 'Nepřijdu');
    return {
      subject: (confirmed ? 'Registrace potvrzena · ' : 'Vaše vstupenka · ') + ev.name + ' ' + day_(dayStart_(ev.date)),
      html: shell('QR vstupenka · ' + ev.name, hero('Registrace přijata', first + ', těšíme se na vás', 'Tady je vaše vstupenka na akci <b>' + esc_(ev.name) + '</b>. U vstupu stačí ukázat QR kód z mobilu.') + qr + info + next + cta),
      text: first + ', děkujeme za registraci na akci ' + ev.name + ' (' + when + ').',
    };
  }
  if (kind === 'rsvp') {
    return {
      subject: 'Přijdete? Potvrďte prosím účast · ' + ev.name + ' ' + day_(dayStart_(ev.date)),
      html: shell('Přijdu / Nepřijdu', hero('Potvrzení účasti', first + ', přijdete?', '<b>' + esc_(ev.name) + '</b> bude ' + esc_(longDay_(ev.date)) + '. Dejte nám prosím vědět, jestli přijdete. Podle toho objednáme jídlo a dopravu.') +
        buttons('Přijdu', 'Nepřijdu') +
        '<tr><td style="padding:4px 32px 0;font-size:14px;line-height:21px;color:' + muted + ';text-align:center;">Odpověď potvrdíte na stránce, která se otevře. Změnit ji můžete kdykoliv.</td></tr>' +
        '<tr><td style="padding:20px 32px 0;font-size:15px;line-height:23px;">Pro jistotu vám posíláme <b>vstupenku s QR kódem znovu</b>:</td></tr>' + qr + info + cta),
      text: first + ', přijdete na akci ' + ev.name + ' (' + when + ')? Odpovězte prosím přes odkaz níže.',
    };
  }
  if (kind === 'remind') {
    return {
      subject: 'Za týden se vidíme · ' + ev.name + ' ' + day_(dayStart_(ev.date)),
      html: shell('Kdyby se cokoliv změnilo, dejte nám vědět', hero('Připomínka', first + ', za týden se vidíme', 'Počítáme s vámi na akci <b>' + esc_(ev.name) + '</b>, ' + esc_(longDay_(ev.date)) + '.') +
        box('<b>Kdyby se cokoliv změnilo</b>, třeba onemocníte nebo vám do toho něco přijde, dejte nám prosím vědět.') +
        buttons('Pořád platí, přijdu', 'Nemůžu přijít') + qr + info + cta),
      text: first + ', za týden se vidíme na akci ' + ev.name + '. Kdyby se cokoliv změnilo, dejte nám prosím vědět.',
    };
  }
  return {
    subject: 'Ještě nemáme vaši odpověď · ' + ev.name + ' ' + day_(dayStart_(ev.date)),
    html: shell('Přijdete?', hero('Potvrzení účasti', first + ', ještě nemáme vaši odpověď', '<b>' + esc_(ev.name) + '</b> je už za týden. Přijdete?') + buttons('Přijdu', 'Nepřijdu') + qr + info + cta),
    text: first + ', přijdete na akci ' + ev.name + '? Odpovězte prosím přes odkaz níže.',
  };
}

/** QR obrázek generovaný přímo v Apps Scriptu (qrcode.gs) – kód neodchází žádné cizí službě. */
function qrBlob_(text) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const b64 = q.createDataURL(8, 4).split(',')[1];
  return Utilities.newBlob(Utilities.base64Decode(b64), 'image/gif', 'vstupenka-qr.gif');
}
/** Je vyplněná skutečná adresa webu? Do té doby e-maily čekají ve frontě (odkazy by vedly na cizí doménu). */
function webUrlReady_() { return /^https:\/\//.test(CONFIG.WEB_URL) && CONFIG.WEB_URL.indexOf('VASE-ADRESA') < 0; }
function ticketUrl_(token) { return CONFIG.WEB_URL.replace(/\/?$/, '/') + 'vstupenka.html?t=' + encodeURIComponent(token); }
function eventUrl_(ev) {
  const c = client_(ev.clientId), base = CONFIG.WEB_URL.replace(/\/?$/, '/');
  return CONFIG.PRETTY_URLS ? base + c.slug + '/' + ev.slug : base + 'landing.html?c=' + c.slug + '&e=' + ev.slug;
}

// ============================================================
//  PŘEHLED + LOG
// ============================================================
function obnovitPrehled() {
  const ss = ss_();
  const sum = ss.getSheetByName(SHEET_SUM) || ss.insertSheet(SHEET_SUM);
  const people = allPeople_();
  sum.clear();
  sum.getRange(1, 1).setValue('PŘEHLED · aktualizováno ' + stamp_() + ' · zbývající e-mailová kvóta dnes: ' + MailApp.getRemainingDailyQuota()).setFontWeight('bold');
  CONFIG.EVENTS.filter(function (e) { return e.status === 'published'; }).forEach(function (ev, idx) {
    const col = 1 + idx * 3;
    const list = people.filter(function (p) { return p.event === ev.id; });
    const s = eventStats_(ev, list);
    const m = mailStats_(ev, list);
    const rows = [
      [ev.name.toUpperCase(), day_(dayStart_(ev.date))],
      ['Registrace: ' + eventUrl_(ev), ''],
      ['REGISTRACE', ''],
      ['Registrovaných zaměstnanců', s.registered], ['Pozváno', ev.invited || '—'], ['Osob celkem (vč. doprovodu)', s.persons],
      ['', ''],
      ['ÚČAST (osoby vč. doprovodu)', ''],
      ['✅ Přijdou', s.yes], ['⏳ Neodpověděli', s.pending], ['❌ Nepřijdou', s.no],
      ['', ''],
      ['E-MAILY', ''],
      ['Odesláno', m.sent], ['Ve frontě', m.queued], ['Chyba – zkusí se znovu', m.retry], ['Chyba – ruční kontrola', m.failed], ['Nejistý stav („odesílám…“)', m.sending],
      ['', ''],
      ['CATERING (jen „Přijdou“)', ''],
    ].concat(Object.keys(s.diets).map(function (k) { return [k, s.diets[k]]; })).concat([
      ['Celkem porcí', s.yes], ['', ''], ['DOPRAVA (osoby, jen „Přijdou“)', ''],
    ]).concat(Object.keys(s.transport).map(function (k) { return [k, s.transport[k]]; })).concat([
      ['', ''], ['NA AKCI', ''], ['Odbaveno osob', s.arrived], ['', ''], ['ALERGIE', ''],
    ]).concat(s.allergies.length ? s.allergies.map(function (a) { return [a, '']; }) : [['—', '']]);
    sum.getRange(3, col, rows.length, 2).setValues(rows);
    sum.getRange(3, col, 1, 2).setFontWeight('bold').setFontSize(12).setBackground('#151827').setFontColor('#FFFFFF');
    rows.forEach(function (r, i) {
      if (i > 1 && r[0] && r[1] === '' && r[0] === String(r[0]).toUpperCase() && r[0] !== '—') sum.getRange(3 + i, col, 1, 2).setFontWeight('bold').setBackground('#EEF0FF');
    });
    sum.setColumnWidth(col, 300); sum.setColumnWidth(col + 1, 110); sum.setColumnWidth(col + 2, 30);
  });
}
function eventStats_(ev, list) {
  const s = { registered: 0, persons: 0, yes: 0, no: 0, pending: 0, arrived: 0, diets: {}, transport: {}, allergies: [] };
  (ev.registration.diets || []).forEach(function (x) { s.diets[x] = 0; });
  (ev.registration.transport || []).forEach(function (x) { s.transport[x] = 0; });
  list.forEach(function (p) {
    const n = 1 + p.guests;
    s.registered++; s.persons += n;
    if (p.attendance === YES) {
      s.yes += n;
      s.diets[p.diet] = (s.diets[p.diet] || 0) + 1;
      p.guestDiets.forEach(function (g) { s.diets[g] = (s.diets[g] || 0) + 1; });
      if (p.allergies) s.allergies.push(p.name + ': ' + p.allergies);
      if (p.transport) s.transport[p.transport] = (s.transport[p.transport] || 0) + n;
    } else if (p.attendance === NO) s.no += n;
    else s.pending += n;
    if (p.arrivedAt) s.arrived += 1 + (p.guestsArrived == null ? p.guests : p.guestsArrived);
  });
  return s;
}
function mailStats_(ev, list) {
  const m = { sent: 0, queued: 0, retry: 0, failed: 0, sending: 0 };
  list.forEach(function (p) {
    p.mails.forEach(function (v) {
      v = String(v);
      if (/^odesláno/.test(v)) m.sent++;
      else if (v === QUEUED) m.queued++;
      else if (v === SENDING) m.sending++;
      else if (/^chyba/.test(v)) { if (sendable_(v)) m.retry++; else m.failed++; }
    });
  });
  return m;
}
/** Deník: registrace, odpovědi, e-maily, příchody. Bez tajných odkazů a QR kódů. */
function log_(eventId, email, type, detail) {
  try {
    const ss = ss_();
    const sh = ss.getSheetByName(SHEET_LOG) || ss.insertSheet(SHEET_LOG);
    sh.appendRow([now_(), eventId, email, type, detail || '']);
  } catch (e) { console.warn('Log se nepodařilo zapsat'); }
}

// ============================================================
//  PRVNÍ SPUŠTĚNÍ + MENU (administrace v tabulce)
// ============================================================
function nastavit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
  const sh = ss.getSheetByName(SHEET_REG) || ss.insertSheet(SHEET_REG, 0);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#151827').setFontColor('#FFFFFF');
  sh.setFrozenRows(1); sh.setFrozenColumns(3);
  sh.setColumnWidth(1, 80); sh.setColumnWidth(3, 180); sh.setColumnWidth(4, 230);
  const max = sh.getMaxRows() - 1;
  const attRange = sh.getRange(2, COL.attendance + 1, max, 1);
  attRange.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([PENDING, YES, NO], true).build());
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(YES).setBackground('#E4F6EE').setRanges([attRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(NO).setBackground('#FDECEA').setRanges([attRange]).build(),
  ]);
  if (!sh.getFilter()) sh.getRange(1, 1, sh.getMaxRows(), HEADERS.length).createFilter();
  // tajné sloupce (odkaz a QR) skrýt, ať nejsou vidět při sdílení obrazovky
  sh.hideColumns(COL.token + 1); sh.hideColumns(COL.qr + 1);

  // samostatný list pro každou zveřejněnou akci (živý výběr, needitovat) – bez tajných sloupců
  CONFIG.EVENTS.filter(function (e) { return e.status === 'published'; }).forEach(function (ev) {
    const name = ev.name.slice(0, 90);
    const s = ss.getSheetByName(name) || ss.insertSheet(name);
    s.clear();
    s.getRange('A1').setFormula('=QUERY(' + SHEET_REG + '!A:T, "select C,D,E,F,G,H,I,J,K,P,R,S,M,N,O where B = \'' + ev.id + '\' order by C", 1)');
    s.getRange(1, 1, 1, 15).setFontWeight('bold').setBackground('#151827').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
    s.setTabColor((client_(ev.clientId) || { colors: {} }).colors.primary || '#4F5BFF');
  });
  if (!ss.getSheetByName(SHEET_SUM)) ss.insertSheet(SHEET_SUM);
  const lg = ss.getSheetByName(SHEET_LOG) || ss.insertSheet(SHEET_LOG);
  if (lg.getLastRow() === 0) lg.appendRow(['Čas', 'Akce', 'E-mail', 'Událost', 'Detail']);
  ensureScannerKey_();

  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('zpracujFrontu').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('obnovitPrehled').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('zalohovat').timeBased().everyDays(1).atHour(2).create();
  obnovitPrehled();

  const plan = CONFIG.EVENTS.filter(function (e) { return e.status === 'published'; }).map(function (ev) {
    const r = automationAt_(ev, 'rsvp'), m = automationAt_(ev, 'remind');
    return '• ' + ev.name + ' (' + day_(dayStart_(ev.date)) + '): QR po registraci' + (r ? ', opětovné potvrzení ' + day_(r) : '') + (m ? ', připomínka ' + day_(m) : '') + '\n   ' + eventUrl_(ev);
  }).join('\n');
  notify_('Hotovo ✓\n\n' + plan +
    '\n\nFronta a plánovač: každých 5 minut · přehled: každých 15 minut · záloha: denně ve 2:00.' +
    '\nDnes ještě můžete poslat ' + MailApp.getRemainingDailyQuota() + ' e-mailů.' +
    '\n\nDalší krok: Nasadit → Nové nasazení → Webová aplikace. Odkaz pro skenery: menu 🎟️ EventDesk → Odkaz pro skener.');
}

// Alert v tabulce; při spuštění z editoru Apps Script jen do logu (getUi tam nefunguje)
function notify_(msg) { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🎟️ EventDesk')
    .addItem('Obnovit přehled', 'menuPrehled')
    .addItem('Odeslat čekající e-maily teď', 'menuFronta')
    .addSeparator()
    .addItem('Poslat výzvu k potvrzení teď…', 'menuVyzva')
    .addItem('Poslat připomínku teď…', 'menuPripominka')
    .addItem('Znovu zařadit e-maily s chybou', 'menuChyby')
    .addSeparator()
    .addItem('Zneplatnit vstupenku na vybraném řádku a poslat novou', 'menuNovaVstupenka')
    .addItem('Odkaz pro skener', 'menuSkener')
    .addItem('Vyměnit klíč skeneru (zneplatní staré odkazy)', 'menuNovyKlicSkeneru')
    .addSeparator()
    .addItem('Zálohovat tabulku teď', 'zalohovat')
    .addItem('Po akci: anonymizovat osobní údaje…', 'menuAnonymizovat')
    .addItem('Kolik e-mailů dnes ještě můžu poslat?', 'menuKvota')
    .addItem('Poslat si testovací e-maily', 'menuTest')
    .addSeparator()
    .addItem('Nastavit (spustit jednou na začátku)', 'nastavit')
    .addToUi();
}
function menuPrehled() { obnovitPrehled(); ss_().setActiveSheet(ss_().getSheetByName(SHEET_SUM)); }
function menuFronta() {
  const n = zpracujFrontu();
  SpreadsheetApp.getUi().alert(n < 0 ? 'Fronta se právě zpracovává, zkuste to za minutu.' : 'Odesláno e-mailů: ' + n + '.\nZbývající kvóta: ' + MailApp.getRemainingDailyQuota());
}
function menuKampan_(kind, label) {
  const ui = SpreadsheetApp.getUi();
  const ids = CONFIG.EVENTS.filter(function (e) { return e.status === 'published'; }).map(function (e) { return e.id + ' = ' + e.name; }).join('\n');
  const r = ui.prompt(label, 'Napište id akce:\n' + ids, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const ev = event_(r.getResponseText().trim());
  if (!ev) return ui.alert('Akci s tímto id neznám.');
  const n = zaraditKampan_(ev.id, kind);
  PropertiesService.getScriptProperties().setProperty('done_' + kind + '_' + ev.id, stamp_() + ' (ručně)');
  log_(ev.id, '', 'kampaň ' + kind + ' (ručně)', n + ' e-mailů do fronty');
  ui.alert('Zařazeno do fronty: ' + n + ' e-mailů (' + ev.name + '). Kdo už e-mail dostal, nedostane ho znovu.');
}
function menuVyzva() { menuKampan_('rsvp', 'Opětovné potvrzení účasti'); }
function menuPripominka() { menuKampan_('remind', 'Připomínka před akcí'); }
function menuChyby() {
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('Znovu zařadit e-maily s chybou?\n\nStav „odesílám…“ znamená, že e-mail mohl odejít. Ten se znovu nezařadí – zkontrolujte ho ručně a případně přepište buňku na „fronta“.', ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  const sh = regSheet_(); const n = sh.getLastRow() - 1; if (n < 1) return;
  const range = sh.getRange(2, COL.ticketMail + 1, n, 3); let c = 0;
  range.setValues(range.getValues().map(function (r) { return r.map(function (v) { v = String(v); return /^chyba/.test(v) ? (c++, QUEUED) : v; }); }));
  ui.alert('Znovu zařazeno: ' + c + '.');
}
/** Kompromitovaná vstupenka: nový tajný odkaz + nový QR, starý QR přestane platit, e-mail s novou vstupenkou. */
function menuNovaVstupenka() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== SHEET_REG) return ui.alert('Otevřete list „' + SHEET_REG + '“ a klikněte do řádku účastníka.');
  const row = sh.getActiveRange().getRow();
  if (row < 2 || !sh.getRange(row, COL.token + 1).getValue()) return ui.alert('Vyberte řádek účastníka.');
  const name = sh.getRange(row, COL.name + 1).getValue();
  if (ui.alert('Zneplatnit vstupenku: ' + name + '?\n\nStarý QR kód i odkaz přestanou platit a účastníkovi odejde e-mail s novou vstupenkou.', ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    sh.getRange(row, COL.token + 1).setValue(newToken_());
    sh.getRange(row, COL.qr + 1).setValue(newToken_());
    sh.getRange(row, COL.ticketMail + 1).setValue(QUEUED);
  } finally { lock.releaseLock(); }
  const p = rowPerson_(sh, row);
  log_(p.event, p.email, 'vstupenka zneplatněna', 'vystavena nová');
  sendQueued_(row, 'ticket');
  ui.alert('Hotovo. Nová vstupenka: ' + sh.getRange(row, COL.ticketMail + 1).getValue());
}
function ensureScannerKey_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SCANNER_KEY')) props.setProperty('SCANNER_KEY', newToken_() + newToken_());
  return props.getProperty('SCANNER_KEY');
}
function scannerLink_() { return CONFIG.WEB_URL.replace(/\/?$/, '/') + 'scanner.html#k=' + ensureScannerKey_(); }
function menuSkener() {
  SpreadsheetApp.getUi().alert('Odkaz pro telefony u vstupu (neveřejný!)\n\n' + scannerLink_() +
    '\n\nOtevřete ho na každém telefonu obsluhy (např. pošlete obsluze osobně nebo převeďte na QR).\nOdkaz dává přístup ke jménům, stravě a alergiím účastníků – nesdílejte ho veřejně. Po akci klíč vyměňte.');
}
function menuNovyKlicSkeneru() {
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('Vyměnit klíč skeneru? Všechny dosavadní odkazy pro skener přestanou fungovat.', ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  PropertiesService.getScriptProperties().setProperty('SCANNER_KEY', newToken_() + newToken_());
  menuSkener();
}
/** Denní záloha tabulky do složky na Disku (drží posledních BACKUP_KEEP kopií). Obnova = otevřít kopii. */
function zalohovat() {
  const ss = ss_();
  const file = DriveApp.getFileById(ss.getId());
  const it = DriveApp.getFoldersByName('EventDesk – zálohy');
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder('EventDesk – zálohy');
  file.makeCopy(ss.getName() + ' – záloha ' + Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH-mm'), folder);
  const copies = [];
  const files = folder.getFiles();
  while (files.hasNext()) copies.push(files.next());
  copies.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  copies.slice(CONFIG.BACKUP_KEEP).forEach(function (f) { f.setTrashed(true); });
}
/** Po akci: smaže osobní údaje (jméno, e-mail, útvar, alergie, jména doprovodu, odkazy) – počty zůstanou. */
function menuAnonymizovat() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Anonymizovat osobní údaje', 'Nejdřív si udělejte export / zálohu, pokud je potřebujete.\n\nNapište id akce (např. cez-dukovany):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const ev = event_(r.getResponseText().trim());
  if (!ev) return ui.alert('Akci s tímto id neznám.');
  const c = ui.prompt('Opravdu?', 'Pro potvrzení napište SMAZAT', ui.ButtonSet.OK_CANCEL);
  if (c.getSelectedButton() !== ui.Button.OK || c.getResponseText().trim() !== 'SMAZAT') return ui.alert('Zrušeno.');
  const sh = regSheet_(); const n = sh.getLastRow() - 1; if (n < 1) return;
  const range = sh.getRange(2, 1, n, HEADERS.length);
  let k = 0;
  range.setValues(range.getValues().map(function (v) {
    if (v[COL.event] !== ev.id) return v;
    k++;
    v[COL.token] = ''; v[COL.qr] = ''; v[COL.name] = 'anonymizováno'; v[COL.email] = ''; v[COL.dept] = '';
    v[COL.allergies] = ''; v[COL.guestNames] = '';
    return v;
  }));
  const lg = ss_().getSheetByName(SHEET_LOG);
  if (lg && lg.getLastRow() > 1) {
    const lr = lg.getRange(2, 1, lg.getLastRow() - 1, 5);
    lr.setValues(lr.getValues().map(function (v) { if (v[1] === ev.id) v[2] = ''; return v; }));
  }
  ui.alert('Anonymizováno záznamů: ' + k + '. Zálohy na Disku (složka „EventDesk – zálohy“) smažte ručně, až nebudou potřeba.');
}
function menuKvota() { SpreadsheetApp.getUi().alert('Dnes ještě můžete poslat ' + MailApp.getRemainingDailyQuota() + ' e-mailů.\n(Google Workspace: 1 500 příjemců/den, běžný Gmail: 100.)'); }
/** Pošle testovací e-maily JEN na účet, který je spouští. */
function menuTest() {
  const me = Session.getActiveUser().getEmail();
  CONFIG.EVENTS.filter(function (e) { return e.status === 'published'; }).forEach(function (ev) {
    const p = { token: 'TEST', qr: 'TEST', event: ev.id, name: 'Testovací Zaměstnanec', email: me, guests: 1, guestDiets: [ev.registration.diets[0]], diet: ev.registration.diets[0], transport: (ev.registration.transport || [])[0] || '', attendance: YES };
    sendMail_('confirm', p);
    if (automationAt_(ev, 'rsvp')) sendMail_('rsvp', p);
    if (automationAt_(ev, 'remind')) sendMail_('remind', p);
  });
  SpreadsheetApp.getUi().alert('Testovací e-maily odeslány na ' + me + '.');
}

// ============================================================
//  POMOCNÉ
// ============================================================
function event_(id) { return CONFIG.EVENTS.filter(function (e) { return e.id === id; })[0] || null; }
function client_(id) { return CONFIG.CLIENTS.filter(function (c) { return c.id === id; })[0] || null; }
function publicEvent_(ev) { return ev ? { id: ev.id, name: ev.name, date: ev.date, city: ev.city } : null; }
function ss_() { const id = PropertiesService.getScriptProperties().getProperty('SS_ID'); return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet(); }
function regSheet_() {
  const sh = ss_().getSheetByName(SHEET_REG);
  if (!sh) throw new Error('Chybí list "' + SHEET_REG + '". Spusťte nejdřív funkci nastavit().');
  return sh;
}
function findRow_(sh, col, value) {
  const last = sh.getLastRow();
  if (last < 2 || !value) return 0;
  const cell = sh.getRange(2, col + 1, last - 1, 1).createTextFinder(String(value)).matchEntireCell(true).matchCase(true).findNext();
  return cell ? cell.getRow() : 0;
}
function findEmailRow_(sh, email, eventId) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const cells = sh.getRange(2, COL.email + 1, last - 1, 1).createTextFinder(email).matchEntireCell(true).matchCase(false).findAll();
  for (let i = 0; i < cells.length; i++) { const r = cells[i].getRow(); if (sh.getRange(r, COL.event + 1).getValue() === eventId) return r; }
  return 0;
}
function rowPerson_(sh, row) { return toPerson_(sh.getRange(row, 1, 1, HEADERS.length).getValues()[0]); }
function allPeople_() {
  const sh = regSheet_(); const n = sh.getLastRow() - 1; if (n < 1) return [];
  return sh.getRange(2, 1, n, HEADERS.length).getValues().filter(function (v) { return v[COL.token]; }).map(toPerson_);
}
const iso_ = function (v) { return v instanceof Date ? v.toISOString() : (v ? String(v) : ''); };
function toPerson_(v) {
  const ga = v[COL.guestsArrived];
  const ev = event_(String(v[COL.event]));
  return {
    token: String(v[COL.token]), qr: String(v[COL.qr] || ''), event: String(v[COL.event]), name: String(v[COL.name]), email: String(v[COL.email]), dept: String(v[COL.dept]),
    diet: String(v[COL.diet]) || ((ev && ev.registration.diets[0]) || ''), allergies: String(v[COL.allergies]),
    guests: Number(v[COL.guests]) || 0, guestNames: split_(v[COL.guestNames]), guestDiets: split_(v[COL.guestDiets]),
    transport: String(v[COL.transport] == null ? '' : v[COL.transport]),
    registered: iso_(v[COL.registered]), attendance: String(v[COL.attendance] || PENDING), attendanceAt: iso_(v[COL.attendanceAt]),
    arrivedAt: iso_(v[COL.arrivedAt]), guestsArrived: ga === '' || ga == null ? null : Number(ga),
    mails: [v[COL.ticketMail], v[COL.rsvpMail], v[COL.remindMail]],
  };
}
/** Pro stránku vstupenky: bez e-mailu, bez stavů e-mailů a bez interních tokenů. */
function publicPerson_(p) {
  return {
    token: p.token, event: p.event, name: p.name, dept: p.dept, diet: p.diet, allergies: p.allergies, guests: p.guests,
    guestNames: p.guestNames, guestDiets: p.guestDiets, transport: p.transport, registered: p.registered,
    attendance: p.attendance, attendanceAt: p.attendanceAt, arrivedAt: p.arrivedAt, guestsArrived: p.guestsArrived,
  };
}
function stats_(eventId) {
  let expected = 0, arrived = 0;
  allPeople_().forEach(function (p) {
    if (eventId && p.event !== eventId) return;
    if (p.attendance === YES) expected += 1 + p.guests;
    if (p.arrivedAt) arrived += 1 + (p.guestsArrived == null ? p.guests : p.guestsArrived);
  });
  return { expected: expected, arrived: arrived };
}
function details_(ev, d) {
  const r = ev.registration;
  const guests = Math.max(0, Math.min(r.maxGuests || 0, parseInt(d.guests, 10) || 0));
  const names = toArr_(d.guestNames), diets = toArr_(d.guestDiets);
  const pick = function (x) { return r.diets.indexOf(x) >= 0 ? x : r.diets[0]; };
  const guestNames = [], guestDiets = [];
  for (let i = 0; i < guests; i++) { guestNames.push(clean_(names[i], 80).replace(/;/g, ',') || 'Doprovod ' + (i + 1)); guestDiets.push(pick(diets[i])); }
  const t = r.transport || [];
  return { diet: pick(d.diet), transport: t.indexOf(d.transport) >= 0 ? d.transport : (t[0] || ''), allergies: clean_(d.allergies, 200), guests: guests, guestNames: guestNames, guestDiets: guestDiets };
}
/** Klíč skeneru (Script Properties). Platný klíč projde vždy – špatné pokusy neblokují obsluhu. */
function requireScanner_(d) {
  const key = PropertiesService.getScriptProperties().getProperty('SCANNER_KEY');
  const given = str_(d.key, 200);
  if (key && given.length === key.length && safeEqual_(given, key)) return;
  rateLimit_('scanfail', 300, 600, 'Příliš mnoho neplatných pokusů. Zkuste to později.');
  throw fail_('Skener není ověřený. Otevřete prosím odkaz pro skener od organizátora.', 'AUTH');
}
/** Skutečná zbývající denní kvóta účtu (Workspace 1 500 příjemců/den, Gmail 100) minus rezerva. */
function hasQuota_() { return MailApp.getRemainingDailyQuota() > CONFIG.QUOTA_RESERVE; }
function safeEqual_(a, b) { let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
/** Jednoduchý limit počtu požadavků v časovém okně (Apps Script nezná IP adresu, proto celkově). */
function rateLimit_(name, max, windowSec, msg) {
  const cache = CacheService.getScriptCache();
  const slot = name + ':' + Math.floor(Date.now() / 1000 / windowSec);
  const n = Number(cache.get(slot) || 0) + 1;
  cache.put(slot, String(n), windowSec + 5);
  if (n > max) throw fail_(msg, 'RATE');
}
/** 32 hex znaků z kryptograficky náhodného UUID (122 bitů náhody). */
function newToken_() { return Utilities.getUuid().replace(/-/g, ''); }
function token_(raw) {
  const s = str_(raw, 300).trim();
  const m = s.match(/[?&]t=([a-f0-9]{32})\b/i);
  if (m) return m[1].toLowerCase();
  return /^[a-f0-9]{32}$/i.test(s) ? s.toLowerCase() : '';
}
function qr_(raw) {
  const s = str_(raw, 300).trim();
  const m = s.match(/^EVT1\.([a-f0-9]{32})(?:\.|$)/i);
  return m ? m[1].toLowerCase() : (/^[a-f0-9]{32}$/i.test(s) ? s.toLowerCase() : '');
}
function str_(x, max) { return typeof x === 'string' ? x.slice(0, max) : (typeof x === 'number' ? String(x).slice(0, max) : ''); }
function toArr_(x) { return Array.isArray(x) ? x.slice(0, 5) : x == null ? [] : [x]; }
function split_(s) { return String(s || '').split(';').map(function (x) { return x.trim(); }).filter(String); }
/** Ořízne, zkrátí a odstraní znaky, které by Sheets mohly vykonat jako vzorec. */
function clean_(s, max) {
  // mezery mezi znaky se odstraňují taky (jinak by „= =A1“ prošlo jako vzorec); pojistka: apostrof = vždy text
  const v = str_(s, 1000).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).replace(/^[\s=+\-@'|]+/, '').trim();
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
function normalize_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function fail_(msg, code) { const e = new Error(msg); e.userMessage = msg; e.code = code || ''; return e; }
function tz_() { return Session.getScriptTimeZone() || 'Europe/Prague'; }
function now_() { return new Date(); }
function date_(iso) { return new Date(iso); }
/** Datum akce (YYYY-MM-DD) jako začátek dne v časové zóně skriptu. */
function dayStart_(ymd) { const p = String(ymd).slice(0, 10).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function endOfDay_(ymd) { const d = dayStart_(ymd); d.setHours(23, 59, 59, 999); return d; }
function stamp_() { return Utilities.formatDate(new Date(), tz_(), 'd. M. HH:mm'); }
function hhmm_(d) { return Utilities.formatDate(d, tz_(), 'HH:mm'); }
function day_(d) { return Utilities.formatDate(d, tz_(), 'd. M.'); }
function longDay_(ymd) {
  const d = dayStart_(ymd);
  const days = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  return days[d.getDay()] + ' ' + d.getDate() + '. ' + months[d.getMonth()] + ' ' + d.getFullYear();
}
