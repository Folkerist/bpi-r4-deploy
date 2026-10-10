Mark the MT7988 PCIe PEXTP reference clock selectors (`pextp_p0_sel`..`pextp_p3_sel`) as `CLK_IS_CRITICAL`, so `clk_disable_unused()` no longer gates them while the deferred, asynchronous `mtk-pcie-gen3` probe is still training the links.

This is the standalone version of the topckgen hunk from #24569 (`135-clk-mediatek-mt7988-pextp-critical-infracfg-mux-gates.patch`), as discussed in #25706. It matches what MediaTek's SDK does.

**Tested on BananaPi BPI-R4 Pro 8X** (BE14 + two NVMe SSDs, kernel 6.18.52):
- without the patch: 2/6 boots with all PCIe links up
- with the patch, no `clk_ignore_unused`: 16/16 (10 warm, 5 cold, 1 after sysupgrade)

Independently confirmed in #25706 by @EPinci and @Diyckstra (10/10 warm, 5/5 cold on 8X).

Closes #25706
