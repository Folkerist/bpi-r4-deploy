# Поля формы Bug report для OpenWrt

Копируйте содержимое каждого блока в одноимённое поле. Поля, которые уже заполнены правильно, отмечены «уже есть».

---

## Add a title (уже есть)
```
mediatek/filogic: BPI-R4 Pro 8X: random PCIe "link down" at boot — pextp_p0..p3_sel gated by clk_disable_unused()
```

## Describe the bug
```
On BPI-R4 Pro 8X with all PCIe slots populated, a random subset of the four mtk-pcie-gen3 controllers fails at boot with "PCIe link down" / -110, so NVMe SSDs and/or Wi-Fi radios disappear until the next lucky reboot.

Cause: the topckgen clocks pextp_p0_sel..pextp_p3_sel (26 MHz, one per PCIe port) are enabled by the bootloader but have no consumer in mt7988a.dtsi, so clk_disable_unused() gates them. On this board the PCIe probe is deferred and runs asynchronously, so clk_disable_unused() hits the middle of reset/link training.

Booting with clk_ignore_unused (17/17) or marking these four clocks CLK_IS_CRITICAL (16/16, the way MediaTek's SDK does it) fixes it completely; stock gave 2/6. Details and the patch are in "Additional info".
```

## OpenWrt version
Сюда нужна именно ревизия, а не текст. Замените то, что там сейчас, на:
```
r36539-98bc30d154
```
(проверить на роутере: `. /etc/openwrt_release && echo $DISTRIB_REVISION`)

## OpenWrt release
```
SNAPSHOT
```

## OpenWrt target/subtarget
```
mediatek/filogic
```

## Device (уже есть, можно заменить на это)
```
Banana Pi BPI-R4 Pro 8X (bananapi_bpi-r4-pro-8x), MT7988A, eMMC boot, U-Boot 2026.07-OpenWrt-r35937. PCIe: BE14 Wi-Fi (MT7996, 2 links) + 2x M.2 NVMe SSD (CN13, CN14).
```

## Image kind (уже есть)
`Official downloaded image`

## Steps to reproduce (уже есть)

## Actual behaviour (уже есть)

## Expected behaviour (уже есть)

## Additional info
````
### Root cause

CLK_TOP_PEXTP_P0_SEL..CLK_TOP_PEXTP_P3_SEL (topckgen CLK_CFG_13/14) are left enabled by the bootloader but have no consumer in mt7988a.dtsi — the PCIe nodes only reference infracfg clocks (pl_250m, tl_26m, peri_26m, top_133m). So clk_disable_unused() (late_initcall_sync) gates them.

The PCIe probe is deferred once ("Failed to get clk index: 0 ret: -517"), all four controllers are re-probed from deferred_probe_initcall() at ~6.5 s, and since the driver uses PROBE_PREFER_ASYNCHRONOUS, clk_disable_unused() runs right after, inside the reset/link-training window. Every failing boot had "clk: Disabling unused clocks" 50–150 ms after the PCIe probe started; successful ones ~440 ms.

clk_summary on a good boot with clk_ignore_unused (hardware_enable = Y, enable_cnt = 0): pextp_p0_sel..p3_sel, da_xtp_glb_p0_sel..p3_sel, pextp_sel, pcie_mbist_250m_sel. All clocks claimed by the PCIe nodes have enable_cnt >= 1.

MediaTek's SDK (mtk-openwrt-feeds) marks exactly these clocks critical (999-clk-03-clk-mediatek-mt7988-mark-spi0-and-pextp-clks-as-critical.patch) and later also adds them as "pextp_clk" to each PCIe node.

### Test results (kernel 6.18.52)

| Configuration | Boots | All links up |
|---|---|---|
| stock | 6 warm | 2 |
| clk_ignore_unused | 17 (11 warm, 6 cold) | 17 |
| patch below, no cmdline option | 16 (10 warm, 5 cold, 1 after sysupgrade) | 16 |

A backport of the upstream PERST# timing / .shutdown fixes (22fc8822d146, 7a0e17e7a081, v7.2) made no difference.

### Workaround

```
fw_setenv bootargs "$(fw_printenv -n bootargs) clk_ignore_unused"
```

### Proposed fix

Pextp part of the SDK patch (SPI0 part left out, since 255-clk-mediatek-mt7988-infracfg-SPI0-clocks-are-not-critical.patch does the opposite). Applies on current patches-6.18:

```diff
--- a/drivers/clk/mediatek/clk-mt7988-topckgen.c
+++ b/drivers/clk/mediatek/clk-mt7988-topckgen.c
@@ -225,15 +225,15 @@ static const struct mtk_mux top_muxes[] = {
 				   0x0d0, 0x0d4, 0x0d8, 0, 2, 7, 0x1C4, 21, CLK_IS_CRITICAL),
 	MUX_GATE_CLR_SET_UPD_FLAGS(CLK_TOP_INFRA_F26M_SEL, "csw_infra_f26m_sel", sspxtp_parents,
 				   0x0d0, 0x0d4, 0x0d8, 8, 1, 15, 0x1C4, 22, CLK_IS_CRITICAL),
-	MUX_GATE_CLR_SET_UPD(CLK_TOP_PEXTP_P0_SEL, "pextp_p0_sel", sspxtp_parents, 0x0d0, 0x0d4,
-			     0x0d8, 16, 1, 23, 0x1C4, 23),
-	MUX_GATE_CLR_SET_UPD(CLK_TOP_PEXTP_P1_SEL, "pextp_p1_sel", sspxtp_parents, 0x0d0, 0x0d4,
-			     0x0d8, 24, 1, 31, 0x1C4, 24),
+	MUX_GATE_CLR_SET_UPD_FLAGS(CLK_TOP_PEXTP_P0_SEL, "pextp_p0_sel", sspxtp_parents, 0x0d0,
+				   0x0d4, 0x0d8, 16, 1, 23, 0x1C4, 23, CLK_IS_CRITICAL),
+	MUX_GATE_CLR_SET_UPD_FLAGS(CLK_TOP_PEXTP_P1_SEL, "pextp_p1_sel", sspxtp_parents, 0x0d0,
+				   0x0d4, 0x0d8, 24, 1, 31, 0x1C4, 24, CLK_IS_CRITICAL),
 	/* CLK_CFG_14 */
-	MUX_GATE_CLR_SET_UPD(CLK_TOP_PEXTP_P2_SEL, "pextp_p2_sel", sspxtp_parents, 0x0e0, 0x0e4,
-			     0x0e8, 0, 1, 7, 0x1C4, 25),
-	MUX_GATE_CLR_SET_UPD(CLK_TOP_PEXTP_P3_SEL, "pextp_p3_sel", sspxtp_parents, 0x0e0, 0x0e4,
-			     0x0e8, 8, 1, 15, 0x1C4, 26),
+	MUX_GATE_CLR_SET_UPD_FLAGS(CLK_TOP_PEXTP_P2_SEL, "pextp_p2_sel", sspxtp_parents, 0x0e0,
+				   0x0e4, 0x0e8, 0, 1, 7, 0x1C4, 25, CLK_IS_CRITICAL),
+	MUX_GATE_CLR_SET_UPD_FLAGS(CLK_TOP_PEXTP_P3_SEL, "pextp_p3_sel", sspxtp_parents, 0x0e0,
+				   0x0e4, 0x0e8, 8, 1, 15, 0x1C4, 26, CLK_IS_CRITICAL),
```

A cleaner long-term fix would be to add <&topckgen CLK_TOP_PEXTP_Px_SEL> to each pcie@ node (the driver takes all clocks via devm_clk_bulk_get_all()) and upstream that to Linux. Happy to test either variant on the board.

The plain BPI-R4 shares mt7988a.dtsi and is probably affected too, just less often (fewer populated slots).
````

## Diffconfig
Оставить **пустым** (образ официальный, не самосборка).

## Terms
Поставить галочку **I am reporting an issue for OpenWrt, not an unsupported fork.**

Затем нажать зелёную кнопку **Create**.
