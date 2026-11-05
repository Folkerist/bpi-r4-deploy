// ─── План квартиры (геометрия из floorplan/gen-floorplan.py) ──────────────────────────────────────────────────
const PLAN_VB = "80 465 440 395";
const PLAN_ROOMS = [
  ["balcony", "detskaia", "130,545 175,515 175,605 130,605", null, "Балкон"],
  ["kids", "detskaia", "175,512 300,512 300,615 175,615", [237, 563]],
  ["bath", "vannaia", "300,512 318,492 336,480 354,492 372,512 372,568 300,568", [336, 527]],
  ["corridor2", "koridor", "300,568 372,568 372,615 300,615", null],
  ["corridor", "koridor", "300,615 372,615 372,720 300,720", [336, 668]],
  ["bedroom", "spalnia", "372,512 505,512 505,615 372,615", [438, 563]],
  ["hall", "zal", "125,615 300,615 300,720 125,720", [212, 667]],
  ["kitchen", "kukhnia", "125,720 230,720 230,825 95,825 95,750", [158, 770]],
  ["storage", "kladovka", "230,775 285,775 285,825 230,825", [257, 805], "Кладовка"],
  ["wc", "tualet", "285,775 320,775 320,825 285,825", [302, 805], "WC"],
  ["entry", "prikhozhaia", "230,720 370,720 370,825 320,825 320,775 230,775", [345, 800]],
];
const PLAN_PTS = Object.fromEntries(PLAN_ROOMS.map((r) => [r[0], r[2]]));
const PLAN_WINDOWS = [[130, 560, 130, 595], [175, 548, 175, 600], [505, 535, 505, 590], [125, 640, 125, 695], [95, 760, 95, 815], [100, 745, 122, 724]];
const PLAN_OPENINGS = [
  ["door", "v", 300, 574, 598, 1, "a"], ["door", "v", 372, 574, 598, -1, "a"], ["door", "h", 568, 324, 348, -1, "b"],
  ["slide", "v", 300, 643, 687, 0, ""], ["door", "v", 230, 748, 772, -1, "a"], ["door", "h", 775, 260, 282, -1, "a"],
  ["door", "h", 775, 293, 313, -1, "a"], ["door", "h", 825, 336, 364, 1, "b"], ["door", "v", 175, 518, 540, 1, "a"],
  ["arch", "h", 615, 324, 372, 0, ""], ["arch", "h", 720, 327, 367, 0, ""], ["arch", "h", 720, 192, 215, 0, ""],
];
const PLAN_FIXTURES = `<rect class="fx" x="301" y="603" width="22" height="11" rx="1.5"/><rect class="fx" x="236" y="722" width="24" height="13" rx="1.5"/>
  <rect class="fx" x="260" y="722" width="24" height="13" rx="1.5"/><rect class="fx" x="304" y="518" width="17" height="44" rx="7"/>
  <ellipse class="fx" cx="358" cy="558" rx="5" ry="4"/>`;
// Что светится при включённом светильнике.
const KIT_TABLE = [195, 795];
const PLAN_LIGHTS = {
  "switch.light_bath": { fill: "bath" }, "switch.light_corridor": { fill: "corridor2" }, "switch.light_hall_main": { fill: "corridor" },
  "switch.light_hall_perimeter": { rect: [307, 622, 58, 91] }, "switch.light_entry_main": { fill: "entry" },
  "switch.light_entry_perimeter": { line: "237,727 363,727 363,818 327,818 327,768 237,768" }, "switch.light_wc": { fill: "wc" },
  "switch.light_storage": { fill: "storage" }, "switch.light_kitchen_perimeter": { fill: "kitchen", line: "130,727 223,727 223,818 102,818 102,754" },
  "switch.light_kitchen_main": { spot: KIT_TABLE }, "light.zal_yeelight_hall": { fill: "hall" }, "light.spalnia_yeelight_bed": { fill: "bedroom" },
  "light.zal_yeelight_hall_ambilight": { amb: "126,616 299,616 299,719 126,719" }, "light.spalnia_yeelight_bed_ambilight": { amb: "373,513 504,513 504,614 373,614" },
};
const PLAN_MOTION = {
  "binary_sensor.kukhnia_motion": { pts: "kitchen" }, "binary_sensor.kukhnia_stol_motion": { spot: [KIT_TABLE[0], KIT_TABLE[1], 22] },
  "binary_sensor.vannaia_motion": { pts: "bath" }, "binary_sensor.koridor_motion": { pts: "corridor" },
  "binary_sensor.tualet_motion": { pts: "wc" }, "binary_sensor.prikhozhaia_motion": { pts: "entry" },
};
const PLAN_SPEAKERS = { "media_player.yandex_station_u0086h0002ec9r": [140, 705], "media_player.yandex_tv_t60jcw202w4z1k": [158, 738],
  "media_player.yandex_station_x11bmg2000x29z": [492, 602], "media_player.yandex_station_m104q81001k74k": [287, 528],
  "media_player.yandex_station_lp00000000000047571100008ab064b1": [315, 745], "media_player.yandex_station_r10cv31007wqfn": [312, 552] };
// Зоны уборки на плане (как fp-vac-*.svg; у S5 «малый коридор» захватывает ванную).
const VAC_PTS = { kukhnia: PLAN_PTS.kitchen, koridor2: PLAN_PTS.corridor2, koridor: PLAN_PTS.corridor, spalnia: PLAN_PTS.bedroom,
  zal: PLAN_PTS.hall, detskaia: PLAN_PTS.kids, prokhod: "230,720 320,720 320,775 230,775", prikhozhaia: "320,720 370,720 370,825 320,825" };
const VAC_PTS_S5 = { ...VAC_PTS, koridor2: "300,512 318,492 336,480 354,492 372,512 372,615 300,615" };
const VAC_LABEL = { zal: [212, 700], kukhnia: [150, 800], spalnia: [438, 590], detskaia: [237, 590], koridor: [336, 690],
  koridor2: [336, 592], prokhod: [275, 752], prikhozhaia: [345, 790] };

function planDoors() {
  return PLAN_OPENINGS.map(([kind, o, c0, a, b, d, hg]) => {
    const P = (t) => (o === "v" ? [c0, t] : [t, c0]);
    const [x1, y1] = P(a), [x2, y2] = P(b), w = b - a;
    let s = `<line class="gap" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    if (kind === "door") {
      const [H, E] = hg === "a" ? [P(a), P(b)] : [P(b), P(a)];
      const O = o === "v" ? [H[0] + d * w, H[1]] : [H[0], H[1] + d * w];
      const cr = (O[0] - H[0]) * (E[1] - H[1]) - (O[1] - H[1]) * (E[0] - H[0]);
      s += `<path class="fx" d="M${H[0]} ${H[1]} L${O[0]} ${O[1]} A${w} ${w} 0 0 ${cr > 0 ? 1 : 0} ${E[0]} ${E[1]}"/>`;
    } else if (kind === "slide") {
      const m = (a + b) / 2;
      s += `<line class="fx" style="stroke-width:2" x1="${c0 - 2}" y1="${a}" x2="${c0 - 2}" y2="${m + 3}"/><line class="fx" style="stroke-width:2" x1="${c0 + 2}" y1="${m - 3}" x2="${c0 + 2}" y2="${b}"/>`;
    } else s += `<line class="fx" stroke-dasharray="3 3" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    return s;
  }).join("");
}
const PLAN_STATIC = (() => PLAN_WINDOWS.map(([a, b, c, d]) => `<line class="win" x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`).join("") + planDoors() + PLAN_FIXTURES)();

// opts: { mode: "live"|"select", layers:Set, selected:Set, who }
function renderPlan(hass, opts = {}) {
  const S = (id) => hass.states[id];
  const on = (id) => S(id)?.state === "on";
  const L = opts.layers || new Set(["light", "motion", "vac", "media", "heat"]);
  const select = opts.mode === "select";
  let base = "", over = "", labels = "";
  for (const [pid, rid, pts, lp, cap] of PLAN_ROOMS) {
    const room = ROOM[rid];
    const t = room?.temp ? parseFloat(S(room.temp)?.state) : NaN;
    const heat = !select && L.has("heat") && !isNaN(t) && pid !== "balcony" && pid !== "corridor2";
    const style = heat ? `style="fill:${tempColor(t)};fill-opacity:.13"` : pid === "balcony" ? `style="fill-opacity:.4"` : "";
    base += `<polygon class="room" points="${pts}" ${style} ${select ? "" : `data-act="room" data-room="${rid}"`}/>`;
    if (!lp) continue;
    const small = ["storage", "wc", "bath"].includes(pid);
    const name = cap || room?.name || "";
    if (select) continue;
    labels += `<text class="lbl" x="${lp[0]}" y="${lp[1] - (heat ? 4 : -3)}" font-size="${small ? 7.5 : pid === "entry" ? 9.5 : 11}" text-anchor="middle">${esc(name)}</text>`;
    if (heat) labels += `<text class="lbl2" x="${lp[0]}" y="${lp[1] + 9}" font-size="${small ? 7 : 9}" text-anchor="middle" style="fill:${tempColor(t)}">${fmt1(t)}°</text>`;
  }
  if (!select && L.has("light")) {
    for (const [e, g] of Object.entries(PLAN_LIGHTS)) {
      if (!on(e)) continue;
      if (g.fill) over += `<polygon class="light" points="${PLAN_PTS[g.fill]}"/>`;
      if (g.rect) over += `<rect class="light-line" x="${g.rect[0]}" y="${g.rect[1]}" width="${g.rect[2]}" height="${g.rect[3]}" rx="4"/>`;
      if (g.line) over += `<polygon class="light-line" points="${g.line}" stroke-linejoin="round"/>`;
      if (g.spot) over += `<circle class="light" cx="${g.spot[0]}" cy="${g.spot[1]}" r="24" style="stroke:none;fill-opacity:.3"/><circle class="light" cx="${g.spot[0]}" cy="${g.spot[1]}" r="11" style="fill-opacity:.55;stroke:none"/>`;
      if (g.amb) { const a = S(e).attributes || {}, c = a.rgb_color ? `rgb(${a.rgb_color.join(",")})` : "#f472b6";
        over += `<polygon class="light-line" points="${g.amb}" style="stroke:${c};stroke-width:3" stroke-linejoin="round"/>`; }
    }
  }
  if (!select && L.has("motion")) {
    for (const [e, g] of Object.entries(PLAN_MOTION)) {
      if (!on(e)) continue;
      over += g.pts ? `<polygon class="motion" points="${PLAN_PTS[g.pts]}"/>` : `<circle class="motion" cx="${g.spot[0]}" cy="${g.spot[1]}" r="${g.spot[2]}"/>`;
    }
    if (on(DOOR)) over += `<path class="door" d="M364 825 L364 853 A28 28 0 0 1 336 825 Z"/><line x1="364" y1="825" x2="364" y2="853" stroke="#f87171" stroke-width="3" stroke-linecap="round"/>`;
  }
  if (L.has("vac") || select) {
    for (const v of [VAC.qrevo, VAC.s5]) {
      const z = S(v.planRoom)?.state, pts = (v.id === "s5" ? VAC_PTS_S5 : VAC_PTS)[z];
      if (pts) over += `<polygon class="vac" points="${pts}" style="fill:${v.color};stroke:${v.color}"/>`;
    }
  }
  if (!select) {
    const camOn = on(CAMERA_MOTION);
    over += `<g class="cam ${camOn ? "alert" : ""}"><polygon class="fov" points="336,609 330,825 370,825"/>
      <circle cx="336" cy="609" r="4.5" fill="${camOn ? "#f87171" : "#38bdf8"}"/></g>`;
    if (L.has("media")) for (const [e, [x, y]] of Object.entries(PLAN_SPEAKERS)) {
      const p = S(e)?.state === "playing";
      over += `<g class="spk ${p ? "on" : ""}">${p ? [0, 0.8, 1.6].map((d) => `<circle class="ring" cx="${x}" cy="${y}" r="5" style="animation-delay:${d}s"/>`).join("") : ""}
        <circle class="c" cx="${x}" cy="${y}" r="3.6"/></g>`;
    }
  }
  if (select) {
    const pts = opts.who === "Сухой" ? VAC_PTS_S5 : VAC_PTS;
    for (const z of VAC_ZONES) {
      const sel = opts.selected?.has(z.id);
      over += `<polygon class="${sel ? "sel" : "zone"}" points="${pts[z.id]}" data-act="zone" data-zone="${z.id}"/>`;
      const [x, y] = VAC_LABEL[z.id];
      labels += `<text class="lbl" x="${x}" y="${y}" font-size="${z.id === "prikhozhaia" || z.id === "prokhod" || z.id === "koridor2" ? 7.5 : 10}" text-anchor="middle" style="${sel ? "fill:#fff" : ""}">${esc(z.name.replace("Малый коридор", "Мал. коридор"))}</text>`;
    }
  }
  return `<svg class="plan" viewBox="${PLAN_VB}" preserveAspectRatio="xMidYMid meet">
    <defs><filter id="hpGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${base}${PLAN_STATIC}${over}${labels}</svg>`;
}
