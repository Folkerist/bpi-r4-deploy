# BPI-R4 Pro 8X (MT7988A), OpenWrt: пропадают PCIe-устройства и Wi-Fi ~20 Мбит/с через LTE

## 1. После перезагрузки пропадают NVMe или Wi-Fi (PCIe link down)

**Причина.** Опорные клоки PCIe `pextp_p0_sel … pextp_p3_sel` не прописаны за узлами PCIe в DTS,
поэтому ядро считает их неиспользуемыми и выключает (`clk_disable_unused`). Это происходит прямо
во время установки линка отложенной пробы `mtk-pcie-gen3`, и часть линков случайно не поднимается.

**Решение.** Добавить `clk_ignore_unused` в bootargs U-Boot (sysupgrade его не стирает):
```sh
fw_printenv -n bootargs
fw_setenv bootargs "<ваши текущие bootargs> clk_ignore_unused"
```
Для своей сборки есть вариант лучше: пометить `CLK_TOP_PEXTP_P0..P3_SEL` в
`drivers/clk/mediatek/clk-mt7988-topckgen.c` флагом `CLK_IS_CRITICAL`, как в SDK MediaTek.

## 2. Wi-Fi намного медленнее кабеля при интернете через LTE или проводной WAN

**Причины (три, накладываются друг на друга):**
1. Оператор или вышестоящий роутер помечает входящий трафик DSCP (Yota LTE: AF11 `tos 0x28`,
   у меня за MikroTik: CS1 `tos 0x20`). Wi-Fi по этой метке кладёт пакеты в очередь Background (AC_BK),
   самую медленную. Кабелю метка безразлична. Карта BE14 и её ревизия ни при чём.
2. Без flow offloading маршрутизация клиентов упирается примерно в 100 Мбит/с.
3. GRO на проводном `wan`: склеенные пакеты по 64 КБ при пересылке в Wi-Fi режут скорость в разы.

Проверить метку: `tcpdump -i wan -nn -v -c 20 'tcp and src port 443' | grep -o 'tos 0x[0-9a-f]*'`
(пакет `tcpdump-mini`), при этом что-нибудь качать. Всё, кроме `tos 0x0`/`0x2`, — метка.

**Решение.**
```sh
uci set firewall.@defaults[0].flow_offloading='1'
uci set firewall.@defaults[0].flow_offloading_hw='1'
uci commit firewall; fw4 reload
apk add ethtool
```
И hotplug-скрипт `/etc/hotplug.d/iface/30-uplink-tweaks`: при поднятии `wan`/`mm` он стирает DSCP
на входе интерфейса (netdev ingress, срабатывает до flow offloading, поэтому правило в fw4 не годится)
и выключает GRO на `wan`:
```sh
[ "$ACTION" = ifup ] || exit 0
case "$INTERFACE" in wan|mm) ;; *) exit 0 ;; esac
[ "$INTERFACE" = wan ] && ethtool -K "$DEVICE" gro off
devs=""; for d in wan wwan0; do [ -d /sys/class/net/$d ] && devs="$devs${devs:+, }\"$d\""; done
[ -n "$devs" ] || exit 0
nft -f - <<NFT
table netdev uplink_dscp
delete table netdev uplink_dscp
table netdev uplink_dscp {
	chain ingress {
		type filter hook ingress devices = { $devs } priority -500; policy accept;
		meta protocol ip ip dscp set cs0
		meta protocol ip6 ip6 dscp set cs0
	}
}
NFT
```
Имена `wan`/`mm`/`wwan0` поправьте под себя.

Итог у меня: Wi-Fi через проводной WAN 32 → 129 Мбит/с одним потоком (194 в 4 потока),
через LTE 17 → 86–92 Мбит/с.
