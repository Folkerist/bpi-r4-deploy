// ─── Панель ──────────────────────────────────────────────────────────────────────────────────────────────────
const SECTIONS = ["hdr", "scenes", "hub", "wx", "clim", "health", "quick", "rooms", "plan", "vac", "cam", "media", "alice", "feed", "litter", "litset", "catst"];
// Разделы панели. Листаются вбок или вкладками (на телефоне вкладки внизу, как в приложениях).
// cols — колонки на широком экране; на телефоне карточки идут одна под другой в том же порядке.
const PAGES = [
  { id: "home", name: "Дом", icon: "home-variant-outline", cols: [["scenes", "quick", "rooms"], ["hub"]] },
  { id: "flat", name: "Квартира", icon: "floor-plan", cols: [["plan"], ["vac"]] },
  { id: "music", name: "Музыка", icon: "music-circle-outline", cols: [["media"], ["alice"]] },
  { id: "climate", name: "Климат", icon: "thermometer", cols: [["clim"], ["wx"]] },
  { id: "safety", name: "Охрана", icon: "shield-home-outline", cols: [["cam", "health"], ["feed"]] },
  { id: "cat", name: "Лоток", icon: "cat", cols: [["litter", "litset"], ["catst"]] },
];
const PAGE_IX = Object.fromEntries(PAGES.map((p, i) => [p.id, i]));
const SEC_CLASS = { scenes: "scenesc", hub: "hubc", wx: "wx", clim: "climc", health: "health", quick: "quick", rooms: "rooms-c", plan: "planc",
  vac: "vac", cam: "camc", media: "media", alice: "alicec", feed: "feedc", litter: "litc", litset: "litset", catst: "catc" };

class HomePanelCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sigs = {};
    this._tab = "live";
    this._layers = new Set(["light", "motion", "vac", "media", "heat"]);
    this._modal = null;
    this._vacSel = new Set();
    this._vacWho = null;
    this._vacView = "plan";
    this._mediaSel = null;
    this._aliceCat = ALICE[0].id;
    this._logFilter = "all";
    this._forecast = { daily: [], hourly: [] };
    this._hist = {};
    this._log = [];
    this._subs = [];
    try { this._theme = localStorage.getItem("hp-theme") || "auto"; } catch (e) { this._theme = "auto"; }
    try { this._page = clamp(parseInt(localStorage.getItem("hp-page")) || 0, 0, PAGES.length - 1); } catch (e) { this._page = 0; }
  }
  setConfig(config) { this._config = config || {}; }
  getCardSize() { return 24; }
  static getStubConfig() { return {}; }

  set hass(h) {
    const first = !this._hass;
    this._hass = h;
    if (!this._built) this._build();
    if (first || !this._subscribed) this._subscribe();
    this._schedule();
  }
  get hass() { return this._hass; }

  connectedCallback() {
    this._timers = [
      setInterval(() => this._tick(), 1000),
      setInterval(() => this._refreshCam(false), 6000),
      setInterval(() => { this._loadHistory(); this._loadLitterHistory(); }, 10 * 60000),
    ];
    if (this._hass && !this._subscribed) this._subscribe();
  }
  disconnectedCallback() {
    (this._timers || []).forEach(clearInterval);
    this._subs.forEach((u) => { try { Promise.resolve(u).then((f) => f && f()); } catch (e) {} });
    this._subs = []; this._subscribed = false;
  }

  // ─── Построение и обновление ───
  _build() {
    this._built = true;
    if (!document.getElementById("hp-font")) {
      const l = document.createElement("link");
      l.id = "hp-font"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&display=swap";
      document.head.appendChild(l);
    }
    const sec = (id) => `<section class="card ${SEC_CLASS[id]}" id="s-${id}"></section>`;
    this.shadowRoot.innerHTML = `<style>${HP_CSS}</style>
      <div class="root" id="root"><div class="wrap">
        <header id="s-hdr"></header>
        <nav class="pnav" id="pnav" style="--n:${PAGES.length}"><span class="ind"></span>${PAGES.map((p, i) =>
          `<button data-act="page" data-p="${i}" class="${i === this._page ? "on" : ""}">${ico(p.icon)}<span>${p.name}</span></button>`).join("")}</nav>
        <div class="pages" id="pages">${PAGES.map((p) =>
          `<div class="page p-${p.id}">${p.cols.map((c) => `<div class="col">${c.map(sec).join("")}</div>`).join("")}</div>`).join("")}</div>
        </div>
        <div id="modal"></div><div id="toast"></div>
      </div>`;
    this._initPages();
    const R = this.shadowRoot;
    R.addEventListener("click", (e) => this._onClick(e));
    R.addEventListener("change", (e) => this._onInput(e, true));
    R.addEventListener("input", (e) => this._onInput(e, false));
    R.addEventListener("pointerdown", (e) => { if (e.target.matches?.("input[type=range]")) this._dragging = true; });
    R.addEventListener("pointerup", () => { this._dragging = false; });
    R.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "tts-text") this._tts(); });
    this._escHandler = (e) => {
      if (e.key === "Escape" && this._modal) this._closeModal();
      const t = e.composedPath()[0];
      if (!this._modal && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !/^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName || "") && !t?.isContentEditable)
        this._goPage(this._page + (e.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", this._escHandler);
  }

  // ─── Страницы: листание вбок (scroll-snap), вкладки, высота по текущей странице ───
  _initPages() {
    const P = this._pagesEl = this.shadowRoot.getElementById("pages");
    this._navEl = this.shadowRoot.getElementById("pnav");
    P.addEventListener("scroll", () => {
      this._onPagesScroll();
      clearTimeout(this._settle);
      this._settle = setTimeout(() => this._pageSettled(), 140);
    }, { passive: true });
    let w = 0;
    // В следующем кадре: менять высоту прямо из ResizeObserver — это «ResizeObserver loop».
    this._pagesRO = new ResizeObserver(() => requestAnimationFrame(() => {
      // Ширина поменялась (поворот, окно) — остаёмся на той же странице.
      if (P.clientWidth !== w) { w = P.clientWidth; P.scrollLeft = this._page * w; }
      this._onPagesScroll();
    }));
    this._pagesRO.observe(P);
    [...P.children].forEach((pg) => this._pagesRO.observe(pg));
  }
  _onPagesScroll() {
    const P = this._pagesEl, w = P.clientWidth; if (!w) return;
    const x = clamp(P.scrollLeft / w, 0, PAGES.length - 1);
    this._navEl.style.setProperty("--x", x.toFixed(4));
    const i = Math.round(x);
    if (i !== this._page) {
      this._page = i;
      this._navEl.querySelectorAll("button").forEach((b, j) => b.classList.toggle("on", j === i));
      try { localStorage.setItem("hp-page", i); } catch (e) {}
    }
    // Пока листается — высота по большей из двух соседних страниц, чтобы ничего не обрезалось.
    const pg = P.children, a = Math.floor(x), b = Math.ceil(x);
    const h = Math.abs(x - i) < 0.01 ? pg[i].offsetHeight : Math.max(pg[a]?.offsetHeight || 0, pg[b]?.offsetHeight || 0);
    if (h && h !== this._ph) { this._ph = h; P.style.height = `${h}px`; }
  }
  _pageSettled() {
    this._onPagesScroll();
    // Страница пролистана, а экран прокручен ниже её начала — подняться к началу страницы.
    const r = this._pagesEl.getBoundingClientRect(), nav = this._navEl;
    const top = getComputedStyle(nav).position === "fixed" ? 0 : nav.getBoundingClientRect().bottom - 1;
    if (r.top < top) this._pagesEl.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  _goPage(i) {
    i = clamp(i, 0, PAGES.length - 1);
    const P = this._pagesEl;
    P.scrollTo({ left: i * P.clientWidth, behavior: "smooth" });
  }

  _schedule() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this._update(); });
  }

  _update(force = false) {
    const h = this._hass; if (!h) return;
    const root = this.shadowRoot.getElementById("root");
    root.classList.toggle("light", !this._isDark());
    for (const k of SECTIONS) {
      let sig;
      try { sig = this[`sig_${k}`](); } catch (e) { sig = Math.random(); }
      if (!force && sig === this._sigs[k]) continue;
      this._sigs[k] = sig;
      const el = this.shadowRoot.getElementById(`s-${k}`);
      try { el.innerHTML = this[`r_${k}`](); } catch (e) { console.error("home-panel", k, e); el.innerHTML = `<div class="empty">Ошибка блока «${k}»: ${esc(e.message)}</div>`; }
    }
    this._renderModal(force);
  }

  _tick() {
    const c = this.shadowRoot.getElementById("clock");
    if (c) { const d = new Date(); c.innerHTML = `${hhmm(d)}<span class="sec">${pad2(d.getSeconds())}</span>`; }
    if (this._modal?.type === "camera") this._refreshCam(true);
    // Раз в минуту обновляются «N минут назад».
    const m = Math.floor(Date.now() / 60000);
    if (m !== this._minute) { this._minute = m; this._schedule(); }
  }

  _isDark() {
    if (this._theme === "dark") return true;
    if (this._theme === "light") return false;
    const d = this._hass?.themes?.darkMode;
    return d != null ? d : window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  }

  // ─── Подписки: прогноз, лента событий, история ───
  async _subscribe() {
    const h = this._hass; if (!h?.connection || this._subscribed) return;
    this._subscribed = true;
    const sub = (cb, msg) => h.connection.subscribeMessage(cb, msg).catch((e) => console.warn("home-panel sub", msg.type, e));
    for (const type of ["daily", "hourly"]) {
      this._subs.push(sub((m) => { this._forecast[type] = m.forecast || []; this._sigs.wx = null; this._sigs.hdr = null; this._schedule(); },
        { type: "weather/subscribe_forecast", forecast_type: type, entity_id: WEATHER }));
    }
    this._subs.push(sub((m) => {
      const ev = (m.events || []).filter((e) => e.entity_id && e.state != null);
      if (!ev.length) return;
      const seen = new Set(this._log.map((e) => e.entity_id + e.when));
      this._log = [...this._log, ...ev.filter((e) => !seen.has(e.entity_id + e.when))].sort((a, b) => a.when - b.when).slice(-400);
      this._sigs.feed = null; this._schedule();
    }, { type: "logbook/event_stream", start_time: new Date(Date.now() - 12 * 3600e3).toISOString(), entity_ids: LOG_ENTITIES }));
    this._loadHistory();
    this._loadLitterHistory();
  }

  async _loadHistory() {
    const h = this._hass; if (!h?.callWS) return;
    const ids = ROOMS.flatMap((r) => [r.temp, r.hum]).filter(Boolean);
    try {
      const res = await h.callWS({ type: "history/history_during_period", start_time: new Date(Date.now() - 24 * 3600e3).toISOString(),
        entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
      const out = {};
      for (const [id, arr] of Object.entries(res || {})) {
        out[id] = arr.map((x) => [(x.lu ?? x.lc ?? 0) * 1000, parseFloat(x.s)]).filter((p) => !isNaN(p[1]) && p[0] > 0);
      }
      this._hist = out; this._sigs.clim = null; this._sigs.modal = null; this._schedule();
    } catch (e) { console.warn("home-panel history", e); }
  }

  // ─── Доступ к состояниям ───
  _s(id) { return this._hass?.states[id]; }
  _v(id) { return this._s(id)?.state; }
  _n(id) { const v = parseFloat(this._v(id)); return isNaN(v) ? null : v; }
  _on(id) { return this._v(id) === "on"; }
  _a(id, k) { return this._s(id)?.attributes?.[k]; }
  _sig(ids, extra = "") { return ids.map((id) => { const s = this._s(id); return s ? s.state + "|" + s.last_updated : "-"; }).join(";") + "#" + extra; }
  _url(p) { if (!p) return ""; return /^https?:/.test(p) ? p : this._hass?.hassUrl ? this._hass.hassUrl(p) : p; }
  _lightsOn(ids = ALL_LIGHTS) { return ids.filter((e) => this._on(e)); }
  _lastMotion(room) {
    let best = null;
    for (const m of room.motion || []) {
      const s = this._s(m); if (!s) continue;
      const t = s.state === "on" ? Date.now() : Date.parse(s.last_changed);
      if (!best || t > best) best = t;
    }
    return best;
  }
  _motionNow(room) { return (room.motion || []).some((m) => this._on(m)); }
  _station() {
    const list = STATIONS.map(([e, n, r]) => ({ e, n, r, s: this._s(e) })).filter((x) => x.s);
    if (this._mediaSel && list.find((x) => x.e === this._mediaSel)) return list.find((x) => x.e === this._mediaSel);
    return list.find((x) => x.s.state === "playing") ||
      [...list].sort((a, b) => Date.parse(b.s.attributes.media_position_updated_at || 0) - Date.parse(a.s.attributes.media_position_updated_at || 0))[0];
  }
  _vacRoomName(v) {
    const z = this._v(v.planRoom);
    return VAC_ZONES.find((x) => x.id === z)?.name || (v.room ? this._v(v.room) : null);
  }
  _vacStatus(v) {
    const st = this._v(v.entity);
    const detail = v.id === "qrevo" ? QREVO_STATUS[this._v(v.status)] : S5_STATUS[this._v(v.status)];
    return { st, text: VAC_STATE[st] || st || "—", detail };
  }

  // Замечания для «Всё в порядке».
  _issues() {
    const out = [], h = this._hass, now = Date.now();
    if (this._on(DOOR)) { const m = this._n(DOOR_MIN) || 0;
      out.push({ sev: m >= 10 ? "bad" : "warn", icon: "door-open", text: "Входная дверь открыта", sub: m ? `${m} ${plural(m, ["минуту", "минуты", "минут"])}` : "только что" }); }
    if (this._on(CAMERA_MOTION)) out.push({ sev: "warn", icon: "cctv", text: "Камера видит движение", sub: "Прихожая" });
    if (this._v(ZIGBEE) && !this._on(ZIGBEE)) out.push({ sev: "bad", icon: "zigbee", text: "Zigbee2MQTT не на связи", sub: "датчики и выключатели не отвечают" });
    const qe = this._v(QREVO.error); if (qe && !["none", "unknown", "unavailable"].includes(qe)) out.push({ sev: "bad", icon: "robot-vacuum-alert", text: "Qrevo: ошибка", sub: qe });
    const de = this._v(QREVO.dockError); if (de && !["ok", "unknown", "unavailable"].includes(de)) out.push({ sev: "bad", icon: "home-alert", text: "Станция Qrevo: ошибка", sub: de });
    if (this._on(QREVO.waterShortage)) out.push({ sev: "bad", icon: "water-off", text: "Qrevo: нет воды", sub: "долейте бак чистой воды" });
    if (this._on(QREVO.cleanBox)) out.push({ sev: "warn", icon: "cup-water", text: "Станция Qrevo: бак чистой воды", sub: "проверьте бак" });
    if (this._on(QREVO.dirtyBox)) out.push({ sev: "warn", icon: "delete-variant", text: "Станция Qrevo: бак грязной воды", sub: "пора вылить" });
    if (this._on(LITTER.binFull)) out.push({ sev: "warn", icon: "delete-variant", text: "Лоток: мусорный ящик полон", sub: "пора вынести" });
    if (this._on(LITTER.tankLow)) out.push({ sev: "warn", icon: "pail-outline", text: "Лоток: мало наполнителя в баке", sub: "досыпьте наполнитель" });
    if (this._on(LITTER.drumLow)) out.push({ sev: "warn", icon: "grain", text: "Лоток: мало наполнителя в барабане", sub: "нажмите «Досыпать»" });
    if (this._on(LITTER.problem)) out.push({ sev: "bad", icon: "alert-circle-outline", text: "Лоток: неисправность", sub: (this._a(LITTER.faults, "codes") || []).join(", ") || "посмотрите в приложении" });
    if (this._s(LITTER.online) && this._v(LITTER.online) === "off") out.push({ sev: "warn", icon: "lan-disconnect", text: "Лоток не в сети", sub: "коридор" });
    for (const v of [VAC.qrevo, VAC.s5]) if (this._v(v.entity) === "error") out.push({ sev: "bad", icon: "robot-vacuum-alert", text: `${v.model}: ошибка`, sub: "посмотрите в приложении" });
    const skip = new Set(["sensor.vivo_x200_battery_level", "sensor.planshet_battery_level", VAC.qrevo.battery, VAC.s5.battery]);
    const ents = h.entities || {}, devs = h.devices || {}, areas = h.areas || {};
    const devName = (id) => { const e = ents[id], d = e && devs[e.device_id]; return d ? (d.name_by_user || d.name) : this._a(id, "friendly_name") || id; };
    const areaName = (id) => { const e = ents[id], d = e && devs[e.device_id], a = e?.area_id || d?.area_id; return a && areas[a] ? areas[a].name : ""; };
    for (const [id, s] of Object.entries(h.states)) {
      if (s.attributes.device_class !== "battery" || skip.has(id) || !id.startsWith("sensor.")) continue;
      const v = parseFloat(s.state); if (isNaN(v) || v >= 25) continue;
      out.push({ sev: v <= 10 ? "bad" : "warn", icon: v <= 10 ? "battery-alert-variant-outline" : "battery-low", text: `${devName(id)}`, sub: `батарея ${Math.round(v)}%${areaName(id) ? " · " + areaName(id) : ""}` });
    }
    const unav = new Map();
    for (const [id, s] of Object.entries(h.states)) {
      if (s.state !== "unavailable") continue;
      const dom = id.split(".")[0];
      if (!["sensor", "binary_sensor", "light", "switch", "media_player", "vacuum", "camera"].includes(dom)) continue;
      if (ents[id]?.hidden || ents[id]?.entity_category) continue;
      const key = ents[id]?.device_id || id;
      if (!unav.has(key)) unav.set(key, id);
    }
    for (const id of unav.values()) out.push({ sev: "warn", icon: "lan-disconnect", text: devName(id), sub: `нет связи${areaName(id) ? " · " + areaName(id) : ""}` });
    const b = Date.parse(this._v(BACKUP));
    if (!isNaN(b) && now - b > 3 * 86400e3) out.push({ sev: "warn", icon: "backup-restore", text: "Давно не было резервной копии", sub: ago(b) });
    const rank = { bad: 0, warn: 1 };
    return out.sort((a, b2) => rank[a.sev] - rank[b2.sev]);
  }

  // ─── Шапка ───
  sig_hdr() { return this._sig([WEATHER, PERSON, ...TRACKERS.flatMap((t) => [t[0], t[1]]), DOOR, CAMERA_MOTION, ZIGBEE, QREVO.waterShortage,
    LITTER.binFull, LITTER.tankLow, LITTER.drumLow, LITTER.problem, LITTER.online],
    `${this._theme}|${Math.floor(Date.now() / 60000)}|${this._isDark()}|${Object.keys(this._hass.states).length}`); }
  r_hdr() {
    const now = new Date(), name = this._hass.user?.name || "";
    const date = DATE_FMT.format(now); const dateCap = date.charAt(0).toUpperCase() + date.slice(1);
    const w = this._s(WEATHER), issues = this._issues();
    const bad = issues.some((i) => i.sev === "bad");
    const person = this._s(PERSON);
    const pName = person?.attributes.friendly_name || name || "Я";
    const av = [`<div class="av ${person?.state === "home" ? "" : "away"}" title="${esc(pName)}: ${person?.state === "home" ? "дома" : "не дома"}"
        style="background:linear-gradient(135deg,#f472b6,#fb923c)">${esc(pName.charAt(0).toUpperCase())}</div>`,
      ...TRACKERS.filter((t) => this._s(t[0])).map(([e, bat, n, icon], i) => {
        const home = this._v(e) === "home", b = this._n(bat);
        return `<div class="av ${home ? "" : "away"}" title="${n}: ${home ? "дома" : "не дома"}${b != null ? ", " + b + "%" : ""}"
          style="background:${i ? "linear-gradient(135deg,#38bdf8,#6366f1)" : "linear-gradient(135deg,#a78bfa,#6366f1)"}">${ico(icon)}${b != null ? `<span class="batt">${Math.round(b)}</span>` : ""}</div>`;
      })].join("");
    const themeIcon = { auto: "theme-light-dark", dark: "weather-night", light: "white-balance-sunny" }[this._theme];
    return `<div class="greet"><h1>${greeting(now)}${name ? `, <span>${esc(name)}</span>` : ""}</h1><div class="date">${dateCap}</div></div>
      <div class="pill" title="Кто дома"><div class="people">${av}</div></div>
      ${w ? `<button class="pill" data-act="modal" data-m="weather">${weatherIcon(w.state, 34, this._isNight())}<b>${fmt0(w.attributes.temperature)}°</b><span class="muted">${esc(COND[w.state] || w.state)}</span></button>` : ""}
      <button class="pill" data-act="modal" data-m="status"><span class="dot ${issues.length ? (bad ? "bad" : "warn") : ""}"></span>
        ${issues.length ? `${issues.length} ${plural(issues.length, ["замечание", "замечания", "замечаний"])}` : "Всё в порядке"}</button>
      <button class="iconbtn" data-act="theme" title="Тема: ${{ auto: "как в системе", dark: "тёмная", light: "светлая" }[this._theme]}">${ico(themeIcon)}</button>
      <div class="clock" id="clock">${hhmm(now)}<span class="sec">${pad2(now.getSeconds())}</span></div>`;
  }
  _isNight(d = new Date()) {
    const set = Date.parse(this._v(SUN_SET)), rise = Date.parse(this._v(SUN_RISE));
    if (!isNaN(set) && !isNaN(rise)) return rise < set; // следующий восход раньше заката = сейчас ночь
    const h = d.getHours(); return h < 6 || h >= 20;
  }

  // ─── Хаб «Дом сейчас» ───
  sig_hub() { return this._sig([...ROOMS.flatMap((r) => [r.temp, r.hum, ...(r.motion || [])]).filter(Boolean), ...ALL_LIGHTS, WEATHER, DOOR, DOOR_MIN, ...STATIONS.map((s) => s[0])], Math.floor(Date.now() / 60000)); }
  r_hub() {
    const temps = ROOMS.filter((r) => r.temp).map((r) => ({ r, t: this._n(r.temp) })).filter((x) => x.t != null);
    const hums = ROOMS.filter((r) => r.hum).map((r) => this._n(r.hum));
    const tin = avg(temps.map((x) => x.t)), hin = avg(hums);
    const lit = this._lightsOn(), w = this._s(WEATHER);
    let last = null; for (const r of ROOMS) { const t = this._lastMotion(r); if (t && (!last || t > last.t)) last = { r, t }; }
    const moving = ROOMS.some((r) => this._motionNow(r));
    const recent = last && Date.now() - last.t < 3 * 60000;
    const cold = temps.reduce((a, b) => (!a || b.t < a.t ? b : a), null), hot = temps.reduce((a, b) => (!a || b.t > a.t ? b : a), null);
    const door = this._on(DOOR), dm = this._n(DOOR_MIN) || 0;
    const playing = STATIONS.filter(([e]) => this._v(e) === "playing");
    const tc = tempColor(tin), prog = clamp(((tin ?? 15) - 15) / 15, 0, 1), C = 2 * Math.PI * 62;
    const [cf, cfCls] = comfort(tin, hin);
    const node = (x, y, cls, icon, val, lbl, sub, act) =>
      `<div class="node ${cls}" style="left:${x}%;top:${y}%;transform:translate(-50%,-41px)" ${act || ""}>
        <div class="disc">${ico(icon)}<b>${val}</b></div><div class="lbl">${lbl}</div><div class="sub2">${sub}</div></div>`;
    const link = (x, y, on, color) => `<line class="flow ${on ? "on" : ""}" x1="50" y1="46" x2="${x}" y2="${y}" stroke="${color}" vector-effect="non-scaling-stroke"/>`;
    return `<div class="card-h"><h2>Дом сейчас</h2><div class="meta"><span class="badge ${cfCls}">${cf}</span></div>
        <button class="go" data-act="modal" data-m="climate" title="Климат">${ico("chevron-right")}</button></div>
      <div class="hub">
        <svg class="links" viewBox="0 0 100 100" preserveAspectRatio="none">
          ${link(15, 17, lit.length > 0, "#fbbf24")}${link(85, 17, false, "#2dd4bf")}${link(15, 73, recent || moving, "#38bdf8")}${link(85, 73, door, door ? "#f87171" : "#38bdf8")}
        </svg>
        ${node(15, 17, lit.length ? "glow-amber" : "", "lightbulb-on-outline", lit.length, "Свет", lit.length ? `из ${ALL_LIGHTS.length}` : "выключен", `data-act="modal" data-m="lights" style="cursor:pointer;left:15%;top:17%;transform:translate(-50%,-41px)"`)}
        ${node(85, 17, "glow-teal", "thermometer", `${fmt0(w?.attributes.temperature)}<small>°</small>`, "Улица", esc((COND[w?.state] || "—").replace("Переменная облачность", "переменно").toLowerCase()), `data-act="modal" data-m="weather" style="cursor:pointer;left:85%;top:17%;transform:translate(-50%,-41px)"`)}
        ${node(15, 73, moving || recent ? "glow-cyan" : "", "motion-sensor", !last ? "—" : moving ? "●" : Date.now() - last.t < 3600e3 ? `${Math.max(1, Math.floor((Date.now() - last.t) / 60000))}<small>м</small>` : `${Math.floor((Date.now() - last.t) / 3600e3)}<small>ч</small>`, "Движение", last ? esc(last.r.name) : "нет данных", `data-act="modal" data-m="events" style="cursor:pointer;left:15%;top:73%;transform:translate(-50%,-41px)"`)}
        ${node(85, 73, door ? "glow-red" : "", door ? "door-open" : "door-closed", door ? `${dm}<small>м</small>` : ico("check").replace("ha-icon", "ha-icon style='position:static;--mdc-icon-size:26px;color:var(--green)'"), "Дверь", door ? "открыта" : "закрыта", "")}
        <div class="node center" style="left:50%;top:46%;transform:translate(-50%,-60px)">
          <div class="disc"><svg class="ring" viewBox="0 0 144 144"><circle cx="72" cy="72" r="62" fill="none" stroke="var(--ring-bg)" stroke-width="7"/>
            <circle cx="72" cy="72" r="62" fill="none" stroke="${tc}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(C * prog).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 72 72)" style="filter:drop-shadow(0 0 8px ${tc})"/></svg>
            ${ico("home-thermometer-outline")}<b>${fmt1(tin)}<small>°</small></b><div class="cap">${hin != null ? fmt0(hin) + "% · ДОМ" : "ДОМ"}</div></div></div>
      </div>
      <div class="stats">
        <div class="stat"><div class="k">Мин</div><div class="v">${fmt1(cold?.t)}<small>°</small></div><div class="s">${esc(cold?.r.name || "—")}</div></div>
        <div class="stat"><div class="k">Макс</div><div class="v">${fmt1(hot?.t)}<small>°</small></div><div class="s">${esc(hot?.r.name || "—")}</div></div>
        <div class="stat"><div class="k">Влажн.</div><div class="v">${fmt0(hin)}<small>%</small></div><div class="s">в среднем</div></div>
        <div class="stat"><div class="k">Колонки</div><div class="v">${playing.length ? playing.length : "—"}</div><div class="s">${playing.length ? "играют" : "тишина"}</div></div>
      </div>`;
  }

  // ─── Погода ───
  sig_wx() { return this._sig([WEATHER, SUN_SET, SUN_RISE], `${this._forecast.daily.length}|${this._forecast.hourly[0]?.datetime}|${Math.floor(Date.now() / 600000)}`); }
  r_wx() {
    const w = this._s(WEATHER); if (!w) return `<div class="card-h"><h2>Погода</h2></div><div class="empty">Нет данных о погоде</div>`;
    const a = w.attributes, d0 = this._forecast.daily[0];
    const wind = a.wind_speed != null ? (a.wind_speed / 3.6) : null;
    const dir = a.wind_bearing != null ? WIND_DIR[Math.round(a.wind_bearing / 45) % 8] : "";
    const press = a.pressure != null ? Math.round(a.pressure * 0.750062) : null;
    const set = this._v(SUN_SET), rise = this._v(SUN_RISE);
    const night = this._isNight();
    const hours = this._forecast.hourly.slice(0, 12).map((f) => {
      const d = new Date(f.datetime), hh = d.getHours(), n = hh < 6 || hh >= 21;
      return `<div class="hr"><span class="h">${pad2(hh)}:00</span>${weatherIcon(f.condition, 30, n)}<b>${fmt0(f.temperature)}°</b>
        <span class="p">${f.precipitation_probability ? f.precipitation_probability + "%" : f.precipitation ? fmt1(f.precipitation) : ""}</span></div>`;
    }).join("");
    const days = this._forecast.daily.slice(0, 7).map((f, i) => {
      const d = new Date(f.datetime);
      return `<div class="dy ${i === 0 ? "today" : ""}"><span class="d">${i === 0 ? "Сег" : WD[d.getDay()]}</span>${weatherIcon(f.condition, 30)}
        <b>${fmt0(f.temperature)}°</b><span class="lo">${fmt0(f.templow)}°</span><span class="p">${f.precipitation ? fmt1(f.precipitation) + " мм" : ""}</span></div>`;
    }).join("");
    return `<div class="card-h"><h2>Погода</h2><div class="meta">${esc(a.friendly_name || "")} · влажность <b>${fmt0(a.humidity)}%</b></div>
        <button class="go" data-act="modal" data-m="weather">${ico("chevron-right")}</button></div>
      <div class="wx-now">${weatherIcon(w.state, 78, night)}
        <div><div class="t">${fmt0(a.temperature)}<sup>°</sup></div></div>
        <div><div class="c">${esc(COND[w.state] || w.state)}</div>
          <div class="l">${a.apparent_temperature != null ? `ощущается ${fmt0(a.apparent_temperature)}°` : ""}${d0 ? ` · ${fmt0(d0.temperature)}° / ${fmt0(d0.templow)}°` : ""}</div></div>
      </div>
      <div class="legend" style="margin-top:14px">
        ${wind != null ? `<span class="chip">${ico("weather-windy")}${fmt0(wind)} м/с ${dir}</span>` : ""}
        ${press ? `<span class="chip">${ico("gauge")}${press} мм</span>` : ""}
        ${rise ? `<span class="chip">${ico("weather-sunset-up")}${hhmm(new Date(rise))}</span>` : ""}
        ${set ? `<span class="chip">${ico("weather-sunset-down")}${hhmm(new Date(set))}</span>` : ""}
      </div>
      ${hours ? `<div class="hourly">${hours}</div>` : ""}
      ${days ? `<div class="daily">${days}</div>` : ""}`;
  }

  // ─── Климат ───
  sig_clim() { return this._sig(ROOMS.flatMap((r) => [r.temp, r.hum]).filter(Boolean), Object.keys(this._hist).length + "|" + (this._hist["sensor.zal_temperature"]?.length || 0)); }
  r_clim() {
    const rows = ROOMS.filter((r) => r.temp).map((r) => {
      const t = this._n(r.temp), hm = this._n(r.hum), [cf, cls] = comfort(t, hm);
      const pts = (this._hist[r.temp] || []).concat(t != null ? [[Date.now(), t]] : []);
      const p = sparkPath(pts, 96, 36, 3, 0.8), c = tempColor(t);
      return `<button class="crow" data-act="room" data-room="${r.id}">
        <span class="ic" style="color:${c}">${ico(r.icon)}</span>
        <span class="n">${esc(r.name)}<small>${cls === "ok" ? `влажность ${fmt0(hm)}%` : `<span class="badge ${cls}">${cf}</span> · ${fmt0(hm)}%`}</small></span>
        <span class="tv"><b style="color:${c}">${fmt1(t)}°</b></span>
        ${p ? `<svg class="spark" viewBox="0 0 96 36"><defs><linearGradient id="sg-${r.id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
          <path d="${p.area}" fill="url(#sg-${r.id})"/><path d="${p.d}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>` : `<span></span>`}
      </button>`;
    }).join("");
    const t = avg(ROOMS.map((r) => r.temp && this._n(r.temp))), hm = avg(ROOMS.map((r) => r.hum && this._n(r.hum)));
    return `<div class="card-h"><h2>Климат</h2><div class="meta"><b>${fmt1(t)}°</b> · ${fmt0(hm)}% в среднем</div>
      <button class="go" data-act="modal" data-m="climate">${ico("chevron-right")}</button></div><div class="clim">${rows}</div>`;
  }

  // ─── Состояние устройств ───
  sig_health() { return this._sig([BACKUP, ZIGBEE], `${Object.values(this._hass.states).filter((s) => s.state === "unavailable" || s.attributes.device_class === "battery").map((s) => s.state).join(",")}|${this._v(DOOR)}|${this._v(QREVO.waterShortage)}|${[LITTER.binFull, LITTER.tankLow, LITTER.drumLow, LITTER.problem, LITTER.online].map((e) => this._v(e)).join()}`); }
  r_health() {
    const is = this._issues().filter((i) => i.icon !== "door-open" && i.icon !== "cctv");
    const b = Date.parse(this._v(BACKUP));
    const oks = [];
    if (this._on(ZIGBEE)) oks.push(["zigbee", "Zigbee2MQTT на связи", ""]);
    if (!isNaN(b)) oks.push(["backup-restore", "Резервная копия", ago(b)]);
    return `<div class="card-h"><h2>Устройства</h2><div class="meta">${is.length ? `<b class="accent-amber">${is.length}</b> ${plural(is.length, ["замечание", "замечания", "замечаний"])}` : "всё хорошо"}</div>
        <button class="go" data-act="modal" data-m="status">${ico("chevron-right")}</button></div>
      <div class="hl">${is.slice(0, 5).map((i) => `<div class="hi ${i.sev}">${ico(i.icon)}<span class="grow">${esc(i.text)}</span><span class="v">${esc(i.sub.split(" · ")[0])}</span></div>`).join("")}
        ${is.length > 5 ? `<button class="hi" data-act="modal" data-m="status">${ico("dots-horizontal")}<span class="grow">и ещё ${is.length - 5}</span></button>` : ""}
        ${oks.map(([i, t, v]) => `<div class="hi ok">${ico(i)}<span class="grow">${t}</span><span class="v" style="color:var(--sub)">${esc(v)}</span></div>`).join("")}</div>`;
  }

  // ─── Быстрые действия ───
  sig_quick() { return this._sig([...ALL_LIGHTS, VAC.qrevo.entity, VAC.s5.entity, VAC.qrevo.planRoom, VAC.s5.planRoom, CAMERA_MOTION, DOOR, DOOR_MIN,
    ...STATIONS.map((s) => s[0]), ...ROOMS.flatMap((r) => [r.temp, r.hum]).filter(Boolean)], Math.floor(Date.now() / 60000)); }
  r_quick() {
    const lit = this._lightsOn();
    const vq = this._vacStatus(VAC.qrevo), vs = this._vacStatus(VAC.s5);
    const cleaning = [VAC.qrevo, VAC.s5].filter((v) => ["cleaning", "returning", "paused"].includes(this._v(v.entity)));
    const vacText = cleaning.length ? cleaning.map((v) => `${v.title}: ${VAC_STATE[this._v(v.entity)].toLowerCase()}${this._v(v.entity) === "cleaning" && this._vacRoomName(v) ? " · " + this._vacRoomName(v).toLowerCase() : ""}`).join(", ")
      : vq.st === "docked" && vs.st === "docked" ? "оба на базе" : `${VAC_STATE[vq.st] || "—"} / ${VAC_STATE[vs.st] || "—"}`;
    const cam = this._on(CAMERA_MOTION), camLast = Date.parse(this._s(CAMERA_MOTION)?.last_changed);
    const playing = STATIONS.filter(([e]) => this._v(e) === "playing");
    const door = this._on(DOOR), dm = this._n(DOOR_MIN) || 0;
    const t = avg(ROOMS.map((r) => r.temp && this._n(r.temp))), hm = avg(ROOMS.map((r) => r.hum && this._n(r.hum)));
    const tile = (cls, icon, name, sub, act, corner = "") =>
      `<button class="qt ${cls}" ${act}><span class="qi">${ico(icon)}</span>${corner ? `<span class="corner">${corner}</span>` : ""}<span><div class="qn">${name}</div><div class="qs">${sub}</div></span></button>`;
    return `<div class="card-h"><h2>Быстрые действия</h2></div><div class="qa">
      ${tile(lit.length ? "on-amber" : "", lit.length ? "lightbulb-group" : "lightbulb-group-outline", "Свет", lit.length ? `${lit.length} из ${ALL_LIGHTS.length} горит` : "всё выключено", `data-act="modal" data-m="lights"`)}
      ${tile(cleaning.length ? "on-violet" : "", "robot-vacuum", "Пылесосы", vacText, `data-act="modal" data-m="vacuum"`)}
      ${tile(cam ? "on-red" : "", "cctv", "Камера", cam ? "движение!" : `тихо · ${isNaN(camLast) ? "—" : agoShort(camLast)}`, `data-act="modal" data-m="camera"`)}
      ${tile(playing.length ? "on-pink" : "", playing.length ? "music" : "music-note-outline", "Музыка", playing.length ? esc(STATIONS.find(([e]) => e === playing[0][0])[1]) + (playing.length > 1 ? ` +${playing.length - 1}` : "") : "тишина", `data-act="page" data-p="${PAGE_IX.music}"`)}
      ${tile(door ? "on-red" : "", door ? "door-open" : "door-closed-lock", "Дверь", door ? `открыта${dm ? " " + dm + " мин" : ""}` : "закрыта", `data-act="modal" data-m="events" data-a="door"`)}
      ${tile("on-cyan", "home-thermometer-outline", "Климат", `${fmt1(t)}° · ${fmt0(hm)}%`, `data-act="modal" data-m="climate"`)}
      ${tile("", "lightbulb-off-outline", "Выключить", "весь свет в квартире", `data-act="alloff"`)}
      ${tile("", "bullhorn-outline", "Объявить", "сказать на колонке", `data-act="modal" data-m="media" data-a="tts"`)}
    </div>`;
  }

  // ─── Сценарии: «Я ухожу», «Спокойной ночи», «Утро» ───
  sig_scenes() { return this._sig([...ALL_LIGHTS, DOOR, VAC.qrevo.entity, VAC.s5.entity, "sun.sun", ...SCENES.map((s) => s.script)]); }
  // Что сделает сценарий — для подписи на кнопке и для окна подтверждения.
  _sceneInfo(sc) {
    const lit = this._lightsOn().length, door = this._on(DOOR), dark = this._v("sun.sun") !== "above_horizon";
    const vacs = [VAC.qrevo, VAC.s5].filter((v) => ["cleaning", "paused"].includes(this._v(v.entity)));
    const lamps = (n) => `${n} ${plural(n, ["лампу", "лампы", "ламп"])}`;
    if (sc.id === "leave") return {
      sub: lit ? `погасит ${lamps(lit)} и музыку` : "погасит свет и музыку",
      steps: [["lightbulb-group-off-outline", lit ? `Выключу свет — сейчас горит ${lamps(lit)}` : "Выключу свет во всём доме"],
              ["speaker-off", "Остановлю музыку на всех колонках"]] };
    if (sc.id === "night") return {
      sub: door ? "дверь открыта!" : "погасит всё в доме", warn: door,
      steps: [["lightbulb-group-off-outline", "Выключу свет, ТВ, фитолампу и гирлянду"], ["speaker-off", "Остановлю колонки"],
              ...vacs.map((v) => ["robot-vacuum", `${v.title} пылесос поедет на базу`]),
              ...(door ? [["door-open", "Входная дверь открыта — закройте её", "warn"]] : [])] };
    return {
      sub: "утреннее шоу на кухне",
      steps: [...(dark ? [["lightbulb-on-outline", "Включу свет над столом на кухне"]] : []),
              ["weather-sunset-up", "Алиса на кухне включит утреннее шоу: погода, новости, музыка"]] };
  }
  r_scenes() {
    return `<div class="scenes">${SCENES.map((sc) => {
      const i = this._sceneInfo(sc), run = this._v(sc.script) === "on";
      return `<button class="sc ${run ? "run" : ""} ${i.warn ? "warn" : ""}" data-act="scene" data-s="${sc.id}" style="--g:${sc.grad}">
        <span class="si">${ico(sc.icon)}</span><span class="sn">${sc.name}</span><span class="ss">${run ? "выполняется…" : esc(i.sub)}</span></button>`;
    }).join("")}</div>`;
  }

  // ─── Комнаты ───
  sig_rooms() { return this._sig(ROOMS.flatMap((r) => [r.temp, r.hum, ...(r.lights || []), ...(r.motion || []), ...(r.media || []), r.problem, r.door]).filter(Boolean), this._tab + "|" + Math.floor(Date.now() / 60000)); }
  r_rooms() {
    const cnt = (g) => ROOMS.filter((r) => r.group === g && this._lightsOn(r.lights || []).length).length;
    const tiles = ROOMS.filter((r) => r.group === this._tab).map((r) => {
      const lit = this._lightsOn(r.lights || []), t = r.temp ? this._n(r.temp) : null, hm = r.hum ? this._n(r.hum) : null;
      const mv = this._motionNow(r), lm = this._lastMotion(r), prob = r.problem && this._on(r.problem);
      const play = (r.media || []).some((e) => this._v(e) === "playing");
      const door = r.door && this._on(r.door);
      const bits = [];
      if (t != null) bits.push(`<span class="temp" style="color:${tempColor(t)}">${fmt1(t)}°</span>`);
      if (hm != null) bits.push(`${fmt0(hm)}%`);
      if (r.lights?.length) bits.push(lit.length ? `свет ${lit.length}/${r.lights.length}` : "свет выкл");
      else if (!bits.length) bits.push("—");
      if (!t && lm) bits.push(`движение ${agoShort(lm)}`);
      if (door) bits.push(`<span class="warn">дверь открыта</span>`);
      if (play) bits.push(`<span class="mus">${ico("music")}</span>`);
      if (prob) bits.push(`<span class="warn">${ico("alert-outline")}</span>`);
      return `<div class="rt ${lit.length ? "lit" : ""}" data-act="room" data-room="${r.id}" role="button" tabindex="0">
        ${mv ? `<span class="mv" title="Движение"></span>` : ""}
        <span class="ri">${ico(r.icon)}</span>
        <span class="grow"><div class="rn">${esc(r.name)}</div><div class="rs">${bits.join(" · ")}</div></span>
        ${r.lights?.length ? `<button class="lb" data-act="roomlights" data-room="${r.id}" title="${lit.length ? "Выключить свет" : "Включить свет"}">${ico(lit.length ? "lightbulb-on" : "lightbulb-outline")}</button>` : ""}
      </div>`;
    }).join("");
    const litRooms = ROOMS.filter((r) => this._lightsOn(r.lights || []).length).length;
    return `<div class="card-h"><h2>Комнаты</h2><div class="meta">${litRooms ? `свет в <b>${litRooms}</b> ${plural(litRooms, ["комнате", "комнатах", "комнатах"])}` : "везде темно"}</div></div>
      <div class="tabs"><button class="tab ${this._tab === "live" ? "act" : ""}" data-act="tab" data-t="live">Жилые${cnt("live") ? `<span class="n">${cnt("live")}</span>` : ""}</button>
        <button class="tab ${this._tab === "other" ? "act" : ""}" data-act="tab" data-t="other">Прихожая и остальное${cnt("other") ? `<span class="n">${cnt("other")}</span>` : ""}</button></div>
      <div class="rooms">${tiles}</div>`;
  }

  // ─── План ───
  sig_plan() { return this._sig([...Object.keys(PLAN_LIGHTS), ...Object.keys(PLAN_MOTION), ...Object.keys(PLAN_SPEAKERS), DOOR, CAMERA_MOTION,
    VAC.qrevo.planRoom, VAC.s5.planRoom, ...ROOMS.map((r) => r.temp).filter(Boolean)], [...this._layers].join(",")); }
  r_plan() {
    const L = [["light", "Свет", "#fbbf24"], ["motion", "Движение", "#38bdf8"], ["vac", "Пылесосы", "#a78bfa"], ["media", "Колонки", "#f472b6"], ["heat", "Температура", "#84cc16"]];
    return `<div class="card-h"><h2>План квартиры</h2><div class="meta">нажмите на комнату</div></div>
      <div class="plan-wrap">${renderPlan(this._hass, { layers: this._layers })}</div>
      <div class="legend">${L.map(([k, n, c]) => `<button class="lg ${this._layers.has(k) ? "act" : ""}" data-act="layer" data-l="${k}"><i style="background:${c}"></i>${n}</button>`).join("")}</div>`;
  }

  // ─── Пылесосы ───
  sig_vac() { return this._sig(Object.values(VAC).flatMap((v) => [v.entity, v.battery, v.status, v.progress, v.planRoom, v.room].filter(Boolean)).concat([QREVO.waterShortage, QREVO.error]), ""); }
  r_vac() {
    const card = (v) => {
      const { st, text, detail } = this._vacStatus(v), bat = this._n(v.battery), act = ["cleaning", "returning"].includes(st);
      const room = st === "cleaning" ? this._vacRoomName(v) : null, prog = v.progress ? this._n(v.progress) : null;
      const line = st === "cleaning" ? `${text}${room ? " · " + room.toLowerCase() : ""}` : detail && st !== "cleaning" ? detail : text;
      const playIcon = st === "cleaning" ? "pause" : "play";
      return `<div class="vc ${act ? "act" : ""}" style="--c:${v.color}">
        ${robotSvg(v.color, bat, st === "cleaning", 96)}
        <div class="vn">${v.title}</div><div class="vm">${v.model} · ${bat != null ? Math.round(bat) + "%" : "—"}</div>
        <div class="vs ${act ? "act" : ""}">${esc(line)}</div>
        ${st === "cleaning" && prog != null ? `<div class="bar"><i style="width:${prog}%"></i></div>` : ""}
        <div class="vb"><button data-act="vac" data-v="${v.id}" data-c="play" title="${st === "cleaning" ? "Пауза" : st === "paused" ? "Продолжить" : "Выбрать комнаты"}">${ico(playIcon)}</button>
          <button data-act="vac" data-v="${v.id}" data-c="home" title="На базу">${ico("home-import-outline")}</button>
          <button data-act="vac" data-v="${v.id}" data-c="locate" title="Где ты?">${ico("map-marker-radius-outline")}</button></div>
      </div>`;
    };
    const warn = this._on(QREVO.waterShortage) ? `<div class="hi bad" style="margin-top:10px">${ico("water-off")}<span class="grow">Qrevo: нет воды в станции</span></div>` : "";
    return `<div class="card-h"><h2>Пылесосы</h2><div class="meta">сухой и мокрый</div><button class="go" data-act="modal" data-m="vacuum">${ico("chevron-right")}</button></div>
      <div class="vacs">${card(VAC.s5)}${card(VAC.qrevo)}</div>${warn}
      <button class="bigbtn" data-act="modal" data-m="vacuum">${ico("broom")}Выбрать комнаты и убрать</button>`;
  }

  // ─── Камера ───
  sig_cam() { return this._sig([CAMERA, CAMERA_MOTION, DOOR], ""); }
  _camUrl() { const p = this._a(CAMERA, "entity_picture"); return p ? this._url(p) + (p.includes("?") ? "&" : "?") + "t=" + Date.now() : ""; }
  r_cam() {
    const alert = this._on(CAMERA_MOTION), url = this._camUrl(), last = Date.parse(this._s(CAMERA_MOTION)?.last_changed);
    return `<div class="card-h"><h2>Камера</h2><div class="meta">${alert ? `<b class="accent-red">движение</b>` : `движение ${isNaN(last) ? "—" : agoShort(last) + " назад"}`}</div>
        <button class="go" data-act="modal" data-m="camera">${ico("chevron-right")}</button></div>
      <div class="cam ${alert ? "alert" : ""}" data-act="modal" data-m="camera">
        ${url ? `<img id="camimg" src="${url}" alt="" onerror="this.style.opacity=0">` : `<div class="noimg">Камера недоступна</div>`}
        <div class="ov"><span class="tag rec"><i></i>LIVE</span><span class="tag">${ico("cctv")}Прихожая</span>
          ${alert ? `<span class="tag alert">${ico("motion-sensor")}Движение</span>` : ""}${this._on(DOOR) ? `<span class="tag alert">${ico("door-open")}Дверь открыта</span>` : ""}</div>
        <div class="ts" id="camts">${hhmm(new Date())}</div>
      </div>`;
  }
  _refreshCam(big) {
    if (document.hidden) return;
    const id = big ? "camimg-big" : "camimg";
    const img = this.shadowRoot.getElementById(id); if (!img) return;
    const url = this._camUrl(); if (!url) return;
    const pre = new Image();
    pre.onload = () => { img.src = url; img.style.opacity = 1; const ts = this.shadowRoot.getElementById(big ? "camts-big" : "camts");
      if (ts) { const d = new Date(); ts.textContent = `${hhmm(d)}:${pad2(d.getSeconds())}`; } };
    pre.src = url;
  }

  // ─── Музыка ───
  sig_media() { return this._sig(STATIONS.map((s) => s[0]), this._mediaSel || ""); }
  r_media() {
    const st = this._station();
    if (!st) return `<div class="card-h"><h2>Музыка</h2></div><div class="empty">Колонки не найдены</div>`;
    const a = st.s.attributes, play = st.s.state === "playing", pic = a.entity_picture ? this._url(a.entity_picture) : "";
    const vol = Math.round((a.volume_level ?? 0) * 100), off = st.s.state === "unavailable";
    const resume = this._canResume(st.s);
    const title = off ? "Колонка не на связи" : a.media_title || (play ? "Играет" : "Тишина");
    const artist = off ? "" : a.media_artist || (a.media_title ? (play ? "" : "на паузе") : `Нажмите ${play ? "" : "▶"} — включится «${ALICE_DEFAULT[0]}»`);
    const nPlay = STATIONS.filter(([e]) => this._v(e) === "playing").length;
    return `<div class="card-h"><h2>Музыка</h2><div class="meta">${nPlay ? `играет: <b>${nPlay}</b>` : "везде тихо"}</div>
        <button class="go" data-act="modal" data-m="media" title="Все колонки и объявления">${ico("chevron-right")}</button></div>
      <div class="where">Колонка в комнате</div>
      <div class="stations">${STATIONS.filter(([e]) => this._s(e)).map(([e, n, r]) => `<button class="st ${this._v(e) === "playing" ? "play" : ""} ${e === st.e ? "sel" : ""}" data-act="msel" data-e="${e}" title="${esc(n)}"><i></i>${esc(ROOM[r]?.name || n)}</button>`).join("")}</div>
      <div class="mus"><div class="disk ${play ? "spin" : ""}"><div class="lab" style="${pic ? `background-image:url('${esc(pic)}')` : ""}">${pic ? "" : ico("music-note")}</div></div>
        <div class="info"><div class="tt">${esc(title)}</div><div class="ar">${esc(artist)}</div>
          <div class="ctrls"><button data-act="media" data-e="${st.e}" data-c="prev" title="Назад" ${resume || play ? "" : "disabled"}>${ico("skip-previous")}</button>
            <button class="play" data-act="media" data-e="${st.e}" data-c="pp" title="${play ? "Пауза" : resume ? "Продолжить" : "Включить «" + ALICE_DEFAULT[0] + "»"}">${ico(play ? "pause" : "play")}</button>
            <button data-act="media" data-e="${st.e}" data-c="next" title="Дальше" ${resume || play ? "" : "disabled"}>${ico("skip-next")}</button></div></div></div>
      <div class="vol">${ico(vol ? "volume-medium" : "volume-off")}<input type="range" min="0" max="100" value="${vol}" data-in="vol" data-e="${st.e}" style="--p:${vol}%" aria-label="Громкость"><b style="min-width:34px;color:var(--text)">${vol}</b></div>`;
  }
  // На паузе с треком — можно продолжить; пустая колонка (idle, нет трека) на «play» молчит.
  _canResume(s) { return s && s.state === "paused" && !!s.attributes.media_title; }
  _alice(e, cmd, label) {
    const st = STATIONS.find((x) => x[0] === e), where = ROOM[st?.[2]]?.name || st?.[1] || "колонка";
    return this._call("media_player", "play_media", { entity_id: e, media_content_type: "command", media_content_id: cmd },
      `${where}: «${label}»`);
  }

  // ─── Попросить Алису: каталог команд по темам, видна одна тема ───
  sig_alice() { return `${this._aliceCat}|${this._station()?.e}|${this._isDark()}`; }
  r_alice() {
    const st = this._station(), cat = ALICE.find((c) => c.id === this._aliceCat) || ALICE[0];
    const where = st ? ROOM[st.r]?.name || st.n : "—";
    return `<div class="card-h"><h2>Попросить Алису</h2><div class="meta">на колонке: <b>${esc(where)}</b></div></div>
      <div class="acats">${ALICE.map((c) => `<button class="${c.id === cat.id ? "on" : ""}" style="--ac:${c.color}" data-act="acat" data-c="${c.id}">${ico(c.icon)}<span>${c.name}</span></button>`).join("")}</div>
      <div class="acmds" style="--ac:${cat.color}">${cat.items.map(([name, icon, cmd, plus], i) =>
        `<button class="acmd" data-act="alice" data-i="${i}" ${st ? "" : "disabled"}><span class="ai">${ico(icon)}</span>
          <span class="at"><b>${esc(name)}</b><small>«Алиса, ${esc(cmd.charAt(0).toLowerCase() + cmd.slice(1))}»</small></span>${plus ? `<span class="plus" title="Нужна опция «Алиса Плюс»">Плюс</span>` : ""}</button>`).join("")}</div>
      <div class="ahint">${ico("gesture-tap")}Нажмите — колонка сделает сама. Или скажите эти слова вслух.${cat.id === "games" ? " В игре отвечайте колонке голосом, закончить — «Алиса, хватит»." : ""}</div>`;
  }

  // ─── Лента событий ───
  _evText(e) {
    const id = e.entity_id, s = e.state;
    if (id === DOOR) return s === "on" ? { icon: "door-open", c: "var(--red)", t: "Входная дверь открыта", g: "door" } : s === "off" ? { icon: "door-closed", c: "var(--sub)", t: "Входная дверь закрыта", g: "door" } : null;
    if (id === CAMERA_MOTION) return s === "on" ? { icon: "cctv", c: "var(--red)", t: "Камера: движение", sub: "Прихожая", g: "motion" } : null;
    for (const v of Object.values(VAC)) if (id === v.entity) {
      const map = { cleaning: "начал уборку", returning: "едет на базу", docked: "вернулся на базу", paused: "на паузе", error: "ошибка!", idle: "остановился" };
      return map[s] ? { icon: s === "error" ? "robot-vacuum-alert" : "robot-vacuum", c: v.color, t: `${v.title} пылесос ${map[s]}`, sub: v.model, g: "vac" } : null;
    }
    const st = STATIONS.find((x) => x[0] === id);
    if (st) return s === "playing" ? { icon: "music", c: "var(--pink)", t: `${st[1]}: музыка`, sub: ROOM[st[2]]?.name, g: "media" } : null;
    const room = ROOMS.find((r) => (r.motion || []).includes(id) || (r.lights || []).includes(id));
    if (!room) return null;
    if ((room.motion || []).includes(id)) return s === "on" ? { icon: "motion-sensor", c: "var(--cyan)", t: `Движение: ${room.name.toLowerCase()}`, sub: id.includes("stol") ? "у стола" : "", g: "motion" } : null;
    if (s !== "on" && s !== "off") return null;
    return { icon: s === "on" ? "lightbulb-on" : "lightbulb-outline", c: s === "on" ? "var(--amber)" : "var(--sub)",
      t: `${room.name}: ${(LIGHT_NAMES[id] || "свет").toLowerCase()} ${s === "on" ? "включен" : "выключен"}${LIGHT_NAMES[id] === "Подсветка" && s === "on" ? "а" : LIGHT_NAMES[id] === "Подсветка" ? "а" : ""}`, g: "light" };
  }
  _events(filter = "all", n = 400) {
    const out = [];
    for (let i = this._log.length - 1; i >= 0 && out.length < n; i--) {
      const e = this._log[i], t = this._evText(e);
      if (!t || (filter !== "all" && t.g !== filter)) continue;
      out.push({ ...t, when: e.when * 1000 });
    }
    return out;
  }
  sig_feed() { return `${this._log.length}|${this._log[this._log.length - 1]?.when}|${Math.floor(Date.now() / 60000)}`; }
  r_feed() {
    const ev = this._events("all", 8);
    return `<div class="card-h"><h2>События</h2><div class="meta">за 12 часов</div><button class="go" data-act="modal" data-m="events">${ico("chevron-right")}</button></div>
      <div class="feed">${ev.length ? ev.map((e) => this._evRow(e)).join("") : `<div class="empty">Событий пока нет</div>`}</div>`;
  }
  _evRow(e) {
    return `<div class="ev"><span class="ei" style="color:${e.c}">${ico(e.icon)}</span><span class="et">${esc(e.t)}${e.sub ? `<small>${esc(e.sub)}</small>` : ""}</span><span class="ew">${agoShort(e.when)}</span></div>`;
  }

  // ─── Лоток ───
  _lbState() {
    const task = this._v(LITTER.task), online = this._on(LITTER.online), s = this._s(LITTER.online);
    if (!s || s.state === "unavailable") return { mode: "off", color: "var(--faint)", text: "Нет данных", task };
    if (!online) return { mode: "off", color: "var(--faint)", text: "Не в сети", task };
    if (this._on(LITTER.problem)) return { mode: "bad", color: "var(--red)", text: "Неисправность", task };
    if (task === "cat_inside") return { mode: "cat", color: "var(--amber)", text: LITTER_TASK.cat_inside, task };
    if (task && task !== "idle" && LITTER_TASK[task]) return { mode: "clean", color: "var(--violet)", text: LITTER_TASK[task], task };
    if (this._on(LITTER.binFull)) return { mode: "bad", color: "var(--red)", text: "Ящик полон", task };
    return { mode: "idle", color: "var(--green)", text: LITTER_TASK.idle, task };
  }
  // Когда лоток уберёт после последнего визита (если автоуборка включена и после визита ещё не убирал).
  _lbEta() {
    const v = Date.parse(this._v(LITTER.lastVisit)), c = Date.parse(this._v(LITTER.lastClean));
    if (!this._on(LITTER.auto) || isNaN(v) || (!isNaN(c) && c >= v)) return null;
    const delay = this._lbPending ?? this._n(LITTER.delay) ?? 0, dur = this._n(LITTER.dur) || 0;
    return v + (dur + delay * 60) * 1000;
  }
  _lbVisits() {
    return (this._a(LITTER.visits, "visits") || []).map((x) => ({ t: Date.parse(x.time), w: x.weight_g, d: x.duration_s }))
      .filter((x) => !isNaN(x.t)).sort((a, b) => a.t - b.t);
  }
  sig_litter() { return this._sig(Object.values(LITTER), Math.floor(Date.now() / 60000) + "|" + (this._lbPending ?? "")); }
  r_litter() {
    if (!this._s(LITTER.online)) return `<div class="card-h"><h2>Лоток</h2></div><div class="empty">Интеграция homerunPET не найдена</div>`;
    const st = this._lbState(), now = Date.now(), online = st.mode !== "off";
    const lv = Date.parse(this._v(LITTER.lastVisit)), lc = Date.parse(this._v(LITTER.lastClean)), eta = this._lbEta();
    let sub;
    if (st.mode === "clean") sub = "барабан вращается — не мешайте";
    else if (st.mode === "cat") sub = this._on(LITTER.auto) ? "уберёт, когда кошка выйдет" : "автоуборка выключена";
    else if (eta) sub = eta > now ? `уберёт в ${hhmm(new Date(eta))} · через ${Math.max(1, Math.round((eta - now) / 60000))} мин` : "сейчас начнёт уборку";
    else if (!isNaN(lc)) sub = `убрано ${agoShort(lc)} назад`;
    else sub = "";
    const tank = (id, icon, name, okText, badText) => {
      const s = this._s(id), bad = this._on(id), unk = !s || s.state === "unavailable" || s.state === "unknown";
      return `<div class="lt ${unk ? "unk" : bad ? "bad" : "ok"}"><span class="li">${ico(icon)}</span><span class="ln">${name}</span>
        <span class="lv">${unk ? "—" : bad ? badText : okText}</span></div>`;
    };
    return `<div class="card-h"><h2>Лоток</h2><div class="meta">${online ? `<span class="ldot"></span>в сети · коридор` : `<b class="accent-red">не в сети</b>`}</div></div>
      <div class="lbx">
        <div class="lart">${litterSvg(st.mode, st.color)}</div>
        <div class="linfo"><div class="lst" style="color:${st.color}">${esc(st.text)}</div>
          <div class="lsub">${esc(sub)}</div>
          <div class="lfacts"><span>${ico("paw")}<b>${fmt0(this._n(LITTER.visits))}</b> ${plural(this._n(LITTER.visits) || 0, ["визит", "визита", "визитов"])} сегодня</span>
            <span>${ico("broom")}<b>${fmt0(this._n(LITTER.cleans))}</b> ${plural(this._n(LITTER.cleans) || 0, ["уборка", "уборки", "уборок"])}</span>
            ${!isNaN(lv) ? `<span>${ico("clock-outline")}визит ${agoShort(lv)} назад</span>` : ""}</div></div>
      </div>
      <div class="ltanks">
        ${tank(LITTER.binFull, "delete-variant", "Ящик отходов", "пустой", "полон")}
        ${tank(LITTER.tankLow, "pail-outline", "Бак наполнителя", "есть", "мало")}
        ${tank(LITTER.drumLow, "grain", "Барабан", "хватает", "мало")}
      </div>
      <div class="lbtns"><button class="bigbtn" data-act="lbclean" ${online ? "" : "disabled"}>${ico("broom")}Убрать сейчас</button>
        <button class="bigbtn ghost" data-act="lbadd" ${online ? "" : "disabled"}>${ico("tray-arrow-down")}Досыпать</button></div>`;
  }

  sig_litset() { return this._sig([LITTER.delay, LITTER.online, ...LITTER_SWITCHES.map((x) => x[0])], String(this._lbPending ?? "")); }
  r_litset() {
    if (!this._s(LITTER.delay)) return `<div class="card-h"><h2>Настройки лотка</h2></div><div class="empty">Нет данных</div>`;
    const auto = this._on(LITTER.auto), cur = this._lbPending ?? this._n(LITTER.delay), dis = this._v(LITTER.delay) === "unavailable";
    const fw = this._v(LITTER.fw);
    return `<div class="card-h"><h2>Настройки лотка</h2></div>
      <div class="ldel ${auto ? "" : "off"}">
        <div class="ldh"><div><div class="ldk">Уборка после ухода кошки</div><div class="lds">${auto ? "через столько минут лоток уберёт сам" : "автоуборка выключена"}</div></div>
          <div class="ldv"><button data-act="lbdelay" data-d="-1" ${dis || cur <= 1 ? "disabled" : ""} aria-label="Меньше">${ico("minus")}</button>
            <b>${fmt0(cur)}<small>мин</small></b>
            <button data-act="lbdelay" data-d="1" ${dis || cur >= 60 ? "disabled" : ""} aria-label="Больше">${ico("plus")}</button></div></div>
        <div class="lpre">${LITTER_DELAYS.map((m) => `<button class="${m === cur ? "on" : ""}" data-act="lbdelay" data-v="${m}" ${dis ? "disabled" : ""}>${m}</button>`).join("")}</div>
      </div>
      <div class="lsw">${LITTER_SWITCHES.map(([e, n, sub, icon]) => { const s = this._s(e); if (!s) return "";
        const on = s.state === "on", na = s.state === "unavailable";
        return `<div class="lrow ${na ? "na" : ""}"><span class="lri ${on ? "on" : ""}">${ico(icon)}</span><span class="ln">${n}<small>${sub}</small></span>
          <button class="tog cy ${on ? "on" : ""}" data-act="toggle" data-e="${e}" ${na ? "disabled" : ""} aria-label="${esc(n)}"></button></div>`; }).join("")}</div>
      ${fw && fw !== "unavailable" ? `<div class="lfw">${ico("chip")}Прошивка ${esc(fw)}</div>` : ""}`;
  }

  sig_catst() { return this._sig([LITTER.visits, LITTER.weight, LITTER.dur, LITTER.cleans, LITTER.lastVisit],
    Math.floor(Date.now() / 60000) + "|" + Object.values(this._lhist || {}).reduce((s, a) => s + a.length, 0)); }
  // По дням за неделю: визиты (максимум счётчика за день) и средний вес.
  _lbWeek() {
    const H = this._lhist || {}, days = [], d0 = new Date(); d0.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const a = d0.getTime() - i * 86400e3, b = a + 86400e3, inDay = (p) => p[0] >= a && p[0] < b;
      const vis = (H[LITTER.visits] || []).filter(inDay).map((p) => p[1]), ws = (H[LITTER.weight] || []).filter(inDay).map((p) => p[1]);
      if (i === 0) { const v = this._n(LITTER.visits), w = this._n(LITTER.weight); if (v != null) vis.push(v); if (w != null) ws.push(w); }
      days.push({ t: a, visits: vis.length ? Math.max(...vis) : null, weight: avg(ws) });
    }
    return days;
  }
  r_catst() {
    if (!this._s(LITTER.visits)) return `<div class="card-h"><h2>Кошка</h2></div><div class="empty">Нет данных</div>`;
    const visits = this._lbVisits(), w = this._n(LITTER.weight), week = this._lbWeek();
    const durs = visits.map((x) => x.d).filter((x) => x != null), avgDur = avg(durs);
    const wk = week.filter((d) => d.weight != null), w0 = wk.length > 1 ? wk[0].weight : null;
    const dW = w != null && w0 != null ? w - w0 : null;
    const vDays = week.filter((d) => d.visits != null), avgVis = avg(vDays.map((d) => d.visits));
    const stat = (k, v, s) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
    // Шкала дня: визиты точками, 0–24 ч. Подписи — обычным текстом, чтобы не растягивались вместе с рисунком.
    const W = 600, Hh = 44, day0 = new Date().setHours(0, 0, 0, 0), X = (ts) => 8 + ((ts - day0) / 86400e3) * (W - 16);
    let tl = `<svg class="ltl" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none"><line class="gl" x1="8" x2="${W - 8}" y1="26" y2="26"/>`;
    for (let h = 0; h <= 24; h += 6) { const x = 8 + (h / 24) * (W - 16); tl += `<line class="gl" x1="${x}" x2="${x}" y1="22" y2="30"/>`; }
    const nx = X(Date.now()); tl += `<line x1="${nx}" x2="${nx}" y1="4" y2="34" stroke="var(--cyan)" stroke-width="1.5" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/></svg>`;
    const dots = visits.map((v) => { const r = 9 + clamp((v.d || 60) / 30, 0, 8);
      return `<i style="left:${((v.t - day0) / 86400e3 * 100).toFixed(2)}%;width:${r}px;height:${r}px" title="${hhmm(new Date(v.t))} · ${v.w ? fmt2(v.w / 1000) + " кг · " : ""}${fmtDur(v.d)}"></i>`; }).join("");
    tl = `<div class="ltlw">${tl}<div class="ltd">${dots}</div></div><div class="ltax"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>`;
    // Неделя: столбики визитов и линия веса.
    const maxV = Math.max(4, ...week.map((d) => d.visits || 0));
    const ws2 = week.map((d) => d.weight).filter((x) => x != null), wlo = ws2.length ? Math.min(...ws2) - 0.15 : 0, whi = ws2.length ? Math.max(...ws2) + 0.15 : 1;
    const bars = week.map((d, i) => { const today = i === 6, h = d.visits != null ? Math.max(6, (d.visits / maxV) * 100) : 0;
      const wy = d.weight != null ? 100 - ((d.weight - wlo) / (whi - wlo || 1)) * 100 : null;
      return `<div class="lwd ${today ? "today" : ""}" title="${d.visits != null ? d.visits + " визитов" : "нет данных"}${d.weight != null ? " · " + fmt2(d.weight) + " кг" : ""}">
        <div class="lwb"><i style="height:${h}%"></i>${wy != null ? `<s style="bottom:${(100 - wy).toFixed(1)}%"></s>` : ""}<em>${d.visits ?? ""}</em></div>
        <span>${today ? "сегодня" : WD[new Date(d.t).getDay()]}</span></div>`; }).join("");
    const rows = visits.slice().reverse().slice(0, 6).map((v) =>
      `<div class="ev"><span class="ei" style="color:var(--amber)">${ico("paw")}</span><span class="et">${hhmm(new Date(v.t))}<small>${v.w ? fmt2(v.w / 1000) + " кг" : "вес —"}</small></span><span class="ew">${fmtDur(v.d)}</span></div>`).join("");
    return `<div class="card-h"><h2>Кошка</h2><div class="meta">${visits.length ? `последний визит <b>${hhmm(new Date(visits[visits.length - 1].t))}</b>` : "сегодня визитов не было"}</div></div>
      <div class="stats lstats">
        ${stat("Вес", `${fmt2(w)}<small> кг</small>`, dW != null ? `${dW >= 0 ? "+" : "−"}${fmt2(Math.abs(dW))} кг за неделю` : "по последнему визиту")}
        ${stat("Визитов", fmt0(this._n(LITTER.visits)), avgVis != null && vDays.length > 1 ? `в среднем ${fmt1(avgVis)} в день` : "сегодня")}
        ${stat("В лотке", fmtDur(avgDur), "в среднем за визит")}
        ${stat("Уборок", fmt0(this._n(LITTER.cleans)), "сегодня")}
      </div>
      <div class="lsec">Сегодня</div>${tl}
      <div class="lsec">Неделя<span><i class="lg-b"></i>визиты <i class="lg-w"></i>вес</span></div><div class="lweek">${bars}</div>
      ${rows ? `<div class="lsec">Визиты</div><div class="feed lfeed">${rows}</div>` : ""}`;
  }
  async _loadLitterHistory() {
    const h = this._hass; if (!h?.callWS || !h.states[LITTER.visits]) return;
    try {
      const res = await h.callWS({ type: "history/history_during_period", start_time: new Date(Date.now() - 7 * 86400e3).toISOString(),
        entity_ids: [LITTER.visits, LITTER.weight], minimal_response: true, no_attributes: true, significant_changes_only: false });
      const out = {};
      for (const id of [LITTER.visits, LITTER.weight]) {
        out[id] = (res?.[id] || []).map((x) => [(x.lu ?? x.lc ?? 0) * 1000, parseFloat(x.s)]).filter((p) => !isNaN(p[1]) && p[0] > 0);
      }
      this._lhist = out; this._sigs.catst = null; this._schedule();
    } catch (e) { console.warn("home-panel litter history", e); }
  }
  // Задержку двигают кнопками подряд — отправляем последнее значение через 0,8 с.
  _lbDelay(d) {
    const cur = this._lbPending ?? this._n(LITTER.delay) ?? 5;
    const v = clamp(d.v != null ? +d.v : cur + +d.d, 1, 60);
    this._lbPending = v; this._sigs.litset = null; this._sigs.litter = null; this._update();
    clearTimeout(this._lbT);
    this._lbT = setTimeout(() => {
      Promise.resolve(this._call("number", "set_value", { entity_id: LITTER.delay, value: v }, `Лоток уберёт через ${v} мин после визита`))
        .finally(() => setTimeout(() => { this._lbPending = null; this._sigs.litset = null; this._schedule(); }, 1500));
    }, 800);
  }

  // ─── Действия ───
  _call(domain, service, data, toast) {
    const p = this._hass.callService(domain, service, data);
    if (toast) this._toast(toast);
    Promise.resolve(p).catch((e) => this._toast(`Ошибка: ${e.message || e}`, true));
    return p;
  }
  _toast(text, err) {
    const el = this.shadowRoot.getElementById("toast");
    el.innerHTML = ""; void el.offsetWidth;
    el.innerHTML = `<div class="toast">${ico(err ? "alert-circle" : "check-circle")}${esc(text)}</div>`;
    clearTimeout(this._toastT); this._toastT = setTimeout(() => (el.innerHTML = ""), 3300);
  }
  _confirm(text, fn, ok = "Да", icon = "help-circle-outline", extra = {}) {
    this._pending = fn; this._prevModal = this._modal;
    this._openModal("confirm", { text, ok, icon, ...extra });
  }
  _toggle(id) {
    const dom = id.split(".")[0];
    this._call(dom === "light" || dom === "switch" ? dom : "homeassistant", "toggle", { entity_id: id });
  }
  _roomLights(room) {
    const lit = this._lightsOn(room.lights || []);
    if (lit.length) this._call("homeassistant", "turn_off", { entity_id: lit }, `${room.name}: свет выключен`);
    else { const main = (room.lights || []).filter((e) => !e.endsWith("_ambilight")); this._call("homeassistant", "turn_on", { entity_id: main.length ? main : room.lights }, `${room.name}: свет включён`); }
  }
  _vacCmd(vid, c) {
    const v = VAC[vid], st = this._v(v.entity);
    if (c === "play") {
      if (st === "cleaning") return this._call("vacuum", "pause", { entity_id: v.entity }, `${v.title}: пауза`);
      if (st === "paused") return this._call("vacuum", "start", { entity_id: v.entity }, `${v.title}: продолжаю уборку`);
      this._vacWho = v.who; return this._openModal("vacuum");
    }
    if (c === "home") return this._call("vacuum", "return_to_base", { entity_id: v.entity }, `${v.title}: едет на базу`);
    if (c === "locate") return this._call("vacuum", "locate", { entity_id: v.entity }, `${v.title}: подаёт голос`);
  }
  _vacGo() {
    const rooms = VAC_ZONES.map((z) => z.id).filter((z) => this._vacSel.has(z));
    if (!rooms.length) return;
    const who = this._vacWho || "Сухой";
    const names = VAC_ZONES.filter((z) => this._vacSel.has(z.id)).map((z) => z.name.toLowerCase()).join(", ");
    this._call("script", "fp_vacuum_clean", { rooms, who }, `${who === "Вместе" ? "Сначала пылесос, потом мойка" : who === "Мокрый" ? "Qrevo моет" : "S5 пылесосит"}: ${names}`);
    this._vacSel.clear(); this._closeModal();
  }
  _tts() {
    const inp = this.shadowRoot.getElementById("tts-text"), sel = this.shadowRoot.getElementById("tts-st");
    const text = inp?.value.trim(); if (!text) return;
    const cmd = this._ttsMode === "cmd";
    this._call("media_player", "play_media", { entity_id: sel.value, media_content_type: cmd ? "command" : "text", media_content_id: text },
      cmd ? `Команда отправлена: «${text}»` : `Колонка скажет: «${text}»`);
    inp.value = "";
  }

  _onClick(ev) {
    const el = ev.target.closest("[data-act]");
    if (!el) { if (ev.target.classList?.contains("overlay")) this._closeModal(); return; }
    const d = el.dataset, act = d.act;
    if (el.closest(".rt") && act === "room" && ev.target.closest(".lb")) return;
    ev.stopPropagation();
    switch (act) {
      case "modal": return this._openModal(d.m, d.a);
      case "close": return this._closeModal();
      case "theme": {
        this._theme = { auto: "dark", dark: "light", light: "auto" }[this._theme];
        try { localStorage.setItem("hp-theme", this._theme); } catch (e) {}
        this._toast({ auto: "Тема как в системе", dark: "Тёмная тема", light: "Светлая тема" }[this._theme]);
        return this._update(true);
      }
      case "tab": this._tab = d.t; return this._update();
      case "page": return this._goPage(+d.p);
      case "layer": this._layers.has(d.l) ? this._layers.delete(d.l) : this._layers.add(d.l); return this._update();
      case "room": return this._openModal("room", d.room);
      case "roomlights": return this._roomLights(ROOM[d.room]);
      case "toggle": return this._toggle(d.e);
      case "vac": return this._vacCmd(d.v, d.c);
      case "zone": this._vacSel.has(d.zone) ? this._vacSel.delete(d.zone) : this._vacSel.add(d.zone); return this._renderModal(true);
      case "vacall": VAC_ZONES.forEach((z) => this._vacSel.add(z.id)); return this._renderModal(true);
      case "vacnone": this._vacSel.clear(); return this._renderModal(true);
      case "who": this._vacWho = d.w; return this._renderModal(true);
      case "vacview": this._vacView = d.v; return this._renderModal(true);
      case "vacgo": return this._vacGo();
      case "select": return this._call("select", "select_option", { entity_id: d.e, option: d.o });
      case "fan": return this._call("vacuum", "set_fan_speed", { entity_id: d.e, fan_speed: d.o });
      case "press": return this._confirm(`Запустить сценарий Roborock «${d.n}»?`, () => this._call("button", "press", { entity_id: d.e }, `Сценарий «${d.n}» запущен`), "Запустить", "play-circle-outline");
      case "acat": this._aliceCat = d.c; return this._update();
      case "scene": {
        const sc = SCENES.find((x) => x.id === d.s); if (!sc) return;
        return this._confirm(`${sc.name}?`, () => this._call("script", "turn_on", { entity_id: sc.script }, sc.bye), sc.ok, sc.icon,
          { title: sc.name, grad: sc.grad, steps: this._sceneInfo(sc).steps });
      }
      case "alice": {
        const st = this._station(), it = (ALICE.find((c) => c.id === this._aliceCat) || ALICE[0]).items[+d.i];
        return st && it && this._alice(st.e, it[2], it[0]);
      }
      case "media": {
        // Пустая колонка на «play» молчит — тогда просим Алису включить «Мою волну».
        if (d.c === "pp") { const s = this._s(d.e); if (s && s.state !== "playing" && !this._canResume(s)) return this._alice(d.e, ALICE_DEFAULT[1], ALICE_DEFAULT[0]); }
        const svc = { pp: "media_play_pause", next: "media_next_track", prev: "media_previous_track", stop: "media_stop" }[d.c];
        return this._call("media_player", svc, { entity_id: d.e });
      }
      case "msel": this._mediaSel = d.e; return this._update();
      case "ttsmode": this._ttsMode = d.m; return this._renderModal(true);
      case "tts": return this._tts();
      case "phrase": { const i = this.shadowRoot.getElementById("tts-text"); if (i) { i.value = d.t; i.focus(); } return; }
      case "lbclean": return this._confirm("Убрать лоток сейчас?", () => this._call("button", "press", { entity_id: LITTER.clean }, "Лоток начал уборку"), "Убрать", "broom");
      case "lbadd": return this._confirm("Досыпать одну порцию наполнителя из бака?", () => this._call("button", "press", { entity_id: LITTER.add }, "Лоток досыпает наполнитель"), "Досыпать", "tray-arrow-down");
      case "lbdelay": return this._lbDelay(d);
      case "alloff": return this._confirm("Выключить весь свет в квартире?", () => this._call("homeassistant", "turn_off", { entity_id: ALL_LIGHTS }, "Весь свет выключен"), "Выключить", "lightbulb-group-off-outline");
      case "allon": return this._confirm("Включить основной свет во всех комнатах?", () => this._call("homeassistant", "turn_on", { entity_id: MAIN_LIGHTS }, "Свет включён везде"), "Включить", "lightbulb-group-outline");
      case "cleanroom": {
        const r = ROOM[d.room], who = d.w;
        return this._call("script", "fp_vacuum_clean", { rooms: r.vac, who }, `${r.name}: ${who === "Сухой" ? "S5 пылесосит" : who === "Мокрый" ? "Qrevo моет" : "сначала пылесос, потом мойка"}`);
      }
      case "filter": this._logFilter = d.f; return this._renderModal(true);
      case "swatch": return this._call("light", "turn_on", { entity_id: d.e, rgb_color: d.rgb.split(",").map(Number) });
      case "effect": return this._call("light", "turn_on", { entity_id: d.e, effect: d.x });
      case "yes": { const fn = this._pending; this._pending = null; const prev = this._prevModal; this._modal = prev; this._renderModal(true); if (fn) fn(); return; }
      case "no": { this._pending = null; this._modal = this._prevModal; return this._renderModal(true); }
    }
  }
  _onInput(ev, commit) {
    const el = ev.target; if (!el.dataset?.in) return;
    const v = Number(el.value), d = el.dataset;
    el.style.setProperty("--p", `${((v - el.min) / (el.max - el.min)) * 100}%`);
    const out = el.parentElement.querySelector("b"); if (out && d.in !== "ct") out.textContent = d.in === "vol" || d.in === "bright" ? v : v;
    if (!commit) return;
    this._dragging = false;
    if (d.in === "vol") this._call("media_player", "volume_set", { entity_id: d.e, volume_level: v / 100 });
    if (d.in === "bright") this._call("light", "turn_on", { entity_id: d.e, brightness_pct: v });
    if (d.in === "ct") this._call("light", "turn_on", { entity_id: d.e, color_temp_kelvin: v });
  }
}
