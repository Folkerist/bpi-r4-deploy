// ─── Ядро: конфигурация квартиры, форматирование, значки ────────────────────────────────────────────────────

const HP_VERSION = "__VERSION__";

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
