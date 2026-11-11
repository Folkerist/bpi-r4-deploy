// ─── Окна ────────────────────────────────────────────────────────────────────────────────────────────────────

// График за сутки: температура (линия) и влажность (пунктир, правая шкала).
function chartSvg(tp, hp, w = 640, h = 190) {
  const padL = 34, padR = 34, padT = 12, padB = 24, W = w - padL - padR, H = h - padT - padB;
  const now = Date.now(), t0 = now - 24 * 3600e3;
  const clip = (p) => (p || []).filter((x) => x[0] >= t0 - 3600e3).map((x) => [Math.max(x[0], t0), x[1]]);
  tp = clip(tp); hp = clip(hp);
  if (tp.length < 2 && hp.length < 2) return `<div class="empty">История ещё не загрузилась</div>`;
  const X = (t) => padL + ((t - t0) / (now - t0)) * W;
  const scale = (pts, span) => { let lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
    if (hi - lo < span) { const m = (hi + lo) / 2; lo = m - span / 2; hi = m + span / 2; } return [lo, hi]; };
  const path = (pts, lo, hi) => { const Y = (v) => padT + H - ((v - lo) / (hi - lo)) * H;
    let d = `M${X(pts[0][0]).toFixed(1)} ${Y(pts[0][1]).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) { d += ` H${X(pts[i][0]).toFixed(1)} V${Y(pts[i][1]).toFixed(1)}`; }
    return { d: d + ` H${X(now).toFixed(1)}`, Y }; };
  let out = `<svg class="chart" viewBox="0 0 ${w} ${h}">`;
  for (let i = 0; i <= 4; i++) { const y = padT + (H * i) / 4; out += `<line class="gl" x1="${padL}" x2="${w - padR}" y1="${y}" y2="${y}"/>`; }
  for (let k = 0; k <= 24; k += 6) { const t = t0 + k * 3600e3, x = X(t);
    out += `<text class="ax" x="${x}" y="${h - 6}" text-anchor="middle">${k === 24 ? "сейчас" : hhmm(new Date(t))}</text>`; }
  if (hp.length > 1) { const [lo, hi] = scale(hp, 10), p = path(hp, lo, hi);
    out += `<path d="${p.d} V${padT + H} H${X(hp[0][0])} Z" fill="#38bdf8" fill-opacity=".08"/><path d="${p.d}" fill="none" stroke="#38bdf8" stroke-width="1.6" stroke-dasharray="4 3" opacity=".8"/>`;
    out += `<text class="ax" x="${w - 4}" y="${padT + 8}" text-anchor="end" fill="#38bdf8">${fmt0(hi)}%</text><text class="ax" x="${w - 4}" y="${padT + H}" text-anchor="end">${fmt0(lo)}%</text>`; }
  if (tp.length > 1) { const [lo, hi] = scale(tp, 2), p = path(tp, lo, hi), c = tempColor(tp[tp.length - 1][1]);
    out += `<defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".3"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
      <path d="${p.d} V${padT + H} H${X(tp[0][0])} Z" fill="url(#cg)"/><path d="${p.d}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>`;
    out += `<text class="ax" x="4" y="${padT + 8}">${fmt1(hi)}°</text><text class="ax" x="4" y="${padT + H}">${fmt1(lo)}°</text>`; }
  return out + `</svg>`;
}
// Кольцо ресурса расходника.
function ringSvg(p, color, size = 44) {
  const r = 18, C = 2 * Math.PI * r, v = clamp(p, 0, 1);
  return `<svg class="pr" width="${size}" height="${size}" viewBox="0 0 44 44"><circle cx="22" cy="22" r="${r}" fill="none" stroke="var(--ring-bg)" stroke-width="5"/>
    <circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(C * v).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 22 22)"/></svg>`;
}

Object.assign(HomePanelCard.prototype, {
  _openModal(type, arg) {
    if (type === "vacuum" && !this._vacWho) this._vacWho = this._v("input_select.fp_vacuum") || "Сухой";
    if (type === "events") this._logFilter = arg || "all";
    if (type === "media") this._ttsFocus = arg === "tts";
    this._modal = { type, arg };
    this._renderModal(true);
    if (type === "camera") setTimeout(() => this._refreshCam(true), 50);
    if (this._ttsFocus) setTimeout(() => this.shadowRoot.getElementById("tts-text")?.focus(), 80);
  },
  _closeModal() { this._modal = null; this._pending = null; this._renderModal(true); },

  _renderModal(force) {
    const host = this.shadowRoot.getElementById("modal");
    if (!this._modal) { if (host.innerHTML) host.innerHTML = ""; this._sigs.modal = null; return; }
    if (this._dragging && !force) return;
    const m = this._modal, fn = this[`m_${m.type}`];
    if (!fn) return;
    const sigFn = this[`ms_${m.type}`];
    const sig = (sigFn ? sigFn.call(this, m.arg) : Math.floor(Date.now() / 60000)) + "|" + m.type + "|" + m.arg + "|" + this._isDark();
    if (!force && sig === this._sigs.modal) return;
    this._sigs.modal = sig;
    const scroll = host.querySelector(".modal")?.scrollTop || 0;
    const ttsVal = this.shadowRoot.getElementById("tts-text")?.value;
    let res;
    try { res = fn.call(this, m.arg); } catch (e) { console.error("home-panel modal", e); res = { html: `<div class="empty">Ошибка: ${esc(e.message)}</div>` }; }
    const again = host.querySelector(".overlay");
    host.innerHTML = `<div class="overlay" style="${again ? "animation:none" : ""}"><div class="modal ${res.cls || ""}" style="${again ? "animation:none" : ""}">${res.html}</div></div>`;
    const md = host.querySelector(".modal"); if (md) md.scrollTop = scroll;
    if (ttsVal) { const i = this.shadowRoot.getElementById("tts-text"); if (i) i.value = ttsVal; }
  },
  _mh(icon, grad, title, sub) {
    return `<div class="mh"><div class="mi" style="background:${grad}">${ico(icon)}</div><div><h3>${title}</h3><div class="ms">${sub || ""}</div></div>
      <button class="x" data-act="close" title="Закрыть">${ico("close")}</button></div>`;
  },

  // ─── Подтверждение ───
  m_confirm(a) {
    // steps: [[значок, текст, "warn"?], ...] — список «что произойдёт» вместо одной фразы.
    const steps = a.steps ? `<ul class="csteps">${a.steps.map(([i, t, w]) => `<li class="${w || ""}">${ico(i)}<span>${esc(t)}</span></li>`).join("")}</ul>` : "";
    return { cls: "sm", html: `<div class="confirm">${this._mh(a.icon, a.grad || "linear-gradient(135deg,#a78bfa,#6366f1)", a.title || "Подтвердите", "")}
      ${steps || `<p>${esc(a.text)}</p>`}<div class="rowbtns"><button class="sbtn" data-act="no">Отмена</button><button class="sbtn pri" data-act="yes">${esc(a.ok)}</button></div></div>` };
  },

  // ─── Свет ───
  ms_lights() { return this._sig(ALL_LIGHTS); },
  m_lights() {
    const lit = this._lightsOn();
    const groups = ROOMS.filter((r) => r.lights?.length).map((r) => {
      const rows = r.lights.map((e) => this._lightRow(e)).join("");
      const on = this._lightsOn(r.lights).length;
      return `<div class="lgrp"><h4>${ico(r.icon)}${esc(r.name)}<span style="margin-left:auto;color:${on ? "var(--amber)" : "var(--sub)"};font-size:13px">${on ? `горит ${on}` : "выкл"}</span></h4>${rows}</div>`;
    }).join("");
    return { html: `${this._mh("lightbulb-group", "linear-gradient(135deg,#fde047,#f59e0b)", "Свет", lit.length ? `горит <b>${lit.length}</b> из ${ALL_LIGHTS.length}` : "везде выключено")}
      <div class="rowbtns" style="margin:-6px 0 18px"><button class="sbtn amber" data-act="allon">${ico("lightbulb-group")}Включить везде</button>
        <button class="sbtn" data-act="alloff">${ico("lightbulb-group-off-outline")}Выключить всё</button></div>
      <div class="lights">${groups}</div>` };
  },
  _lightRow(e) {
    const s = this._s(e); if (!s) return "";
    const on = s.state === "on", a = s.attributes, name = LIGHT_NAMES[e] || a.friendly_name;
    let ctl = "";
    if (on && e.startsWith("light.")) {
      const modes = a.supported_color_modes || [];
      const br = a.brightness != null ? Math.round((a.brightness / 255) * 100) : 100;
      if (modes.some((m) => m !== "onoff")) ctl += `<label>${ico("brightness-6")}<input type="range" min="1" max="100" value="${br}" data-in="bright" data-e="${e}" style="--p:${br}%;--rc:#f59e0b"><b style="min-width:30px;color:var(--text)">${br}</b></label>`;
      if (modes.includes("color_temp") && !modes.includes("rgb")) {
        const lo = a.min_color_temp_kelvin || 2700, hi = a.max_color_temp_kelvin || 6500, k = a.color_temp_kelvin || Math.round((lo + hi) / 2);
        ctl += `<label>${ico("thermometer")}<input type="range" min="${lo}" max="${hi}" step="100" value="${k}" data-in="ct" data-e="${e}" style="--p:${((k - lo) / (hi - lo)) * 100}%;--rc:#fde68a;background-image:linear-gradient(90deg,#ffb45a,#fff4e0,#cfe3ff);background-size:100% 100%"></label>`;
      }
      if (modes.includes("rgb") || modes.includes("hs")) {
        const sw = [["255,147,41", "#ff9329"], ["255,214,170", "#ffd6aa"], ["255,60,60", "#ff3c3c"], ["255,64,200", "#ff40c8"], ["140,80,255", "#8c50ff"], ["40,120,255", "#2878ff"], ["20,220,160", "#14dca0"]];
        ctl += `<div class="swatches">${sw.map(([rgb, c]) => `<button class="sw" style="background:${c}" data-act="swatch" data-e="${e}" data-rgb="${rgb}"></button>`).join("")}</div>`;
      }
    }
    return `<div class="lrow"><span class="ln">${esc(name)}</span><button class="tog ${on ? "on" : ""}" data-act="toggle" data-e="${e}" aria-label="${esc(name)}"></button></div>${ctl ? `<div class="lctl">${ctl}</div>` : ""}`;
  },

  // ─── Пылесосы ───
  ms_vacuum() { return this._sig([...Object.values(VAC).flatMap((v) => [v.entity, v.battery, v.status, v.progress, v.planRoom, v.map].filter(Boolean)),
    QREVO.mode, QREVO.water, S5_MODE, ...QREVO.parts.map((p) => p[0]), QREVO.waterShortage, QREVO.cleanBox, QREVO.dirtyBox, QREVO.totalArea], [...this._vacSel].join(",") + this._vacWho + this._vacView); },
  m_vacuum() {
    const who = this._vacWho || "Сухой", sel = VAC_ZONES.filter((z) => this._vacSel.has(z.id));
    const seg = (items, cur, act, color) => `<div class="seg" style="--sc:${color}">${items.map(([v, label, icon]) =>
      `<button class="${v === cur ? "act" : ""}" ${act(v)}>${icon ? ico(icon) : ""}${label}</button>`).join("")}</div>`;
    const robot = (v) => {
      const { st, text, detail } = this._vacStatus(v), bat = this._n(v.battery), room = this._vacRoomName(v);
      return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0">${robotSvg(v.color, bat, st === "cleaning", 58)}
        <div style="flex:1;min-width:0"><b>${v.title}</b> <span style="color:var(--sub);font-size:13px">${v.model}</span>
          <div style="font-size:13.5px;color:${["cleaning", "returning"].includes(st) ? v.color : "var(--sub)"};font-weight:700">${esc(text)}${st === "cleaning" && room ? " · " + esc(room) : ""}${detail && st !== "cleaning" ? " · " + esc(detail.toLowerCase()) : ""} · ${bat != null ? Math.round(bat) + "%" : "—"}</div></div>
        <div class="vb" style="display:flex;gap:6px">${st === "cleaning" || st === "paused" ? `<button class="sbtn" data-act="vac" data-v="${v.id}" data-c="play">${ico(st === "cleaning" ? "pause" : "play")}</button>` : ""}
          <button class="sbtn" data-act="vac" data-v="${v.id}" data-c="home" title="На базу">${ico("home-import-outline")}</button></div></div>`;
    };
    const mapPic = (id) => { const p = this._a(id, "entity_picture"); return p ? `<img src="${esc(this._url(p))}" style="width:100%;border-radius:16px;display:block;background:#0003" alt="">` : `<div class="empty">Карты нет</div>`; };
    const view = this._vacView;
    const left = `<div class="panel"><div class="tabs" style="margin-bottom:12px">
        <button class="tab ${view === "plan" ? "act" : ""}" data-act="vacview" data-v="plan">План</button>
        <button class="tab ${view === "q" ? "act" : ""}" data-act="vacview" data-v="q">Карта Qrevo</button>
        <button class="tab ${view === "s" ? "act" : ""}" data-act="vacview" data-v="s">Карта S5</button></div>
      ${view === "plan" ? renderPlan(this._hass, { mode: "select", selected: this._vacSel, who }) : view === "q" ? mapPic(VAC.qrevo.map) : mapPic(VAC.s5.map)}
      <div style="margin-top:10px">${robot(VAC.s5)}${robot(VAC.qrevo)}</div></div>`;
    let settings = "";
    if (who === "Сухой") {
      const cur = this._v(S5_MODE);
      settings = `<div class="ph">Мощность S5</div>${seg(Object.entries(S5_FAN).map(([k, v]) => [k, v]), cur, (k) => `data-act="select" data-e="${S5_MODE}" data-o="${k}"`, VAC.s5.color)}`;
    } else if (who === "Мокрый") {
      const mode = this._v(QREVO.mode), fan = this._a(VAC.qrevo.entity, "fan_speed"), water = this._v(QREVO.water);
      settings = `<div class="ph">Как убирать</div>${seg([["vacuum", "Пылесос", "robot-vacuum"], ["vac_and_mop", "Пылесос и швабра", "broom"], ["mop", "Только швабра", "water-outline"]], mode, (k) => `data-act="select" data-e="${QREVO.mode}" data-o="${k}"`, VAC.qrevo.color)}
        <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:12px;margin-top:14px">
          <div><div class="ph">Мощность</div>${seg(["quiet", "balanced", "turbo", "max"].map((k) => [k, QREVO_FAN[k]]), fan, (k) => `data-act="fan" data-e="${VAC.qrevo.entity}" data-o="${k}"`, VAC.qrevo.color)}</div>
          <div><div class="ph">Вода</div>${seg(["low", "medium", "high"].map((k) => [k, QREVO_WATER[k]]), water, (k) => `data-act="select" data-e="${QREVO.water}" data-o="${k}"`, "#38bdf8")}</div></div>`;
    } else settings = `<div class="hi" style="background:transparent;padding:0;color:var(--sub);font-weight:500;white-space:normal">${ico("information-outline")}<span>Сначала S5 пылесосит выбранные комнаты, после его возвращения на базу Qrevo моет их же в режиме «только швабра», затем режим Qrevo возвращается прежний.</span></div>`;
    const right = `<div class="panel"><div class="ph">Комнаты <span class="r">${sel.length} из ${VAC_ZONES.length}
        <button class="sbtn" style="height:32px;margin-left:8px" data-act="${sel.length === VAC_ZONES.length ? "vacnone" : "vacall"}">${sel.length === VAC_ZONES.length ? "Сбросить" : "Все"}</button></span></div>
      <div class="chips">${VAC_ZONES.map((z) => `<button class="zc ${this._vacSel.has(z.id) ? "act" : ""}" data-act="zone" data-zone="${z.id}"><span class="zi">${ico(z.icon)}</span>${esc(z.name)}<span class="ck">${this._vacSel.has(z.id) ? ico("check") : ""}</span></button>`).join("")}</div></div>
      <div class="panel"><div class="ph">Кто убирает</div>
        ${seg([["Сухой", "Сухой · S5", "robot-vacuum"], ["Мокрый", "Мокрый · Qrevo", "water"], ["Вместе", "Сначала сухой, потом мокрый", "robot-vacuum-variant"]], who, (k) => `data-act="who" data-w="${k}"`, "#a78bfa")}
        <div style="margin-top:14px">${settings}</div></div>
      <div class="panel" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="flex:1;min-width:180px"><div class="ph" style="margin:0 0 4px">Готово к уборке</div>
          <div style="font-weight:800;font-size:17px">${sel.length ? esc(sel.map((z) => z.name).join(", ")) : "Выберите комнаты на плане или списком"}</div>
          <div style="color:var(--sub);font-size:13.5px">${who === "Сухой" ? "Roborock S5, пылесос" : who === "Мокрый" ? `Roborock Qrevo · ${QREVO_MODE[this._v(QREVO.mode)] || ""}` : "S5, затем Qrevo"}</div></div>
        <button class="bigbtn" style="width:auto;padding:0 26px;margin:0" data-act="vacgo" ${sel.length ? "" : "disabled"}>${ico("play")}Убрать ${sel.length ? sel.length + " " + plural(sel.length, ["комнату", "комнаты", "комнат"]) : ""}</button></div>`;
    // Станция Qrevo, расходники, итоги.
    const parts = QREVO.parts.filter(([e]) => this._s(e)).map(([e, n, max, icon]) => {
      const hrs = this._n(e), p = hrs == null ? 0 : hrs / max, c = hrs == null ? "var(--faint)" : hrs <= 0 ? "#f87171" : p < 0.15 ? "#fbbf24" : "#34d399";
      return `<div class="part">${ringSvg(p, c)}<div><b>${hrs == null ? "—" : hrs <= 0 ? "Пора" : fmt0(hrs) + " ч"}</b><small>${n}</small></div></div>`;
    }).join("");
    const dock = [[QREVO.waterShortage, "Нехватка воды", "water-off"], [QREVO.cleanBox, "Бак чистой воды", "cup-water"], [QREVO.dirtyBox, "Бак грязной воды", "delete-variant"]]
      .filter(([e]) => this._on(e)).map(([, n, i]) => `<div class="hi bad">${ico(i)}<span class="grow">${n}</span></div>`).join("");
    const lastEnd = Date.parse(this._v(QREVO.lastEnd));
    const bottom = `<div class="mcols" style="margin-top:20px"><div class="panel"><div class="ph">Qrevo: ресурс расходников</div><div class="parts">${parts}</div>${dock ? `<div class="hl" style="margin-top:10px">${dock}</div>` : ""}</div>
      <div><div class="panel"><div class="ph">Qrevo за всё время</div><div class="kv">
        <div class="stat"><div class="k">Уборок</div><div class="v">${fmt0(this._n(QREVO.totalCount))}</div></div>
        <div class="stat"><div class="k">Площадь</div><div class="v">${this._n(QREVO.totalArea) != null ? Math.round(this._n(QREVO.totalArea) / 1000) + "<small> тыс. м²</small>" : "—"}</div></div>
        <div class="stat"><div class="k">Часов</div><div class="v">${fmt0(this._n(QREVO.totalTime))}</div></div></div>
        ${!isNaN(lastEnd) ? `<div style="color:var(--sub);font-size:13px;margin-top:10px">Последняя уборка закончилась ${ago(lastEnd)}</div>` : ""}</div>
      <div class="panel"><div class="ph">Сценарии Roborock</div><div class="rowbtns">${QREVO.routines.filter(([e]) => this._s(e)).map(([e, n]) => `<button class="sbtn" data-act="press" data-e="${e}" data-n="${esc(n)}">${ico("play-circle-outline")}${esc(n)}</button>`).join("")}</div></div></div></div>`;
    return { html: `${this._mh("robot-vacuum", "linear-gradient(135deg,#c4b5fd,#7c3aed)", "Уборка", `S5 ${this._vacStatus(VAC.s5).text.toLowerCase()} · Qrevo ${this._vacStatus(VAC.qrevo).text.toLowerCase()}`)}
      <div class="mcols"><div>${left}</div><div>${right}</div></div>${bottom}` };
  },

  // ─── Комната ───
  ms_room(id) { const r = ROOM[id]; return this._sig([r.temp, r.hum, ...(r.lights || []), ...(r.motion || []), ...(r.media || []), r.problem, r.door].filter(Boolean), (this._hist[r.temp]?.length || 0) + "|" + Math.floor(Date.now() / 60000)); },
  m_room(id) {
    const r = ROOM[id]; if (!r) return { html: "" };
    const t = r.temp ? this._n(r.temp) : null, hm = r.hum ? this._n(r.hum) : null, [cf, cls] = comfort(t, hm);
    const lm = this._lastMotion(r), mv = this._motionNow(r);
    const sub = [t != null ? `<span class="chip">${ico("thermometer")}${fmt1(t)}°</span>` : "", hm != null ? `<span class="chip">${ico("water-percent")}${fmt0(hm)}%</span>` : "",
      t != null ? `<span class="badge ${cls}">${cf}</span>` : "", lm ? `<span class="chip">${ico("motion-sensor")}${mv ? "движение сейчас" : "движение " + ago(lm)}</span>` : ""].join("");
    const chart = r.temp ? `<div class="panel"><div class="ph">За сутки <span class="r"><span style="color:${tempColor(t)}">━ температура</span> · <span style="color:#38bdf8">┅ влажность</span></span></div>
      ${chartSvg((this._hist[r.temp] || []).concat(t != null ? [[Date.now(), t]] : []), (this._hist[r.hum] || []).concat(hm != null ? [[Date.now(), hm]] : []))}</div>` : "";
    const lights = r.lights?.length ? `<div class="panel"><div class="ph">Свет <span class="r"><button class="sbtn ${this._lightsOn(r.lights).length ? "" : "amber"}" style="height:34px" data-act="roomlights" data-room="${r.id}">${this._lightsOn(r.lights).length ? "Выключить" : "Включить"}</button></span></div>${r.lights.map((e) => this._lightRow(e)).join("")}</div>` : "";
    const sensors = [...(r.motion || []).map((m) => { const s = this._s(m); if (!s) return "";
        return `<div class="hi ${s.state === "on" ? "warn" : ""}">${ico("motion-sensor")}<span class="grow">${m.includes("stol") ? "Датчик у стола" : "Датчик движения"}</span><span class="v">${s.state === "on" ? "движение" : ago(Date.parse(s.last_changed))}</span></div>`; }),
      r.door ? `<div class="hi ${this._on(r.door) ? "bad" : "ok"}">${ico(this._on(r.door) ? "door-open" : "door-closed")}<span class="grow">Входная дверь</span><span class="v">${this._on(r.door) ? "открыта" : "закрыта"}</span></div>` : "",
      r.camera ? `<button class="hi" data-act="modal" data-m="camera">${ico("cctv")}<span class="grow">Камера C700</span><span class="v">${this._on(CAMERA_MOTION) ? "движение" : "смотрит"}</span></button>` : ""].join("");
    const media = (r.media || []).filter((e) => this._s(e)).map((e) => this._mediaRow(e)).join("");
    const clean = r.vac ? `<div class="panel"><div class="ph">Уборка</div><div class="rowbtns">
        <button class="sbtn" data-act="cleanroom" data-room="${r.id}" data-w="Сухой">${ico("robot-vacuum")}Пропылесосить</button>
        <button class="sbtn" data-act="cleanroom" data-room="${r.id}" data-w="Мокрый">${ico("water")}Помыть</button>
        <button class="sbtn pri" data-act="cleanroom" data-room="${r.id}" data-w="Вместе">${ico("robot-vacuum-variant")}Вместе</button></div></div>` : "";
    const probs = r.problem && this._on(r.problem) ? `<div class="panel"><div class="ph">Проблемы</div><div class="hi warn">${ico("alert-outline")}<span class="grow" style="white-space:normal">${esc(this._a(r.problem, "devices"))}</span></div></div>` : "";
    const grad = t != null ? `linear-gradient(135deg, ${tempColor(t)}, #6366f1)` : "linear-gradient(135deg,#94a3b8,#475569)";
    return { cls: "md", html: `${this._mh(r.icon, grad, esc(r.name), sub)}
      <div class="mcols" style="grid-template-columns:1.3fr 1fr"><div>${chart}${lights}</div>
      <div>${sensors ? `<div class="panel"><div class="ph">Датчики</div><div class="hl">${sensors}</div></div>` : ""}${media ? `<div class="panel"><div class="ph">Колонка</div>${media}</div>` : ""}${clean}${probs}</div></div>` };
  },

  _mediaRow(e) {
    const s = this._s(e); if (!s) return "";
    const a = s.attributes, st = STATIONS.find((x) => x[0] === e), play = s.state === "playing", vol = Math.round((a.volume_level ?? 0) * 100);
    const pic = a.entity_picture ? this._url(a.entity_picture) : "";
    return `<div class="mrow ${play ? "play" : ""}"><div class="art" style="${pic ? `background-image:url('${esc(pic)}')` : ""}">${pic ? "" : ico(play ? "music" : "speaker")}</div>
      <div class="mt">${esc(st ? st[1] : a.friendly_name)} <span style="color:var(--sub);font-weight:500;font-size:12.5px">· ${esc(ROOM[st?.[2]]?.name || "")}</span>
        <small>${play ? esc([a.media_title, a.media_artist].filter(Boolean).join(" — ") || "играет") : s.state === "unavailable" ? "нет связи" : a.media_title ? "пауза · " + esc(a.media_title) : "не играет"}</small></div>
      <div class="mc"><button data-act="media" data-e="${e}" data-c="prev">${ico("skip-previous")}</button><button data-act="media" data-e="${e}" data-c="pp" style="${play ? "background:linear-gradient(135deg,#f0abfc,#a855f7);color:#fff" : ""}">${ico(play ? "pause" : "play")}</button>
        <button data-act="media" data-e="${e}" data-c="next">${ico("skip-next")}</button></div>
      <div class="vol" style="grid-column:1/-1;margin-top:2px">${ico("volume-medium")}<input type="range" min="0" max="100" value="${vol}" data-in="vol" data-e="${e}" style="--p:${vol}%"><b style="min-width:30px;color:var(--text)">${vol}</b></div></div>`;
  },

  // ─── Музыка и объявления ───
  ms_media() { return this._sig(STATIONS.map((s) => s[0]), this._ttsMode || ""); },
  m_media() {
    const mode = this._ttsMode || "say";
    const opts = STATIONS.filter(([e]) => this._s(e)).map(([e, n, r]) => `<option value="${e}" ${e === (this._station()?.e) ? "selected" : ""}>${esc(n)} · ${esc(ROOM[r]?.name || "")}</option>`).join("");
    const phrases = mode === "say" ? ["Ужин готов!", "Пора спать", "Выхожу, буду через 20 минут", "Не забудьте ключи"] : ["включи музыку", "поставь будильник на 7 утра", "какая погода завтра", "включи радио"];
    return { cls: "md", html: `${this._mh("music", "linear-gradient(135deg,#f0abfc,#a855f7)", "Музыка и колонки", `${STATIONS.filter(([e]) => this._v(e) === "playing").length} из ${STATIONS.length} играют`)}
      <div class="panel"><div class="ph">${ico("bullhorn-outline")} Колонка скажет или сделает</div>
        <div class="seg" style="margin-bottom:10px;--sc:#f472b6"><button class="${mode === "say" ? "act" : ""}" data-act="ttsmode" data-m="say">${ico("account-voice")}Произнести текст</button>
          <button class="${mode === "cmd" ? "act" : ""}" data-act="ttsmode" data-m="cmd">${ico("microphone-message")}Команда Алисе</button></div>
        <div class="tts"><input id="tts-text" placeholder="${mode === "say" ? "Что сказать?" : "Например: включи музыку"}" autocomplete="off"><select id="tts-st">${opts}</select>
          <button class="sbtn pri" style="height:48px" data-act="tts">${ico("send")}</button></div>
        <div class="rowbtns" style="margin-top:10px">${phrases.map((p) => `<button class="st" data-act="phrase" data-t="${esc(p)}">${esc(p)}</button>`).join("")}</div></div>
      <div class="panel">${STATIONS.map(([e]) => this._mediaRow(e)).join("")}</div>` };
  },

  // ─── Камера ───
  ms_camera() { return this._sig([CAMERA_MOTION, DOOR, ...CAM_SWITCHES.map((s) => s[0])], this._log.length); },
  m_camera() {
    const alert = this._on(CAMERA_MOTION), url = this._camUrl();
    const ev = this._events("all", 400).filter((e) => e.icon === "cctv" || e.g === "door").slice(0, 12);
    return { html: `${this._mh("cctv", "linear-gradient(135deg,#67e8f9,#0284c7)", "Камера · Прихожая", alert ? `<span class="badge bad">движение сейчас</span>` : "Xiaomi C700 · смотрит на входную дверь")}
      <div class="cams"><div class="cam big ${alert ? "alert" : ""}">${url ? `<img id="camimg-big" src="${url}" alt="">` : `<div class="noimg">Камера недоступна</div>`}
          <div class="ov"><span class="tag rec"><i></i>LIVE</span>${this._on(DOOR) ? `<span class="tag alert">${ico("door-open")}Дверь открыта</span>` : ""}</div><div class="ts" id="camts-big"></div></div>
        <div><div class="panel"><div class="ph">Настройки камеры</div>${CAM_SWITCHES.filter(([e]) => this._s(e)).map(([e, n, i]) =>
            `<div class="lrow">${ico(i)}<span class="ln">${n}</span><button class="tog cy ${this._on(e) ? "on" : ""}" data-act="toggle" data-e="${e}"></button></div>`).join("")}</div>
          <div class="panel"><div class="ph">Последние события</div><div class="feed">${ev.length ? ev.map((e) => this._evRow(e)).join("") : `<div class="empty">Нет событий за 12 часов</div>`}</div></div></div></div>` };
  },

  // ─── Погода ───
  ms_weather() { return this._sig([WEATHER], this._forecast.hourly.length + "|" + this._forecast.daily.length); },
  m_weather() {
    const w = this._s(WEATHER); if (!w) return { html: this._mh("weather-cloudy", "#64748b", "Погода", "нет данных") };
    const a = w.attributes, hrs = this._forecast.hourly.slice(0, 24), days = this._forecast.daily.slice(0, 7);
    let chart = "";
    if (hrs.length > 1) {
      const W = 760, H = 170, pts = hrs.map((f) => [Date.parse(f.datetime), f.temperature]);
      const p = sparkPath(pts, W, H - 60, 24, 4);
      chart = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;overflow:visible">
        <defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fbbf24" stop-opacity=".35"/><stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></linearGradient></defs>
        <g transform="translate(0 30)"><path d="${p.area}" fill="url(#wg)"/><path d="${p.d}" fill="none" stroke="#fbbf24" stroke-width="2.5"/>
        ${hrs.map((f, i) => { const x = p.X(pts[i][0]), y = p.Y(pts[i][1]), hh = new Date(f.datetime).getHours();
          return i % 2 ? "" : `<text x="${x}" y="${y - 10}" text-anchor="middle" style="fill:var(--text);font-weight:800;font-size:13px">${fmt0(f.temperature)}°</text>
            <text x="${x}" y="${H - 34}" text-anchor="middle" style="fill:var(--sub);font-size:11.5px;font-weight:600">${pad2(hh)}:00</text>`; }).join("")}</g></svg>`;
    }
    const tmin = Math.min(...days.map((d) => d.templow ?? d.temperature)), tmax = Math.max(...days.map((d) => d.temperature));
    const rows = days.map((f, i) => { const d = new Date(f.datetime), lo = f.templow ?? f.temperature, hi = f.temperature;
      const L = ((lo - tmin) / (tmax - tmin || 1)) * 100, R = ((hi - tmin) / (tmax - tmin || 1)) * 100;
      return `<div style="display:grid;grid-template-columns:64px 40px 1fr 60px;gap:12px;align-items:center;padding:7px 0;border-bottom:1px dashed var(--line)">
        <b>${i === 0 ? "Сегодня" : WD[d.getDay()] + ", " + d.getDate()}</b>${weatherIcon(f.condition, 34)}
        <div style="display:flex;align-items:center;gap:10px"><span style="color:var(--sub);width:30px;text-align:right">${fmt0(lo)}°</span>
          <div class="bar" style="flex:1;position:relative"><i style="position:absolute;left:${L}%;width:${Math.max(4, R - L)}%;background:linear-gradient(90deg,${tempColor(lo)},${tempColor(hi)})"></i></div>
          <b style="width:30px">${fmt0(hi)}°</b></div>
        <span style="color:var(--blue);font-size:12.5px;font-weight:700;text-align:right">${f.precipitation ? fmt1(f.precipitation) + " мм" : ""}</span></div>`; }).join("");
    const wind = a.wind_speed != null ? a.wind_speed / 3.6 : null;
    return { cls: "md", html: `${this._mh("weather-partly-cloudy", "linear-gradient(135deg,#fde047,#38bdf8)", `${fmt0(a.temperature)}° · ${esc(COND[w.state] || w.state)}`, `${esc(a.friendly_name || "")} · ощущается ${fmt0(a.apparent_temperature)}°`)}
      <div class="legend" style="margin:-4px 0 16px"><span class="chip">${ico("water-percent")}${fmt0(a.humidity)}%</span>${wind != null ? `<span class="chip">${ico("weather-windy")}${fmt0(wind)} м/с ${a.wind_bearing != null ? WIND_DIR[Math.round(a.wind_bearing / 45) % 8] : ""}</span>` : ""}
        ${a.pressure ? `<span class="chip">${ico("gauge")}${Math.round(a.pressure * 0.750062)} мм рт. ст.</span>` : ""}${a.cloud_coverage != null ? `<span class="chip">${ico("cloud-outline")}облачность ${fmt0(a.cloud_coverage)}%</span>` : ""}
        ${this._v(SUN_SET) ? `<span class="chip">${ico("weather-sunset")}закат ${hhmm(new Date(this._v(SUN_SET)))}</span>` : ""}</div>
      ${chart ? `<div class="panel"><div class="ph">По часам</div>${chart}</div>` : ""}<div class="panel"><div class="ph">На неделю</div>${rows}</div>` };
  },

  // ─── Климат ───
  ms_climate() { return this._sig(ROOMS.flatMap((r) => [r.temp, r.hum]).filter(Boolean), Object.values(this._hist).reduce((s, a) => s + a.length, 0)); },
  m_climate() {
    const cards = ROOMS.filter((r) => r.temp).map((r) => { const t = this._n(r.temp), hm = this._n(r.hum), [cf, cls] = comfort(t, hm);
      return `<button class="panel" style="text-align:left;margin:0" data-act="room" data-room="${r.id}"><div class="ph" style="margin-bottom:4px">${ico(r.icon)} ${esc(r.name)} <span class="r"><span class="badge ${cls}">${cf}</span></span></div>
        <div style="display:flex;gap:14px;align-items:baseline"><b style="font-size:30px;color:${tempColor(t)}">${fmt1(t)}°</b><span style="color:var(--sub);font-weight:700">${fmt0(hm)}%</span></div>
        ${chartSvg((this._hist[r.temp] || []).concat([[Date.now(), t]]), (this._hist[r.hum] || []).concat([[Date.now(), hm]]), 420, 130)}</button>`; }).join("");
    const w = this._s(WEATHER);
    return { html: `${this._mh("home-thermometer-outline", "linear-gradient(135deg,#67e8f9,#84cc16)", "Климат", `в среднем ${fmt1(avg(ROOMS.map((r) => r.temp && this._n(r.temp))))}° · ${fmt0(avg(ROOMS.map((r) => r.hum && this._n(r.hum))))}% · на улице ${fmt0(w?.attributes.temperature)}°`)}
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:14px">${cards}</div>` };
  },

  // ─── Состояние ───
  ms_status() { return this._sig([DOOR, CAMERA_MOTION, ZIGBEE, BACKUP, QREVO.waterShortage], Object.values(this._hass.states).filter((s) => s.state === "unavailable").length); },
  m_status() {
    const is = this._issues(), b = Date.parse(this._v(BACKUP));
    const oks = [[!this._on(DOOR), "door-closed-lock", "Входная дверь закрыта"], [this._on(ZIGBEE), "zigbee", "Zigbee2MQTT на связи"],
      [!this._on(QREVO.waterShortage) && this._v(QREVO.error) === "none", "robot-vacuum", "Пылесосы без ошибок"],
      [!isNaN(b), "backup-restore", `Резервная копия ${isNaN(b) ? "" : ago(b)}`]].filter((x) => x[0]);
    return { cls: "md", html: `${this._mh(is.length ? "alert-circle-outline" : "shield-check-outline", is.length ? "linear-gradient(135deg,#fbbf24,#f97316)" : "linear-gradient(135deg,#6ee7b7,#10b981)",
        is.length ? `${is.length} ${plural(is.length, ["замечание", "замечания", "замечаний"])}` : "Всё в порядке", "устройства, датчики, пылесосы, резервные копии")}
      ${is.length ? `<div class="panel"><div class="ph">Требует внимания</div><div class="hl">${is.map((i) => `<div class="hi ${i.sev}">${ico(i.icon)}<span class="grow">${esc(i.text)}<small style="display:block;color:var(--sub);font-weight:500">${esc(i.sub)}</small></span></div>`).join("")}</div></div>` : ""}
      <div class="panel"><div class="ph">В порядке</div><div class="hl">${oks.map(([, i, t]) => `<div class="hi ok">${ico(i)}<span class="grow">${esc(t)}</span></div>`).join("")}</div></div>` };
  },

  // ─── События ───
  ms_events() { return `${this._log.length}|${this._logFilter}|${Math.floor(Date.now() / 60000)}`; },
  m_events() {
    const F = [["all", "Все"], ["motion", "Движение"], ["light", "Свет"], ["door", "Дверь"], ["vac", "Пылесосы"], ["media", "Музыка"]];
    const ev = this._events(this._logFilter, 300);
    let lastH = null, list = "";
    for (const e of ev) { const d = new Date(e.when), h = d.toDateString() + d.getHours();
      if (h !== lastH) { lastH = h; list += `<div class="ph" style="margin:14px 0 4px">${ago(e.when).startsWith("только") || ago(e.when).includes("минут") ? "Последний час" : `${pad2(d.getHours())}:00 – ${pad2(d.getHours())}:59`}</div>`; }
      list += this._evRow(e).replace(`<span class="ew">${agoShort(e.when)}</span>`, `<span class="ew">${hhmm(d)}</span>`); }
    return { cls: "md", html: `${this._mh("timeline-clock-outline", "linear-gradient(135deg,#38bdf8,#6366f1)", "События", `за 12 часов · ${ev.length}`)}
      <div class="filters">${F.map(([k, n]) => `<button class="lg ${this._logFilter === k ? "act" : ""}" data-act="filter" data-f="${k}">${n}</button>`).join("")}</div>
      <div class="feed">${list || `<div class="empty">Нет событий</div>`}</div>` };
  },
});
