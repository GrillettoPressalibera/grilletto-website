# Grilletto Pressalibera — coming soon

Landing statica in italiano. Titolo, annuncio e impaginazione sono già nell'HTML; React monta soltanto elementi grafici decorativi. Nessun form, analytics, foto o link fittizio.

## Sviluppo e verifica

Richiede Node.js >= 20.19, npm e Google Chrome stabile installato per i test browser (`playwright` usa il canale `chrome`). La build su Cloudflare Pages richiede solo Node e npm; non esegue i test browser.

```sh
npm ci
npm run build
npm test
npm run preview
```

La preview serve la build `dist/` in locale. Provare la pagina anche con JavaScript disabilitato e con la preferenza di movimento ridotto. `npm run dev` avvia l'ambiente di sviluppo.

## Pubblicazione prevista

Cloudflare Pages previsto tramite repository GitHub, ramo di produzione `main`, comando `npm run build`, directory di output `dist`. Il push su `main` è autorizzato, ma non attiva una distribuzione Pages finché il progetto non è collegato: il primo deploy `*.pages.dev` richiede autorizzazione distinta. Il dominio personalizzato `pressalibera.grilletto.fyi` e i redirect di `grilletto.fyi`/`www.grilletto.fyi` richiedono un'ulteriore autorizzazione, dopo inventario dei record DNS e delle regole esistenti.

Redirect pianificati: 302 da ogni percorso dei due host alla homepage `https://pressalibera.grilletto.fyi/`, senza query. Non configurare il record del sottodominio prima di associarlo in Pages → Custom domains.

## Rollback

Se il deploy è difettoso, usare la dashboard Pages → Deployments per ripristinare un deployment precedente; correggere anche il ramo `main`, altrimenti il prossimo push riattiva il difetto. Per sospendere i redirect, disabilitare le due regole Cloudflare dopo averne registrato la configurazione precedente. Non cancellare record o regole DNS non pertinenti.
