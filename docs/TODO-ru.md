# Отложенные задачи (BPI-R4 Pro 8X)

## 1. Эксперимент с WED (Wi-Fi через аппаратный offload)

Сейчас: Wi-Fi через проводной WAN ~129 Мбит/с одним потоком (~194 в 4 потока);
сам роутер качает 560-900, Wi-Fi локально ~578. Разрыв из-за того, что WAN -> Wi-Fi идёт через CPU:
PPE (flow_offloading_hw) ускоряет только кабель, до Wi-Fi дотягивается лишь через WED.

План:
- включить: `echo 'options mt7996e wed_enable=1' > /etc/modules.d/mt7996e-wed; reboot`
  (или через `/etc/modules.conf`), проверить `cat /sys/module/mt7996e/parameters/wed_enable` и dmesg на WED;
- замерить Mac по Wi-Fi (selectel, 1 и 4 потока), сравнить с 129/194;
- проверить, что DSCP-метка снова не мешает: WED/PPE-пакеты идут мимо CPU и правила
  `netdev uplink_dscp` (см. `router/30-uplink-tweaks`) — смотреть `tcpdump -i br-lan` tos и скорость;
- следить за стабильностью (MT7996 + WED бывает нестабилен): dmesg, падения Wi-Fi;
- откат: удалить файл опций, reboot.

## 2. XPON-стик HSGQ (SFP)

- SFP1 (`lan6`, через коммутатор MxL862xx): линк не поднимается — драйвер не может перевести SerDes
  в 1000BASE-X/2500BASE-X (`lan6: autoneg setting not compatible with PCS`), остаётся USXGMII.
- SFP2 (`wan`, GMAC1 MT7988): overlay `8x-wan-sfp` в `bootconf_extra` включает слот, режим выбирается
  верно (2500base-x), но без оптики ядро ждёт снятия LOS (`/sys/kernel/debug/sfp2/state`: `wait_los`).
  Для HSGQ нет quirk `ignore_los` в `sfp.c`.
- Вернуться, когда будет оптика: `fw_setenv bootconf_extra` с `wan-sfp` вместо `wan-phy`
  (копия исходного значения: `/root/bootconf_extra.orig`), затем найти IP стика и зайти через ssh-туннель.

## 3. Upstream

- Отправить в OpenWrt патч 980 (`pextp_p0..p3_sel` как CLK_IS_CRITICAL), чтобы убрать `clk_ignore_unused`.

## Tested-by для openwrt/openwrt#24990 (температура AS21xxx)
- План: после обновления до свежего snapshot собрать `as21xxx.ko` с патчами 978/979 из PR в официальном SDK той же сборки, подменить `/lib/modules/$(uname -r)/as21xxx.ko` (оригинал сохранить), перезагрузиться.
- До патча (r36539, 6.18.52): 11 hwmon, `hwmon4..7` = `mdio_bus:10_mii:00..03` (MxL862xx), датчиков AS21010 нет. Список в `/root/hwmon-before.txt`.
- Ожидается: +2 hwmon для PHY на `mdio-bus:18` и `mdio-bus:1c` (`mdio_bus:18`/`mdio_bus:1c`), ~45–55 °C; WAN/SFP работают как раньше.
- Эталон со стандартным модулем (07.10.2026): WAN (AS21010 на `mdio-bus:1c`) ↔ RB5009, 1000/Full, ping `-s 1400` 60/60, 0% loss, avg 0.53 ms, errors 0 (dropped RX 6 / TX 4 при поднятии линка). Сохранено в `/root/wan-before.txt`, `/root/as21-before.txt`. На время теста: `network.wan.defaultroute=0`, `peerdns=0`, потом удалить и `ifdown wan`.
- Результат (08.10.2026, r36928, 6.18.55): модуль из PR загружен (taint O), появились `mdio_bus:18` 50.7 °C и `mdio_bus:1c` 60.3 °C, WAN 1000/Full, ping 60/60. Модуль лежит в `/overlay/upper/lib/modules/6.18.55/as21xxx.ko` — при следующем обновлении НЕ сохранять (prepare исключает lib/modules/), иначе 10G-порты не поднимутся на другом ядре.
