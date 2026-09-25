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
