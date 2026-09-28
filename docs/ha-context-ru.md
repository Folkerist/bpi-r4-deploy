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
- Карта: viewBox плана расширен до -10..610 (боковые панели): слева «Уборка» (8 комнат пылесоса), справа
  снимок камеры, «Вкл»/«Выкл» (весь свет, с подтверждением), статус/заряд пылесоса, Старт/Пауза/На базу. Оверлеи комнат
  (свой viewBox 80..520) — по центру шириной 70.97%; card-mod max-width = (100vh-72px)*1.57.
- Правая панель карты: погода (анимированные значки Basmilius weather-icons, MIT, в `config/www/weather/`,
  по состоянию weather.*; сейчас `weather.forecast_home_assistant` = Met.no, план — Gismeteo из HACS),
  снимок камеры + красная рамка при `binary_sensor.c700_motion` (ещё не создан), «Горит: N» =
  `sensor.lights_on` (помощник-шаблон), «Вкл»/«Выкл» весь свет (коммит 1b652fc), пылесос. Вкладка «Погода» — почасовой и дневной прогноз.
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
  Порты RB5009: ether1 = BPI-R4 (+ его Wi-Fi-клиенты), ether2 = Xiaomi AX3600 (главный mesh, 192.168.88.20),
  ether3 = Xiaomi AX1800 (узел mesh, 192.168.88.10, связь с AX3600 по кабелю через RB5009), sfp = провайдер.
  Xiaomi AX3600 (MAC 88:C3:97:…): 2,4 ГГц канал 6, 5 ГГц канал 40/160 МГц
  (советовали закрепить вместо «авто»). Пароли задавать через LuCI или `read` по одной строке — при вставке
  блока `read` съедает следующие строки; `stty` в образе нет.
- Доступ к HA снаружи нужен: через Back To Home или пир WireGuard на RB5009 (не проброс порта).

## Как работаем
- Общение на русском, коротко, команды блоками; ассистент не имеет доступа к роутеру — пользователь
  выполняет команды по SSH и присылает вывод.
- Не повторять и не коммитить ключи/пароли/токены; если пользователь их прислал — напомнить сменить.
