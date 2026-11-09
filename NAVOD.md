# Návod k nasazení: ČEZ Energoservis, Dukovany (4. 12. 2026)

MVP pro jednu akci. Podpora dalších akcí v kódu zůstává (Temelín je připravený, ale skrytý: `status: 'draft'`).

```
Zaměstnanec ── /cez/dukovany ──▶ Apps Script (Web App) ──▶ Google Sheet (soukromý)
   │                                 │  ├─ e-mail s QR (Google Workspace, fronta)
   │◀── e-mail: odkaz na vstupenku ──┘  ├─ 20. 11. opětovné potvrzení + QR
   │                                    └─ 27. 11. připomínka
Obsluha u vstupu ── scanner.html (klíč skeneru) ──▶ Apps Script ──▶ čas příchodu
Organizátoři ── Google Sheet (přihlášení Google účtem) = administrace
```

Náklady: 0 Kč navíc (Google Workspace + bezplatný hosting).

## Co budete potřebovat
- **Google Workspace účet** pro odesílání (limit 1 500 příjemců/den; běžný Gmail má jen 100).
- Hosting statického webu s **https**: Netlify (doporučeno, podporuje čisté adresy) nebo GitHub Pages.
- 30–45 minut.

---

## 1. Google Sheet a Apps Script
1. Přihlaste se **Workspace účtem**, ze kterého mají chodit e-maily, a založte nový Google Sheet (např. „EventDesk – ČEZ Dukovany“).
2. **Sdílení:** jen konkrétní organizátoři (role Editor), **ne** „kdokoli s odkazem“.
3. **Rozšíření → Apps Script.** Vytvořte dva soubory a vložte do nich obsah:
   - `Code.gs` ← `apps-script/Code.gs`
   - `qrcode.gs` ← `apps-script/qrcode.gs` (generátor QR, aby kódy neodcházely cizí službě)
4. V Nastavení projektu (⚙️) zapněte „Zobrazit appsscript.json“ a vložte `apps-script/appsscript.json`.
5. V `Code.gs` nahoře v `CONFIG` zkontrolujte:
   - `WEB_URL`: adresa webu (doplníte po kroku 2)
   - `REPLY_TO`: adresa pro odpovědi účastníků
   - u akce: `venue`, `time` (zatím `null` = „Upřesníme“), `emailDomains` (doporučeno, viz Bezpečnost)
6. Vyberte funkci **`nastavit`** → **Spustit** → povolte oprávnění. Funkce:
   - vytvoří listy Registrace, list akce, Přehled a Log;
   - vytvoří tajný klíč skeneru (uloží se do Script Properties, ne do kódu);
   - nastaví časovače: fronta e-mailů 5 min, přehled 15 min, záloha denně ve 2:00.
7. **Nasadit → Nové nasazení → Webová aplikace:**
   - Spustit jako: **Já**
   - Kdo má přístup: **Kdokoli** (nutné pro registrační formulář; administrátorské operace přes API neexistují)
   - Zkopírujte URL končící `/exec`.

> Po každé změně `Code.gs`: **Nasadit → Spravovat nasazení → Upravit → Nová verze** (URL zůstane stejná).

## 2. Web
1. Ve `web/config.js` vložte URL do `API_URL`.
2. Nasaďte složku `web/`:
   - **Netlify:** přetáhněte složku na app.netlify.com/drop (s účtem, aby nevypršela). Soubor `_redirects` zařídí adresy `/cez/dukovany`.
   - **GitHub Pages:** funguje přes `404.html`. Pokud web neběží v kořeni domény, upravte `BASE` v `404.html` a `APP_BASE` v `landing.html`.
3. Adresu webu vložte do `CONFIG.WEB_URL` v Code.gs a nasaďte novou verzi.
   > Dokud je v `WEB_URL` zástupná adresa, e-maily se neodesílají a čekají ve frontě (odkazy by vedly na cizí doménu). Po nasazení nové verze odejdou samy do 5 minut.
   > Bezpečnostní hlavičky (`_headers`) fungují jen na Netlify, proto je Netlify doporučený.
4. **Zaměstnancům posílejte odkaz:** `https://VASE-ADRESA/cez/dukovany`

## 3. Skenery u vstupu
- V tabulce **🎟️ EventDesk → Odkaz pro skener**. Odkaz otevřete na každém telefonu obsluhy (předejte osobně, nesdílejte veřejně).
- Telefon zůstane aktivovaný. „Odhlásit“ aktivaci smaže.
- Po akci: **Vyměnit klíč skeneru** (staré odkazy přestanou platit).

## 4. Test před spuštěním (bez rizika)
1. **🎟️ EventDesk → Poslat si testovací e-maily**: přijdou jen na váš účet.
2. Zaregistrujte se na webu vlastním e-mailem. Zkontrolujte e-mail s QR, odkaz na vstupenku a změnu účasti (vyžaduje potvrzení na stránce).
3. Na mobilu otevřete odkaz pro skener a naskenujte svůj QR. Druhý sken má hlásit „Už je uvnitř“.
4. Testovací řádky v listu Registrace smažte a vyčistěte list Log.

## Harmonogram (automaticky)
| Kdy | Co |
|---|---|
| po registraci | e-mail s QR (registrace = potvrzená účast) |
| **20. 11. 9:00** | opětovné potvrzení účasti + QR znovu (všem kromě „Nepřijdu“) |
| **27. 11. 9:00** | připomínka: potvrzeným „kdyby cokoliv, dejte vědět“, ostatním výzva k odpovědi |
| **4. 12.** | check-in |

Kampaně jde spustit i ručně z menu. Kdo už e-mail dostal, nedostane ho znovu.

## E-maily a kvóty
- Fronta každých 5 minut, max. 40 e-mailů na běh (max. 480/h). Před každým odesláním se čte **skutečná zbývající kvóta** účtu; rezervu 20 nechává pro ruční e-maily.
- 600 lidí: výzva odejde zhruba za 75 minut.
- Při chybě se e-mail zkusí ještě 2× a pak se označí „zkontrolujte“. Stav „odesílám…“ se automaticky neopakuje, protože e-mail mohl odejít. Zkontrolujte ho ručně.
- Vše je v listu **Log** a v **Přehledu** (odesláno / ve frontě / chyby).

## Administrace = Google Sheet
- **Seznam účastníků:** list „ČEZ Energoservis, Dukovany“ (jen pro čtení) nebo „Registrace“ (filtry jsou zapnuté).
- **Stav účasti a příchodu:** sloupce Účast a Příchod. **Přehled:** catering, doprava, e-maily, odbaveno.
- **Export:** Soubor → Stáhnout → .xlsx / .csv.
- **Kompromitovaná vstupenka:** klikněte do řádku → menu **Zneplatnit vstupenku… a poslat novou**.
- Sloupce s tajným odkazem a QR kódem jsou skryté. Nesdílejte je.

## Den akce
- [ ] 2–3 nabité telefony s daty, odkaz pro skener otevřený
- [ ] záloha: vytištěný list akce podle abecedy
- [ ] bez QR → **Hledat jménem**; méně doprovodu → −/+; omyl → „Zrušit“

## Po akci
1. Export, pokud je potřeba (Soubor → Stáhnout).
2. **🎟️ EventDesk → Po akci: anonymizovat osobní údaje…** (smaže jména, e-maily, alergie a odkazy, počty zůstanou).
3. Smažte zálohy ve složce Disku „EventDesk – zálohy“.
4. Vyměňte klíč skeneru a zrušte nasazení Web App (Nasadit → Spravovat nasazení → Archivovat).

## Zálohy a obnova
Denně ve 2:00 se kopie tabulky uloží do složky „EventDesk – zálohy“ (posledních 14). Obnova: otevřete kopii, zkopírujte list Registrace zpět, případně v ní spusťte `nastavit` a nasaďte Web App z ní.

## Co je ve složce `web/`
Jen to, co se nasazuje: registrace (`landing.html`), vstupenka (`vstupenka.html`), skener (`scanner.html`) a `index.html`, který přesměruje na `/cez/dukovany`.

Ukázková „velká“ administrace pro agenturu je odložená ve složce `pozdeji-platforma/` a nenasazuje se.

## Demo
Prázdné `API_URL` = demo s fiktivními daty, nic se nikam neposílá: `/cez/dukovany`, `vstupenka.html`, `scanner.html` (PIN 2412).
