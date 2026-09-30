// Поддельный hass из снимка реального HA (snapshot.local.json, в git не попадает).
const q = new URLSearchParams(location.search);
const snap = await (await fetch("snapshot.local.json")).json();
const HA = "http://192.168.88.2:8123";
const states = Object.fromEntries(snap.states.map((s) => [s.entity_id, s]));
const entities = Object.fromEntries(snap.entities.map((e) => [e.entity_id, { entity_id: e.entity_id, device_id: e.device_id, area_id: e.area_id,
  hidden: !!e.hidden_by, entity_category: e.entity_category }]));
const devices = Object.fromEntries(snap.devices.map((d) => [d.id, d]));
const areas = Object.fromEntries(snap.areas.map((a) => [a.area_id, a]));
// Сценарии превью: ?demo=1 — включить свет, музыку, открыть дверь, запустить пылесос.
if (q.get("demo")) {
  const set = (id, st, attrs = {}) => { if (states[id]) states[id] = { ...states[id], state: st, last_changed: new Date().toISOString(), last_updated: new Date().toISOString(), attributes: { ...states[id].attributes, ...attrs } }; };
  ["switch.light_kitchen_main", "switch.light_kitchen_perimeter", "light.zal_yeelight_hall", "switch.light_hall_perimeter"].forEach((e) => set(e, "on", e.startsWith("light.") ? { brightness: 180, color_temp_kelvin: 3500, color_mode: "color_temp" } : {}));
  set("light.zal_yeelight_hall_ambilight", "on", { rgb_color: [140, 80, 255], brightness: 120, color_mode: "rgb" });
  set("media_player.yandex_station_x11bmg2000x29z", "playing", { media_title: "Nothing Else Matters", media_artist: "Metallica", volume_level: 0.35 });
  set("binary_sensor.kukhnia_motion", "on");
  set("vacuum.koridor_roborock_qrevo", "cleaning"); set("sensor.fp_vacuum_room", "kukhnia"); set("sensor.koridor_roborock_qrevo_cleaning_progress", "42");
  if (q.get("demo") === "2") { set("binary_sensor.e4aaec6dff8c_contact", "on"); set("sensor.fp_door_open_min", "4"); set("binary_sensor.c700_motion", "on"); }
}
const listeners = [];
const hass = {
  states, entities, devices, areas, user: snap.user, config: snap.config, language: "ru", locale: { language: "ru" },
  themes: { darkMode: (q.get("theme") || "dark") === "dark" },
  hassUrl: (p) => HA + p,
  callService(domain, service, data) {
    console.log("callService", domain, service, JSON.stringify(data));
    const ids = [].concat(data?.entity_id || []);
    for (const id of ids) { const s = states[id]; if (!s) continue;
      let st = s.state;
      if (service === "toggle") st = st === "on" ? "off" : "on"; else if (service === "turn_on") st = "on"; else if (service === "turn_off") st = "off";
      states[id] = { ...s, state: st, last_changed: new Date().toISOString(), last_updated: new Date().toISOString() }; }
    push(); return Promise.resolve();
  },
  callWS(msg) { if (msg.type === "history/history_during_period") return Promise.resolve(snap.history); return Promise.resolve(null); },
  connection: { subscribeMessage(cb, msg) {
    setTimeout(() => {
      if (msg.type === "weather/subscribe_forecast") cb(msg.forecast_type === "daily" ? snap.forecast_daily : snap.forecast_hourly);
      if (msg.type === "logbook/event_stream") cb({ events: snap.logbook });
    }, 30);
    return Promise.resolve(() => {});
  } },
};
function push() { el.hass = { ...hass, states: { ...states } }; }
await new Promise((r) => { const s = document.createElement("script"); s.src = "../home-panel.js?" + Date.now(); s.onload = r; document.head.append(s); });
const el = document.createElement("home-panel-card");
el.setConfig({}); document.body.append(el); push();
if (q.get("modal")) setTimeout(() => el._openModal(q.get("modal"), q.get("arg") || undefined), 400);
if (q.get("sel")) setTimeout(() => { q.get("sel").split(",").forEach((z) => el._vacSel.add(z)); el._renderModal(true); }, 600);
window.el = el;
