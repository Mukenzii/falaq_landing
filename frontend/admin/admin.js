/* Falaq Nashr admin panel: Uzum sync, books, news, messages, settings. Talks to /api/admin/*. */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $view = $("#view");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const som = (n) => (n == null ? "—" : n.toLocaleString("ru-RU").replace(/\s/g, " ") + " so‘m");
  const src = (u) => (!u ? "" : /^https?:/.test(u) ? u : "/" + u.replace(/^\//, ""));
  const when = (d) => (d ? new Date(d).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }) : "—");

  async function api(path, { method = "GET", body } = {}) {
    const r = await fetch("/api" + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== "/admin/login") { showLogin(); throw new Error("Sessiya tugadi"); }
    if (!r.ok) throw new Error(data.error || `Xato ${r.status}`);
    return data;
  }

  /* ---------- login ---------- */
  function showLogin() {
    stopPolling();
    $("#shell").hidden = true;
    $("#login").hidden = false;
  }
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $("#login-form .status");
    status.className = "status";
    status.textContent = "";
    try {
      await api("/admin/login", { method: "POST", body: { password: e.target.password.value } });
      e.target.reset();
      start();
    } catch (err) {
      status.className = "status is-err";
      status.textContent = err.message;
    }
  });
  $("#logout").addEventListener("click", async () => {
    await api("/admin/logout", { method: "POST" }).catch(() => {});
    showLogin();
  });

  /* ---------- tabs ---------- */
  const tabs = { uzum: renderUzum, books: renderBooks, news: renderNews, messages: renderMessages, settings: renderSettings };
  let tab = "uzum";
  document.querySelectorAll(".tabs button").forEach((b) =>
    b.addEventListener("click", () => { location.hash = b.dataset.tab; }));
  window.addEventListener("hashchange", () => openTab(location.hash.slice(1)));

  function openTab(name) {
    tab = tabs[name] ? name : "uzum";
    stopPolling();
    document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    $view.innerHTML = `<p class="muted">Yuklanmoqda…</p>`;
    tabs[tab]().catch((e) => { $view.innerHTML = `<p class="status is-err">${esc(e.message)}</p>`; });
  }

  async function start() {
    $("#login").hidden = true;
    $("#shell").hidden = false;
    openTab(location.hash.slice(1));
    refreshMsgBadge();
  }

  /* ---------- Uzum ---------- */
  let poll = null;
  const stopPolling = () => { clearTimeout(poll); poll = null; };
  const badge = (status) =>
    status === "ok" ? `<span class="badge badge--ok">Bajarildi</span>`
      : status === "error" ? `<span class="badge badge--err">Xato</span>`
      : `<span class="badge badge--run">Bajarilmoqda</span>`;

  async function renderUzum() {
    const [sync, products] = await Promise.all([api("/admin/sync"), api("/admin/products")]);
    const last = sync.runs[0];
    const shop = sync.shop;
    const active = products.filter((p) => p.active);
    $view.innerHTML = `
      <section class="sync">
        <div class="card sync__main">
          <p class="eyebrow">Uzum Market</p>
          <h1>Mahsulotlarni yangilash</h1>
          <p class="muted">Tugma Uzumdagi do‘kon sahifasini ochadi, barcha mahsulotlarning nomi, narxi, rasmlari, reytingi va mavjudligini oladi, so‘ng saytdagi kitoblarga bog‘laydi. Odatda 20–60 soniya davom etadi.</p>
          <div class="row" style="justify-content:flex-start">
            <button id="sync-btn" class="btn btn--lg" type="button" ${sync.running ? "disabled" : ""}>
              ${sync.running ? `<span class="spinner"></span> Yangilanmoqda…` : "Uzumdan yangilash"}
            </button>
            ${shop && shop.url ? `<a href="${esc(shop.url)}" target="_blank" rel="noopener">Do‘kon sahifasi ↗</a>` : ""}
          </div>
          <div class="stats">
            <div class="stat"><b>${active.length}</b><span>Mahsulot</span></div>
            <div class="stat"><b>${active.filter((p) => p.inStock).length}</b><span>Sotuvda</span></div>
            <div class="stat"><b>${last && last.matched != null ? last.matched : "—"}</b><span>Kitobga bog‘langan</span></div>
          </div>
          ${shop ? `<p class="muted">${esc(shop.title || "")}${shop.rating ? ` · ★ ${esc(shop.rating)}` : ""} · oxirgi yangilanish: ${when(shop.syncedAt)}${
            shop.source === "search" ? ` · <b>manba: Uzum qidiruvi</b> (do‘kon sahifasi bo‘sh edi)` : ""}</p>` : ""}
        </div>
        <div class="card">
          <div class="row"><h2>Jarayon</h2>${last ? badge(last.status) : ""}</div>
          <pre class="log" id="sync-log">${last ? esc(last.log || "…") : "Hali yangilanmagan."}</pre>
          <p class="muted" style="margin:.6em 0 0;font-size:.8rem">${
            sync.runs.slice(1, 5).map((r) => `${when(r.started_at)} — ${r.status === "ok" ? `${r.found} ta` : esc(r.status)}`).join(" · ")}</p>
        </div>
      </section>
      <section>
        <div class="row" style="margin-bottom:12px">
          <h2>Uzumdagi mahsulotlar (${products.length})</h2>
          <input class="search" id="p-search" type="search" placeholder="Qidirish…">
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th></th><th>Nomi</th><th>Narx</th><th>Eski narx</th><th>Reyting</th><th>Holat</th><th>Yangilangan</th></tr></thead>
          <tbody id="p-rows">${products.map(productRow).join("") || `<tr><td colspan="7" class="muted">Mahsulotlar yo‘q. “Uzumdan yangilash” tugmasini bosing.</td></tr>`}</tbody>
        </table></div>
      </section>`;

    $("#sync-btn").addEventListener("click", async (e) => {
      e.currentTarget.disabled = true;
      e.currentTarget.innerHTML = `<span class="spinner"></span> Yangilanmoqda…`;
      try { await api("/admin/sync", { method: "POST" }); } catch (err) { alertLog(err.message); }
      watchSync();
    });
    $("#p-search").addEventListener("input", (e) => {
      const n = e.target.value.trim().toLowerCase();
      document.querySelectorAll("#p-rows tr").forEach((tr) => { tr.hidden = n && !tr.dataset.t?.includes(n); });
    });
    if (sync.running) watchSync();
  }

  function productRow(p) {
    return `<tr class="${p.active ? "" : "is-dim"}" data-t="${esc(p.title.toLowerCase())}">
      <td>${p.image ? `<img class="thumb" src="${esc(p.image)}" alt="" loading="lazy">` : ""}</td>
      <td class="title-cell"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a><br><span class="muted" style="font-size:.75rem">ID ${p.id}</span></td>
      <td class="num">${som(p.price)}</td>
      <td class="num muted">${p.fullPrice ? som(p.fullPrice) : "—"}</td>
      <td class="num">${p.rating ? `★ ${p.rating} (${p.reviews ?? 0})` : "—"}</td>
      <td>${!p.active ? `<span class="badge">Uzumda yo‘q</span>` : p.inStock ? `<span class="badge badge--ok">Sotuvda</span>` : `<span class="badge">Tugagan</span>`}</td>
      <td class="num muted">${when(p.updatedAt)}</td>
    </tr>`;
  }

  function alertLog(text) {
    const log = $("#sync-log");
    if (log) log.textContent = text;
  }

  function watchSync() {
    stopPolling();
    const tick = async () => {
      if (tab !== "uzum") return;
      try {
        const s = await api("/admin/sync");
        const last = s.runs[0];
        alertLog(last ? last.log || "…" : "");
        const log = $("#sync-log");
        if (log) log.scrollTop = log.scrollHeight;
        if (s.running) { poll = setTimeout(tick, 1500); return; }
        renderUzum(); // finished: redraw with fresh numbers and products
      } catch (e) { /* 401 handled in api() */ }
    };
    poll = setTimeout(tick, 800);
  }

  /* ---------- generic editor ---------- */
  // fields: [{ key, label, type: text|textarea|number|checkbox|select, options, full, hint }]
  function edit({ title, fields, value, save }) {
    const dlg = $("#editor");
    $("#editor-title").textContent = title;
    $("#editor-status").textContent = "";
    $("#editor-fields").innerHTML = fields.map((f) => {
      const v = value[f.key];
      const cls = f.full || f.type === "textarea" ? "full" : "";
      if (f.type === "checkbox") return `<label class="check ${cls}"><input type="checkbox" name="${f.key}" ${v ? "checked" : ""}> ${esc(f.label)}</label>`;
      if (f.type === "textarea") return `<label class="${cls}">${esc(f.label)}<textarea name="${f.key}" rows="${f.rows || 4}">${esc(v)}</textarea></label>`;
      if (f.type === "select") return `<label class="${cls}">${esc(f.label)}<select name="${f.key}">${f.options.map((o) =>
        `<option value="${esc(o.value)}" ${String(o.value) === String(v ?? "") ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select></label>`;
      return `<label class="${cls}">${esc(f.label)}<input name="${f.key}" type="${f.type || "text"}" value="${esc(v)}" ${f.required ? "required" : ""} ${f.pattern ? `pattern="${f.pattern}"` : ""}>${f.hint ? `<span class="muted" style="font-weight:400">${esc(f.hint)}</span>` : ""}</label>`;
    }).join("");

    const form = $("#editor-form");
    const onSubmit = async (e) => {
      if (e.submitter?.value !== "save") return;
      e.preventDefault();
      if (!form.reportValidity()) return;
      const out = {};
      for (const f of fields) {
        const el = form.elements[f.key];
        out[f.key] = f.type === "checkbox" ? el.checked : f.type === "number" ? (el.value === "" ? null : Number(el.value)) : el.value.trim() || null;
      }
      $("#editor-save").disabled = true;
      try {
        await save(out);
        dlg.close();
      } catch (err) {
        $("#editor-status").className = "status is-err";
        $("#editor-status").textContent = err.message;
      } finally {
        $("#editor-save").disabled = false;
      }
    };
    form.onsubmit = onSubmit;
    dlg.showModal();
  }

  const slugField = { key: "slug", label: "Slug (manzil)", required: true, pattern: "[a-z0-9]+(-[a-z0-9]+)*", hint: "masalan: yangi-kitob" };
  const slugify = (s) => String(s || "").toLowerCase().replace(/[’‘ʻʼ'`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  /* ---------- books ---------- */
  async function renderBooks() {
    const [books, products, site] = await Promise.all([api("/admin/books"), api("/admin/products"), fetch("/api/site").then((r) => r.json())]);
    $view.innerHTML = `
      <div class="row"><h1>Kitoblar (${books.length})</h1><button class="btn" id="add-book" type="button">+ Kitob qo‘shish</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th></th><th>Nomi</th><th>Muallif</th><th>Bo‘lim</th><th>Uzum narxi</th><th>Bosh sahifa</th><th></th></tr></thead>
        <tbody>${books.map((b) => `<tr>
          <td><img class="thumb" src="${esc(src(b.cover || b.uzum?.image))}" alt=""></td>
          <td class="title-cell"><a href="/#/kitob/${esc(b.slug)}" target="_blank" rel="noopener">${esc(b.title)}</a></td>
          <td>${esc(b.author)}</td>
          <td>${esc(site.categories.find((c) => c.slug === b.category)?.name || "—")}</td>
          <td class="num">${b.uzum ? `<a href="${esc(b.uzum.url)}" target="_blank" rel="noopener">${som(b.uzum.price)}</a>` : `<span class="muted">bog‘lanmagan</span>`}</td>
          <td>${[b.featured && "tanlov", b.more && "yana", b.announced && "e’lon"].filter(Boolean).join(", ") || "—"}</td>
          <td class="actions"><button class="btn btn--ghost btn--sm" data-edit="${b.id}">Tahrirlash</button><button class="btn btn--danger btn--sm" data-del="${b.id}">O‘chirish</button></td>
        </tr>`).join("")}</tbody>
      </table></div>`;

    const productOptions = [{ value: "", label: "— avtomatik (nom bo‘yicha) —" }].concat(
      products.filter((p) => p.active).map((p) => ({ value: p.id, label: `${p.title.slice(0, 80)} — ${som(p.price)}` })));
    const fields = [
      { key: "title", label: "Nomi", required: true },
      { key: "author", label: "Muallif" },
      slugField,
      { key: "category", label: "Bo‘lim", type: "select", options: [{ value: "", label: "—" }].concat(site.categories.map((c) => ({ value: c.slug, label: c.name }))) },
      { key: "desc", label: "Tavsif", type: "textarea" },
      { key: "cover", label: "Muqova rasmi (URL yoki assets/books/…)", full: true, hint: "Bo‘sh qoldirilsa, Uzumdagi rasm ishlatiladi" },
      { key: "uzumId", label: "Uzum mahsuloti", type: "select", full: true, options: productOptions },
      { key: "news", label: "Bog‘liq yangilik", type: "select", options: [{ value: "", label: "—" }].concat(site.news.map((n) => ({ value: n.slug, label: n.title }))) },
      { key: "sort", label: "Tartib", type: "number" },
      { key: "featured", label: "“Mutolaa uchun tanlov”da ko‘rsatish", type: "checkbox" },
      { key: "more", label: "“Yana tanishib chiqing”da ko‘rsatish", type: "checkbox" },
      { key: "announced", label: "Nashriyot e’lonida", type: "checkbox" },
    ];
    const open = (b) => edit({
      title: b ? "Kitobni tahrirlash" : "Yangi kitob",
      fields,
      value: b || { sort: books.length },
      save: async (v) => {
        if (!v.slug) v.slug = slugify(v.title);
        await api(b ? `/admin/books/${b.id}` : "/admin/books", { method: b ? "PUT" : "POST", body: v });
        renderBooks();
      },
    });
    $("#add-book").onclick = () => open(null);
    $view.onclick = async (e) => {
      const id = e.target.dataset.edit || e.target.dataset.del;
      if (!id) return;
      const b = books.find((x) => String(x.id) === id);
      if (e.target.dataset.edit) return open(b);
      if (confirm(`“${b.title}” o‘chirilsinmi?`)) { await api(`/admin/books/${id}`, { method: "DELETE" }); renderBooks(); }
    };
  }

  /* ---------- news ---------- */
  async function renderNews() {
    const news = await api("/admin/news");
    $view.innerHTML = `
      <div class="row"><h1>Yangiliklar (${news.length})</h1><button class="btn" id="add-news" type="button">+ Yangilik qo‘shish</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th></th><th>Sarlavha</th><th>Qisqacha</th><th></th></tr></thead>
        <tbody>${news.map((n) => `<tr>
          <td>${n.image ? `<img class="thumb" src="${esc(src(n.image))}" alt="">` : ""}</td>
          <td class="title-cell"><a href="/#/yangilik/${esc(n.slug)}" target="_blank" rel="noopener">${esc(n.title)}</a></td>
          <td class="muted">${esc(n.summary)}</td>
          <td class="actions"><button class="btn btn--ghost btn--sm" data-edit="${n.id}">Tahrirlash</button><button class="btn btn--danger btn--sm" data-del="${n.id}">O‘chirish</button></td>
        </tr>`).join("")}</tbody>
      </table></div>`;
    const fields = [
      { key: "title", label: "Sarlavha", required: true, full: true },
      slugField,
      { key: "image", label: "Rasm (URL yoki assets/news/…)" },
      { key: "summary", label: "Qisqacha", type: "textarea", rows: 2 },
      { key: "body", label: "Matn", type: "textarea", rows: 6 },
      { key: "sort", label: "Tartib", type: "number" },
      { key: "app", label: "Ilova haqida (Google Play tugmasi)", type: "checkbox" },
    ];
    const open = (n) => edit({
      title: n ? "Yangilikni tahrirlash" : "Yangi yangilik",
      fields,
      value: n || { sort: 0 },
      save: async (v) => {
        if (!v.slug) v.slug = slugify(v.title);
        await api(n ? `/admin/news/${n.id}` : "/admin/news", { method: n ? "PUT" : "POST", body: v });
        renderNews();
      },
    });
    $("#add-news").onclick = () => open(null);
    $view.onclick = async (e) => {
      const id = e.target.dataset.edit || e.target.dataset.del;
      if (!id) return;
      const n = news.find((x) => String(x.id) === id);
      if (e.target.dataset.edit) return open(n);
      if (confirm(`“${n.title}” o‘chirilsinmi?`)) { await api(`/admin/news/${id}`, { method: "DELETE" }); renderNews(); }
    };
  }

  /* ---------- messages ---------- */
  const KIND = { savol: "Savol", ulgurji: "Ulgurji xarid", hamkorlik: "Hamkorlik" };
  async function refreshMsgBadge() {
    const msgs = await api("/admin/messages").catch(() => []);
    const open = msgs.filter((m) => !m.handled).length;
    $("#msg-badge").hidden = !open;
    $("#msg-badge").textContent = open;
    return msgs;
  }
  async function renderMessages() {
    const msgs = await refreshMsgBadge();
    $view.innerHTML = `<h1>Xabarlar (${msgs.length})</h1>` + (msgs.length ? msgs.map((m) => `
      <article class="card msg ${m.handled ? "is-done" : ""}">
        <div class="msg__head">
          <b>${esc(m.name)}</b>
          <a href="tel:${esc(m.phone.replace(/[^\d+]/g, ""))}">${esc(m.phone)}</a>
          <span class="badge">${esc(KIND[m.kind] || m.kind)}</span>
          <span class="muted">${when(m.created_at)}</span>
        </div>
        ${m.text ? `<p class="msg__text">${esc(m.text)}</p>` : ""}
        <div class="row" style="justify-content:flex-start">
          <button class="btn btn--ghost btn--sm" data-done="${m.id}" data-v="${m.handled ? "" : "1"}">${m.handled ? "Qayta ochish" : "Javob berildi"}</button>
          <button class="btn btn--danger btn--sm" data-del="${m.id}">O‘chirish</button>
        </div>
      </article>`).join("") : `<p class="muted">Hozircha xabar yo‘q. Saytdagi “Aloqa” sahifasidagi forma orqali kelgan murojaatlar shu yerda ko‘rinadi.</p>`);
    $view.onclick = async (e) => {
      const t = e.target;
      if (t.dataset.done) { await api(`/admin/messages/${t.dataset.done}`, { method: "PATCH", body: { handled: !!t.dataset.v } }); renderMessages(); }
      if (t.dataset.del && confirm("Xabar o‘chirilsinmi?")) { await api(`/admin/messages/${t.dataset.del}`, { method: "DELETE" }); renderMessages(); }
    };
  }

  /* ---------- settings ---------- */
  async function renderSettings() {
    const s = await api("/admin/settings");
    const links = s.links || {};
    const uzum = s.uzum || {};
    const linkKeys = [["telegram", "Telegram kanal"], ["telegramBot", "Telegram bot"], ["instagram", "Instagram"], ["youtube", "YouTube"], ["uzum", "Uzum do‘kon havolasi"], ["googlePlay", "Google Play"]];
    $view.innerHTML = `
      <h1>Sozlamalar</h1>
      <form id="settings-form" class="settings">
        <div class="card">
          <h2>Uzum Market</h2>
          <label>Do‘kon nomi (uzum.uz/uz/shop/<b>…</b>)<input name="shop" value="${esc(uzum.shop)}" required></label>
          <label>Do‘kon bo‘sh bo‘lsa, qidiruv so‘zi<input name="fallbackQuery" value="${esc(uzum.fallbackQuery)}"></label>
          <label>Qidiruvda nomida bo‘lishi shart bo‘lgan so‘z<input name="fallbackMatch" value="${esc(uzum.fallbackMatch)}"></label>
          <p class="muted" style="font-size:.85rem">Qidiruv so‘zini bo‘sh qoldirsangiz, faqat do‘kon sahifasidagi mahsulotlar olinadi.</p>
        </div>
        <div class="card">
          <h2>Aloqa</h2>
          <label>Telefonlar (har biri yangi qatorda)<textarea name="phones" rows="3">${esc((s.phones || []).join("\n"))}</textarea></label>
          ${linkKeys.map(([k, l]) => `<label>${l}<input name="link_${k}" type="url" value="${esc(links[k])}"></label>`).join("")}
        </div>
        <div class="row" style="grid-column:1/-1;justify-content:flex-start">
          <button class="btn" type="submit">Saqlash</button>
          <p class="status" id="settings-status" role="status"></p>
        </div>
      </form>`;
    $("#settings-form").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target.elements;
      const st = $("#settings-status");
      const body = {
        uzum: { shop: f.shop.value.trim(), fallbackQuery: f.fallbackQuery.value.trim(), fallbackMatch: f.fallbackMatch.value.trim() },
        phones: f.phones.value.split("\n").map((x) => x.trim()).filter(Boolean),
        links: { ...links, ...Object.fromEntries(linkKeys.map(([k]) => [k, f["link_" + k].value.trim()])) },
      };
      try {
        await api("/admin/settings", { method: "PUT", body });
        st.className = "status is-ok"; st.textContent = "Saqlandi";
      } catch (err) {
        st.className = "status is-err"; st.textContent = err.message;
      }
    };
  }

  /* ---------- boot ---------- */
  api("/admin/me").then((r) => (r.admin ? start() : showLogin())).catch(showLogin);
})();
