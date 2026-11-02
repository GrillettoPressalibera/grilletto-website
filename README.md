# Grilletto Pressalibera — coming soon

Landing statica in italiano. Titolo, annuncio e impaginazione sono già nell'HTML; React monta soltanto elementi grafici decorativi. Nessun form, analytics, foto o link fittizio.

## Sviluppo e verifica

Richiede Node.js >= 20.19, pnpm (versione dichiarata in `package.json`) e Google Chrome stabile per i test browser (`playwright` usa il canale `chrome`). Il workflow GitHub installa Chrome per i test prima del deploy.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm run build
corepack pnpm test
corepack pnpm run preview
```

La preview serve la build `dist/` in locale. Provare la pagina anche con JavaScript disabilitato e con la preferenza di movimento ridotto. `corepack pnpm dev` avvia l'ambiente di sviluppo. La build Vite usa asset relativi, così funziona sia su `/grilletto-website/` sia alla radice del dominio personalizzato.

## Pubblicazione GitHub Pages

Il workflow `.github/workflows/deploy-pages.yml` verifica build e test e pubblica **solo** `dist/` dopo i push su `main` (o con avvio manuale). GitHub Pages deve essere abilitato da chi ha permessi admin sul repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Se il primo workflow parte prima dell'abilitazione, rieseguirlo dalla scheda Actions dopo aver selezionato la sorgente.

Per il dominio, impostare `pressalibera.grilletto.fyi` in **GitHub Settings → Pages → Custom domain**, quindi configurare su Cloudflare DNS il CNAME `pressalibera` verso `grillettopressalibera.github.io` (non verso Cloudflare Pages). Attendere la verifica DNS e abilitare **Enforce HTTPS** su GitHub quando disponibile. Non creare un progetto Cloudflare Pages per lo stesso hostname. Il DNS e gli eventuali redirect restano gestiti separatamente su Cloudflare; questo workflow non li modifica.

Redirect eventualmente pianificati: 302 da ogni percorso di `grilletto.fyi` e `www.grilletto.fyi` alla homepage `https://pressalibera.grilletto.fyi/`, senza query, solo dopo inventario DNS/regole e configurazione separata.

## Rollback

Ripubblicare una revisione funzionante su `main` (ad esempio con un revert): il prossimo push attiva una nuova distribuzione. Per sospendere i redirect, disabilitare le regole Cloudflare dopo averne registrato la configurazione precedente. Non cancellare record o regole DNS non pertinenti.
