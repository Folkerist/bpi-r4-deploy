// Панель дома для Home Assistant. Собрано build.py из src/ — не править вручную.
(() => {
"use strict";
// ─── Ядро: конфигурация квартиры, форматирование, значки ────────────────────────────────────────────────────

const HP_VERSION = "4e099f8c";

// Комнаты: зона HA, что в ней есть, как она нарисована на плане и как её зовут пылесосы.
const ROOMS = [
  { id: "zal", area: "gostinaia", name: "Зал", icon: "sofa-outline", group: "live", plan: ["hall"],
    temp: "sensor.zal_temperature", hum: "sensor.zal_humidity",
    lights: ["light.zal_yeelight_hall", "light.zal_yeelight_hall_ambilight"],
    media: ["media_player.yandex_station_u0086h0002ec9r"], problem: "binary_sensor.fp_problem_gostinaia", vac: ["zal"] },
  { id: "kukhnia", area: "kukhnia", name: "Кухня", icon: "silverware-fork-knife", group: "live", plan: ["kitchen"],
    temp: "sensor.kukhnia_temperature", hum: "sensor.kukhnia_humidity",
    lights: ["switch.light_kitchen_main", "switch.light_kitchen_perimeter"],
    motion: ["binary_sensor.kukhnia_motion", "binary_sensor.kukhnia_stol_motion"],
    media: ["media_player.yandex_tv_t60jcw202w4z1k"], problem: "binary_sensor.fp_problem_kukhnia", vac: ["kukhnia"] },
  { id: "spalnia", area: "spalnia", name: "Спальня", icon: "bed-king-outline", group: "live", plan: ["bedroom"],
    temp: "sensor.spalnia_temperature", hum: "sensor.spalnia_humidity",
    lights: ["light.spalnia_yeelight_bed", "light.spalnia_yeelight_bed_ambilight"],
    media: ["media_player.yandex_station_x11bmg2000x29z"], problem: "binary_sensor.fp_problem_spalnia", vac: ["spalnia"] },
  { id: "detskaia", area: "detskaia", name: "Детская", icon: "teddy-bear", group: "live", plan: ["kids", "balcony"],
    temp: "sensor.detskaia_temperature", hum: "sensor.detskaia_humidity",
    media: ["media_player.yandex_station_m104q81001k74k"], problem: "binary_sensor.fp_problem_detskaia", vac: ["detskaia"] },
  { id: "prikhozhaia", area: "prikhozhaia", name: "Прихожая", icon: "door", group: "other", plan: ["entry"],
    lights: ["switch.light_entry_main", "switch.light_entry_perimeter"],
    motion: ["binary_sensor.prikhozhaia_motion"], door: "binary_sensor.e4aaec6dff8c_contact",
    media: ["media_player.yandex_station_lp00000000000047571100008ab064b1"], problem: "binary_sensor.fp_problem_prikhozhaia",
    vac: ["prikhozhaia", "prokhod"] },
  { id: "koridor", area: "koridor", name: "Коридор", icon: "shoe-print", group: "other", plan: ["corridor", "corridor2"],
    temp: "sensor.koridor_temperature", hum: "sensor.koridor_humidity",
    lights: ["switch.light_hall_main", "switch.light_hall_perimeter", "switch.light_corridor"],
    motion: ["binary_sensor.koridor_motion"], camera: "camera.c700", problem: "binary_sensor.fp_problem_koridor",
    vac: ["koridor", "koridor2"] },
  { id: "vannaia", area: "vannaia", name: "Ванная", icon: "shower-head", group: "other", plan: ["bath"],
    temp: "sensor.vannaia_temperature", hum: "sensor.vannaia_humidity", lights: ["switch.light_bath"],
    motion: ["binary_sensor.vannaia_motion"], media: ["media_player.yandex_station_r10cv31007wqfn"],
    problem: "binary_sensor.fp_problem_vannaia" },
  { id: "tualet", area: "tualet", name: "Туалет", icon: "toilet", group: "other", plan: ["wc"],
    lights: ["switch.light_wc"], motion: ["binary_sensor.tualet_motion"], problem: "binary_sensor.fp_problem_tualet" },
  { id: "kladovka", area: "kladovka", name: "Кладовка", icon: "archive-outline", group: "other", plan: ["storage"],
    lights: ["switch.light_storage"], problem: "binary_sensor.fp_problem_kladovka" },
];
const ROOM = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
const ALL_LIGHTS = ROOMS.flatMap((r) => r.lights || []);
const MAIN_LIGHTS = ALL_LIGHTS.filter((e) => !e.endsWith("_ambilight"));

// Имена светильников покороче, чем в HA.
const LIGHT_NAMES = {
  "light.zal_yeelight_hall": "Люстра", "light.zal_yeelight_hall_ambilight": "Подсветка",
  "switch.light_kitchen_main": "Над столом", "switch.light_kitchen_perimeter": "Подсветка",
  "light.spalnia_yeelight_bed": "Люстра", "light.spalnia_yeelight_bed_ambilight": "Подсветка",
  "switch.light_entry_main": "Люстра", "switch.light_entry_perimeter": "Подсветка",
  "switch.light_hall_main": "Люстра", "switch.light_hall_perimeter": "Подсветка", "switch.light_corridor": "Малый коридор",
  "switch.light_bath": "Свет", "switch.light_wc": "Свет", "switch.light_storage": "Свет",
};

// Зоны уборки (как в script.fp_vacuum_clean) и их контуры на плане.
const VAC_ZONES = [
  { id: "zal", name: "Зал", icon: "sofa-outline" },
  { id: "kukhnia", name: "Кухня", icon: "silverware-fork-knife" },
  { id: "spalnia", name: "Спальня", icon: "bed-king-outline" },
  { id: "detskaia", name: "Детская", icon: "teddy-bear" },
  { id: "prikhozhaia", name: "Прихожая", icon: "door" },
  { id: "koridor", name: "Коридор", icon: "shoe-print" },
  { id: "koridor2", name: "Малый коридор", icon: "shower-head" },
  { id: "prokhod", name: "Проход", icon: "arrow-left-right" },
];

const VAC = {
  qrevo: { id: "qrevo", entity: "vacuum.koridor_roborock_qrevo", who: "Мокрый", title: "Мокрый", model: "Roborock Qrevo",
    color: "#2dd4bf", battery: "sensor.koridor_roborock_qrevo_battery", room: "sensor.koridor_roborock_qrevo_current_room",
    status: "sensor.koridor_roborock_qrevo_status", progress: "sensor.koridor_roborock_qrevo_cleaning_progress",
    area: "sensor.koridor_roborock_qrevo_cleaning_area", time: "sensor.koridor_roborock_qrevo_cleaning_time",
    planRoom: "sensor.fp_vacuum_room", map: "image.koridor_roborock_qrevo_map_0" },
  s5: { id: "s5", entity: "vacuum.roborock_s5_8159_robot_cleaner", who: "Сухой", title: "Сухой", model: "Roborock S5",
    color: "#a78bfa", battery: "sensor.roborock_s5_8159_battery_level", status: "sensor.roborock_s5_8159_status",
    area: "sensor.roborock_s5_8159_props_clean_area", time: "sensor.roborock_s5_8159_props_clean_time",
    planRoom: "sensor.fp_vacuum2_room", map: "image.robot_pylesos_live_map" },
};
const QREVO = {
  mode: "select.koridor_roborock_qrevo_cleaning_mode", water: "select.koridor_roborock_qrevo_mop_intensity",
  mopMode: "select.koridor_roborock_qrevo_mop_mode", error: "sensor.koridor_roborock_qrevo_vacuum_error",
  dockError: "sensor.koridor_roborock_qrevo_dock_dock_error",
  waterShortage: "binary_sensor.koridor_roborock_qrevo_water_shortage",
  cleanBox: "binary_sensor.koridor_roborock_qrevo_dock_clean_water_box",
  dirtyBox: "binary_sensor.koridor_roborock_qrevo_dock_dirty_water_box",
  totalArea: "sensor.koridor_roborock_qrevo_total_cleaning_area", totalCount: "sensor.koridor_roborock_qrevo_total_cleaning_count",
  totalTime: "sensor.koridor_roborock_qrevo_total_cleaning_time", lastEnd: "sensor.koridor_roborock_qrevo_last_clean_end",
  parts: [
    ["sensor.koridor_roborock_qrevo_filter_time_left", "Фильтр", 150, "air-filter"],
    ["sensor.koridor_roborock_qrevo_main_brush_time_left", "Основная щётка", 300, "brush-variant"],
    ["sensor.koridor_roborock_qrevo_side_brush_time_left", "Боковая щётка", 200, "fan"],
    ["sensor.koridor_roborock_qrevo_sensor_time_left", "Датчики", 30, "eye-outline"],
    ["sensor.koridor_roborock_qrevo_dock_strainer_time_left", "Сито станции", 150, "filter-outline"],
  ],
  routines: [
    ["button.koridor_roborock_qrevo_utro", "Утро"],
    ["button.koridor_roborock_qrevo_sukhaia_zatem_vlazhnaia", "Сухая, затем влажная"],
    ["button.koridor_roborock_qrevo_pyl_potom_vlazhnaia", "Пыль, потом влажная"],
    ["button.koridor_roborock_qrevo_tualetp", "Туалет"],
  ],
};
const S5_MODE = "select.roborock_s5_8159_mode";

const WEATHER = "weather.pavshino";
const CAMERA = "camera.c700";
const CAMERA_MOTION = "binary_sensor.c700_motion";
const DOOR = "binary_sensor.e4aaec6dff8c_contact";
const DOOR_MIN = "sensor.fp_door_open_min";
const PERSON = "person.folk";
const TRACKERS = [["device_tracker.vivo_x200", "sensor.vivo_x200_battery_level", "Телефон", "cellphone"],
                  ["device_tracker.planshet", "sensor.planshet_battery_level", "Планшет", "tablet"]];
const SUN_RISE = "sensor.sun_next_rising";
const SUN_SET = "sensor.sun_next_setting";
const BACKUP = "sensor.backup_last_successful_automatic_backup";
const ZIGBEE = "binary_sensor.zigbee2mqtt_bridge_connection_state";
const CAM_SWITCHES = [["switch.chuangmi_81ac1_63f6_motion_detection", "Обнаружение движения", "motion-sensor"],
                      ["switch.chuangmi_81ac1_63f6_glimmer_full_color", "Цветная ночная съёмка", "weather-night"],
                      ["switch.chuangmi_81ac1_63f6_switch_status_2", "Индикатор на камере", "led-on"]];

const STATIONS = [
  ["media_player.yandex_station_x11bmg2000x29z", "Станция Макс", "spalnia"],
  ["media_player.yandex_station_u0086h0002ec9r", "Станция 2", "zal"],
  ["media_player.yandex_tv_t60jcw202w4z1k", "ТВ Станция", "kukhnia"],
  ["media_player.yandex_station_m104q81001k74k", "Станция Мини", "detskaia"],
  ["media_player.yandex_station_r10cv31007wqfn", "Станция Миди", "vannaia"],
  ["media_player.yandex_station_lp00000000000047571100008ab064b1", "Станция Лайт", "prikhozhaia"],
];

// Что попросить у Алисы: команды из справки Яндекса (alice.yandex.ru/support/ru/station/skills/).
// Кнопка отправляет фразу на выбранную колонку (play_media с типом command) — как будто её сказали вслух.
// plus — нужна опция «Алиса Плюс».
const ALICE = [
  { id: "music", name: "Музыка", icon: "music-circle-outline", color: "#f472b6", items: [
    ["Моя волна", "waves", "Включи мою волну"],
    ["Мои любимые", "heart-outline", "Включи мою музыку"],
    ["Что-то новое", "new-box", "Включи что-нибудь новенькое"],
    ["Популярное", "fire", "Запусти самое популярное"],
    ["Весёлое", "emoticon-happy-outline", "Включи радостное"],
    ["Спокойное", "leaf", "Включи спокойную музыку"],
    ["Для вечеринки", "party-popper", "Включи музыку для вечеринки"],
    ["Дискотека 80-х", "record-player", "Давай послушаем дискотеку 80-х"] ] },
  { id: "radio", name: "Радио", icon: "radio", color: "#fb923c", items: [
    ["Любое радио", "radio", "Включи радио"],
    ["Русское радио", "radio-tower", "Включи «Русское радио»"],
    ["Европа Плюс", "broadcast", "Включи «Европу Плюс»"],
    ["Ретро FM", "record-player", "Включи «Ретро FM»"],
    ["Авторадио", "car-side", "Включи «Авторадио»"],
    ["Маяк", "lighthouse", "Включи «Маяк»"],
    ["Радио JAZZ", "saxophone", "Поставь «Радио JAZZ»"],
    ["Детское радио", "teddy-bear", "Включи «Детское радио»"] ] },
  { id: "show", name: "Шоу и книги", icon: "microphone-variant", color: "#fbbf24", items: [
    ["Утреннее шоу", "weather-sunset-up", "Включи утреннее шоу"],
    ["Вечернее шоу", "weather-sunset-down", "Включи вечернее шоу"],
    ["Новости", "newspaper-variant-outline", "Расскажи новости"],
    ["Продолжить книгу", "book-open-page-variant-outline", "Продолжи аудиокнигу"],
    ["Подкаст", "podcast", "Включи подкаст"],
    ["Этот день в истории", "calendar-star", "Расскажи про этот день в истории"] ] },
  { id: "kids", name: "Детям", icon: "teddy-bear", color: "#34d399", items: [
    ["Сказка", "book-open-variant", "Расскажи сказку"],
    ["Детские песни", "music-box-outline", "Включи детские песни"],
    ["Колыбельная", "baby-face-outline", "Включи колыбельную"],
    ["Детское радио", "radio", "Включи «Детское радио»"],
    ["Зарядка", "run", "Давай сделаем зарядку", true],
    ["Игра 3–5 лет", "home-heart", "Хочу в домик", true],
    ["Игра 5–8 лет", "rocket-launch-outline", "Хочу всё знать", true],
    ["Пора спать", "bed-outline", "Мне пора спать", true] ] },
  { id: "games", name: "Игры", icon: "puzzle-outline", color: "#a78bfa", items: [
    ["Угадай животное", "paw", "Давай сыграем в «Угадай животное»"],
    ["Загадки", "head-question-outline", "Давай сыграем в загадки"],
    ["Угадай песню", "music-note-outline", "Давай сыграем в «Угадай песню»"],
    ["Города", "city-variant-outline", "Давай сыграем в города"],
    ["Верю — не верю", "scale-balance", "Давай сыграем в «Верю — не верю»"],
    ["Найди лишнее", "shape-outline", "Давай сыграем в «Найди лишнее»"],
    ["Угадай число", "numeric", "Давай сыграем в «Угадай число»"],
    ["Квест про космос", "rocket-outline", "Давай сыграем в квест про космос"] ] },
  { id: "sleep", name: "Сон и звуки", icon: "weather-night", color: "#60a5fa", items: [
    ["Шум дождя", "weather-pouring", "Включи шум дождя"],
    ["Шум океана", "waves", "Давай послушаем шум океана"],
    ["Пение птиц", "bird", "Поставь пение птиц"],
    ["Костёр", "campfire", "Включи звук костра"],
    ["Кот мурлычет", "cat", "Включи мурчание кота"],
    ["Белый шум", "blur", "Включи белый шум"],
    ["Выключить через 30 минут", "timer-sand", "Выключись через 30 минут"],
    ["Выключить через час", "timer-outline", "Выключись через час"] ] },
];
// Кнопка ▶ на молчащей колонке: если продолжать нечего — так.
const ALICE_DEFAULT = ["Моя волна", "Включи мою волну"];

// Кнопки-сценарии на главной: скрипты HA (router/homeassistant/scripts.yaml), в основе — сценарии «Дома с Алисой».
const SCENES = [
  { id: "leave", script: "script.home_leave", name: "Я ухожу", icon: "exit-run", grad: "linear-gradient(135deg,#fb923c,#f43f5e)",
    ok: "Да, ухожу", bye: "Хорошего дня! Свет и музыка выключены" },
  { id: "night", script: "script.home_night", name: "Спокойной ночи", icon: "weather-night", grad: "linear-gradient(135deg,#818cf8,#4338ca)",
    ok: "Спокойной ночи", bye: "Спокойной ночи! Всё выключено" },
  { id: "morning", script: "script.home_morning", name: "Утро", icon: "weather-sunset-up", grad: "linear-gradient(135deg,#fde047,#f59e0b)",
    ok: "Доброе утро", bye: "Доброе утро! Алиса включает утреннее шоу" },
];

// Сущности ленты событий.
const LOG_ENTITIES = [DOOR, CAMERA_MOTION, VAC.qrevo.entity, VAC.s5.entity,
  ...ROOMS.flatMap((r) => [...(r.motion || []), ...(r.lights || [])]), ...STATIONS.map((s) => s[0])];

const COND = {
  "clear-night": "Ясно", cloudy: "Облачно", exceptional: "Непогода", fog: "Туман", hail: "Град", lightning: "Гроза",
  "lightning-rainy": "Гроза с дождём", partlycloudy: "Переменная облачность", pouring: "Ливень", rainy: "Дождь",
  snowy: "Снег", "snowy-rainy": "Мокрый снег", sunny: "Ясно", windy: "Ветрено", "windy-variant": "Ветрено",
};
const VAC_STATE = { cleaning: "Убирает", docked: "На базе", returning: "Едет на базу", paused: "Пауза", idle: "Ждёт",
  error: "Ошибка", unavailable: "Нет связи", unknown: "—" };
const QREVO_STATUS = {
  washing_the_mop: "Моет швабру", going_to_wash_the_mop: "Едет мыть швабру", emptying_the_bin: "Выгружает пыль",
  charging: "Заряжается", charging_complete: "Заряжен", cleaning: "Убирает", segment_cleaning: "Убирает комнаты",
  returning_home: "Едет на базу", paused: "Пауза", idle: "Ждёт", mopping: "Моет пол", in_call: "На связи",
  drying: "Сушит швабру", air_drying_stopping: "Сушит швабру", updating: "Обновляется", locked: "Заблокирован",
  charging_problem: "Проблема с зарядкой", back_to_dock_washing_duster: "Едет мыть швабру",
};
const S5_STATUS = { charging: "Заряжается", sweeping: "Убирает", "go charging": "Едет на базу", idle: "Ждёт",
  paused: "Пауза", error: "Ошибка", "charging complete": "Заряжен" };
const QREVO_MODE = { vacuum: "Пылесос", vac_and_mop: "Пылесос и швабра", mop: "Только швабра", custom: "Своё",
  smart_mode: "Умный" };
const QREVO_FAN = { quiet: "Тихо", balanced: "Обычно", turbo: "Турбо", max: "Макс", max_plus: "Макс+" };
const QREVO_WATER = { off: "Без воды", low: "Мало", medium: "Средне", high: "Много" };
const S5_FAN = { Silent: "Тихо", Basic: "Обычно", Strong: "Сильно", "Full Speed": "Макс" };

// ─── Мелкие помощники ────────────────────────────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ico = (name, cls = "") => `<ha-icon class="${cls}" icon="mdi:${name}"></ha-icon>`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const plural = (n, f) => { n = Math.abs(n) % 100; const n1 = n % 10;
  return f[n > 10 && n < 20 ? 2 : n1 > 1 && n1 < 5 ? 1 : n1 === 1 ? 0 : 2]; };
const fmt1 = (v) => (v == null || isNaN(v) ? "—" : (Math.round(v * 10) / 10).toFixed(1).replace(".", ","));
const fmt0 = (v) => (v == null || isNaN(v) ? "—" : String(Math.round(v)));
const pad2 = (n) => String(n).padStart(2, "0");
const hhmm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const avg = (a) => { const v = a.filter((x) => x != null && !isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const WD = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const DATE_FMT = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" });

function ago(ts, now = Date.now()) {
  const s = Math.max(0, (now - ts) / 1000);
  if (s < 45) return "только что";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} ${plural(m, ["минуту", "минуты", "минут"])} назад`;
  const h = Math.round(m / 60);
  const d = new Date(ts), today = new Date(now);
  if (h < 12 && d.getDate() === today.getDate()) return `${h} ${plural(h, ["час", "часа", "часов"])} назад`;
  const y = new Date(now - 86400000);
  if (d.toDateString() === today.toDateString()) return `сегодня в ${hhmm(d)}`;
  if (d.toDateString() === y.toDateString()) return `вчера в ${hhmm(d)}`;
  return `${d.getDate()}.${pad2(d.getMonth() + 1)} в ${hhmm(d)}`;
}
const agoShort = (ts, now = Date.now()) => {
  const m = Math.floor(Math.max(0, now - ts) / 60000);
  if (m < 1) return "сейчас"; if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} ч`; return `${Math.floor(h / 24)} д`;
};

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : h < 23 ? "Добрый вечер" : "Доброй ночи";
}

// Комфорт: цвет температуры и подпись.
function tempColor(t) {
  if (t == null) return "var(--sub)";
  const stops = [[16, [96, 165, 250]], [20, [45, 212, 191]], [23, [132, 204, 22]], [25.5, [250, 204, 21]], [28, [249, 115, 22]], [31, [239, 68, 68]]];
  if (t <= stops[0][0]) return `rgb(${stops[0][1]})`;
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
    const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], k = (t - t0) / (t1 - t0);
    return `rgb(${c0.map((c, j) => Math.round(c + (c1[j] - c) * k)).join(",")})`;
  }
  return `rgb(${stops[stops.length - 1][1]})`;
}
function comfort(t, h) {
  if (h != null && h >= 70) return ["Влажно", "warn"];
  if (t != null && t >= 26) return ["Жарко", "warn"];
  if (t != null && t < 19) return ["Прохладно", "cold"];
  if (h != null && h < 30) return ["Сухо", "warn"];
  return ["Комфортно", "ok"];
}
const WIND_DIR = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];

// ─── Анимированные значки погоды (свои SVG) ────────────────────────────────────────────────────────────────
const W_SUN = (cx = 24, cy = 24, r = 8, rays = true) => `
  <g class="w-sun">${rays ? `<g class="w-rays" style="transform-origin:${cx}px ${cy}px">${[...Array(8)].map((_, i) => {
    const a = (i * Math.PI) / 4, x1 = cx + Math.cos(a) * (r + 4), y1 = cy + Math.sin(a) * (r + 4), x2 = cx + Math.cos(a) * (r + 8), y2 = cy + Math.sin(a) * (r + 8);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#fbbf24" stroke-width="2.6" stroke-linecap="round"/>`; }).join("")}</g>` : ""}
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#hpSunG)"/></g>`;
const W_MOON = `<path class="w-moon" d="M30 10a14 14 0 1 0 10 22A12 12 0 0 1 30 10z" fill="url(#hpMoonG)"/>`;
const W_CLOUD = (dx = 0, dy = 0, s = 1, cls = "w-cloud", fill = "url(#hpCloudG)") =>
  `<path class="${cls}" transform="translate(${dx} ${dy}) scale(${s})" d="M14 38h22a9 9 0 0 0 1.5-17.9A12 12 0 0 0 14.6 18 10 10 0 0 0 14 38z" fill="${fill}"/>`;
const W_DEFS = `<defs>
  <radialGradient id="hpSunG" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></radialGradient>
  <linearGradient id="hpMoonG" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fef9c3"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient>
  <linearGradient id="hpCloudG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient>
  <linearGradient id="hpDarkCloudG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#64748b"/></linearGradient>
</defs>`;
function weatherIcon(cond, size = 48, night = false) {
  const drops = (n, color, kind) => [...Array(n)].map((_, i) => {
    const x = 16 + i * 8, d = (i * 0.35).toFixed(2);
    return kind === "snow"
      ? `<circle class="w-flake" style="animation-delay:${d}s" cx="${x}" cy="40" r="1.8" fill="${color}"/>`
      : `<line class="w-drop" style="animation-delay:${d}s" x1="${x}" y1="39" x2="${x - 2}" y2="44" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;
  }).join("");
  let body;
  switch (cond) {
    case "sunny": body = W_SUN(24, 24, 9); break;
    case "clear-night": body = W_MOON + `<circle class="w-star" cx="10" cy="12" r="1.2" fill="#fef9c3"/><circle class="w-star" style="animation-delay:.8s" cx="40" cy="9" r="1" fill="#fef9c3"/>`; break;
    case "partlycloudy": body = (night ? `<g transform="translate(6 -4) scale(.75)">${W_MOON}</g>` : W_SUN(31, 15, 7)) + W_CLOUD(-2, 4, 1); break;
    case "cloudy": body = W_CLOUD(6, -2, 0.8, "w-cloud w-cloud2", "url(#hpDarkCloudG)") + W_CLOUD(-2, 4, 1); break;
    case "fog": body = W_CLOUD(0, -2, 1) + [0, 1, 2].map((i) => `<line class="w-fog" style="animation-delay:${i * .5}s" x1="${8 + i * 3}" y1="${40 + i * 3}" x2="${38 - i * 2}" y2="${40 + i * 3}" stroke="#94a3b8" stroke-width="2.4" stroke-linecap="round"/>`).join(""); break;
    case "rainy": body = W_CLOUD(0, -4, 1, "w-cloud", "url(#hpDarkCloudG)") + drops(3, "#60a5fa"); break;
    case "pouring": body = W_CLOUD(0, -4, 1, "w-cloud", "url(#hpDarkCloudG)") + drops(4, "#3b82f6"); break;
    case "snowy": body = W_CLOUD(0, -4, 1) + drops(3, "#e0f2fe", "snow"); break;
    case "snowy-rainy": body = W_CLOUD(0, -4, 1) + drops(2, "#60a5fa") + `<circle class="w-flake" cx="36" cy="40" r="1.8" fill="#e0f2fe"/>`; break;
    case "hail": body = W_CLOUD(0, -4, 1, "w-cloud", "url(#hpDarkCloudG)") + drops(3, "#e2e8f0", "snow"); break;
    case "lightning": case "lightning-rainy": body = W_CLOUD(0, -4, 1, "w-cloud", "url(#hpDarkCloudG)") +
      `<path class="w-bolt" d="M25 31l-5 8h5l-3 7 8-10h-5l3-5z" fill="#facc15"/>` + (cond === "lightning-rainy" ? drops(2, "#60a5fa") : ""); break;
    case "windy": case "windy-variant": body = [0, 1, 2].map((i) => `<path class="w-wind" style="animation-delay:${i * .4}s" d="M${6 + i * 2} ${16 + i * 9}h${24 - i * 4}a4 4 0 1 0-4-4" fill="none" stroke="#94a3b8" stroke-width="2.4" stroke-linecap="round"/>`).join(""); break;
    default: body = W_CLOUD(-2, 2, 1);
  }
  return `<svg class="wicon" width="${size}" height="${size}" viewBox="0 0 48 48">${W_DEFS}${body}</svg>`;
}

// Робот-пылесос сверху: корпус, лидар, кольцо батареи вокруг.
function robotSvg(color, battery, active, size = 92) {
  const r = 40, c = 2 * Math.PI * r, b = clamp(battery ?? 0, 0, 100);
  return `<svg class="robot ${active ? "is-active" : ""}" width="${size}" height="${size}" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--ring-bg)" stroke-width="5"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
      stroke-dasharray="${(c * b / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)" class="ring-prog"/>
    <g class="robot-body">
      <circle cx="50" cy="50" r="29" fill="var(--robot)" stroke="${color}" stroke-opacity=".5" stroke-width="1.5"/>
      <circle cx="50" cy="50" r="23" fill="none" stroke="var(--robot-line)" stroke-width="1"/>
      <circle cx="50" cy="42" r="7" fill="var(--robot-top)" stroke="${color}" stroke-width="1.5"/>
      <circle cx="50" cy="42" r="2.2" fill="${color}" class="lidar"/>
      <path d="M37 60 Q50 67 63 60" fill="none" stroke="var(--robot-line)" stroke-width="2" stroke-linecap="round"/>
    </g>
  </svg>`;
}

// Кривая по точкам [[t, v], ...] в прямоугольнике w×h.
function sparkPath(pts, w, h, pad = 2, minSpan = 1) {
  if (!pts || pts.length < 2) return null;
  const t0 = pts[0][0], t1 = pts[pts.length - 1][0] || t0 + 1;
  let lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
  if (hi - lo < minSpan) { const m = (hi + lo) / 2; lo = m - minSpan / 2; hi = m + minSpan / 2; }
  const X = (t) => pad + ((t - t0) / (t1 - t0 || 1)) * (w - 2 * pad), Y = (v) => h - pad - ((v - lo) / (hi - lo)) * (h - 2 * pad);
  let d = `M${X(pts[0][0]).toFixed(1)} ${Y(pts[0][1]).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [ta, va] = pts[i - 1], [tb, vb] = pts[i], xm = (X(ta) + X(tb)) / 2;
    d += ` C${xm.toFixed(1)} ${Y(va).toFixed(1)} ${xm.toFixed(1)} ${Y(vb).toFixed(1)} ${X(tb).toFixed(1)} ${Y(vb).toFixed(1)}`;
  }
  return { d, area: `${d} L${X(t1).toFixed(1)} ${h} L${X(t0).toFixed(1)} ${h} Z`, lo, hi, X, Y };
}

// ─── Стили ───────────────────────────────────────────────────────────────────────────────────────────────────
const HP_CSS = `
:host { display:block; --r:24px; --gap:18px; font-family:"Onest","Manrope",system-ui,-apple-system,"Segoe UI",sans-serif;
  -webkit-font-smoothing:antialiased; font-feature-settings:"tnum" 1; }
.root { --bg:#070b12; --bg2:#0c1220; --card:rgba(255,255,255,.045); --card-hi:rgba(255,255,255,.075); --line:rgba(255,255,255,.08);
  --line2:rgba(255,255,255,.14); --text:#eef2f8; --sub:#8a94a7; --faint:#566074; --ring-bg:rgba(255,255,255,.08);
  --tile:rgba(255,255,255,.035); --tile-hi:rgba(255,255,255,.07); --shadow:0 20px 60px -30px rgba(0,0,0,.8);
  --amber:#fbbf24; --amber2:#f59e0b; --cyan:#38bdf8; --teal:#2dd4bf; --violet:#a78bfa; --pink:#f472b6; --green:#34d399;
  --red:#f87171; --orange:#fb923c; --blue:#60a5fa; --robot:#1a2231; --robot-top:#232d3f; --robot-line:rgba(255,255,255,.18);
  --plan-bg:transparent; --plan-room:rgba(255,255,255,.045); --plan-wall:rgba(255,255,255,.22); --plan-sub:rgba(255,255,255,.28);
  --plan-text:#dfe6f1; --plan-win:#60a5fa; --glass-blur:18px; --overlay:rgba(3,6,12,.62); --modal:#0d1422f2; }
.root.light { --bg:#f3efe7; --bg2:#fbf8f2; --card:rgba(255,255,255,.72); --card-hi:#fff; --line:rgba(30,35,50,.08);
  --line2:rgba(30,35,50,.14); --text:#1b2130; --sub:#6b7385; --faint:#a3a9b6; --ring-bg:rgba(30,35,50,.08);
  --tile:rgba(30,35,50,.035); --tile-hi:rgba(30,35,50,.06); --shadow:0 18px 50px -30px rgba(40,40,60,.45);
  --robot:#eef1f6; --robot-top:#fff; --robot-line:rgba(30,35,50,.2); --plan-room:rgba(30,35,50,.045); --plan-wall:rgba(30,35,50,.22);
  --plan-sub:rgba(30,35,50,.3); --plan-text:#2a3140; --plan-win:#3b82f6; --overlay:rgba(40,40,50,.35); --modal:#fbf9f5f5; }
* { box-sizing:border-box; }
button { font:inherit; color:inherit; border:0; background:none; cursor:pointer; -webkit-tap-highlight-color:transparent; }
ha-icon { --mdc-icon-size:22px; display:inline-flex; }
.root { position:relative; min-height:100vh; color:var(--text); background:var(--bg); overflow:hidden; overflow:clip; padding:22px 26px 34px; }
.root::before { content:""; position:absolute; inset:-20%; pointer-events:none; z-index:0;
  background: radial-gradient(900px 600px at 12% -5%, rgba(251,191,36,.10), transparent 60%),
    radial-gradient(800px 700px at 100% 0%, rgba(167,139,250,.10), transparent 60%),
    radial-gradient(1000px 800px at 50% 120%, rgba(56,189,248,.08), transparent 60%); animation: drift 40s ease-in-out infinite alternate; }
.root.light::before { background: radial-gradient(900px 600px at 10% -5%, rgba(251,191,36,.18), transparent 60%),
    radial-gradient(800px 700px at 100% 0%, rgba(167,139,250,.12), transparent 60%),
    radial-gradient(1000px 800px at 50% 120%, rgba(45,212,191,.12), transparent 60%); }
@keyframes drift { to { transform: translate3d(3%, 2%, 0) scale(1.05); } }
.wrap { position:relative; z-index:1; max-width:1880px; margin:0 auto; }

/* ─ Шапка ─ */
header { display:flex; align-items:center; gap:14px; margin-bottom:20px; flex-wrap:wrap; }
.greet { flex:1 1 320px; min-width:0; }
.greet h1 { margin:0; font-size:clamp(26px,2.6vw,40px); font-weight:800; letter-spacing:-.02em; line-height:1.05; }
.greet h1 span { background:linear-gradient(90deg,var(--amber),var(--pink) 60%,var(--violet)); -webkit-background-clip:text; background-clip:text; color:transparent; }
.greet .date { color:var(--sub); font-size:15px; margin-top:6px; }
.pill { display:flex; align-items:center; gap:10px; height:54px; padding:0 18px; border-radius:18px; background:var(--card);
  border:1px solid var(--line); backdrop-filter:blur(var(--glass-blur)); -webkit-backdrop-filter:blur(var(--glass-blur));
  white-space:nowrap; font-weight:600; font-size:15px; transition:transform .2s, background .2s; }
button.pill:hover { background:var(--card-hi); transform:translateY(-1px); }
.pill .muted { color:var(--sub); font-weight:500; }
.people { display:flex; }
.av { width:34px; height:34px; border-radius:50%; display:grid; place-items:center; font-weight:800; font-size:14px; margin-left:-8px;
  border:2px solid var(--bg); position:relative; color:#fff; }
.av:first-child { margin-left:0; }
.av.away { filter:grayscale(1); opacity:.45; }
.av ha-icon { --mdc-icon-size:17px; }
.av .batt { position:absolute; bottom:-5px; right:-6px; font-size:9px; font-weight:800; background:var(--bg2); color:var(--text);
  border:1px solid var(--line2); border-radius:8px; padding:0 3px; line-height:13px; }
.dot { width:9px; height:9px; border-radius:50%; background:var(--green); box-shadow:0 0 0 4px rgba(52,211,153,.18); }
.dot.warn { background:var(--amber); box-shadow:0 0 0 4px rgba(251,191,36,.18); }
.dot.bad { background:var(--red); box-shadow:0 0 0 4px rgba(248,113,113,.2); animation:pulse 1.6s infinite; }
@keyframes pulse { 50% { box-shadow:0 0 0 8px rgba(248,113,113,0); } }
.clock { font-size:clamp(36px,3.6vw,56px); font-weight:800; letter-spacing:-.03em; line-height:1; padding:0 6px; }
.clock .sec { color:var(--faint); font-size:.45em; margin-left:2px; vertical-align:top; }
.iconbtn { width:54px; height:54px; border-radius:18px; display:grid; place-items:center; background:var(--card); border:1px solid var(--line);
  backdrop-filter:blur(var(--glass-blur)); transition:transform .25s, background .2s; }
.iconbtn:hover { background:var(--card-hi); transform:rotate(15deg); }

/* ─ Страницы (листаются вбок) ─ */
.pnav { position:sticky; top:calc(var(--header-height, 0px) + 8px); z-index:6; display:grid; grid-template-columns:repeat(var(--n),minmax(0,1fr));
  padding:5px; margin:0 auto 18px; max-width:820px; border-radius:20px; background:var(--card); border:1px solid var(--line);
  backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4); box-shadow:var(--shadow); }
.root:not(.light) .pnav { background:rgba(13,20,34,.78); } .root.light .pnav { background:rgba(251,248,242,.85); }
.pnav button { position:relative; z-index:1; height:46px; border-radius:15px; display:flex; align-items:center; justify-content:center; gap:8px;
  font-weight:700; font-size:14.5px; color:var(--sub); transition:color .25s; min-width:0; }
.pnav button span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pnav button ha-icon { --mdc-icon-size:20px; }
.pnav button.on { color:var(--text); } .pnav button.on ha-icon { color:var(--amber); }
.pnav .ind { position:absolute; top:5px; bottom:5px; left:5px; width:calc((100% - 10px) / var(--n)); border-radius:15px;
  background:var(--tile-hi); border:1px solid var(--line2); transform:translateX(calc(var(--x, 0) * 100%)); will-change:transform; }
.pages { --px:26px; display:flex; align-items:flex-start; overflow-x:auto; overflow-y:hidden; scroll-snap-type:x mandatory;
  overscroll-behavior-x:contain; scrollbar-width:none; margin:0 calc(-1 * var(--px)); scroll-margin-top:calc(var(--header-height, 0px) + 84px); }
.pages::-webkit-scrollbar { display:none; }
.page { flex:0 0 100%; min-width:0; scroll-snap-align:start; scroll-snap-stop:always; padding:0 var(--px) 30px;
  display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:var(--gap); align-items:start; }
.page.p-home { grid-template-columns:minmax(0,1.5fr) minmax(0,1fr); }
.page.p-flat { grid-template-columns:minmax(0,1.7fr) minmax(0,1fr); }
.page.p-music { grid-template-columns:minmax(0,1fr) minmax(0,1.5fr); }
.col { display:flex; flex-direction:column; gap:var(--gap); min-width:0; }
.hourly, .tabs { overscroll-behavior-x:contain; }
.card { min-width:0; position:relative; background:var(--card); border:1px solid var(--line); border-radius:var(--r); padding:20px;
  backdrop-filter:blur(var(--glass-blur)); -webkit-backdrop-filter:blur(var(--glass-blur)); box-shadow:var(--shadow);
  animation:rise .6s cubic-bezier(.2,.8,.2,1) both; }
.col:nth-child(2) .card { animation-delay:.06s }
@keyframes rise { from { opacity:0; transform:translateY(14px) scale(.99); } }
.card-h { display:flex; align-items:center; gap:10px; margin-bottom:14px; min-height:36px; }
.card-h h2 { margin:0; font-size:12.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--sub); font-weight:700; }
.card-h .meta { color:var(--sub); font-size:13.5px; margin-left:auto; text-align:right; }
.card-h .meta b { color:var(--text); font-weight:700; }
.card-h .go { width:36px; height:36px; border-radius:12px; display:grid; place-items:center; background:var(--tile-hi); border:1px solid var(--line);
  transition:background .2s, transform .2s; flex:none; }
.card-h .go:hover { transform:translateX(2px); background:var(--line2); }
.card-h .go ha-icon { --mdc-icon-size:18px; }
.accent-amber { color:var(--amber); } .accent-cyan { color:var(--cyan); } .accent-red { color:var(--red); } .accent-green { color:var(--green); }

/* ─ Хаб «Дом сейчас» ─ */
.hub { position:relative; height:330px; }
.hub svg.links { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
.hub .flow { fill:none; stroke-width:2.5; stroke-linecap:round; stroke-dasharray:4 9; opacity:.25; }
.hub .flow.on { opacity:1; animation:flow 1.1s linear infinite; }
@keyframes flow { to { stroke-dashoffset:-26; } }
.node { position:absolute; transform:translate(-50%,-50%); display:flex; flex-direction:column; align-items:center; gap:5px; text-align:center; }
.node .disc { width:78px; height:78px; border-radius:50%; display:grid; place-items:center; background:var(--bg2); border:2px solid var(--line2);
  position:relative; transition:box-shadow .4s, border-color .4s; }
.node .disc ha-icon { position:absolute; top:10px; --mdc-icon-size:17px; color:var(--sub); }
.node .disc b { font-size:21px; font-weight:800; margin-top:12px; }
.node .disc b small { font-size:12px; color:var(--sub); font-weight:600; }
.node .lbl { font-size:11px; letter-spacing:.12em; color:var(--sub); text-transform:uppercase; font-weight:700; }
.node .sub2 { font-size:12.5px; font-weight:600; max-width:120px; line-height:1.2; }
.node.center .disc { width:120px; height:120px; border:0; background:radial-gradient(circle at 50% 35%, var(--bg2), var(--bg)); }
.node.center .disc b { font-size:34px; margin-top:8px; letter-spacing:-.02em; }
.node.center .disc .ring { position:absolute; inset:-6px; }
.node.center .disc ha-icon { top:18px; }
.node.center .disc .cap { position:absolute; bottom:22px; font-size:10.5px; letter-spacing:.14em; color:var(--sub); font-weight:700; }
.node.glow-amber .disc { border-color:var(--amber); box-shadow:0 0 30px -6px rgba(251,191,36,.6); }
.node.glow-amber .disc ha-icon { color:var(--amber); }
.node.glow-cyan .disc { border-color:var(--cyan); box-shadow:0 0 30px -6px rgba(56,189,248,.55); }
.node.glow-cyan .disc ha-icon { color:var(--cyan); }
.node.glow-red .disc { border-color:var(--red); box-shadow:0 0 30px -4px rgba(248,113,113,.7); animation:pulse 1.6s infinite; }
.node.glow-teal .disc { border-color:var(--teal); }
.node.glow-teal .disc ha-icon { color:var(--teal); }
.stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:12px; }
.stat { background:var(--tile); border:1px solid var(--line); border-radius:16px; padding:10px 12px; min-width:0; }
.stat .k { white-space:nowrap; font-size:10.5px; letter-spacing:.12em; color:var(--sub); text-transform:uppercase; font-weight:700; }
.stat .v { font-size:19px; font-weight:800; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.stat .v small { font-size:12px; color:var(--sub); font-weight:600; }
.stat .s { font-size:12px; color:var(--sub); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* ─ Погода ─ */
.wx-now { display:flex; align-items:center; gap:14px; }
.wx-now .t { font-size:64px; font-weight:800; letter-spacing:-.04em; line-height:.9; }
.wx-now .t sup { font-size:.4em; vertical-align:top; position:relative; top:.25em; }
.wx-now .c { font-weight:700; font-size:17px; } .wx-now .l { color:var(--sub); font-size:13.5px; margin-top:3px; }
.wx-now .side { margin-left:auto; display:flex; flex-direction:column; gap:7px; align-items:flex-end; }
.chip { display:inline-flex; align-items:center; gap:6px; padding:6px 11px; border-radius:12px; background:var(--tile-hi); border:1px solid var(--line);
  font-size:13px; font-weight:600; white-space:nowrap; }
.chip ha-icon { --mdc-icon-size:15px; color:var(--sub); }
.hourly { display:flex; gap:8px; overflow-x:auto; margin:16px -4px 0; padding:0 4px 4px; scrollbar-width:none; }
.hourly::-webkit-scrollbar { display:none; }
.hr { flex:0 0 58px; display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 0; border-radius:14px; background:var(--tile); font-size:12.5px; }
.hr .h { color:var(--sub); font-weight:600; } .hr b { font-size:14.5px; } .hr .p { color:var(--blue); font-size:11px; font-weight:700; min-height:13px; }
.daily { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; margin-top:10px; }
.dy { display:flex; flex-direction:column; align-items:center; gap:2px; padding:9px 2px; border-radius:14px; background:var(--tile); border:1px solid transparent; }
.dy.today { border-color:var(--line2); background:var(--tile-hi); }
.dy .d { font-size:12.5px; color:var(--sub); font-weight:700; } .dy b { font-size:15.5px; } .dy .lo { font-size:12px; color:var(--sub); }
.dy .p { font-size:10.5px; color:var(--blue); font-weight:700; min-height:12px; }
.root.light .wicon { filter:drop-shadow(0 1px 1.5px rgba(40,50,70,.35)); }
.wicon .w-rays { animation:spin 22s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.wicon .w-cloud { animation:float 6s ease-in-out infinite; } .wicon .w-cloud2 { animation-duration:8s; animation-direction:reverse; }
@keyframes float { 50% { transform:translateX(1.5px); } }
.wicon .w-drop { animation:drop 1.1s linear infinite; } @keyframes drop { from { transform:translateY(-4px); opacity:0 } 30% { opacity:1 } to { transform:translateY(5px); opacity:0 } }
.wicon .w-flake { animation:flake 2.2s linear infinite; } @keyframes flake { from { transform:translateY(-4px); opacity:0 } 30% { opacity:1 } to { transform:translate(1px,5px); opacity:0 } }
.wicon .w-bolt { animation:bolt 2.4s steps(1) infinite; } @keyframes bolt { 0%,40%,48%,100% { opacity:1 } 44%,52% { opacity:.15 } }
.wicon .w-star { animation:tw 2.4s ease-in-out infinite; } @keyframes tw { 50% { opacity:.2 } }
.wicon .w-fog, .wicon .w-wind { animation:fog 3s ease-in-out infinite; } @keyframes fog { 50% { transform:translateX(3px); opacity:.6 } }

/* ─ Климат ─ */
.clim { display:flex; flex-direction:column; gap:8px; }
.crow { display:grid; grid-template-columns:34px 1fr auto 96px; align-items:center; gap:12px; padding:9px 10px; border-radius:16px; background:var(--tile);
  border:1px solid transparent; text-align:left; width:100%; transition:background .2s, border-color .2s; }
.crow:hover { background:var(--tile-hi); border-color:var(--line); }
.crow .ic { width:34px; height:34px; border-radius:11px; display:grid; place-items:center; background:var(--tile-hi); }
.crow .ic ha-icon { --mdc-icon-size:18px; }
.crow .n { font-weight:700; font-size:14.5px; } .crow .n small { display:block; color:var(--sub); font-weight:500; font-size:12px; margin-top:1px; }
.crow .tv { text-align:right; } .crow .tv b { font-size:19px; font-weight:800; } .crow .tv small { display:block; color:var(--sub); font-size:12px; }
.spark { width:96px; height:36px; display:block; }
.badge { display:inline-flex; align-items:center; font-size:10.5px; font-weight:800; letter-spacing:.04em; padding:2px 7px; border-radius:8px;
  background:rgba(52,211,153,.14); color:var(--green); }
.badge.warn { background:rgba(251,191,36,.16); color:var(--amber); } .badge.cold { background:rgba(96,165,250,.16); color:var(--blue); }
.badge.bad { background:rgba(248,113,113,.16); color:var(--red); }

/* ─ Быстрые действия ─ */
.qa { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.qt { position:relative; display:flex; flex-direction:column; align-items:flex-start; gap:12px; min-height:128px; padding:16px; border-radius:20px;
  background:var(--tile); border:1px solid var(--line); text-align:left; overflow:hidden; transition:transform .25s cubic-bezier(.2,.8,.2,1), background .25s, border-color .25s, box-shadow .25s; }
.qt:hover { transform:translateY(-3px); background:var(--tile-hi); }
.qt:active { transform:scale(.97); }
.qt .qi { width:44px; height:44px; border-radius:14px; display:grid; place-items:center; background:var(--tile-hi); color:var(--sub); transition:all .3s; }
.qt .qn { font-weight:800; font-size:16px; line-height:1.15; } .qt .qs { color:var(--sub); font-size:13px; font-weight:600; margin-top:2px; }
.qt.on-amber { border-color:rgba(251,191,36,.55); background:linear-gradient(160deg,rgba(251,191,36,.16),rgba(251,191,36,.02)); box-shadow:0 10px 40px -18px rgba(251,191,36,.8); }
.qt.on-amber .qi { background:linear-gradient(135deg,#fde047,#f59e0b); color:#3b2600; box-shadow:0 6px 18px -4px rgba(245,158,11,.7); }
.qt.on-amber .qs { color:var(--amber); }
.qt.on-cyan { border-color:rgba(56,189,248,.5); background:linear-gradient(160deg,rgba(56,189,248,.16),rgba(56,189,248,.02)); box-shadow:0 10px 40px -18px rgba(56,189,248,.8); }
.qt.on-cyan .qi { background:linear-gradient(135deg,#67e8f9,#0ea5e9); color:#032033; } .qt.on-cyan .qs { color:var(--cyan); }
.qt.on-violet { border-color:rgba(167,139,250,.5); background:linear-gradient(160deg,rgba(167,139,250,.16),rgba(167,139,250,.02)); box-shadow:0 10px 40px -18px rgba(167,139,250,.8); }
.qt.on-violet .qi { background:linear-gradient(135deg,#c4b5fd,#8b5cf6); color:#1d0f3d; } .qt.on-violet .qs { color:var(--violet); }
.qt.on-pink { border-color:rgba(244,114,182,.5); background:linear-gradient(160deg,rgba(244,114,182,.16),rgba(244,114,182,.02)); box-shadow:0 10px 40px -18px rgba(244,114,182,.8); }
.qt.on-pink .qi { background:linear-gradient(135deg,#f9a8d4,#ec4899); color:#3b0521; } .qt.on-pink .qs { color:var(--pink); }
.qt.on-red { border-color:rgba(248,113,113,.6); background:linear-gradient(160deg,rgba(248,113,113,.2),rgba(248,113,113,.03)); }
.qt.on-red .qi { background:linear-gradient(135deg,#fca5a5,#ef4444); color:#3b0505; animation:pulse 1.6s infinite; } .qt.on-red .qs { color:var(--red); }
.qt.on-green .qi { background:linear-gradient(135deg,#6ee7b7,#10b981); color:#022c1d; }
.qt .corner { position:absolute; top:14px; right:14px; font-size:11px; font-weight:800; color:var(--sub); }

/* ─ Комнаты ─ */
.tabs { display:flex; gap:6px; padding:5px; border-radius:16px; background:var(--tile); border:1px solid var(--line); margin-bottom:14px; }
.tab { flex:1; height:42px; border-radius:12px; font-weight:700; font-size:14.5px; color:var(--sub); display:flex; align-items:center; justify-content:center; gap:8px; transition:all .25s; }
.tab.act { background:var(--card-hi); color:var(--text); box-shadow:0 4px 18px -8px rgba(0,0,0,.4); }
.tab .n { min-width:20px; height:20px; border-radius:10px; font-size:11.5px; display:grid; place-items:center; background:rgba(251,191,36,.22); color:var(--amber); padding:0 6px; }
.rooms { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
.rt { display:flex; align-items:center; gap:13px; padding:14px; border-radius:20px; background:var(--tile); border:1px solid var(--line); text-align:left;
  min-height:86px; transition:all .25s; position:relative; overflow:hidden; }
.rt:hover { background:var(--tile-hi); }
.rt .ri { width:46px; height:46px; border-radius:15px; display:grid; place-items:center; background:var(--tile-hi); flex:none; color:var(--sub); }
.rt .rn { font-weight:800; font-size:16px; } .rt .rs { color:var(--sub); font-size:13px; font-weight:600; margin-top:3px; line-height:1.45; }
.rt .rs ha-icon { vertical-align:-3px; }
.rt .rs .temp { font-weight:800; }
.rt .grow { flex:1; min-width:0; }
.rt .lb { width:46px; height:46px; border-radius:15px; display:grid; place-items:center; flex:none; background:var(--tile-hi); border:1px solid var(--line); color:var(--faint); transition:all .3s; }
.rt .lb:hover { transform:scale(1.06); }
.rt.lit { border-color:rgba(251,191,36,.5); background:linear-gradient(150deg,rgba(251,191,36,.14),rgba(251,191,36,.02)); }
.rt.lit .ri { color:var(--amber); background:rgba(251,191,36,.15); }
.rt.lit .lb { background:linear-gradient(135deg,#fde047,#f59e0b); color:#3b2600; border-color:transparent; box-shadow:0 8px 26px -6px rgba(245,158,11,.75); }
.rt .mv { position:absolute; top:12px; right:70px; width:8px; height:8px; border-radius:50%; background:var(--cyan); box-shadow:0 0 0 0 rgba(56,189,248,.6); animation:ping 1.6s infinite; }
@keyframes ping { 70% { box-shadow:0 0 0 9px rgba(56,189,248,0); } 100% { box-shadow:0 0 0 0 rgba(56,189,248,0); } }
.rt .warn { color:var(--amber); } .rt .warn ha-icon { --mdc-icon-size:15px; }
.rt .mus ha-icon { --mdc-icon-size:15px; color:var(--pink); }

/* ─ План ─ */
.plan-wrap { position:relative; }
.plan { width:100%; height:auto; display:block; }
.plan .room { fill:var(--plan-room); stroke:var(--plan-wall); stroke-width:3.5; stroke-linejoin:round; cursor:pointer; transition:fill .4s; }
.plan .room:hover { fill:var(--tile-hi); }
.plan .room.heat { stroke-width:3.5; }
.plan .lbl { fill:var(--plan-text); font-weight:700; pointer-events:none; }
.plan .lbl2 { fill:var(--plan-sub); font-weight:600; pointer-events:none; }
.plan .fx { fill:none; stroke:var(--plan-sub); stroke-width:1; pointer-events:none; }
.plan .win { stroke:var(--plan-win); stroke-width:3; stroke-linecap:round; }
.plan .gap { stroke:var(--bg2); stroke-width:5; }
.plan .light { fill:#fbbf24; fill-opacity:.32; stroke:#fbbf24; stroke-opacity:.7; stroke-width:2; pointer-events:none; animation:lampin .5s ease both; filter:url(#hpGlow); }
.plan .light-line { fill:none; stroke:#fcd34d; stroke-width:2; pointer-events:none; filter:url(#hpGlow); }
@keyframes lampin { from { opacity:0 } }
.plan .motion { fill:#38bdf8; fill-opacity:.12; stroke:#38bdf8; stroke-width:2.5; stroke-dasharray:8 4; pointer-events:none; animation:mot 1.6s ease-in-out infinite; }
@keyframes mot { 50% { opacity:.3 } }
.plan .vac { fill-opacity:.22; stroke-width:3; pointer-events:none; animation:mot 2s ease-in-out infinite; }
.plan .door { fill:#f87171; fill-opacity:.2; stroke:#f87171; stroke-width:2.5; pointer-events:none; animation:mot 1.2s ease-in-out infinite; }
.plan .spk { pointer-events:none; } .plan .spk .ring { fill:none; stroke:#f472b6; stroke-width:1.6; opacity:0; animation:spk 2.4s linear infinite; }
@keyframes spk { 0% { r:5; opacity:.9 } 100% { r:19; opacity:0 } }
.plan .spk .c { fill:var(--bg2); stroke:var(--plan-sub); stroke-width:1; } .plan .spk.on .c { fill:#f472b6; stroke:#f472b6; }
.plan .cam .fov { fill:#38bdf8; fill-opacity:.07; stroke:#38bdf8; stroke-opacity:.3; stroke-dasharray:3 3; }
.plan .cam.alert .fov { fill:#f87171; fill-opacity:.14; stroke:#f87171; stroke-opacity:.6; animation:mot 1s infinite; }
.plan .sel { fill:var(--violet); fill-opacity:.28; stroke:var(--violet); stroke-width:3; cursor:pointer; transition:fill-opacity .2s; }
.plan .zone { fill:transparent; stroke:transparent; stroke-width:3; cursor:pointer; }
.plan .zone:hover { fill:var(--violet); fill-opacity:.1; }
.legend { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
.lg { display:inline-flex; align-items:center; gap:7px; padding:6px 11px; border-radius:12px; font-size:12.5px; font-weight:700; background:var(--tile);
  border:1px solid var(--line); color:var(--sub); transition:all .2s; }
.lg i { width:10px; height:10px; border-radius:4px; }
.lg.act { color:var(--text); background:var(--tile-hi); border-color:var(--line2); }

/* ─ Пылесосы ─ */
.vacs { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.vc { display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px 12px 14px; border-radius:20px; background:var(--tile); border:1px solid var(--line); text-align:center; }
.vc .vn { font-weight:800; font-size:16px; } .vc .vm { font-size:12px; color:var(--sub); margin-top:-6px; }
.vc .vs { font-size:13px; font-weight:700; } .vc .vs.act { color:var(--c); }
.vc .vb { display:flex; gap:6px; margin-top:4px; }
.vc .vb button { width:40px; height:40px; border-radius:13px; display:grid; place-items:center; background:var(--tile-hi); border:1px solid var(--line); transition:all .2s; }
.vc .vb button:hover { background:var(--c); color:#0b1020; border-color:transparent; }
.vc .vb ha-icon { --mdc-icon-size:19px; }
.vc.act { border-color:color-mix(in srgb, var(--c) 55%, transparent); background:linear-gradient(160deg, color-mix(in srgb, var(--c) 16%, transparent), transparent); }
.robot.is-active .robot-body { animation:wob 3s ease-in-out infinite; transform-origin:50px 50px; }
@keyframes wob { 25% { transform:rotate(8deg) } 75% { transform:rotate(-8deg) } }
.robot .lidar { animation:tw 1.2s infinite; }
.bar { height:6px; border-radius:3px; background:var(--ring-bg); overflow:hidden; width:100%; }
.bar i { display:block; height:100%; border-radius:3px; background:var(--c, var(--teal)); transition:width .6s; }
.bigbtn { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; height:54px; border-radius:18px; margin-top:12px; font-weight:800; font-size:16px;
  background:linear-gradient(135deg,#a78bfa,#7c3aed); color:#fff; box-shadow:0 12px 34px -12px rgba(124,58,237,.9); transition:transform .2s, box-shadow .2s, opacity .2s; }
.bigbtn:hover { transform:translateY(-2px); box-shadow:0 16px 40px -12px rgba(124,58,237,1); }
.bigbtn:disabled { opacity:.4; transform:none; cursor:default; box-shadow:none; }
.bigbtn.ghost { background:var(--tile-hi); color:var(--text); box-shadow:none; border:1px solid var(--line); }

/* ─ Камера ─ */
.cam { position:relative; border-radius:18px; overflow:hidden; background:#000; aspect-ratio:16/9; cursor:pointer; }
.cam img { width:100%; height:100%; object-fit:cover; display:block; transition:opacity .4s; }
.cam .ov { position:absolute; left:12px; right:12px; top:12px; display:flex; gap:8px; align-items:center; }
.cam .tag { background:rgba(0,0,0,.55); color:#fff; backdrop-filter:blur(8px); border-radius:10px; padding:5px 10px; font-size:12.5px; font-weight:700; display:inline-flex; gap:6px; align-items:center; }
.cam .tag ha-icon { --mdc-icon-size:15px; }
.cam .tag.rec i { width:8px; height:8px; border-radius:50%; background:#ef4444; animation:tw 1s infinite; }
.cam .tag.alert { background:rgba(239,68,68,.85); }
.cam.alert { box-shadow:0 0 0 3px #ef4444, 0 0 40px -6px #ef4444; }
.cam .ts { position:absolute; right:12px; bottom:10px; color:#fff; font-size:12px; font-weight:600; text-shadow:0 1px 4px #000; }
.cam .noimg { position:absolute; inset:0; display:grid; place-items:center; color:#94a3b8; font-weight:600; }

/* ─ Музыка ─ */
.mus { display:flex; align-items:center; gap:18px; }
.disk { position:relative; width:118px; height:118px; flex:none; border-radius:50%; background:repeating-radial-gradient(circle, #111 0 2px, #1c1c24 2px 4px);
  display:grid; place-items:center; box-shadow:0 10px 40px -12px rgba(0,0,0,.8), inset 0 0 0 1px rgba(255,255,255,.06); }
.disk.spin { animation:spin 5s linear infinite; }
.disk .lab { width:50px; height:50px; border-radius:50%; background:linear-gradient(135deg,#f472b6,#8b5cf6); background-size:cover; background-position:center;
  box-shadow:0 0 0 3px #0b0b10; display:grid; place-items:center; color:#fff; }
.disk .lab ha-icon { --mdc-icon-size:22px; }
.mus .info { flex:1; min-width:0; }
.mus .tt { font-weight:800; font-size:18px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.mus .ar { color:var(--sub); font-size:13.5px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.mus .src { display:inline-flex; align-items:center; gap:6px; margin-top:9px; padding:6px 11px; border-radius:12px; background:rgba(244,114,182,.12); color:var(--pink); font-weight:700; font-size:13px; }
.mus .src ha-icon { --mdc-icon-size:15px; }
.ctrls { display:flex; align-items:center; gap:10px; margin-top:12px; }
.ctrls button { width:44px; height:44px; border-radius:50%; display:grid; place-items:center; background:var(--tile-hi); border:1px solid var(--line); transition:transform .2s; }
.ctrls button:hover { transform:scale(1.08); }
.ctrls button.play { width:58px; height:58px; background:linear-gradient(135deg,#f0abfc,#a855f7); color:#fff; border:0; box-shadow:0 10px 30px -8px rgba(168,85,247,.9); }
.ctrls button.play ha-icon { --mdc-icon-size:28px; }
.vol { display:flex; align-items:center; gap:10px; margin-top:14px; color:var(--sub); }
input[type=range] { -webkit-appearance:none; appearance:none; flex:1; height:6px; border-radius:3px; background:var(--ring-bg); outline:none; cursor:pointer;
  background-image:linear-gradient(90deg,var(--rc,#f472b6),var(--rc,#f472b6)); background-size:var(--p,50%) 100%; background-repeat:no-repeat; }
input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:20px; height:20px; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.4); border:3px solid var(--rc,#f472b6); }
input[type=range]::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:#fff; border:3px solid var(--rc,#f472b6); }
.stations { display:flex; gap:6px; flex-wrap:wrap; margin:0 0 18px; }
.where { color:var(--sub); font-size:12.5px; font-weight:700; margin:-4px 0 8px; }
.media .st { padding:9px 13px; font-size:14px; border-radius:13px; }
.ctrls button[disabled] { opacity:.35; cursor:default; transform:none; }
/* ─ Попросить Алису ─ */
.acats { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:6px; padding:5px; border-radius:18px; background:var(--tile); border:1px solid var(--line); margin-bottom:14px; }
.acats button { min-height:58px; border-radius:13px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:6px 4px;
  font-size:13px; font-weight:700; color:var(--sub); transition:all .2s; text-align:center; line-height:1.1; }
.acats button ha-icon { --mdc-icon-size:22px; }
.acats button.on { background:var(--card-hi); color:var(--text); box-shadow:inset 0 0 0 2px var(--ac); } .acats button.on ha-icon { color:var(--ac); }
.acmds { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.acmd { position:relative; display:flex; align-items:center; gap:12px; min-height:72px; padding:12px 14px; border-radius:18px; text-align:left;
  background:var(--tile); border:1px solid var(--line); transition:transform .15s, background .2s, border-color .2s; }
.acmd:hover { background:var(--tile-hi); border-color:var(--line2); } .acmd:active { transform:scale(.97); }
.acmd[disabled] { opacity:.4; cursor:default; }
.acmd .ai { flex:0 0 auto; width:46px; height:46px; border-radius:15px; display:grid; place-items:center; color:var(--ac);
  background:color-mix(in srgb, var(--ac) 16%, transparent); }
.acmd .ai ha-icon { --mdc-icon-size:24px; }
.acmd .at { min-width:0; display:flex; flex-direction:column; gap:3px; }
.acmd .at b { font-size:16px; font-weight:800; line-height:1.15; }
.acmd .at small { color:var(--sub); font-size:12.5px; font-weight:500; line-height:1.25; }
.acmd .plus { position:absolute; top:8px; right:10px; font-size:10px; font-weight:800; letter-spacing:.04em; color:var(--ac);
  background:color-mix(in srgb, var(--ac) 14%, transparent); border-radius:7px; padding:2px 6px; }
.ahint { display:flex; align-items:center; gap:8px; margin-top:14px; color:var(--sub); font-size:13px; line-height:1.35; }
.ahint ha-icon { --mdc-icon-size:18px; flex:0 0 auto; }
.st { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:11px; background:var(--tile); border:1px solid var(--line); font-size:12.5px; font-weight:700; color:var(--sub); }
.st i { width:7px; height:7px; border-radius:50%; background:var(--faint); }
.st.play i { background:var(--pink); box-shadow:0 0 0 3px rgba(244,114,182,.25); } .st.sel { color:var(--text); border-color:var(--line2); background:var(--tile-hi); }

/* ─ Лента событий ─ */
.feed { display:flex; flex-direction:column; }
.ev { display:grid; grid-template-columns:34px 1fr auto; gap:11px; align-items:center; padding:8px 0; border-bottom:1px dashed var(--line); }
.ev:last-child { border-bottom:0; }
.ev .ei { width:34px; height:34px; border-radius:11px; display:grid; place-items:center; background:var(--tile-hi); }
.ev .ei ha-icon { --mdc-icon-size:17px; }
.ev .et { font-size:14px; font-weight:600; line-height:1.25; } .ev .et small { display:block; color:var(--sub); font-weight:500; font-size:12px; }
.ev .ew { color:var(--sub); font-size:12px; font-weight:600; white-space:nowrap; }
.empty { color:var(--sub); font-size:14px; padding:14px 0; text-align:center; }

/* ─ Здоровье устройств ─ */
.hl { display:flex; flex-direction:column; gap:7px; }
.hi { display:flex; align-items:center; gap:10px; font-size:13.5px; font-weight:600; padding:8px 10px; border-radius:13px; background:var(--tile); }
.hi ha-icon { --mdc-icon-size:18px; } .hi .grow { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hi .v { font-weight:800; } .hi.bad ha-icon, .hi.bad .v { color:var(--red); } .hi.warn ha-icon, .hi.warn .v { color:var(--amber); } .hi.ok ha-icon { color:var(--green); }

/* ─ Окна ─ */
.overlay { position:fixed; inset:0; z-index:50; background:var(--overlay); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
  display:flex; align-items:center; justify-content:center; padding:24px; animation:fade .25s ease both; }
@keyframes fade { from { opacity:0 } }
.modal { position:relative; width:min(1180px,100%); max-height:calc(100vh - 48px); overflow:auto; background:var(--modal); border:1px solid var(--line2);
  border-radius:30px; padding:26px; box-shadow:0 40px 120px -30px rgba(0,0,0,.8); animation:pop .35s cubic-bezier(.2,.9,.25,1.05) both; scrollbar-width:thin; }
.modal.sm { width:min(520px,100%); } .modal.md { width:min(820px,100%); }
@keyframes pop { from { opacity:0; transform:translateY(20px) scale(.97) } }
.mh { display:flex; align-items:center; gap:16px; margin-bottom:20px; }
.mh .mi { width:60px; height:60px; border-radius:20px; display:grid; place-items:center; color:#fff; flex:none; }
.mh .mi ha-icon { --mdc-icon-size:30px; }
.mh h3 { margin:0; font-size:28px; font-weight:800; letter-spacing:-.02em; } .mh .ms { color:var(--sub); font-size:14.5px; margin-top:3px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.mh .x { margin-left:auto; width:48px; height:48px; border-radius:16px; display:grid; place-items:center; background:var(--tile-hi); border:1px solid var(--line); flex:none; }
.mh .x:hover { background:var(--line2); }
.mcols { display:grid; grid-template-columns:1fr 1.15fr; gap:20px; }
.panel { background:var(--tile); border:1px solid var(--line); border-radius:22px; padding:18px; }
.panel + .panel { margin-top:14px; }
.ph { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--sub); font-weight:700; margin:0 0 12px; display:flex; align-items:center; gap:8px; }
.ph .r { margin-left:auto; letter-spacing:0; text-transform:none; font-size:13px; }
.seg { display:flex; gap:6px; padding:5px; border-radius:16px; background:var(--tile); border:1px solid var(--line); }
.seg button { flex:1; min-height:48px; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; font-size:13.5px; font-weight:700; color:var(--sub); transition:all .2s; padding:4px; }
.seg button ha-icon { --mdc-icon-size:20px; }
.seg button.act { background:var(--card-hi); color:var(--text); box-shadow:inset 0 0 0 2px var(--sc,var(--violet)); }
.chips { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
.zc { position:relative; display:flex; flex-direction:column; align-items:flex-start; gap:10px; padding:12px; border-radius:16px; background:var(--tile); border:1px solid var(--line); font-weight:700; font-size:13.5px; text-align:left; min-height:84px; transition:all .2s; }
.zc .zi { width:34px; height:34px; border-radius:11px; display:grid; place-items:center; background:var(--tile-hi); color:var(--sub); }
.zc .zi ha-icon { --mdc-icon-size:18px; }
.zc .ck { position:absolute; top:10px; right:10px; width:20px; height:20px; border-radius:50%; border:2px solid var(--line2); display:grid; place-items:center; }
.zc.act { border-color:var(--violet); background:linear-gradient(150deg,rgba(167,139,250,.2),rgba(167,139,250,.03)); }
.zc.act .zi { background:linear-gradient(135deg,#c4b5fd,#8b5cf6); color:#fff; } .zc.act .ck { background:var(--violet); border-color:var(--violet); color:#fff; }
.zc .ck ha-icon { --mdc-icon-size:14px; }
.rowbtns { display:flex; gap:8px; flex-wrap:wrap; }
.sbtn { display:inline-flex; align-items:center; gap:8px; height:42px; padding:0 15px; border-radius:13px; background:var(--tile-hi); border:1px solid var(--line); font-weight:700; font-size:14px; transition:all .2s; }
.sbtn:hover { background:var(--line2); } .sbtn ha-icon { --mdc-icon-size:18px; }
.sbtn.pri { background:linear-gradient(135deg,#a78bfa,#7c3aed); color:#fff; border:0; }
.sbtn.amber { background:linear-gradient(135deg,#fde047,#f59e0b); color:#3b2600; border:0; }
.sbtn.danger { color:var(--red); }
.parts { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
.part { display:flex; align-items:center; gap:10px; padding:10px; border-radius:14px; background:var(--tile); }
.part .pr { flex:none; } .part b { display:block; font-size:15px; } .part small { color:var(--sub); font-size:12px; font-weight:600; }
.kv { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.kv .stat .v { font-size:22px; }
.lights { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:12px; }
.lgrp { background:var(--tile); border:1px solid var(--line); border-radius:20px; padding:14px; }
.lgrp h4 { margin:0 0 10px; display:flex; align-items:center; gap:8px; font-size:15px; } .lgrp h4 ha-icon { --mdc-icon-size:18px; color:var(--sub); }
.lrow { display:flex; align-items:center; gap:10px; padding:8px 4px; }
.lrow .ln { flex:1; font-weight:600; font-size:14px; }
.tog { width:52px; height:30px; border-radius:15px; background:var(--ring-bg); position:relative; transition:background .25s; flex:none; }
.tog::after { content:""; position:absolute; top:3px; left:3px; width:24px; height:24px; border-radius:50%; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,.35); transition:transform .25s cubic-bezier(.3,1.4,.5,1); }
.tog.on { background:linear-gradient(135deg,#fde047,#f59e0b); } .tog.on::after { transform:translateX(22px); }
.tog.on.cy { background:linear-gradient(135deg,#67e8f9,#0ea5e9); }
.lctl { display:flex; flex-direction:column; gap:8px; padding:0 4px 8px; }
.lctl label { display:flex; align-items:center; gap:10px; color:var(--sub); font-size:12.5px; font-weight:600; }
.lctl label ha-icon { --mdc-icon-size:17px; }
.swatches { display:flex; gap:8px; padding:4px; }
.sw { width:28px; height:28px; border-radius:50%; border:2px solid var(--line2); transition:transform .2s; } .sw:hover { transform:scale(1.15); }
.chart { width:100%; height:auto; display:block; }
.chart .ax { fill:var(--sub); font-size:11px; font-weight:600; }
.chart .gl { stroke:var(--line); stroke-dasharray:3 4; }
.cams { display:grid; grid-template-columns:1.7fr 1fr; gap:18px; }
.cam.big { aspect-ratio:16/9; cursor:default; }
.tts { display:flex; gap:8px; }
.tts input, .tts select { height:48px; border-radius:14px; border:1px solid var(--line2); background:var(--tile); color:var(--text); padding:0 14px; font:inherit; font-size:15px; outline:none; }
.tts input { flex:1; min-width:0; } .tts input:focus { border-color:var(--pink); }
.mrow { display:grid; grid-template-columns:42px 1fr auto; gap:12px; align-items:center; padding:12px; border-radius:18px; background:var(--tile); border:1px solid var(--line); }
.mrow + .mrow { margin-top:8px; }
.mrow .art { width:42px; height:42px; border-radius:12px; background:var(--tile-hi) center/cover; display:grid; place-items:center; color:var(--sub); }
.mrow .mt { font-weight:700; font-size:14.5px; } .mrow .mt small { display:block; color:var(--sub); font-size:12.5px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:320px; }
.mrow .mc { display:flex; gap:6px; align-items:center; }
.mrow .mc button { width:38px; height:38px; border-radius:12px; display:grid; place-items:center; background:var(--tile-hi); }
.mrow.play { border-color:rgba(244,114,182,.5); }
.mrow input[type=range] { grid-column:1/-1; }
.filters { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
.toast { position:fixed; left:50%; bottom:28px; transform:translateX(-50%); z-index:80; background:var(--modal); border:1px solid var(--line2); color:var(--text);
  border-radius:16px; padding:13px 18px; font-weight:700; font-size:14.5px; display:flex; gap:10px; align-items:center; box-shadow:0 20px 60px -20px rgba(0,0,0,.7);
  animation:toast 3.2s ease both; pointer-events:none; }
.toast ha-icon { color:var(--green); }
@keyframes toast { 0% { opacity:0; transform:translate(-50%,20px) } 10%,85% { opacity:1; transform:translate(-50%,0) } 100% { opacity:0; transform:translate(-50%,10px) } }
/* ─ Сценарии ─ */
.card.scenesc { padding:12px; }
.scenes { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.sc { position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:flex-start; gap:4px; min-height:118px; padding:14px 16px;
  border-radius:20px; text-align:left; background:var(--tile); border:1px solid var(--line); transition:transform .15s, background .2s; }
.sc::before { content:""; position:absolute; inset:0; background:var(--g); opacity:.12; transition:opacity .25s; pointer-events:none; }
.sc:hover::before { opacity:.2; } .sc:active { transform:scale(.97); }
.sc .si { width:48px; height:48px; border-radius:16px; display:grid; place-items:center; background:var(--g); color:#fff; margin-bottom:6px;
  box-shadow:0 10px 24px -12px rgba(0,0,0,.6); }
.sc .si ha-icon { --mdc-icon-size:26px; }
.sc .sn { font-size:17px; font-weight:800; line-height:1.15; }
.sc .ss { font-size:13px; font-weight:600; color:var(--sub); line-height:1.25; }
.sc.warn .ss { color:var(--red); }
.sc.run .si { animation:pulse 1.4s infinite; }
.csteps { list-style:none; margin:0 0 20px; padding:0; display:flex; flex-direction:column; gap:8px; }
.csteps li { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; background:var(--tile); font-size:15.5px; font-weight:600; line-height:1.3; }
.csteps li ha-icon { --mdc-icon-size:22px; color:var(--sub); flex:0 0 auto; }
.csteps li.warn { background:rgba(248,113,113,.12); color:var(--red); } .csteps li.warn ha-icon { color:var(--red); }
.confirm p { font-size:16px; color:var(--sub); margin:0 0 20px; line-height:1.5; }
.confirm .rowbtns { justify-content:flex-end; }

/* ─ Адаптив ─ */
@media (max-width:1000px) { .root { padding:16px 14px 28px; } .pages { --px:14px; } .page, .page[class] { grid-template-columns:minmax(0,1fr); }
  .col { display:contents; } .pnav { margin-bottom:14px; }
  .mcols, .cams { grid-template-columns:1fr; } .chips { grid-template-columns:repeat(2,1fr); } }
@media (max-width:640px) { .root { padding-bottom:calc(96px + env(safe-area-inset-bottom, 0px)); }
  .pnav { position:fixed; top:auto; left:8px; right:8px; bottom:calc(8px + env(safe-area-inset-bottom, 0px)); z-index:20; margin:0; max-width:none; border-radius:22px; }
  .pnav button { flex-direction:column; gap:3px; height:58px; font-size:12px; } .pnav button ha-icon { --mdc-icon-size:24px; }
  .pages { scroll-margin-top:calc(var(--header-height, 0px) + 8px); }
  .toast { bottom:calc(96px + env(safe-area-inset-bottom, 0px)); }
  .acats { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .scenes { gap:8px; } .sc { min-height:112px; padding:12px; } .sc .si { width:42px; height:42px; } .sc .sn { font-size:15px; } .sc .ss { font-size:12px; } .acmds { grid-template-columns:1fr; }
  .qa { grid-template-columns:repeat(2,1fr); } .qt { min-height:112px; } .rooms { grid-template-columns:1fr; }
  header { gap:8px; } .pill { height:46px; padding:0 12px; font-size:14px; } .pill .muted { display:none; } .qt .qn { font-size:15px; } .iconbtn { width:46px; height:46px; }
  .clock { order:-1; width:100%; font-size:44px; } .greet { flex-basis:100%; } .stats { grid-template-columns:repeat(2,1fr); }
  .overlay { padding:0; align-items:flex-end; } .modal { border-radius:28px 28px 0 0; max-height:92vh; padding:20px 16px; }
  .mh h3 { font-size:22px; } .mh .mi { width:50px; height:50px; } .daily { grid-template-columns:repeat(4,1fr); } .dy:nth-child(n+5) { display:none; }
  .crow { grid-template-columns:34px 1fr auto 70px; } .spark { width:70px; } .card { padding:16px; } .hub { height:320px; } }
@media (prefers-reduced-motion: reduce) { *, *::before { animation:none !important; transition:none !important; } }
`;

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

// ─── Панель ──────────────────────────────────────────────────────────────────────────────────────────────────
const SECTIONS = ["hdr", "scenes", "hub", "wx", "clim", "health", "quick", "rooms", "plan", "vac", "cam", "media", "alice", "feed"];
// Разделы панели. Листаются вбок или вкладками (на телефоне вкладки внизу, как в приложениях).
// cols — колонки на широком экране; на телефоне карточки идут одна под другой в том же порядке.
const PAGES = [
  { id: "home", name: "Дом", icon: "home-variant-outline", cols: [["scenes", "quick", "rooms"], ["hub"]] },
  { id: "flat", name: "Квартира", icon: "floor-plan", cols: [["plan"], ["vac"]] },
  { id: "music", name: "Музыка", icon: "music-circle-outline", cols: [["media"], ["alice"]] },
  { id: "climate", name: "Климат", icon: "thermometer", cols: [["clim"], ["wx"]] },
  { id: "safety", name: "Охрана", icon: "shield-home-outline", cols: [["cam", "health"], ["feed"]] },
];
const PAGE_IX = Object.fromEntries(PAGES.map((p, i) => [p.id, i]));
const SEC_CLASS = { scenes: "scenesc", hub: "hubc", wx: "wx", clim: "climc", health: "health", quick: "quick", rooms: "rooms-c", plan: "planc",
  vac: "vac", cam: "camc", media: "media", alice: "alicec", feed: "feedc" };

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
      setInterval(() => this._loadHistory(), 10 * 60000),
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
  sig_hdr() { return this._sig([WEATHER, PERSON, ...TRACKERS.flatMap((t) => [t[0], t[1]]), DOOR, CAMERA_MOTION, ZIGBEE, QREVO.waterShortage],
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
  sig_health() { return this._sig([BACKUP, ZIGBEE], `${Object.values(this._hass.states).filter((s) => s.state === "unavailable" || s.attributes.device_class === "battery").map((s) => s.state).join(",")}|${this._v(DOOR)}|${this._v(QREVO.waterShortage)}`); }
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

// ─── Регистрация ─────────────────────────────────────────────────────────────────────────────────────────────
if (!customElements.get("home-panel-card")) customElements.define("home-panel-card", HomePanelCard);
window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === "home-panel-card"))
  window.customCards.push({ type: "home-panel-card", name: "Панель дома", description: "Главный экран квартиры: свет, климат, пылесосы, камера, музыка" });
console.info(`%c HOME-PANEL %c ${HP_VERSION} `, "background:#a78bfa;color:#fff;font-weight:700;border-radius:4px 0 0 4px", "background:#1e1b4b;color:#fff;border-radius:0 4px 4px 0");

})();
