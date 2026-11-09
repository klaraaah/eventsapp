// ============================================================
//  NASTAVENÍ PLATFORMY
//  Klienti, akce a branding tady nejsou. Přicházejí z datové vrstvy:
//  demo = js/demo-data.js, ostrá verze = Google Sheet přes Apps Script.
// ============================================================
// Ukázka pro klienty: odkaz s ?demo=1 přepne tuto kartu prohlížeče do DEMO režimu
// (fiktivní data jen v prohlížeči, nic se neukládá do tabulky ani neodesílá). ?demo=0 ukázku vypne.
window.EVENTDESK_DEMO = (function () {
  try {
    var m = location.search.match(/[?&]demo=([01])\b/);
    if (m) { if (m[1] === '1') sessionStorage.setItem('ed-demo', '1'); else sessionStorage.removeItem('ed-demo'); }
    return sessionStorage.getItem('ed-demo') === '1';
  } catch (e) { return /[?&]demo=1\b/.test(location.search); }
})();

window.PLATFORM = {
  // URL nasazené Apps Script Web App (končí /exec). Prázdné = DEMO režim:
  // fiktivní data jen v tomto prohlížeči, žádné e-maily se neodesílají.
  API_URL: window.EVENTDESK_DEMO ? '' : 'https://script.google.com/macros/s/AKfycbx1PoTbm5A-cmvBVLDtSeEyaBRydce897vGPl-xXA-uxUf8VaheyavuDQwpVoCFGFmI/exec',

  NAME: 'EventDesk',            // pracovní název platformy
  AGENCY: 'Yashica',            // agentura, která platformu používá (pořadatel akcí)
  DEMO_SCANNER_PIN: '2412',     // PIN skeneru v demu (naostro se nastavuje v Code.gs)

  // Čisté adresy /klient/akce (např. /cez/dukovany). Vyžadují přesměrování na hostingu
  // (soubor _redirects pro Netlify, 404.html pro GitHub Pages). false = landing.html?c=…&e=…
  PRETTY_URLS: true,
};
