// ============================================================
//  NASTAVENÍ
//  Web je napojený na Apps Script → registrace se ukládají do Google Sheetu.
// ============================================================
window.PLATFORM = {
  // URL nasazené Apps Script Web App (končí /exec)
  API_URL: 'https://script.google.com/macros/s/AKfycbx1PoTbm5A-cmvBVLDtSeEyaBRydce897vGPl-xXA-uxUf8VaheyavuDQwpVoCFGFmI/exec',

  NAME: 'EventDesk',            // pracovní název platformy
  AGENCY: 'YASHICA EVENTS a.s.', // pořadatel akce (zobrazuje se na webu)
  CLIENT_LOGOS: { cez: 'img/cez-energoservis.png' }, // logo klienta v úvodu stránky akce
  DEMO_SCANNER_PIN: '2412',     // jen pro demo bez API_URL (naostro chrání skener klíč v Apps Scriptu)

  // Čisté adresy /klient/akce (např. /cez/dukovany). Vyžadují přesměrování na hostingu
  // (soubor _redirects pro Netlify, 404.html pro GitHub Pages). false = landing.html?c=…&e=…
  PRETTY_URLS: true,
};
