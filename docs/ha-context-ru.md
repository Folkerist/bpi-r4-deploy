# Home Assistant на BPI-R4 Pro 8X — контекст

Сводка из основного чата по роутеру, чтобы продолжать работу над Home Assistant отдельно.
Ключей и паролей здесь нет и быть не должно.

## Железо и система
- Banana Pi BPI-R4 Pro 8X: MT7988A, 4 × Cortex-A73 до 1,8 ГГц, 8 ГБ ОЗУ. Троттлинга нет, в простое ~93% idle.
- OpenWrt SNAPSHOT r36539 (ядро 6.18.52), пакетный менеджер `apk`, оболочка busybox ash
  (нет `sort -h`, нет `<(...)`; длинные URL при вставке переносятся — делить на переменные `B=`/`C=`).
- Overlay (extroot) на eMMC `mmcblk0p6`; eMMC почти не нагружен.
- NVMe 1 ТБ `/mnt/nvme` (ext4): данные Docker `/mnt/nvme/docker`, HA `/mnt/nvme/homeassistant/config`,
  Matter `/mnt/nvme/matter-server/data`.
- Samsung 2 ТБ `/mnt/ssd2`: графики collectd `/mnt/ssd2/collectd-rrd`.
- Модем Quectel RM520N-GL (LTE Yota), ModemManager; SMS → почта.

## Docker / Home Assistant
- Compose: `router/docker/homeassistant-compose.yml`
  - `homeassistant/home-assistant:stable`, `network_mode: host`, TZ Europe/Moscow (без монтирования /etc/localtime).
  - `ghcr.io/home-assistant-libs/python-matter-server:stable`, host, `--primary-interface br-lan`.
- HA: `http://<адрес роутера>:8123`, интеграция Matter подключена: `ws://localhost:5580/ws`.
- Matter Server при старте ходит в DCL (`on.dcl.csa-iot.org`) — напрямую из РФ недоступен, пущен через
  forkop/туннель (`domain_suffix csa-iot.org`). Порт 5580 открывается только после загрузки vendor info.
  Ошибки mDNS `Network is unreachable` на интерфейсах без IPv6 — шум.
- `/etc/init.d/docker-graceful` (router/docker/docker-graceful): корректная остановка контейнеров при
  перезагрузке (раньше при жёсткой остановке портился `.storage/bluetooth.passive_update_processor`).
- HACS: предлагалась установка `docker exec homeassistant bash -c 'wget -qO - https://get.hacs.xyz | bash -'`;
  состояние не подтверждено — проверить `ls /mnt/nvme/homeassistant/config/custom_components/`.
- HACS установлен (подтверждено пользователем).
- Карта квартиры: `router/homeassistant/floorplan/` (SVG тёмный/светлый, генератор `gen-floorplan.py`,
  `card.yaml`). На роутере лежит в `config/www/` → `/local/floorplan-*.svg`; отдельная панель «Карта»
  (panel view, `picture-elements` с `dark_mode_image`). Устройства на карту пока не добавлены.
  Комнаты: зал, спальня, кухня, детская, прихожая, коридор, ванная, WC, кладовка, балкон.
  Проходы сверены (29.09.2026) с лидарной картой Qrevo (где соседние сегменты касаются — там реальный проход; привязка
  ≈39,5 мм на единицу плана) и планировкой из объявления: двери детской/спальни 574–598, арка малый коридор→коридор 324–372
  (слева встроенная полка), коридор→прихожая 327–367, зал→кухня — проём без двери 192–215, дверь кухни 748–772 внутрь
  кухни; нарисованы шкаф в проходе к кухне, ванна и унитаз. Зал–коридор — широкая раздвижная перегородка
  примерно в две двери (~1,7 м), на плане 643–687.
- Пространства HA (area_id | имя): gostinaia|Зал, kukhnia|Кухня, spalnia|Спальня, detskaia|Детская,
  prikhozhaia|Прихожая, koridor|Коридор, vannaia|Ванная, tualet|Туалет, kladovka|Кладовка, balkon|Балкон.
  Созданы правкой `.storage/core.area_registry` при остановленном HA (бэкап `.bak` рядом).
- Zigbee: SONOFF ZBDongle-E V2 (EFR32MG21, USB 1a86:55d4) в USB-хабе роутера → `/dev/ttyACM0`
  (нужен `kmod-usb-acm`, поставлен через apk). Прошит EmberZNet 8.2.2 (было 7.3 → 8.0.2 → 8.2.2; 7.3/EZSP 12 Z2M не принимал).
  Zigbee2MQTT 2.x (`adapter: ember`, канал 25, фронтенд :8099) + Mosquitto (только 127.0.0.1:1883, без пароля)
  в том же compose `/mnt/nvme/compose/homeassistant/docker-compose.yml`; данные `/mnt/nvme/zigbee2mqtt/data`
  (в `configuration.yaml` и `coordinator_backup.json` ключи сети — не публиковать), `/mnt/nvme/mosquitto`.
  Второй донгл — ретранслятор (Zigbee Router), питается от зарядки; перепрошит через dongle.sonoff.tech и
  добавлен в Z2M. На Mac порт донгла держал WiFi Explorer Pro 3 («Device Unresponsive»/«Resource busy») —
  закрывать перед прошивкой. Альтернатива веб-прошивальщику: `universal-silabs-flasher --bootloader-reset rts_dtr`.
  Обновление координатора прямо на роутере, без вынимания (сеть сохраняется, «network matches config»):
  `docker stop zigbee2mqtt`, бэкап `tar czf /mnt/nvme/zigbee2mqtt-backup-DATE.tgz -C /mnt/nvme zigbee2mqtt`,
  gbl (Nerivec, `sonoff_zbdonglee_zigbee_ncp_*_115200_sw_flow.gbl`) в `/mnt/nvme/zigbee2mqtt-fw`, затем
  `docker run --rm --device /dev/ttyACM0 -v $PWD:/fw --entrypoint python3 homeassistant/home-assistant:stable
  -m universal_silabs_flasher --device /dev/ttyACM0 flash --firmware /fw/<file>.gbl` (или `probe`).
- Выключатель Aqara E1 без нуля, 2 клавиши (QBKG39LM, IEEE 0x54ef4410005e7527, в Z2M `switch_bath_corridor`), в малом коридоре у ванной:
  левая → `switch.light_bath` (Ванная), правая → `switch.light_corridor` (малый коридор до арки).
  На карте: подсветка `fp-light-*.svg` + нажатие по комнате (card.yaml). В Z2M при переименовании
  снимать галочку «обновить ID в HA», иначе entity_id уйдут от light_bath/light_corridor.
- Второй Aqara-выключатель `switch_hall` (имя в Z2M) — в основном коридоре (11,2): левая → `switch.light_hall_main` (люстра),
  правая → `switch.light_hall_perimeter` (подсветка по периметру). На карте: заливка / контур по периметру.
- Третий Aqara-выключатель `switch_entry` — в прихожей: левая → `switch.light_entry_perimeter` (подсветка
  по периметру прихожей), правая → `switch.light_wc` (туалет).
- Четвёртый выключатель `switch_entry2` — в прихожей, одна клавиша → `switch.light_entry_main` (люстра прихожей).
  На карте нажатие на прихожую — люстра, значок ленты — подсветка по периметру.
- Выключатель кладовки `switch_storage` → `switch.light_storage` (Кладовка).
- Выключатель кухни `switch_kitchen`: левая → `switch.light_kitchen_main` (центральный свет),
  правая → `switch.light_kitchen_perimeter` (подсветка по периметру — светит на всю кухню). Центр = люстра над
  столом (на карте — пятно у стола, TABLE в gen-floorplan.py); нажатие на кухню — периметр.
- После переноса сети пропал мост docker0: временные `docker run` для правки реестра запускать с
  `--network none` (постоянные контейнеры — host network, им не нужен). Вернётся после `dockerd restart`/ребута.
- Шлюз Xiaomi Smart Home Hub 2 (`lumi.gateway.mgl001`, fw 1.0.5, 192.168.88.19, статическая аренда на RB5009)
  через HACS-интеграцию Xiaomi Gateway 3 (AlexxIT), локально; принимает и BLE-датчики Xiaomi.
  Термометр LYWSD03MMC «Температура гостинная» (uid a4c13843f704) → `sensor.zal_temperature`,
  `sensor.zal_humidity` (Зал), на карте — подписи под «Зал». Остальные LYWSD03MMC (в Mi Home все «Температура»):
  a4c138d0c5b1 → koridor, a4c13832519b → detskaia, a4c1389247b6 → kukhnia, a4c138dc8f4f → vannaia,
  a4c13804447f → spalnia; объекты `sensor.<комната>_temperature/_humidity`, подписи на карте под комнатами.
- Камеры: Xiaomi C700 (`chuangmi.camera.81ac1`, 192.168.88.52) — через отдельный go2rtc (compose, порт UI 1985,
  RTSP 8554, конфиг `/mnt/nvme/go2rtc/go2rtc.yaml`, источник xiaomi, нужен go2rtc ≥ 1.9.13) → Generic Camera в HA.
  Видео HEVC+opus. РАБОТАЕТ: поток `c700` (go2rtc 1.9.14), в HA Generic Camera — stream
  `rtsp://127.0.0.1:8554/c700` → `camera.c700` (Коридор; на карте значок + конус обзора на входную дверь,
  вкладка «Камера» на панели «Планировка»), снимок `http://127.0.0.1:1985/api/frame.jpeg?src=c700`. Грабли: имя потока было
  набрано с кириллической «с» → 404; после `c700:` обязателен пробел. Изредка WRN `cs2: pop buffer is full`.
  Botslab/360 (`360IPC-C221`, .221) — только облако, все порты закрыты, в HA не подключить.
- Зал: основной свет Yeelight Ceiling4 (192.168.88.32) → `light.zal_yeelight_hall` (+ `_ambilight` — подсветка);
  в Спальне Yeelight → `light.spalnia_yeelight_bed` (+ `_ambilight`), на карте — заливка спальни.
  HA при добавлении перепутал светильники (Hall↔Bed) — поменяли местами в реестре; в приложении Yeelight
  имена тоже стоит поменять. (заливка зала на карте, нажатие по залу — вкл/выкл).
- Пылесос Roborock Qrevo (интеграция Roborock) → `vacuum.koridor_roborock_qrevo`, карта
  `image.koridor_roborock_qrevo_map_0`; база на кухне. На карте квартиры значок, вкладка «Пылесос» (управление,
  режимы, карта, кнопки уборки комнат). Сегменты: 1 Кухня, 2 Коридор3, 3 Коридор1, 4 Спальня, 5 Зал, 6 Коридор,
  7 Прихожая, 8 Лекс (детская); на карте долгое нажатие на зал/кухню/спальню/прихожую/детскую — уборка
  комнаты (с подтверждением); vacuum.send_command app_segment_clean [{segments:[N],repeat:1}].
- Второй пылесос Roborock S5 (`roborock.vacuum.s5`, fw 3.5.8, 192.168.88.21, только сухая) — через Xiaomi Miot (учётка Mi Home, cn)
  → `vacuum.roborock_s5_8159_robot_cleaner`, `sensor.roborock_s5_8159_status`/`_battery_level`, `select.roborock_s5_8159_mode`.
  Прошивка S5 не умеет имена комнат (`get_room_mapping` = []), поэтому номера сегментов — из Xiaomi Cloud Map Extractor
  v3.0.0-alpha-24 (ставили вручную в custom_components, в manifest.json снят пин `vacuum-map-parser-roborock==0.1.4`,
  иначе откатил бы 0.1.5 у Roborock/Qrevo; обновлять через HACS нельзя — затрёт правку): `image.robot_pylesos_live_map`,
  `sensor.robot_pylesos_rooms`/`_vacuum_room_id`/`_charger_position` (включены вручную). Сегменты S5: 16 Зал, 17 Кухня,
  18 Ванная+малый коридор, 19 Проход к кухне, 20 Коридор, 21+1 Прихожая, 22 Спальня, 23 Детская; база — на кухне рядом с Qrevo.
  S5 принимает `app_segment_clean` простым списком `[16]`.
- Уборка на карте (29.09.2026): долгое нажатие на комнату и кнопки «Уборка» → `script.fp_vacuum_clean` (rooms: zal, kukhnia,
  spalnia, detskaia, prikhozhaia, koridor, koridor2, prokhod; таблица сегментов обоих пылесосов — `router/homeassistant/scripts.yaml`),
  пылесос — переключатель `input_select.fp_vacuum` «Кто убирает» (Мокрый = Qrevo / Сухой = S5 / Вместе; `input_select.yaml`, подключён в
  configuration.yaml). «Вместе» / «Всё вместе» = `script.fp_vacuum_together`: S5 пылесосит → ждёт базу → Qrevo в режиме `mop`
  моет → режим возвращается. Комната S5 — фиолетовая подсветка (`sensor.fp_vacuum2_room`, `fp-vac2-*.svg`).
- Уборка голосом (29.09.2026), всё решает фраза (переключатель на карте не участвует): «Алиса, пропылесось зал / в зале» —
  сухой S5, «помой кухню / на кухне / помой пол …» — мокрый Qrevo, «убери спальню / в спальне / сделай уборку …» — сначала
  сухой, потом мокрый; «…всю квартиру / везде»; «останови уборку / поставь уборку на паузу» — оба на паузу (и «Вместе»
  прерывается); «пылесосы на базу / хватит убирать» — оба на базу. Проход: «…проход в коридоре / в проходе».
  29 сценариев Яндекса «Пылесось: …», «Помой: …», «Уборка: …», «Уборка: пауза», «Уборка: стоп» (`router/homeassistant/yandex/ya_create.py`
  создаёт/обновляет, а переставшие генерироваться удаляет, через сессию yandex_station; импортировать его нельзя — сразу выполняется): фраза → услышавшая колонка
  выполняет беззвучное «ничего не делай» → `yandex_scenario` (scenario_name) → `automation.uborka_po_golosu_alisa`
  → `script.fp_vacuum_clean` / `fp_vacuum_together` + голосовой ответ на той же колонке. Фразу, сказанную колонке, HA не
  видит — только имя сценария. Не пересекаться с «Время уборки» («Уберись», «Уборка» — пылесос «Бэндер») и «Пропылесось туалет».
  30.09.2026: первая живая проверка упала — в HA нет фильтра `map('extract', …)`, сегменты теперь собираются циклом
  `namespace` (ошибка ломала и уборку с карты). S5 проверен голосом по всем 8 комнатам (зал 16, кухня 17, спальня 22,
  детская 23, прихожая 21+1, коридор 20, малый коридор 18, проход 19) — сегменты верные; «останови уборку» работает.
  Пылесосы «Бэндер» и «Камала» удалены из «Дома с Алисой»: при неточно расслышанной фразе Алиса сама запускала
  пылесос на всю квартиру. Qrevo: «помой проход в коридоре» → сегмент 3, в приложении Roborock — «проход в коридоре»
  (Qrevo знает имена комнат, остальные не проверялись). «Останови уборку» → пауза (S5 `paused`), «пылесосы на базу» → база.
  «Убери …» (Вместе) голосом ещё не проверено.
- Карта: viewBox плана расширен до -10..610 (боковые панели): слева «Уборка» (8 комнат пылесоса), справа
  снимок камеры, «Вкл»/«Выкл» (весь свет, с подтверждением), статус/заряд пылесоса, Старт/Пауза/На базу. Оверлеи комнат
  (свой viewBox 80..520) — по центру шириной 70.97%; card-mod max-width = (100vh-72px)*1.57.
- Правая панель карты: погода (анимированные значки Basmilius weather-icons, MIT, в `config/www/weather/`,
  по состоянию weather.*; сейчас `weather.pavshino` (Gismeteo) = Met.no, план — Gismeteo из HACS),
  снимок камеры + красная рамка при `binary_sensor.c700_motion` (ещё не создан), «Горит: N» =
  `sensor.lights_on` (помощник-шаблон), «Вкл»/«Выкл» весь свет (коммит 1b652fc), «Мокрый» (Qrevo) и «Сухой» (S5) (статус, заряд,
  ▶ ❚❚ ⌂); слева под «Уборка» — «Кто убирает» и «Всё вместе». Вкладка «Погода» — почасовой и дневной прогноз.
- Порядок в Zigbee (29.09.2026): ретранслятор (стоит в ванной) переименован Retranslyator → `router_bath`; у всех устройств
  в Z2M русское `description`; служебные сущности в HA — по имени устройства вместо IEEE (`sensor.switch_kitchen_device_temperature`,
  `select.switch_hall_operation_mode_left`, `update.switch_entry2`, `sensor.router_bath_linkquality`…; история перенесена);
  имена устройств в HA — русские («Выключатель кухня», «Ретранслятор Zigbee»…), мост Z2M — в «Прихожей», ретранслятор — в «Ванной».
  Старые `configuration_backup_v*.yaml` и `migration-*.log` Z2M — в `data/old/`; retained-хвосты старых имён в MQTT удалены.
  Бэкапы: `configuration.yaml.bak-20260929` (Z2M), `core.*_registry.bak-20260929z`, `home-assistant_v2.db.bak-20260929z`.
  В `description` Z2M значения с «: » — только в кавычках (иначе Z2M не стартует: «configuration is not valid»).
- Карта сети Zigbee (29.09.2026): к координатору (донгл в USB-хабе у BPI, прихожая) напрямую — только switch_storage и
  switch_kitchen; switch_entry/entry2 (в 1–2 м от роутера), switch_hall и switch_bath_corridor — через router_bath (ванная).
  Причины: мощность координатора была 5 дБм (по умолчанию Z2M), донгл «глохнет» у роутера (Wi-Fi 2,4 ГГц BPI, LTE-модем
  на USB 3.0; координатор слышит router_bath с LQI 102, тот его — 162), а Aqara E1 без нуля не меняют родителя сами.
  Сделано: `advanced.transmit_power: 20` (бэкап `configuration.yaml.bak-20260929tx`). Дальше: донгл на удлинитель USB 1–1,5 м
  подальше от корпуса, затем выключить router_bath минут на 10 — его выключатели переподключатся, снять networkmap.
- Имена в Z2M: латиница, «тип_комната» (switch_kitchen, sensor_bath, motion_hall). Клавишам/сущностям даём
  постоянные entity_id правкой реестра (HA остановлен), в Z2M при переименовании снимать «обновить ID в HA».
- Bluetooth: в прошивке нет kmod-bluetooth/bluez → рекомендованы ESPHome Bluetooth-прокси на ESP32.
- Nextcloud пробовали и удалили (грузил CPU, segfault PHP JIT на ARM64).

- Датчики движения: 8× Xiaomi RTCGQ02LM (BLE через Xiaomi Gateway 3). Переименованы скриптом реестра
  (id `<комната>_motion`, `_motion_light`, `sensor.<комната>_motion_battery`, `_motion_idle`, `select.…_motion_command`,
  имя устройства «Движение …», пространство устройства): kukhnia (943a), kukhnia_stol (b5a6, под столом),
  vannaia (d8ab, Ванная; в Mi Home был «автопоилка»), koridor (d480, основной коридор у двери-купе), tualet (195d),
  prikhozhaia (1752, возле шкафа). Не определены: 18c23c22943b («датчик движения») и 54ef44c4ea20 («Движение»).
  `binary_sensor.c700_motion` — шаблон по `motion_video_time` камеры (2 мин).

- Карта на телефоне (ширина < 768px): отдельная раскладка в той же вкладке — план без боковых панелей
  (`floorplan-m-*.svg`, viewBox 80 465 440 395), размеры в cqw, на плане только температура; ниже карточки:
  погода + камера (красная рамка при движении), «Горит»/Весь свет/Выключить, пылесос, «Убрать комнату».
  Источник карты — `router/homeassistant/floorplan/map-desktop.yaml`; `gen-card.py` вставляет обе версии
  в card.yaml между `# BEGIN map` / `# END map` (вручную этот блок не править).

- На «Планировке» (28.09.2026): открытая входная дверь (`binary_sensor.e4aaec6dff8c_contact`) — красная створка
  и «открыта N мин»; Яндекс Станции и ТВ Станция значками в комнатах (нажатие — пауза/продолжить); зелёная
  подсветка комнаты, которую убирает пылесос; ⚠ в комнате при батарее < 20% или «нет связи» (нажатие — список);
  «🚶 N мин» с последнего движения (кухня, коридор, прихожая; < 2 ч); влажность ванной > 70% — красным.
  Яндекс Станции (29.09.2026): когда играет — розовая нота вместо колонки, розовые волны (`fp-play-<id>.svg`, координаты —
  STATIONS в gen-floorplan.py) и название трека (у ТВ Станции нет); справа «🎵 N» = `sensor.fp_media_playing` (атрибут
  stations — какие и что играет), на телефоне — плитка «Играет», пока что-то играет.
  Опирается на шаблонные сенсоры `router/homeassistant/templates.yaml` (`sensor.fp_*`, `binary_sensor.fp_problem_*`,
  на роутере `config/templates.yaml`, подключён в configuration.yaml) и макрос `custom_templates/floorplan.jinja`.
  Панель пишется в `.storage/lovelace.dashboard_karta` при остановленном HA (card.yaml → JSON, бэкап `.bak`).
- Резервные копии: `router/docker/stack-backup.sh` → `/usr/bin/stack-backup.sh`, cron `30 4 * * *`, в
  `/mnt/nvme/backups/ГГГГ-ММ-ДД/` (root-only, хранится 14 дней, ~30 МБ/день): `homeassistant.tgz` (config без БД),
  `ha-db.sqlite.gz` (снимок БД через sqlite backup), zigbee2mqtt (ключи сети!), mosquitto, matter-server, go2rtc,
  compose, `router-config.tgz` (sysupgrade -b). Журнал: `logread -e stack-backup`. SSD2 не используем — его будут
  менять; копии на том же NVMe, что и данные (от отказа диска не спасают) — после замены SSD2 добавить вторую копию.
  Встроенный Backup HA не настроен (есть этот скрипт). Восстановление — в шапке скрипта.
- Matter: веб-интерфейс python-matter-server на :5580 (без пароля, только LAN, наружу не пробрасывать) добавлен
  в боковую панель HA как панель «Веб-страница» `http://192.168.88.2:5580` («Matter»). Узлов пока 0.

## Сеть
- Сейчас: BPI-R4 = роутер `192.168.1.1`, основной канал LTE; forkop (sing-box) направляет заблокированное
  в WireGuard `wg0` → RB5009 (`10.10.10.9` → `10.10.10.1`), резерв — подписка (priority group, без RU).
  `uplink-mode.sh`: кабель в WAN → forkop выключается, всё идёт через вышестоящий роутер.
- Дома: оптика → MikroTik RB5009 (`192.168.88.1/24`, DHCP .10–.254) с mihomo (Medium1992, FakeIP 198.18.0.0/15),
  WireGuard `wg-family` 10.10.10.0/24, Back To Home. Весь Wi-Fi дома — точки Xiaomi за RB5009
  (`Xiaomi`, `Xiaomi_5G`), умные устройства в 192.168.88.0/24.
- ПЕРЕНОС ВЫПОЛНЕН (27.09.2026): BPI-R4 = `192.168.88.2` в сети RB5009 (`router/move-behind-rb5009.sh`,
  бэкап старых настроек `/root/pre-rb5009`, откат `sh /root/move-behind-rb5009.sh undo`). Шлюз/DNS — RB5009
  (metric 5), LTE остался запасным (metric 100), forkop и wg0 выключены, dnsmasq без DHCP, DNS через
  resolv.conf.auto (сервер forkop 127.0.0.42 убран). Кабель RB5009 → lan1. HA: `http://192.168.88.2:8123`.
- Xiaomi AX3600 (главный узел mesh) за BPI-R4 не завёлся: lan2 мигал Up/Down — вероятно, петля через mesh
  (к BPI были подключены и AX3600, и ещё одно устройство сети). Решение: Xiaomi и прочие — прямо в RB5009,
  в BPI-R4 только один кабель от RB5009. STP на br-lan выключен.
- Скорость Wi-Fi BPI-R4 после переноса упала до ~21 Мбит/с: RB5009 помечает трафик DSCP CS1 (`tos 0x20`,
  подтверждено tcpdump на lan1), Wi-Fi кладёт его в AC_BK. Исправление — `router/30-uplink-tweaks`
  (/etc/hotplug.d/iface/): сброс DSCP в netdev ingress и GRO off теперь и на lan1 (список портов —
  `/etc/uplink-lan-ports`, по умолчанию `lan1`). Проверка: `nft list table netdev uplink_dscp | grep devices`
  (есть lan1), счётчики растут. tcpdump на lan1 всё равно показывает tos 0x20 — он видит пакеты до правила.
  Установлено 27.09.2026: скорость по Wi-Fi 21 → ~357–470 Мбит/с (curl 100 МБ с speedtest.selectel.ru; Mac на «Home» 5 ГГц, 80 МГц).
- Wi-Fi BPI-R4 = те же сети, что у Xiaomi (устройства переходят сами): 2,4 ГГц `Xiaomii` канал 1 EHT20,
  5 ГГц `Xiaomii_5G` канал 149 EHT80, обе WPA2-PSK (psk2+ccmp, как у Xiaomi); 6 ГГц — `Home` (SAE).
  Порты RB5009 (с 29.09.2026 вечера): ether1 = BPI-R4 (2,5G), ether2 = Xiaomi AX3600 (1G; главный mesh, R3600 fw 1.1.21,
  MAC 88:c3:97:c9:11:d3), sfp = провайдер, ether3–8 пустые. Xiaomi AX1800 (узел mesh, RM1800 fw 1.0.399,
  MAC 28:d1:27:81:df:8b) — кабелем WAN AX1800 → LAN AX3600 (на карте MiWiFi сплошная линия), со стороны RB5009
  виден за ether2. Ping из RB5009: AX3600 ~0,5 мс, AX1800 ~3 мс (медленно отвечает сам, это не радио). Раньше AX1800
  был в ether3/ether4 RB5009 — с включённым радио-backhaul это давало петлю (ether4 уходил в RSTP backup-port). На 28.09.2026 адреса по DHCP: AX3600 = 192.168.88.43, AX1800 = 192.168.88.42
  (раньше были .20/.10). Найти: веб-интерфейс «小米路由器», модель — `http://<ip>/cgi-bin/luci/api/xqsystem/init_info`.
  Xiaomi AX3600 (MAC 88:C3:97:…): 2,4 ГГц канал 6, 5 ГГц канал 40/160 МГц
  (советовали закрепить вместо «авто»). Пароли задавать через LuCI или `read` по одной строке — при вставке
  блока `read` съедает следующие строки; `stty` в образе нет.
- RB5009 (RouterOS 7.24.4): доступ только на чтение `ssh rb` (пользователь `claude`, группа `ro-ssh` = ssh,read,test,
  ключ `~/.ssh/openwrt_claude`); изменения на RB5009 вносит пользователь в терминале Winbox. В комментариях RouterOS —
  только латиница (кириллицу терминал выбрасывает и ломает команду). Закреплённые аренды DHCP (29.09.2026): .19 шлюз
  Xiaomi, .22 Yeelight спальня, .32 Yeelight зал, .24 Roborock, .52 камера C700 (go2rtc ходит по IP), .43 AX3600,
  .42 AX1800 (у Xiaomi адрес прописан на самих роутерах — статус waiting). DSCP-правил на RB5009 нет, CS1 приходит
  извне; fasttrack включён (mangle на быстрые соединения не действует).
- Точки доступа (с 29.09.2026 вечера): AX3600 — прихожая, рядом с BPI-R4; AX1800 — спальня; в зале своей точки нет.
  Wi-Fi BPI-R4 выключен (`wireless.radio0/1.disabled=1`, 22:39 29.09.2026), т.к. AX3600 стоит рядом; плата MT7996
  на PCIe исправна, вернуть — `disabled=0` + `wifi`. `wifi-steer.sh` по cron при выключенном Wi-Fi ничего не делает.
  Ниже — эфир до этой перестановки (BPI — прихожая, AX3600 — спальня, AX1800 — зал). Эфир 29.09.2026: 5 ГГц — Xiaomi
  канал 44 (mesh, оба), BPI 149; 2,4 ГГц — схема 1/6/11: BPI канал 1 (соседи есть, но 6 занят AX3600), AX3600 «Авто (6)» → закрепить 6 и
  20 МГц (было 40/20), AX1800 — 11. 6 ГГц `Home` выключен 29.09.2026 (устройств с 6 ГГц нет; `uci set
  wireless.radio2.disabled=0` вернёт). Бэкапы `/etc/config/wireless.bak`, `.bak2`. Скорость через AX3600 5 ГГц
  рядом: 651/31 Мбит/с — CS1 на Xiaomi не мешает, DSCP-правило на RB5009 не нужно. 29.09.2026 wpad-basic-mbedtls заменён на полный
  wpad-mbedtls (с basic опции 802.11v роняли все точки), включены bss_transition + wnm_sleep_mode на 2,4/5 ГГц;
  мощность снижена до 17 дБм (у всех диапазонов один phy0 — txpower общий, применяется последний). Бэкапы
  `/etc/config/wireless.bak3` (до 802.11v), `.bak4` (до мощности). Роуминг только со стороны BPI:
  `router/wifi-steer.sh` (BSS transition на Xiaomi 5 ГГц, затем отключение с баном 60 с; `DRY=1` — пробный прогон).
- RB5009 ether2 (AX3600): 115+ падений линка и битые кадры (FCS) от AX3600 — на отдаче; PoE auto-on на
  ether1–3 показывал short-circuit, выключен 29.09.2026 — падения прекратились, FCS остались → менять кабель.
  На 29.09.2026 23:00: 151 падение и 123 691 FCS всего, последние падения 22:08–22:12 (перестановка), после — ни
  падений, ни новых FCS. Через этот кабель теперь идёт весь Wi-Fi (и AX1800) — следить.
  Проверка 23:10–23:13: 1 ГБ отдачи Mac (Wi-Fi AX3600) → BPI по ssh через ether2 — 0 новых FCS и падений (54 Мбит/с,
  предел — Wi-Fi Mac 288 Мбит/с при −62 дБм и ssh, не кабель). Похоже, кабель переподключили — ошибки ушли. На ether4–8 PoE auto-on.
  Отдача через AX3600 30–37 Мбит/с при 167 по кабелю с BPI — из-за этих потерь. Камера Botslab (.221) — худший клиент 2,4 ГГц (−79 дБм, 66% повторов).
- Доступ к HA снаружи нужен: через Back To Home или пир WireGuard на RB5009 (не проброс порта).

## Как работаем
- Общение на русском, коротко, команды блоками; ассистент не имеет доступа к роутеру — пользователь
  выполняет команды по SSH и присылает вывод.
- Не повторять и не коммитить ключи/пароли/токены; если пользователь их прислал — напомнить сменить.
- Локальная сессия (Claude Code на маке пользователя в домашней сети, `claude remote-control`): доступ к роутеру
  `ssh bpi` (192.168.88.2, ключ `~/.ssh/openwrt_claude`, у роутера dropbear → `/etc/dropbear/authorized_keys`). Смотреть,
  читать логи и диагностировать — самостоятельно; любые изменения (конфиги, реестр HA, перезапуски контейнеров,
  uci, установка пакетов) — сначала показать план/команду и дождаться «да». Перед правкой файлов — копия `.bak`.
