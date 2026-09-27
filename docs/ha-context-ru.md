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
  (нужен `kmod-usb-acm`, поставлен через apk). Прошит EmberZNet 8.0.2 (было 7.3, EZSP 12 — Z2M не принимал).
  Zigbee2MQTT 2.x (`adapter: ember`, канал 25, фронтенд :8099) + Mosquitto (только 127.0.0.1:1883, без пароля)
  в том же compose `/mnt/nvme/compose/homeassistant/docker-compose.yml`; данные `/mnt/nvme/zigbee2mqtt/data`
  (в `configuration.yaml` и `coordinator_backup.json` ключи сети — не публиковать), `/mnt/nvme/mosquitto`.
  Второй донгл — ретранслятор (Zigbee Router), питается от зарядки; перепрошит через dongle.sonoff.tech и
  добавлен в Z2M. На Mac порт донгла держал WiFi Explorer Pro 3 («Device Unresponsive»/«Resource busy») —
  закрывать перед прошивкой. Альтернатива веб-прошивальщику: `universal-silabs-flasher --bootloader-reset rts_dtr`.
  Для координатора есть EmberZNet 8.2.2 (Nerivec) — обновить позже, после бэкапа.
- Bluetooth: в прошивке нет kmod-bluetooth/bluez → рекомендованы ESPHome Bluetooth-прокси на ESP32.
- Nextcloud пробовали и удалили (грузил CPU, segfault PHP JIT на ARM64).

## Сеть
- Сейчас: BPI-R4 = роутер `192.168.1.1`, основной канал LTE; forkop (sing-box) направляет заблокированное
  в WireGuard `wg0` → RB5009 (`10.10.10.9` → `10.10.10.1`), резерв — подписка (priority group, без RU).
  `uplink-mode.sh`: кабель в WAN → forkop выключается, всё идёт через вышестоящий роутер.
- Дома: оптика → MikroTik RB5009 (`192.168.88.1/24`, DHCP .10–.254) с mihomo (Medium1992, FakeIP 198.18.0.0/15),
  WireGuard `wg-family` 10.10.10.0/24, Back To Home. Весь Wi-Fi дома — точки Xiaomi за RB5009
  (`Xiaomi`, `Xiaomi_5G`), умные устройства в 192.168.88.0/24.
- План (подготовлен, выполнение не подтверждено): BPI-R4 становится сервером/точкой доступа в сети RB5009
  с адресом `192.168.88.2` — `router/move-behind-rb5009.sh` (авто-откат через 10 мин без `touch /tmp/keep-new`).
  После переноса HA будет `http://192.168.88.2:8123`, в одной сети со всеми устройствами.
- Доступ к HA снаружи нужен: через Back To Home или пир WireGuard на RB5009 (не проброс порта).

## Как работаем
- Общение на русском, коротко, команды блоками; ассистент не имеет доступа к роутеру — пользователь
  выполняет команды по SSH и присылает вывод.
- Не повторять и не коммитить ключи/пароли/токены; если пользователь их прислал — напомнить сменить.
