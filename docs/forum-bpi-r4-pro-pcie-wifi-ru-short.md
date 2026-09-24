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

## 2. Wi-Fi не быстрее ~20 Мбит/с при интернете через LTE-модем (по кабелю быстро)

**Причина.** Оператор помечает входящий трафик DSCP (например, AF11, `tos 0x28`). Wi-Fi по этой
метке кладёт пакеты в очередь Background (AC_BK), самую медленную. Кабелю метка безразлична.
Карта BE14 и её ревизия ни при чём.

Проверить: `tcpdump -i wwan0 -nn -v -c 20 'tcp and src port 443' | grep -o 'tos 0x[0-9a-f]*'`
(пакет `tcpdump-mini`), при этом что-нибудь качать. Всё, кроме `tos 0x0`, — метка оператора.

**Решение.** Стирать метку на входе с модема. Файл `/etc/nftables.d/20-wwan-dscp-reset.nft`:
```
chain wwan_dscp_reset {
	type filter hook prerouting priority mangle; policy accept;
	iifname "wwan*" ip dscp set cs0
	iifname "wwan*" ip6 dscp set cs0
}
```
```sh
fw4 check && fw4 reload
echo /etc/nftables.d/20-wwan-dscp-reset.nft >> /etc/sysupgrade.conf
```
Если WAN не `wwan*`, поправьте имя интерфейса.
