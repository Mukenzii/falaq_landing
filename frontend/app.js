/* Falaq Nashr website: a small single-page app with hash routing.
   Content comes from the API (/api/site); prices and stock are synced from Uzum Market in the admin panel. */
(async function () {
  const $app = document.getElementById("app");

  // Every string is HTML-escaped once on load, so templates below can interpolate freely.
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const escAll = (v) =>
    typeof v === "string" ? esc(v)
      : Array.isArray(v) ? v.map(escAll)
      : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, escAll(x)]))
      : v;
  const getJSON = async (url) => {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return escAll(await r.json());
  };

  let D;
  try {
    D = await getJSON("/api/site");
  } catch (e) {
    $app.innerHTML = `<section class="empty panel"><h1>Sayt yuklanmadi</h1><p>Server bilan aloqa yo‘q. Sahifani birozdan so‘ng yangilang.</p></section>`;
    return;
  }
  const L = D.links;
  let products = null; // Uzum shop page, loaded on first visit

  /* ---------- helpers ---------- */
  const slugify = (s) =>
    s.toLowerCase().replace(/[’‘ʻʼ']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const book = (slug) => D.books.find((b) => b.slug === slug);
  const newsItem = (slug) => D.news.find((n) => n.slug === slug);
  const cat = (slug) => D.categories.find((c) => c.slug === slug);
  const cover = (b) => b.cover || (b.uzum && b.uzum.image) || "assets/books/placeholder.svg";
  const catCover = (c) => { const b = book(c.cover); return b ? cover(b) : `assets/books/${c.cover}.jpg`; };
  const arrow = '<span class="arr" aria-hidden="true">↗</span>';
  const ext = 'target="_blank" rel="noopener"';
  const tel = (p) => "tel:" + p.replace(/\s/g, "");

  /* Price and stock synced from Uzum Market by the admin "Uzumdan yangilash" button */
  const uzumFor = (b) => b.uzum || null;
  // Lists show only books in stock on Uzum Market right now. A sold-out or unlinked book keeps
  // its own page (old links still work) but leaves every list.
  const onSale = (b) => !!(b.uzum && b.uzum.inStock);
  const forSale = D.books.filter(onSale);
  const som = (n) => n.toLocaleString("ru-RU").replace(/\s/g, " ") + " so‘m";
  const stockBadge = (u) =>
    `<span class="stock ${u.inStock ? "stock--in" : "stock--out"}">${u.inStock ? "Sotuvda" : "Tugagan"}</span>`;
  const oldPrice = (u) => (u.fullPrice ? ` <s class="old-price">${som(u.fullPrice)}</s>` : "");

  const favKey = "falaq:favorites";
  function getFavs() {
    try { return JSON.parse(localStorage.getItem(favKey)) || []; } catch (e) { return []; }
  }
  function setFavs(list) {
    try { localStorage.setItem(favKey, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
  }
  let favs = getFavs();

  const heart = (filled) =>
    `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

  function favButton(slug) {
    const on = favs.includes(slug);
    return `<button class="fav${on ? " on" : ""}" type="button" data-fav="${slug}" aria-pressed="${on}" aria-label="${on ? "Saralanganlardan olib tashlash" : "Saralanganlarga qo‘shish"}">${heart(on)}</button>`;
  }

  /* ---------- shared blocks ---------- */
  function bookCard(b) {
    const u = uzumFor(b);
    const price = u && (u.price || !u.inStock)
      ? `<span class="book-card__price">${u.price ? som(u.price) : ""}${u.inStock ? oldPrice(u) : stockBadge(u)}</span>`
      : "";
    return `<article class="book-card">
      ${favButton(b.slug)}
      <a class="book-card__link" href="#/kitob/${b.slug}">
        <img src="${cover(b)}" alt="${b.title} — muqova" loading="lazy">
        <span class="book-card__author">${b.author}</span>
        <h3 class="book-card__title">${b.title}</h3>
        ${price}
        <span class="more">Batafsil ${arrow}</span>
      </a>
    </article>`;
  }

  function newsCard(n) {
    return `<article class="news-card">
      <a href="#/yangilik/${n.slug}">
        <div class="news-card__img${n.app ? " is-app" : ""}"><img src="${n.image}" alt="" loading="lazy"></div>
        <span class="news-card__src">Falaq Nashr</span>
        <h3 class="news-card__title">${n.title}</h3>
        <span class="more">Batafsil ${arrow}</span>
      </a>
    </article>`;
  }

  function pageHero(title, sub, eyebrow) {
    return `<section class="page-hero panel">
      ${eyebrow ? `<p class="eyebrow eyebrow--blue">${eyebrow}</p>` : ""}
      <h1>${title}</h1>
      ${sub ? `<p class="page-hero__sub">${sub}</p>` : ""}
    </section>`;
  }

  // Page links for long lists. href(n) builds the link for page n.
  function pager(page, pages, href) {
    if (pages <= 1) return "";
    const nums = [];
    for (let n = 1; n <= pages; n++) {
      if (n === 1 || n === pages || Math.abs(n - page) <= 1) nums.push(n);
      else if (nums[nums.length - 1] !== "…") nums.push("…");
    }
    const link = (n, label, aria) => `<a class="pager__btn" href="${href(n)}" aria-label="${aria}">${label}</a>`;
    return `<nav class="pager" aria-label="Sahifalar">
      ${page > 1 ? link(page - 1, "←", "Oldingi sahifa") : `<span class="pager__btn is-off" aria-hidden="true">←</span>`}
      ${nums.map((n) => n === "…" ? `<span class="pager__gap">…</span>`
        : n === page ? `<span class="pager__btn is-on" aria-current="page">${n}</span>` : link(n, n, `${n}-sahifa`)).join("")}
      ${page < pages ? link(page + 1, "→", "Keyingi sahifa") : `<span class="pager__btn is-off" aria-hidden="true">→</span>`}
    </nav>`;
  }
  const pageOf = (params, pages) => Math.min(Math.max(parseInt(params.get("p"), 10) || 1, 1), Math.max(pages, 1));

  function wholesaleBand() {
    return `
      <div class="band__text">
        <p class="eyebrow eyebrow--sky">Kitob do‘konlari uchun</p>
        <h2>Falaq kitoblari sizning do‘koningizda.</h2>
        <p>Ulgurji xarid va hamkorlik masalalari bo‘yicha biz bilan bog‘laning.</p>
      </div>
      <div class="band__contact">
        ${D.phones.map((p) => `<a class="band__phone" href="${tel(p)}">${p}</a>`).join("")}
        <a class="btn btn--light" href="${L.telegram}" ${ext}>Telegram orqali yozish</a>
      </div>`;
  }

  /* ---------- pages ---------- */
  // Home rows show what can be bought on Uzum right now: the row's chosen books on sale, then
  // other books on sale, then in-stock Uzum shop products not yet on the site.
  function homeRow(chosen, used, count = 4) {
    const books = [...chosen, ...forSale].filter((b, i, all) => all.indexOf(b) === i && !used.has("b" + b.slug));
    const cards = [];
    const take = (key, html) => { used.add(key); cards.push(html); };
    for (const b of books) if (cards.length < count) take("b" + b.slug, bookCard(b));
    if (cards.length < count) {
      if (!products) loadProducts(); // the home page redraws with shop products once they arrive
      const linked = new Set(D.books.map((b) => b.uzum && b.uzum.id));
      for (const p of products ? products.products : []) {
        if (cards.length < count && p.inStock && !linked.has(p.id) && !used.has("p" + p.id)) take("p" + p.id, productCard(p));
      }
    }
    return cards.join("");
  }

  function home() {
    const used = new Set();
    const featuredRow = homeRow(forSale.filter((b) => b.featured), used);
    const moreRow = homeRow(forSale.filter((b) => b.more), used);
    return `
    <section class="hero panel">
      <div class="hero__text">
        <h1>O‘qidingizmi, endi boshqa odamsiz.</h1>
        <p class="hero__lead">Falaq Nashr kitoblari bilan tanishing. O‘zingiz uchun mutolaa, yaqinlaringiz uchun mazmunli sovg‘a toping.</p>
        <div class="btn-row">
          <a class="btn" href="#/kitoblar">Kitoblarni ko‘rish <span class="btn__arrow" aria-hidden="true">→</span></a>
          <a class="btn btn--ghost" href="#/aloqa">Ulgurji savdo <span class="btn__arrow" aria-hidden="true">→</span></a>
        </div>
      </div>
      <a class="hero__img" href="#/yangilik/binafsha-lotin"><img src="assets/news/binafsha-lotin.jpg" alt="Binafsha shu’lasi lotin yozuvida sotuvda"></a>
    </section>

    ${featuredRow ? `<section class="section">
      <div class="section__head">
        <div><p class="eyebrow">Falaq Nashr kitoblari</p><h2>Mutolaa uchun tanlov</h2></div>
        <a class="btn btn--sm" href="#/kitoblar/tanlov">Barcha kitoblar</a>
      </div>
      <div class="grid grid--4">${featuredRow}</div>
    </section>` : ""}

    <section class="section">
      <div class="section__head"><div><p class="eyebrow">O‘zingizga mos kitob</p><h2>Qaysi mavzu sizga yaqin?</h2></div></div>
      <div class="grid grid--3 topics">
        ${D.categories.map((c) => `<a class="topic" href="#/kitoblar/${c.slug}">
            <span class="topic__img"><img src="${catCover(c)}" alt="" loading="lazy"></span>
            <span class="topic__name">${c.name}</span>
            <span class="topic__tag">${c.tagline}</span>
          </a>`).join("")}
      </div>
    </section>

    ${moreRow ? `<section class="section">
      <div class="section__head"><div><p class="eyebrow">Yangi mutolaaga qadam</p><h2>Yana tanishib chiqing</h2></div></div>
      <div class="grid grid--4">${moreRow}</div>
    </section>` : ""}

    <section class="section">
      <div class="section__head">
        <div><p class="eyebrow">Rasmiy kanaldan</p><h2>Nashriyot yangiliklari</h2></div>
        <a class="link-more" href="#/yangiliklar">Barcha yangiliklar ${arrow}</a>
      </div>
      <div class="grid grid--3 news-mini-grid">${D.news.slice(0, 3).map((n) => `
        <article class="news-mini">
          <a href="#/yangilik/${n.slug}" class="news-mini__img"><img src="${n.image}" alt="" loading="lazy"></a>
          <span class="news-card__src">Falaq Nashr</span>
          <h3><a href="#/yangilik/${n.slug}">${n.title}</a></h3>
          <p>${n.summary}</p>
          <a class="more" href="${L.telegram}" ${ext}>Telegramda o‘qish ${arrow}</a>
        </article>`).join("")}
      </div>
    </section>`;
  }

  function about() {
    return `
    ${pageHero("Falaq Nashr", "O‘qidingizmi, endi boshqa odamsiz.")}
    <section class="about">
      <img class="about__img" src="assets/news/uzum-market.jpg" alt="Falaq Nashr kitoblari Uzum Marketda">
      <div class="about__text">
        <p class="eyebrow">Biz haqimizda</p>
        <h2>Kitob orqali yangi dunyolarni kashf eting.</h2>
        <p>Falaq Nashr — kitoblarni asl tillaridan o‘zbek tiliga tarjima qilib, nashr etuvchi nashriyot. Badiiy asarlar, ma’rifiy kitoblar hamda oila va tarbiyaga oid adabiyotlarimiz bilan tanishing.</p>
        <p>Kitoblarimizni kitob do‘konlaridan yoki Uzum Marketdagi rasmiy sahifamizdan xarid qilishingiz mumkin. Kitob do‘konlari uchun ulgurji savdo ham mavjud.</p>
        <div><a class="btn" href="${L.telegram}" ${ext}>Rasmiy kanalimiz</a></div>
      </div>
    </section>`;
  }

  const lists = {
    "": { title: "Barcha kitoblar", filter: () => true },
    badiiy: { title: "Badiiy adabiyot", filter: (b) => b.category === "badiiy" },
    marifiy: { title: "Ma’rifiy adabiyot", filter: (b) => b.category === "marifiy" },
    oila: { title: "Oila va tarbiya", filter: (b) => b.category === "oila" },
    tanlov: { title: "Mutolaa uchun tanlov", filter: () => true, hidden: true },
    elonlar: { title: "Nashriyot e’lonlarida", filter: (b) => b.announced, hidden: true },
  };

  const BOOKS_PER_PAGE = 9;
  function catalog(key, params) {
    const l = lists[key];
    if (!l) return notFound();
    const all = forSale.filter(l.filter);
    const pages = Math.ceil(all.length / BOOKS_PER_PAGE);
    const page = pageOf(params, pages);
    const items = all.slice((page - 1) * BOOKS_PER_PAGE, page * BOOKS_PER_PAGE);
    const side = ["", "badiiy", "marifiy", "oila"]
      .map((k) => `<li><a href="#/kitoblar${k ? "/" + k : ""}" class="${k === key ? "active" : ""}"${k === key ? ' aria-current="page"' : ""}>${lists[k].title}</a></li>`)
      .join("");
    return `
    ${pageHero(l.title, "Falaq Nashr kitoblari bilan tanishing.")}
    <section class="catalog">
      <nav class="catalog__side" aria-label="Kitob bo‘limlari"><p class="eyebrow">Kitoblar</p><ul>${side}</ul></nav>
      <div class="catalog__main">
        ${all.length ? `<p class="count list-top">${all.length} ta kitob</p>
        <div class="grid grid--3">${items.map(bookCard).join("")}</div>` : `<p class="note list-top">Hozircha bu bo‘limda sotuvdagi kitob yo‘q.</p>`}
        ${pager(page, pages, (n) => `#/kitoblar${key ? "/" + key : ""}${n > 1 ? "?p=" + n : ""}`)}
      </div>
    </section>`;
  }

  function bookPage(slug) {
    const b = book(slug);
    if (!b) return notFound();
    const c = cat(b.category) || { slug: "", name: "Kitoblar" };
    const elon = b.news ? `#/yangilik/${b.news}` : L.telegram;
    const elonAttr = b.news ? "" : ext;
    const u = uzumFor(b);
    return `
    <nav class="crumbs" aria-label="Sahifa yo‘li"><a href="#/">Bosh sahifa</a> / <a href="#/kitoblar">Kitoblar</a> / <a href="#/kitoblar/${c.slug}">${c.name}</a></nav>
    <section class="book">
      <div class="book__cover panel"><img src="${cover(b)}" alt="${b.title} — muqova"></div>
      <div class="book__info">
        <p class="eyebrow eyebrow--blue">${c.name}</p>
        <h1>${b.title}</h1>
        <a class="book__author" href="#/muallif/${slugify(b.author)}">${b.author}</a>
        ${u ? `<p class="book__price">${u.price ? som(u.price) : ""}${oldPrice(u)} ${stockBadge(u)}</p>` : ""}
        <p class="book__desc">${b.desc}</p>
        <dl class="specs"><div><dt>Nashriyot</dt><dd>Falaq Nashr</dd></div><div><dt>Til</dt><dd>O‘zbek tili</dd></div></dl>
        <div class="book__actions">
          <a class="btn" href="${u ? u.url : L.uzum}" ${ext}>${u && u.inStock ? "Uzum Marketda xarid qilish" : "Uzum Marketda ko‘rish"} ${arrow}</a>
          <a class="btn btn--outline" href="#/aloqa">Ulgurji xarid uchun</a>
          ${onSale(b) ? favButton(b.slug) : ""}
        </div>
      </div>
    </section>
    <section class="book-more">
      <div>
        <h2>Kitob bilan tanishing</h2>
        <p class="lead">${b.desc}</p>
        <a class="btn btn--outline" href="${elon}" ${elonAttr}>Nashriyot e’lonini o‘qish ${arrow}</a>
      </div>
      <dl class="faq">
        <div><dt>Qayerdan xarid qilish mumkin?</dt><dd>Kitob do‘konlaridan yoki Uzum Marketdagi Falaq Nashr rasmiy sahifasidan.</dd></div>
        <div><dt>Ulgurji buyurtma qanday beriladi?</dt><dd>${D.phones.join(" yoki ")} raqamlariga murojaat qiling.</dd></div>
      </dl>
    </section>`;
  }

  function authorPage(slug) {
    const all = D.books.filter((b) => slugify(b.author) === slug);
    if (!all.length) return notFound();
    const items = all.filter(onSale);
    return `
    ${pageHero(all[0].author, "Falaq Nashr katalogidagi asarlar", "Muallif kitoblari")}
    <section class="author-list">
      ${items.length ? "" : `<p class="note">Hozircha bu muallifning sotuvdagi kitobi yo‘q.</p>`}
      ${items.map((b) => `<article class="author-book panel">
        <a href="#/kitob/${b.slug}"><img src="${cover(b)}" alt="${b.title} — muqova" loading="lazy"></a>
        <div>
          <p class="eyebrow eyebrow--blue eyebrow--plain">${(cat(b.category) || {}).name || ""}</p>
          <h2><a href="#/kitob/${b.slug}">${b.title}</a></h2>
          <p>${b.desc}</p>
          <a class="more" href="${b.news ? "#/yangilik/" + b.news : L.telegram}" ${b.news ? "" : ext}>Nashriyot e’lonini o‘qish ${arrow}</a>
        </div>
      </article>`).join("")}
    </section>`;
  }

  function newsList() {
    return `
    ${pageHero("Nashriyot yangiliklari", "Rasmiy e’lonlar, yangi nashrlar va kitobxonlar uchun xabarlar.")}
    <section class="section section--tight"><div class="grid grid--3 news-grid">${D.news.map(newsCard).join("")}</div></section>`;
  }

  function newsPage(slug) {
    const n = newsItem(slug);
    if (!n) return notFound();
    // App news: a button for each store whose link is set in the admin settings.
    const stores = [[L.googlePlay, "Google Play’da ko‘rish"], [L.appStore, "App Store’da ko‘rish"]].filter(([href]) => href);
    const cta = n.app && stores.length
      ? stores.map(([href, label]) => `<a class="btn" href="${href}" ${ext}>${label} ${arrow}</a>`).join("")
      : `<a class="btn" href="${L.telegram}" ${ext}>Telegramda o‘qish ${arrow}</a>`;
    return `
    <section class="page-hero panel">
      <p class="eyebrow eyebrow--blue"><a href="#/">Falaq Nashr</a> &nbsp;/&nbsp; <a href="#/yangiliklar">Yangiliklar</a></p>
      <h1>${n.title}</h1>
    </section>
    <article class="article">
      <p class="article__src">Falaq Nashr</p>
      <img class="article__img${n.app ? " is-app" : ""}" src="${n.image}" alt="">
      <p class="article__body">${n.body}</p>
      <div class="article__cta">${cta}</div>
    </article>`;
  }

  function contact() {
    return `
    ${pageHero("Biz bilan bog‘laning", "Kitoblar, xarid va hamkorlik bo‘yicha rasmiy aloqa kanallari.")}
    <section class="contact">
      <div class="contact__wholesale">
        <p class="eyebrow">Ulgurji savdo</p>
        <h2>Kitob do‘konlari uchun hamkorlik.</h2>
        ${D.phones.map((p) => `<a class="contact__phone" href="${tel(p)}">${p}</a>`).join("")}
        <div><a class="btn" href="${L.telegramBot}" ${ext}>Telegram botga yozish</a></div>
      </div>
      <div class="contact__retail panel">
        <p class="eyebrow">O‘zingiz uchun kitob</p>
        <h2>Donalab xarid qilmoqchimisiz?</h2>
        <p>Uzum Marketdagi Falaq Nashr rasmiy do‘koniga o‘ting.</p>
        <div><a class="btn" href="${L.uzum}" ${ext}>Uzum Marketga o‘tish ${arrow}</a></div>
      </div>
    </section>
    <section class="form-wrap panel" id="yozish">
      <div>
        <p class="eyebrow eyebrow--blue">Murojaat</p>
        <h2>Bizga yozing</h2>
        <p class="muted">Ism va telefon raqamingizni qoldiring — mutaxassisimiz siz bilan bog‘lanadi.</p>
      </div>
      <form class="form" id="contact-form" novalidate>
        <label>Ismingiz<input name="name" autocomplete="name" required maxlength="120"></label>
        <label>Telefon<input name="phone" type="tel" autocomplete="tel" placeholder="+998 __ ___ __ __" required maxlength="40"></label>
        <label>Mavzu
          <select name="kind">
            <option value="savol">Savol</option>
            <option value="ulgurji">Ulgurji xarid</option>
            <option value="hamkorlik">Hamkorlik</option>
          </select>
        </label>
        <label class="form__full">Xabar<textarea name="text" rows="4" maxlength="2000"></textarea></label>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="form__full form__foot">
          <button class="btn" type="submit">Yuborish</button>
          <p class="form__status" role="status" aria-live="polite"></p>
        </div>
      </form>
    </section>
    <section class="socials panel">
      <a href="${L.telegram}" ${ext}><span>Telegram ${arrow}</span><small>@falaqnashr</small></a>
      <a href="${L.instagram}" ${ext}><span>Instagram ${arrow}</span><small>@falaqnashr</small></a>
      <a href="${L.youtube}" ${ext}><span>YouTube ${arrow}</span><small>@FalaqNashrRasmiy</small></a>
    </section>`;
  }

  const PRODUCTS_PER_PAGE = 12;
  const OTHER = "Boshqa";
  const shopHref = (st) => {
    const qs = new URLSearchParams();
    if (st.cat) qs.set("cat", st.cat);
    if (st.q) qs.set("q", st.q);
    if (st.p > 1) qs.set("p", st.p);
    return "#/dokon" + (qs.toString() ? "?" + qs : "");
  };
  // Data is HTML-escaped on load; filters work on the plain text (st.cat and st.q are never escaped).
  const decode = (s) => { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; };

  function productCard(p) {
    return `<article class="book-card product-card">
        <a class="book-card__link" href="${p.url}" ${ext}>
          <img src="${p.image || "assets/books/placeholder.svg"}" alt="" loading="lazy">
          ${p.rating ? `<span class="book-card__author">★ ${p.rating}${p.reviews ? ` · ${p.reviews} sharh` : ""}</span>` : ""}
          <h3 class="book-card__title">${p.title}</h3>
          <span class="book-card__price">${p.price ? som(p.price) : ""}${p.inStock ? oldPrice(p) : stockBadge(p)}</span>
          ${p.delivery ? `<span class="muted small">Yetkazish: ${p.delivery}</span>` : ""}
          <span class="more">Uzumda ochish ${arrow}</span>
        </a>
      </article>`;
  }

  // Grid + pager for the current filters; redrawn on its own while typing in the search box.
  function shopResults(st) {
    const needle = st.q.trim().toLowerCase();
    const list = products.products.filter((p) => p.inStock
      && (!st.cat || decode(p.category || OTHER) === st.cat) && (!needle || decode(p.title).toLowerCase().includes(needle)));
    const pages = Math.ceil(list.length / PRODUCTS_PER_PAGE);
    const page = Math.min(Math.max(st.p, 1), Math.max(pages, 1));
    const items = list.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);
    return `<p class="count">${list.length} ta mahsulot</p>
      ${items.length ? `<div class="grid grid--4">${items.map(productCard).join("")}</div>` : `<p class="note">Hech narsa topilmadi.</p>`}
      ${pager(page, pages, (n) => shopHref({ ...st, p: n }))}`;
  }

  // Uzum shop products are loaded once, by the first page that needs them, which then redraws.
  let productsLoading = false;
  function loadProducts() {
    if (products || productsLoading) return;
    productsLoading = true;
    getJSON("/api/products")
      .then((d) => { products = d; })
      .catch(() => { products = { products: [], failed: true }; })
      .finally(() => {
        productsLoading = false;
        const hash = location.hash.replace(/^#\/?/, "");
        // lastPath reset: this second render is the same visit, so it should not jump to the list.
        if (hash.startsWith("dokon")) { lastPath = null; route(); }
        else if (hash === "") $app.innerHTML = home(); // redraw rows in place, keeping the scroll position
      });
  }

  function shopPage(params) {
    if (!products) {
      loadProducts();
      return `${pageHero("Uzum Marketdagi kitoblar", "Yuklanmoqda…")}`;
    }
    const sh = D.shop;
    const list = products.products.filter((p) => p.inStock);
    if (!list.length) {
      return `${pageHero("Uzum Marketdagi kitoblar", "", "Onlayn do‘kon")}
      <section class="section section--tight"><p class="note"><a href="${L.uzum}" ${ext}>Kitoblarimizni Uzum Marketda ko‘ring ${arrow}</a></p></section>`;
    }

    const counts = new Map();
    for (const p of list) counts.set(p.category || OTHER, (counts.get(p.category || OTHER) || 0) + 1);
    const cats = [...counts].sort((a, z) => (a[0] === OTHER) - (z[0] === OTHER) || z[1] - a[1] || a[0].localeCompare(z[0]));
    const st = { cat: params.get("cat") || "", q: params.get("q") || "", p: parseInt(params.get("p"), 10) || 1 };
    if (!cats.some(([c]) => decode(c) === st.cat)) st.cat = "";

    return `
    ${pageHero("Uzum Marketdagi kitoblar", "", "Onlayn do‘kon")}
    <section class="section section--tight">
      <div class="shop-tools list-top">
        <input id="shop-search" type="search" placeholder="Kitob nomi bo‘yicha qidirish" aria-label="Qidirish" value="${esc(st.q)}">
        ${cats.length > 1 ? `<select id="shop-cat" aria-label="Bo‘lim">
          <option value="">Barcha bo‘limlar (${list.length})</option>
          ${cats.map(([c, n]) => `<option value="${c}"${decode(c) === st.cat ? " selected" : ""}>${c} (${n})</option>`).join("")}
        </select>` : ""}
        ${sh && sh.url ? `<a class="btn btn--outline btn--sm" href="${sh.url}" ${ext}>Do‘kon sahifasi ${arrow}</a>` : ""}
      </div>
      <div id="shop-results">${shopResults(st)}</div>
    </section>`;
  }

  function favorites() {
    const items = forSale.filter((b) => favs.includes(b.slug));
    if (!items.length) {
      return `<section class="empty panel">
        <span class="empty__icon">${heart(false)}</span>
        <h1>Saralangan kitoblar</h1>
        <p>Hozircha bu yerda kitob yo‘q. Katalogdan yoqqan kitoblaringizni tanlang.</p>
        <a class="btn" href="#/kitoblar">Kitoblarni ko‘rish</a>
      </section>`;
    }
    return `${pageHero("Saralangan kitoblar", `${items.length} ta kitob tanlangan.`)}
    <section class="section section--tight"><div class="grid grid--4">${items.map(bookCard).join("")}</div></section>`;
  }

  function notFound() {
    return `<section class="empty panel">
      <p class="big404">404</p>
      <h1>Sahifa topilmadi</h1>
      <p>Bu sahifa mavjud emas yoki manzili o‘zgargan. Kitoblar katalogiga qayting.</p>
      <a class="btn" href="#/kitoblar">Kitoblarni ko‘rish</a>
    </section>`;
  }

  /* ---------- router ---------- */
  const titles = { "": "Bosh sahifa" };
  let lastPath = null;
  function route() {
    const [path, qs = ""] = location.hash.replace(/^#\/?/, "").split("?");
    const params = new URLSearchParams(qs);
    const parts = path.split("/").filter(Boolean);
    const [a, b] = parts;
    let html, title, nav = a || "";
    if (!a) html = home();
    else if (a === "nashriyot") { html = about(); title = "Nashriyot"; }
    else if (a === "kitoblar") { html = catalog(b || "", params); title = (lists[b || ""] || {}).title; }
    else if (a === "kitob") { html = bookPage(b); title = (book(b) || {}).title; nav = "kitoblar"; }
    else if (a === "muallif") { html = authorPage(b); nav = "kitoblar"; }
    else if (a === "yangiliklar") { html = newsList(); title = "Yangiliklar"; }
    else if (a === "yangilik") { html = newsPage(b); title = (newsItem(b) || {}).title; nav = "yangiliklar"; }
    else if (a === "aloqa") { html = contact(); title = "Aloqa"; }
    else if (a === "saralangan") { html = favorites(); title = "Saralangan"; }
    else if (a === "dokon") { html = shopPage(params); title = "Uzum do‘kon"; }
    else html = notFound();

    $app.innerHTML = html;
    // Wholesale contact lives in the footer, so the page has one dark block at the bottom.
    const cta = document.getElementById("footer-cta");
    if (cta && !cta.childElementCount) cta.innerHTML = wholesaleBand();
    document.title = (title || titles[""]) + " — Falaq Nashr";
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.classList.toggle("active", el.dataset.nav === nav);
    });
    updateFavCount();
    closeMenus();
    // Paging or filtering within the same list keeps the list in view; other pages start at the top.
    const top = path === lastPath && document.querySelector(".list-top");
    if (top) top.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
    lastPath = path;
  }

  /* ---------- interactions ---------- */
  // The navbar's glass and blur appear once content scrolls underneath it.
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 4);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function updateFavCount() {
    const badge = document.getElementById("fav-count");
    const n = forSale.filter((b) => favs.includes(b.slug)).length;
    badge.textContent = n;
    badge.hidden = n === 0;
  }

  function closeMenus() {
    document.body.classList.remove("menu-open");
    document.getElementById("menu-toggle").setAttribute("aria-expanded", "false");
    const dd = document.getElementById("books-dd");
    dd.classList.remove("open");
    dd.querySelector("button").setAttribute("aria-expanded", "false");
  }

  document.addEventListener("click", (e) => {
    const fav = e.target.closest("[data-fav]");
    if (fav) {
      const s = fav.dataset.fav;
      favs = favs.includes(s) ? favs.filter((x) => x !== s) : favs.concat(s);
      setFavs(favs);
      if (location.hash.startsWith("#/saralangan")) route();
      else {
        document.querySelectorAll(`[data-fav="${s}"]`).forEach((el) => (el.outerHTML = favButton(s)));
        updateFavCount();
      }
      return;
    }
    const ddBtn = e.target.closest("#books-dd > button");
    const dd = document.getElementById("books-dd");
    if (ddBtn) {
      const open = dd.classList.toggle("open");
      ddBtn.setAttribute("aria-expanded", String(open));
      return;
    }
    if (!e.target.closest("#books-dd")) dd.classList.remove("open");
    if (e.target.closest("#menu-toggle")) {
      const open = document.body.classList.toggle("menu-open");
      e.target.closest("#menu-toggle").setAttribute("aria-expanded", String(open));
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenus(); });

  // Buttons and menu items answer a press with a ripple from the press point (arrows dart ahead).
  // Links inside the site wait a beat so the press reads, then the page changes (see hashchange).
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const PRESSABLE = ".btn, .dd__menu a, .fav-link, .pager__btn, .catalog__side a, .menu-open .main-nav > a";
  document.addEventListener("click", (e) => {
    const el = e.target.closest(PRESSABLE);
    if (!el || reduceMotion.matches) return;

    const r = el.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    // Keyboard presses (detail 0) have no pointer position: start from the centre.
    ripple.style.setProperty("--x", `${e.detail ? e.clientX - r.left : r.width / 2}px`);
    ripple.style.setProperty("--y", `${e.detail ? e.clientY - r.top : r.height / 2}px`);
    ripple.style.setProperty("--size", `${Math.hypot(r.width, r.height) * 2}px`);
    ripple.addEventListener("animationend", () => ripple.remove());
    el.append(ripple);

    const href = el.getAttribute("href") || "";
    if (!href.startsWith("#/") || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (el.classList.contains("is-going")) return;
    el.classList.add("is-going");
    setTimeout(() => {
      location.hash = href;
      // Elements that stay on screen (header, menus) go back to rest once the page has changed.
      setTimeout(() => el.classList.remove("is-going"), 450);
    }, 160);
  });

  // Every page change (links, menus, Back/Forward) lifts the current page away and brings the next
  // one in: View Transitions where the browser has them, a CSS entrance otherwise. Paging or
  // filtering the same list updates in place.
  let pageTransition = null;
  function changePage() {
    const path = location.hash.replace(/^#\/?/, "").split("?")[0];
    if (reduceMotion.matches || path === lastPath) return route();
    if (document.startViewTransition) {
      const root = document.documentElement;
      root.classList.add("vt-page");
      const t = (pageTransition = document.startViewTransition(route));
      t.finished.finally(() => { if (pageTransition === t) root.classList.remove("vt-page"); });
    } else {
      route();
      $app.classList.remove("page-enter");
      void $app.offsetWidth; // restart the animation
      $app.classList.add("page-enter");
    }
  }
  $app.addEventListener("animationend", (e) => { if (e.target === $app) $app.classList.remove("page-enter"); });

  document.addEventListener("input", (e) => {
    if (e.target.id !== "shop-search") return;
    // Redraw only the results so the search box keeps focus; replaceState keeps the URL shareable.
    const cat = document.getElementById("shop-cat");
    const st = { cat: cat ? cat.value : "", q: e.target.value, p: 1 };
    history.replaceState(null, "", shopHref(st));
    document.getElementById("shop-results").innerHTML = shopResults(st);
  });

  document.addEventListener("change", (e) => {
    if (e.target.id !== "shop-cat") return;
    location.hash = shopHref({ cat: e.target.value, q: document.getElementById("shop-search").value, p: 1 });
  });

  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "contact-form") return;
    e.preventDefault();
    const form = e.target;
    const status = form.querySelector(".form__status");
    const btn = form.querySelector("button[type=submit]");
    const body = Object.fromEntries(new FormData(form));
    btn.disabled = true;
    status.className = "form__status";
    status.textContent = "Yuborilmoqda…";
    try {
      const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Xatolik yuz berdi");
      form.reset();
      status.classList.add("is-ok");
      status.textContent = "Rahmat! Xabaringiz qabul qilindi, tez orada bog‘lanamiz.";
    } catch (err) {
      status.classList.add("is-err");
      status.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("year").textContent = new Date().getFullYear();
  window.addEventListener("hashchange", changePage);
  route();
})();
