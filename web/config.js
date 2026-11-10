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

  // Texty, které web ukáže vždy – i když Apps Script ještě běží se starším kódem.
  // Při změně je upravte i v CONFIG v Code.gs (Code.gs určuje, co se uloží a co přijde e-mailem).
  OVERRIDES: {
    clients: {
      'cez-energoservis': { name: 'ČEZ ENERGOSERVIS spol. s r.o.' },
    },
    events: {
      'cez-dukovany': {
        name: 'ČEZ ENERGOSERVIS spol. s r.o., Dukovany',
        audience: 'Pracovníci na JE Dukovany',
        venue: 'Penzion Lihovar Rouchovany 197',
        time: '14:00 – 00:00 hod.',
        registration: {
          maxGuests: 0,
          busOption: 'Svozový autobus',
          busRoutes: ['směr Třebíč', 'směr Náměšť nad Oslavou', 'směr Moravský Krumlov', 'směr Jaroměřice nad Rokytnou'],
        },
      },
    },
    privacy: { processor: 'YASHICA EVENTS a.s.', retentionDays: 10 },
  },
  DEMO_SCANNER_PIN: '2412',     // jen pro demo bez API_URL (naostro chrání skener klíč v Apps Scriptu)

  // Čisté adresy /klient/akce (např. /cez/dukovany). Vyžadují přesměrování na hostingu
  // (soubor _redirects pro Netlify, 404.html pro GitHub Pages). false = landing.html?c=…&e=…
  PRETTY_URLS: true,
};
