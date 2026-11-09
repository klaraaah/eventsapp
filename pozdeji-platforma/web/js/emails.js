// ============================================================
//  ŠABLONY E-MAILŮ – náhled v administraci (stejný obsah posílá Code.gs)
//  Barvy a logo podle klienta akce. Tlačítka Přijdu / Nepřijdu =
//  odkaz na vstupenku s ?a=ano|ne → na stránce se odpověď předvybere a uloží až po potvrzení.
// ============================================================
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const F = () => window.API.fmt;

  function render(kind, o) {
    const p = o.person, ev = o.event, c = o.client, url = o.ticketUrl;
    const col = Object.assign({ primary: '#2F5BEA', dark: '#151827', light: '#F4F5F8' }, c.colors);
    const muted = '#667481', line = '#E6E8EC';
    const first = p.name.split(' ')[0];
    const when = F().long(ev.date) + (ev.time ? ', ' + ev.time : '');
    const sep = url.indexOf('?') >= 0 ? '&' : '?';

    const hero = (k, title, text) => `<tr><td style="padding:32px 32px 8px;">
      <div style="font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${col.primary};">${esc(k)}</div>
      <div style="font-size:28px;line-height:34px;font-weight:bold;margin:10px 0 0;">${esc(title)}</div>
      <p style="font-size:16px;line-height:25px;color:${muted};margin:12px 0 0;">${text}</p></td></tr>`;
    const box = (html) => `<tr><td style="padding:24px 32px 0;"><div style="background:${col.light};border-left:3px solid ${col.primary};padding:16px 18px;font-size:15px;line-height:23px;">${html}</div></td></tr>`;
    const btn = (href, label, bg, fg, border) => `<td style="padding:6px;"><a href="${href}" target="_blank" style="display:block;background:${bg};color:${fg};border:2px solid ${border};text-decoration:none;font-weight:bold;font-size:16px;padding:14px 22px;text-align:center;">
      <span style="display:inline-block;width:16px;height:16px;line-height:16px;border:2px solid ${fg};margin-right:10px;vertical-align:-3px;font-size:13px;">✓</span>${esc(label)}</a></td>`;
    const buttons = (yes, no) => `<tr><td align="center" style="padding:20px 26px 8px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
      ${yes ? btn(url + sep + 'a=ano', yes, col.primary, '#FFFFFF', col.primary) : ''}${no ? btn(url + sep + 'a=ne', no, '#FFFFFF', col.dark, col.dark) : ''}</tr></table></td></tr>`;
    const qr = `<tr><td align="center" style="padding:24px 32px 8px;">
      <img src="${o.qrSrc}" width="200" height="200" alt="QR kód vstupenky" style="display:block;width:200px;height:200px;border:1px solid ${line};padding:10px;background:#FFFFFF;">
      <div style="font-size:13px;color:${muted};margin-top:10px;">Ukažte u vstupu. Doprovod odbavíme spolu s vámi.</div></td></tr>`;
    const row = (k, v) => `<tr><td style="padding:10px 0;border-bottom:1px solid ${line};font-size:14px;color:${muted};">${k}</td><td style="padding:10px 0;border-bottom:1px solid ${line};font-size:15px;font-weight:bold;text-align:right;">${v}</td></tr>`;
    const info = `<tr><td style="padding:16px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Jméno', esc(p.name))}${row('Akce', esc(ev.name))}${row('Kdy', esc(when))}${row('Kde', esc(ev.city || '') + (ev.venue ? ' · ' + esc(ev.venue) : ' · místo upřesníme'))}
      ${ev.registration.maxGuests ? row('Doprovod', p.guests ? '+' + p.guests : 'bez doprovodu') : ''}${row('Strava', esc(p.diet))}${p.transport ? row('Doprava', esc(p.transport)) : ''}</table></td></tr>`;
    const cta = `<tr><td style="padding:24px 32px 32px;font-size:14px;line-height:21px;color:${muted};">Vstupenku, účast i údaje najdete tady: <a href="${url}" target="_blank" style="color:${col.primary};font-weight:bold;">otevřít moji vstupenku</a>.</td></tr>`;
    const shell = (pre, inner) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;padding:0;background:${col.light};">
      <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(pre)}</span>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${col.light};"><tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;font-family:Arial,Helvetica,sans-serif;color:${col.dark};border-top:4px solid ${col.primary};">
      <tr><td style="padding:20px 32px;border-bottom:1px solid ${line};">${c.logo ? `<img src="${o.logoSrc || c.logo}" alt="${esc(c.name)}" height="34" style="display:block;height:34px;width:auto;">` : `<b style="font-size:17px;color:${col.primary};">${esc(c.name)}</b>`}</td></tr>
      ${inner}
      <tr><td style="padding:28px 32px;background:${col.dark};font-size:13px;line-height:20px;color:#AEB4BD;">${esc(ev.name)} · akce pro zaměstnance ${esc(c.name)} · pořádá <b style="color:#FFFFFF;">${esc(o.agency)}</b></td></tr>
      </table></td></tr></table></body></html>`;

    const rsvpAt = window.API.automationAt(ev, 'rsvp');
    if (kind === 'confirm') {
      const confirmed = ev.automations.confirm.confirmsAttendance || p.attendance === 'ANO';
      const next = confirmed
        ? box('<b>Účast máte potvrzenou.</b> Kdyby vám do toho cokoliv přišlo, klikněte prosím na tlačítko. Uvolníte místo a nebudeme pro vás chystat jídlo.') + buttons(null, 'Nepřijdu')
        : rsvpAt
        ? box(`<b>${F().day(rsvpAt.toISOString())} vás požádáme o potvrzení účasti</b> a pošleme vám QR kód znovu. Už teď víte, jak to bude? Stačí kliknout:`) + buttons('Přijdu', 'Nepřijdu')
        : box('<b>Přijdete?</b> Dejte nám prosím vědět jedním kliknutím.') + buttons('Přijdu', 'Nepřijdu');
      return {
        subject: (confirmed ? 'Registrace potvrzena · ' : 'Vaše vstupenka · ') + ev.name + ' ' + F().day(ev.date),
        html: shell('QR vstupenka · ' + ev.name, hero('Registrace přijata', first + ', těšíme se na vás', 'Tady je vaše vstupenka na akci <b>' + esc(ev.name) + '</b>. U vstupu stačí ukázat QR kód z mobilu.') + qr + info + next + cta),
      };
    }
    if (kind === 'rsvp') {
      return {
        subject: 'Přijdete? Potvrďte prosím účast · ' + ev.name + ' ' + F().day(ev.date),
        html: shell('Jedno kliknutí: Přijdu / Nepřijdu', hero('Potvrzení účasti', first + ', přijdete?', '<b>' + esc(ev.name) + '</b> bude ' + esc(F().long(ev.date)) + '. Dejte nám prosím vědět, jestli přijdete. Podle toho objednáme jídlo a dopravu.') +
          buttons('Přijdu', 'Nepřijdu') +
          `<tr><td style="padding:4px 32px 0;font-size:14px;line-height:21px;color:${muted};text-align:center;">Odpověď potvrdíte na stránce, která se otevře. Změnit ji můžete kdykoliv.</td></tr>` +
          `<tr><td style="padding:20px 32px 0;font-size:15px;line-height:23px;">Pro jistotu vám posíláme <b>vstupenku s QR kódem znovu</b>:</td></tr>` + qr + info + cta),
      };
    }
    if (kind === 'remind') {
      return {
        subject: 'Za týden se vidíme · ' + ev.name + ' ' + F().day(ev.date),
        html: shell('Kdyby se cokoliv změnilo, dejte nám vědět jedním kliknutím', hero('Připomínka', first + ', za týden se vidíme', 'Počítáme s vámi na akci <b>' + esc(ev.name) + '</b>, ' + esc(F().long(ev.date)) + '.') +
          box('<b>Kdyby se cokoliv změnilo</b>, třeba onemocníte nebo vám do toho něco přijde, dejte nám prosím vědět. Stačí jedno kliknutí.') +
          buttons('Pořád platí, přijdu', 'Nemůžu přijít') + qr + info + cta),
      };
    }
    // nudge: připomínka těm, kdo neodpověděli
    return {
      subject: 'Ještě nemáme vaši odpověď · ' + ev.name + ' ' + F().day(ev.date),
      html: shell('Přijdete? Jedno kliknutí stačí', hero('Potvrzení účasti', first + ', ještě nemáme vaši odpověď', '<b>' + esc(ev.name) + '</b> je už za týden. Přijdete?') + buttons('Přijdu', 'Nepřijdu') + qr + info + cta),
    };
  }

  const LABELS = { confirm: 'Potvrzení registrace + QR', rsvp: 'Opětovné potvrzení účasti', remind: 'Připomínka 7 dní předem', nudge: 'Připomínka (bez odpovědi)' };
  window.EMAILS = { render, LABELS };
})();
