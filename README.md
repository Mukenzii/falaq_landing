# Falaq Nashr website

Publisher site with a catalog, news, Uzum Market prices, a contact form, and an admin panel.

```
browser ──► frontend (nginx :8080) ──/api──► backend (Node + Express :3000) ──► db (Postgres 16)
              site + /admin/                     └─ headless Chromium → uzum.uz
```

| Service    | What it does                                                                 |
|------------|------------------------------------------------------------------------------|
| `frontend` | nginx: serves the site (`frontend/`) and admin panel (`frontend/admin/`), proxies `/api` |
| `backend`  | REST API, admin auth, Uzum scraper (Playwright Chromium)                      |
| `db`       | Postgres: books, news, settings, Uzum products, sync history, messages        |
| `adminer`  | Optional DB browser on :8081 (`docker compose --profile tools up -d`)          |

## Run

```sh
cp .env.example .env          # set ADMIN_PASSWORD and SESSION_SECRET
docker compose up -d --build
```

- Site: http://localhost:8080
- Admin: http://localhost:8080/admin/ (password = `ADMIN_PASSWORD`)

On first start the backend creates the tables and loads the initial books, news and links from
`backend/seed/data.js`. With `SYNC_ON_START=1` it also runs one Uzum sync.

## Uzum Market sync

In the admin panel, **Uzum → “Uzumdan yangilash”** runs `backend/src/uzum-scraper.js`:

1. Opens `https://uzum.uz/uz/shop/<shop>` in headless Chromium and reuses the page's anonymous
   GraphQL token.
2. Pages through every product in the shop: title, price, old price, photos, rating, review
   count, availability, delivery date and link.
3. Stores them in `uzum_products`. Products that disappeared are hidden, not deleted.
4. Links each book to a product by title (or keeps the product picked by hand in the book editor).

The shop name is set in **Sozlamalar**, `falaqnashr` by default. If the shop page lists no
products, the sync falls back to an Uzum search (`falaq nashr`) and keeps only titles containing
`falaq`. The admin page shows which source was used. Clear the search word to turn this off.

Run the scraper outside Docker (uses your installed Chrome):

```sh
cd backend && npm install
PLAYWRIGHT_CHANNEL=chrome node -e "import('./src/uzum-scraper.js').then(m => m.scrapeUzum({shop:'falaqnashr', fallbackQuery:'falaq nashr', fallbackMatch:'falaq', log:console.log})).then(r => console.log(r.source, r.products.length))"
```

## API

Public: `GET /api/site`, `GET /api/products`, `POST /api/messages`, `GET /api/health`.
Admin (cookie session): `/api/admin/login|logout|me`, `/api/admin/sync`, `/api/admin/products`,
`/api/admin/books[/:id]`, `/api/admin/news[/:id]`, `/api/admin/messages[/:id]`, `/api/admin/settings`.

## Useful commands

```sh
docker compose logs -f backend                         # API and sync logs
docker compose exec db psql -U falaq falaq             # SQL shell
docker compose down                                    # stop (data is kept in the db-data volume)
docker compose down -v                                 # stop and delete the database
```
