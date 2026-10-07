# OpenWrt issue: BPI-R4 Pro 8X PCIe link down (pextp clocks gated by clk_disable_unused)

> Как отправить: https://github.com/openwrt/openwrt/issues/new/choose → «Bug report».
> Заголовок взять из строки **Title** ниже, остальное раскидать по полям формы
> (или вставить целиком в описание). Патч 980 — в `patches/pcie-6.18/` этого репозитория,
> его можно приложить файлом или вставить из раздела «Proposed fix».

---

**Title:** mediatek/filogic: BPI-R4 Pro 8X: random PCIe "link down" at boot — pextp_p0..p3_sel gated by clk_disable_unused()

### Device

Banana Pi BPI-R4 Pro 8X (`bananapi_bpi-r4-pro-8x`), MT7988A, booting from eMMC.
U-Boot `2026.07-OpenWrt-r35937`.

PCIe endpoints: BE14 Wi-Fi card (MT7996, two links) + two M.2 NVMe SSDs (CN13, CN14) — all four
PCIe controllers have a device attached.

### OpenWrt version

SNAPSHOT, reproduced on official images r36407 and r36539 and on a self-built r36531,
kernel 6.18.52. Nothing in the code has changed up to r36928 (6.18.55) as far as I can see:
`pextp_p*_sel` are still neither critical nor referenced from the PCIe nodes.

### Steps to reproduce

1. Populate all PCIe slots (Wi-Fi card + NVMe SSDs).
2. Reboot (warm or cold) several times.

### Actual behaviour

On a random subset of boots, one or more (sometimes all four) `mtk-pcie-gen3` controllers fail:

```
mtk-pcie-gen3 11300000.pcie: PCIe link down, current LTSSM state: detect.active (0x1000001)
mtk-pcie-gen3 11300000.pcie: probe with driver mtk-pcie-gen3 failed with error -110
```

(`detect.quiet (0x0)` is also seen.) The affected SSD / Wi-Fi radio is then missing until the
next reboot that happens to succeed. Without any workaround only 2 of 6 boots brought up all links.

### Expected behaviour

All four PCIe links come up on every boot.

### Root cause

`CLK_TOP_PEXTP_P0_SEL` … `CLK_TOP_PEXTP_P3_SEL` (topckgen `CLK_CFG_13/14`, 26 MHz, one per port)
are enabled by the bootloader but have **no consumer** in `mt7988a.dtsi` — the PCIe nodes only
reference the infracfg clocks (`pl_250m`, `tl_26m`, `peri_26m`, `top_133m`). Therefore
`clk_disable_unused()` (`late_initcall_sync`) gates them.

On this board the PCIe probe is deferred once (`Failed to get clk index: 0 ret: -517`), so all four
controllers are re-probed from `deferred_probe_initcall()` at ~6.5 s. Because the driver uses
`PROBE_PREFER_ASYNCHRONOUS`, `clk_disable_unused()` runs right after that, i.e. *inside* the
reset / link-training window. In the logs, every failing boot had
`clk: Disabling unused clocks` 50–150 ms after the PCIe probe started; the successful ones had
~440 ms. With more populated slots the race is hit more often, which is probably why it isn't
reported more widely.

`clk_summary` on a good boot with `clk_ignore_unused` shows these as `hardware_enable = Y`,
`enable_cnt = 0` (i.e. what `clk_disable_unused()` would gate):
`pextp_p0_sel..pextp_p3_sel`, `da_xtp_glb_p0_sel..p3_sel`, `pextp_sel`, `pcie_mbist_250m_sel`.
All clocks actually claimed by the PCIe nodes have `enable_cnt >= 1`.

MediaTek's SDK (mtk-openwrt-feeds) marks exactly these clocks critical
(`999-clk-03-clk-mediatek-mt7988-mark-spi0-and-pextp-clks-as-critical.patch`), and a later SDK
commit additionally adds them as a `pextp_clk` to each PCIe node.

### Test results (BPI-R4 Pro 8X, kernel 6.18.52)

| Configuration | Boots | All links up | Failed |
|---|---|---|---|
| stock | 6 (warm) | 2 | 4 (one with all four ports down) |
| `clk_ignore_unused` on cmdline | 17 (11 warm, 6 cold) | **17** | 0 |
| patch below, no cmdline option | 16 (10 warm, 5 cold, 1 after sysupgrade) | **16** | 0 |

With the patch, `clk: Disabling unused clocks` still fires 50–500 ms after the PCIe probe starts
(including the 50–65 ms cases that used to fail), but the links no longer drop.

A backport of the upstream PERST# timing / `.shutdown` fixes (22fc8822d146, 7a0e17e7a081,
v7.2) was also tried and made no difference — the cause here is the clocks, not PERST# timing.

### Workaround

```sh
fw_setenv bootargs "$(fw_printenv -n bootargs) clk_ignore_unused"
```

### Proposed fix

Minimal, vendor-derived (the pextp part of the SDK patch above; the SPI0 part is left out on
purpose, since `255-clk-mediatek-mt7988-infracfg-SPI0-clocks-are-not-critical.patch` does the
opposite). Applies cleanly on top of the current `patches-6.18`:

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

A cleaner long-term fix would be to describe the dependency in the DT (add
`<&topckgen CLK_TOP_PEXTP_Px_SEL>` to each `pcie@` node — the driver takes all clocks via
`devm_clk_bulk_get_all()`), as MediaTek later did in the SDK, and upstream that to Linux. I'm happy
to test either variant on the board.

The plain BPI-R4 (non-Pro) uses the same `mt7988a.dtsi` and is probably affected as well,
just less often (fewer populated slots).
