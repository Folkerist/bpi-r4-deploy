# Сводка: домашняя сеть на BPI-R4 Pro 8X + MikroTik RB5009 (на 16.10.2026)

Контекст для другого ассистента. Ключей, паролей, токенов и ссылок на подписки здесь нет и не должно быть.
Подробности по Home Assistant — `docs/ha-context-ru.md` в репозитории
https://github.com/folkerist/bpi-r4-deploy (ветка `claude/bpi-r4-pcie-link-down-x51z5y`;
репозиторий — форк woziwrt/bpi-r4-deploy, свои изменения в `router/`, `docs/`, `patches/`).

## 1. Железо
- **Banana Pi BPI-R4 Pro 8X**: MT7988A (4× Cortex-A73), 8 ГБ ОЗУ, eMMC, 2× NVMe
  (1 ТБ `/mnt/nvme` — Docker/HA; Samsung 2 ТБ `/mnt/ssd2` — графики collectd).
- Wi-Fi: модуль **BE14** (MT7996, Wi-Fi 7, 2.4/5/6 ГГц), одно PCIe-устройство, в OpenWrt — radio0/1/2.
- Модем **Quectel RM520N-GL** (LTE, Yota), ModemManager; SMS пересылаются на почту.
- 10G PHY AS21010 (WAN), коммутатор MxL862xx (LAN).
- USB у BPI — 5 Гбит/с Gen1 за встроенным хабом, общим с модемом.

## 2. Прошивка
- **OpenWrt SNAPSHOT r36928** (ветка main), ядро **6.18.55**, пакеты через `apk`, оболочка busybox ash.
- Overlay (extroot) на eMMC. Перед sysupgrade — `router/sysupgrade-prepare.sh`
  (сохраняет свои файлы и списки пакетов в `/root`; учитывает ловушку со старым extroot после обновления).
- Сторонние/ручные пакеты: тема proton2025, luci-app-temp-status. forkop/sing-box/byedpi сейчас не используются.
- Для 6.18.55 в overlay лежит `as21xxx.ko` из PR openwrt#24990 (датчики температуры PHY; Tested-by отправлен).

## 3. Топология сети
- Провайдер: GPON 1000/1000. **GPON-стик HSGQ-XPON-Stick** в `sfp-sfpplus1` **MikroTik RB5009**
  (RouterOS 7.24.4, `192.168.88.1/24`, DHCP .10–.254). На RB5009: mihomo (FakeIP 198.18.0.0/15,
  обход блокировок), WireGuard `wg-family` 10.10.10.0/24, Back To Home.
- **BPI-R4 = `192.168.88.2`** в сети RB5009 (кабель RB5009 ether1 → BPI lan1, 2.5G). Шлюз и DNS — RB5009.
  На BPI dnsmasq без DHCP, forkop/wg0 выключены. Откат переноса: `sh /root/move-behind-rb5009.sh undo`.
- RB5009 ether2 → Xiaomi AX3600 (главный узел mesh, прихожая) → кабелем AX1800 (спальня).
  Основной Wi-Fi дома — Xiaomi (`Xiaomi`, `Xiaomi_5G`).
- DSCP: RB5009 приходит трафик с меткой CS1, из-за которой Wi-Fi BPI клал всё в фоновую очередь (21 Мбит/с).
  Исправлено `router/30-uplink-tweaks` (сброс DSCP на lan1 в netdev ingress, GRO off).
- Доступ ассистента к RB5009 — только чтение (`ssh rb`), изменения вносит пользователь в Winbox.
  В комментариях RouterOS — только латиница.

## 4. Резерв через LTE
- На RB5009: маршрут `ISP-main` с check-gateway (distance 1), `LTE-backup-BPI` через 192.168.88.2 (distance 2).
  На BPI `router/lte-backup/lte-backup.sh`: трафик из br-lan → таблица 100 → `wwan0`.
- `router/wwan-watchdog.sh` (исправлен 11.10.2026, коммит 647d98f): после рестарта ModemManager и
  после `mmcli --reset` обязательно `ifup mm`. До исправления LTE не работал 09–11.10 (watchdog сбрасывал
  модем каждые 6 минут, но не поднимал интерфейс).

## 5. Скорость интернета (решено)
- Проблема: отдача 230–350 Мбит/с при тарифе 1000/1000.
- Причина: стик работает только на 2.5G-baseX, flow control нет → RB5009 шлёт пачки на 2,5 Гбит/с, стик
  (GPON вверх ~1,24 Гбит/с) переполняется и теряет пакеты.
- Решение на RB5009:
  `/queue type add name=cake-up kind=cake cake-bandwidth=950M cake-diffserv=besteffort`,
  `/queue interface set [find interface=sfp-sfpplus1] queue=cake-up`.
- Тест 10 ГБ, 16 потоков: без cake 277, cake 900M — 760, cake 950M — 767 Мбит/с. Потолок ~765 — у провайдера.
- Страница LuCI «Статус → Speed test» (`router/speedtest/`): загрузка и отдача через Selectel (Москва,
  `speedtest.selectel.ru/empty.php`), выбор режима, потоков (1–32) и объёма (10 МБ–10 ГБ). Ookla в РФ заблокирован.

## 6. Wi-Fi 7 на BE14
- Регион RU: на 6 ГГц доступно 5925–6425 МГц, 320 МГц — канал 37 (PSC).
- Для Wi-Fi 7 нужен WPA3-SAE + `ieee80211w 2` (с WPA2 будет только Wi-Fi 6/6E).
- Pixel 9 Pro (Wi-Fi 7, максимум 160 МГц, 2SS): iperf3 до BPI 1,63 / 1,73 Гбит/с.
  Android может не показывать сеть только на 6 ГГц в списке — помогает ручное добавление.
- vivo X200 Ultra (китайская прошивка): 11be и 160 МГц есть, 4096-QAM есть, 6 ГГц не видит
  (вероятно, заблокировано региональной прошивкой) → 320 МГц нет.

### Текущая настройка Wi-Fi на BPI — MLO на трёх диапазонах
- `wifi-iface mld0`: `list device radio0/radio1/radio2`, `mode ap`, `network lan`, SSID `test`,
  `encryption sae`, `ieee80211w 2`, `mlo 1`. Стандартные default_radio0/1/2 выключены.
- Линки: 2.4 ГГц канал 1 EHT20, 5 ГГц канал 40 EHT80, 6 ГГц канал 37 EHT320. Интерфейс `ap-mld0`.
- **Pixel 9 Pro XL подключается к MLO и работает хорошо** (проверено пользователем).
- LuCI MLO не поддерживает (luci PR #9040) — показывает радио странно. **Не сохранять Wi-Fi через LuCI.**
- Проверка: `iw dev ap-mld0 info`, `iw dev ap-mld0 station dump`, `logread | grep hostapd`.
- Бэкапы: `/etc/config/wireless.bak-vivo` (до тестов, с сетью `Home` на 6 ГГц), `.bak-mlo` (до MLO),
  `.bak-mlo2` (MLO на двух диапазонах).
- Пароль сети `test` светился в чате — рекомендовано сменить.
- Можно добавить `option sae_pwe '2'` (H2E, нужен на 6 ГГц; обычно OpenWrt ставит сам).
- Проект woziwrt **mt7996-wifi7-manager** (LuCI-мастер MLO) — только для сборок на MediaTek SDK,
  с обычным OpenWrt main несовместим.

## 7. iperf3-сервер на BPI (постоянный)
- `router/iperf3/`: init-скрипт procd `/etc/init.d/iperf3-server`, порты **5201** и **5202**, автоперезапуск,
  автозапуск, сохраняется при sysupgrade. Установлен 15.10.2026.
- С клиента: `iperf3 -c 192.168.88.2` (отдача), `-R` (приём), `-P 4` (потоки), `-p 5202` (второй порт).

## 8. Upstream / OpenWrt
- **Проблема PCIe на 8X**: при загрузке случайно не поднимаются PCIe-линки (BE14/NVMe).
  Причина — `clk_disable_unused()` гасит опорные клоки PEXTP. Фикс: пометить `pextp_p0..p3_sel` как
  `CLK_IS_CRITICAL` (как в MediaTek SDK). Без патча 2/6 загрузок с поднятыми линками, с патчем 16/16.
- **PR openwrt/openwrt#25751** (автор — пользователь, Folkerist), заменил закрытый #25743, закрывает issue #25706.
  На 16.10.2026: открыт, коммит d333858, метка target/mediatek, замечание бота про git-заголовок в патче
  (не трогаем, пока ревьюер не попросит), openwrt-ai — «no new issues», одобрений мейнтейнеров нет.
  Проверяется автоматически раз в 3 дня.
- Вики OpenWrt: страница BPI-R4 Pro обновлена (лог загрузки 8X, чистка разделов 4E), есть русская версия:
  https://openwrt.org/ru/toh/sinovoip/bananapi_bpi-r4_pro
- PR #24038 (bridge flowtable offload) — изучали, не применяли.

## 9. Отложено / идеи
- WED (аппаратный offload Wi-Fi): `options mt7996e wed_enable=1`, замерить, следить за стабильностью.
- Второй слот SFP на BPI (wan-sfp) — когда понадобится.
- Хранилище: лучший вариант — NAS на 10G-порт; DAS по USB ограничен ~400 МБ/с (TerraMaster D2/D4-320 — JBOD).
- Решить: оставить MLO-сеть `test` или вернуть прежний конфиг из бэкапа.

## 10. Как работать с пользователем
- Общение на русском, коротко, команды блоками для копирования.
- Пользователь сам выполняет команды на роутере (`ssh root@192.168.88.2`) и присылает вывод.
- Busybox ash: нет `sort -h`, нет `<(...)`; длинные строки при вставке переносятся; heredoc при вставке
  может ломаться (табуляции → автодополнение). `scp` только с `-O` (на dropbear нет sftp-server).
- Перед изменением конфигов — копия `.bak`. Секреты не повторять и не публиковать.
