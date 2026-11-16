# Falaq Nashr website

Publisher site with a catalog, news, Uzum Market prices and contacts. It is a static site:
no backend, no database and no admin panel.

```
browser ──► nginx (frontend/)    index.html, app.js, styles.css, assets/
                                 data.js   content, edited by hand
                                 uzum.js   prices and stock, written by npm run sync:uzum
```

## Run

```sh
npm start                     # http://localhost:8080 (python3 -m http.server)
# or, as on the server:
docker compose up -d --build  # nginx with security headers on :8080 (PORT in .env)
```

## Content

Edit `frontend/data.js`: links, phone numbers, categories, books and news. A book's cover is
`frontend/assets/books/<slug>.jpg`; a news picture is a file in `frontend/assets/news/`.
After an edit, reload the page (or rebuild the Docker image on the server).

## Uzum Market prices

`npm run sync:uzum` reads the shop's products, prices and stock through the official Uzum Seller
OpenAPI (`scripts/uzum-client.mjs`) and writes their public fields to `frontend/uzum.js`.

1. Put the key from seller.uzum.uz → Settings → API keys into `.env` as `UZUM_API_KEY`
   (see `.env.example`). It stays on this machine and never reaches the site.
2. Run `npm run sync:uzum` (`npm run sync:uzum:check` prints the result without writing).
   Uzum's firewall answers only requests from Uzbekistan.
3. Run it daily on the server, for example with cron:
   `15 6 * * *  cd /path/to/falaq_landing && npm run sync:uzum`
   (with Docker, rebuild after the sync so the image has the new `uzum.js`).

Each book is linked to the Uzum product whose title contains the book title. If it picks the
wrong product, set `uzumId` on the book in `data.js` to the right product id (the number at the
end of the uzum.uz link). Lists show only books in stock; a sold-out book keeps its own page.
Until the first sync the site shows no prices.

## Bookshops near the visitor

A book page shows the 3 bookshops nearest to the visitor: the browser asks for their location
(it stays in the browser and is used only to measure the distance), then the page lists the shops
with distance, address, phone, hours and a route link (Yandex Maps). Without permission it lists
the first three. Shops are the `stores` list in `frontend/data.js` (format described there); a shop
with `books` shows only on those books' pages. With no shops the section is hidden.

## Contacts

There is no contact form: the contact page and the footer show the phone numbers and Telegram.
