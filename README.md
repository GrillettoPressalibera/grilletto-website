# Grilletto Pressalibera — coming soon

Landing statica in italiano, con le sette grafiche PNG ufficiali fornite in `Asset per Gorl.zip`. L'annuncio è HTML e rimane accessibile senza JavaScript; la pagina non carica script, font esterni, form, analytics o link fittizi. I font `ABCArizona-*-TRIAL` presenti nello ZIP non vengono inclusi nel sito o nel repository.

## Sviluppo e verifica

La configurazione CI usa Node.js 26.13.0 LTS (versione fissata in `.node-version`); il vincolo `engines >=26.0.0` accetta anche versioni precedenti della stessa linea. Per lo sviluppo usare preferibilmente la versione fissata, insieme a pnpm (versione dichiarata in `package.json`) e Google Chrome stabile per i test browser (`playwright` usa il canale `chrome`). Entrambi i workflow GitHub leggono `.node-version`; il workflow di deploy installa Chrome per i test prima di pubblicare.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm run build
corepack pnpm test
corepack pnpm run preview
```

`corepack pnpm test` ricostruisce `dist/` prima di eseguire i test statici e browser. La preview serve quella build in locale. Provare la pagina anche con JavaScript disabilitato e con testo ingrandito. `corepack pnpm dev` avvia l'ambiente di sviluppo. La build Vite usa asset relativi, così funziona sia su `/grilletto-website/` sia alla radice del dominio personalizzato. Le PR eseguono `.github/workflows/validate-pr.yml` senza pubblicare il sito.

## Pubblicazione GitHub Pages

Il workflow `.github/workflows/deploy-pages.yml` verifica build e test e pubblica **solo** `dist/` dopo i push su `main` (o con avvio manuale). GitHub Pages deve essere abilitato da chi ha permessi admin sul repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Se il primo workflow parte prima dell'abilitazione, rieseguirlo dalla scheda Actions dopo aver selezionato la sorgente.

Per il dominio, impostare `pressalibera.grilletto.fyi` in **GitHub Settings → Pages → Custom domain**, quindi configurare su Cloudflare DNS il CNAME `pressalibera` verso `grillettopressalibera.github.io` (non verso Cloudflare Pages). Attendere la verifica DNS e abilitare **Enforce HTTPS** su GitHub quando disponibile. Non creare un progetto Cloudflare Pages per lo stesso hostname. Il DNS e gli eventuali redirect restano gestiti separatamente su Cloudflare; questo workflow non li modifica.

Redirect eventualmente pianificati: 302 da ogni percorso di `grilletto.fyi` e `www.grilletto.fyi` alla homepage `https://pressalibera.grilletto.fyi/`, senza query, solo dopo inventario DNS/regole e configurazione separata.

## Rollback

Ripubblicare una revisione funzionante su `main` (ad esempio con un revert): il prossimo push attiva una nuova distribuzione. Per sospendere i redirect, disabilitare le regole Cloudflare dopo averne registrato la configurazione precedente. Non cancellare record o regole DNS non pertinenti.
