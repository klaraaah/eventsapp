# Bezpečnost: přehled pro první ostrou akci

## Opravená rizika (seřazeno podle závažnosti)

| # | Riziko | Závažnost | Oprava |
|---|---|---|---|
| 1 | QR obsahoval odkaz na správu registrace. Fotka cizího QR stačila k zobrazení údajů a změně účasti. | Vysoká | Dva nezávislé náhodné kódy (122 bitů). **Odkaz** (jen v e-mailu) slouží ke správě, **QR** (`EVT1.<kód>`) jen k odbavení. QR neobsahuje žádná osobní data. |
| 2 | Pouhé otevření odkazu z e-mailu měnilo účast (poštovní antiviry odkazy předotevírají). | Vysoká | Odkaz účast jen předvybere. Uloží se až po kliknutí na „Potvrdit“. |
| 3 | QR obrázky v e-mailech generovala cizí služba, která dostávala kódy. | Vysoká | QR se generuje přímo v Apps Scriptu (`qrcode.gs`). |
| 4 | Skener chránil 4místný PIN v kódu. Globální blokace po chybách umožňovala vyřadit vrátnici. | Vysoká | Náhodný klíč skeneru (256 bitů) ve Script Properties, předávaný aktivačním odkazem `#k=` (fragment se neposílá na servery). Platný klíč projde vždy, špatné pokusy obsluhu neblokují. Klíč lze vyměnit. |
| 5 | Formulář šel zneužít: zahlcení cizí schránky opakovanou registrací, roboti. | Střední | Skryté pole proti robotům, souhlas ověřený na serveru, limit 60 registrací za minutu, vstupenka znovu nejvýš 1× za 15 min na e-mail. Volitelně omezení na firemní domény. |
| 6 | Chyby e-mailů se neopakovaly, chyběla evidence. | Střední | 3 pokusy, nejistý stav se neopakuje (žádné duplikáty), list Log a statistiky v Přehledu. |
| 7 | Chyběly zálohy, výmaz po akci a zneplatnění vstupenky. | Střední | Denní záloha (14 kopií), anonymizace z menu, zneplatnění vstupenky s novým e-mailem. |
| 8 | Knihovny z cizích CDN (riziko podvržení). | Střední | Vlastní kopie ve `web/vendor/`. |
| 10 | **Vzorce v tabulce (formula injection):** ochrana šla obejít mezerou (`= =JOIN(",";A:A)`). Výsledek vzorce se vracel na stránce vstupenky, takže šlo vyčíst tajné odkazy, QR kódy a e-maily všech účastníků. | Kritická | `clean_` odstraňuje i mezery mezi úvodními znaky a text, který by stále začínal `=`, `+`, `-`, `@`, uloží s apostrofem (vždy jako text). Opraveno 9. 11. 2026, nasazena verze 2. |
| 11 | E-maily by se odesílaly i s nevyplněnou adresou webu (`VASE-ADRESA.cz`), tajné odkazy by vedly na cizí doménu. | Střední | Dokud `WEB_URL` není skutečná `https://` adresa, e-maily zůstávají ve frontě a neodcházejí. |
| 12 | Odpověď registrace prozrazovala, jestli je e-mail už přihlášený. | Střední | Server vrací stejnou odpověď vždy, web ukazuje jednotný text. |
| 13 | Chyběly bezpečnostní hlavičky (vložení stránky do cizího webu, CSP). | Nízká | `web/_headers` (Netlify): CSP s `connect-src` jen na Apps Script, `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. `landing.html` má nově `noindex` a `no-referrer`. |
| 14 | Písmo z Google Fonts posílalo IP adresy návštěvníků Googlu (GDPR). | Nízká | Instrument Sans je lokálně ve `web/fonts/` (SIL OFL), žádné externí požadavky. |
| 15 | Zrušení příchodu a změna doprovodu na skeneru zapisovaly bez zámku. | Nízká | Oba zápisy jsou pod `LockService`. |
| 9 | Veřejná administrace. | — | Administrace přes API **neexistuje**. Organizátoři pracují v Google Sheetu (přihlášení Google účtem). Webová administrace se nenasazuje (odložena v `pozdeji-platforma/`). |

### Další opatření
- Všechny vstupy se ověřují na serveru: délky, formát e-mailu, výběr jen z povolených hodnot, max. velikost požadavku, zneškodnění vzorců (`=`, `+`, `-`, `@`).
- Web ani skener nikdy nedostanou e-mail účastníka ani stav e-mailů. Skener nedostane tajný odkaz.
- Souběžné skenování řeší `LockService`: jeden zápis, druhý sken hlásí „už je uvnitř“, při obsazení „zkuste znovu“.
- Log neobsahuje tajné odkazy ani QR kódy. Chybové hlášky nevrací interní detaily.
- `noindex` a `no-referrer` na všech stránkách (registrace, vstupenka, skener).
- Bezpečnostní hlavičky platí jen na Netlify (`_headers`). GitHub Pages je nepodporuje.
- Sloupce s tajnými kódy jsou v tabulce skryté.

## Co zůstává (vědomě přijatá rizika)

| Riziko | Proč zůstává | Doporučení |
|---|---|---|
| **Vyčerpání denní kvóty e-mailů** hromadnou registrací vymyšlených adres (cca 25 min při limitu 60/min). | Bez omezení domén nejde rozlišit skutečné zaměstnance. | Nastavit `emailDomains`, případně Cloudflare Turnstile. |
| **Registrovat se může kdokoli s odkazem.** Bez omezení domén nejde ověřit, že jde o zaměstnance. | Nevíme, zda mají všichni zaměstnanci firemní e-mail. | Pokud ano, nastavte `emailDomains`. Jinak průběžně kontrolujte seznam (podezřelé řádky smazat). |
| Limit registrací je **celkový**, ne na osobu (Apps Script nezná IP adresu). | Platforma to neumožňuje. | Útok by mohl na pár minut zpomalit registrace, data neohrozí. Cloudflare Turnstile (zdarma) lze doplnit, pokud by k tomu došlo. |
| Kdo má **odkaz pro skener**, vidí jména, stravu a alergie (přes hledání). | Obsluha to potřebuje. | Předat jen obsluze. Po akci vyměnit klíč. |
| Přeposlaný e-mail = přeposlaná správa registrace. | Vlastnost odkazů bez přihlašování. | V e-mailu je upozornění. Při zneužití stačí vstupenku zneplatnit. |
| Web App běží „jako Já“ s přístupem „Kdokoli“. | Nutné pro anonymní registraci. | Kód nemá žádnou operaci, která by vracela seznamy nebo umožnila hromadné změny. |
| Bezpečnost tabulky závisí na **sdílení Google Sheetu**. | Nastavuje se ručně. | Jen konkrétní lidé, žádné „kdokoli s odkazem“. Doporučené dvoufázové ověření. |

## Ověřeno testy (simulované Google služby)
- 30+ testů backendu, mimo jiné:
  - 621 registrací;
  - duplicitní registrace;
  - upravený nebo vymyšlený QR;
  - souběžné skenování;
  - neoprávněný přístup;
  - výpadek Sheets;
  - výpadek e-mailu s opakováním bez duplikátů;
  - kvóta;
  - zneplatnění vstupenky.
- End-to-end test skutečných stránek v ostrém režimu přes HTTP proti simulovanému backendu.

**Netestováno:**
- skutečný Google účet a Gmail;
- skutečný telefon s kamerou.

Obojí je v kroku 4 v NAVOD.md.
