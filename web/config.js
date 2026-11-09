// ============================================================
//  NASTAVENÍ PLATFORMY
//  Klienti, akce a branding tady nejsou. Přicházejí z datové vrstvy:
//  demo = js/demo-data.js, ostrá verze = Google Sheet přes Apps Script.
// ============================================================
window.PLATFORM = {
  // URL nasazené Apps Script Web App (končí /exec). Prázdné = DEMO režim:
  // fiktivní data jen v tomto prohlížeči, žádné e-maily se neodesílají.
  API_URL: 'https://script.google.com/macros/s/AKfycbx1PoTbm5A-cmvBVLDtSeEyaBRydce897vGPl-xXA-uxUf8VaheyavuDQwpVoCFGFmI/exec',

  NAME: 'EventDesk',            // pracovní název platformy
  AGENCY: 'Yashica',            // agentura, která platformu používá (pořadatel akcí)
  DEMO_SCANNER_PIN: '2412',     // PIN skeneru v demu (naostro se nastavuje v Code.gs)

  // Čisté adresy /klient/akce (např. /cez/dukovany). Vyžadují přesměrování na hostingu
  // (soubor _redirects pro Netlify, 404.html pro GitHub Pages). false = landing.html?c=…&e=…
  PRETTY_URLS: true,
};
