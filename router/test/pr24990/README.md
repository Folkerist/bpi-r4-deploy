# Test build for openwrt/openwrt#24990 (AS21xxx hwmon temperature)

- Target: OpenWrt SNAPSHOT r36928-6046133027, kernel 6.18.55 (mediatek/filogic), vermagic `6.18.55 SMP mod_unload aarch64`.
- Built out-of-tree with the official SDK of the same build.
- Source `as21xxx.c` = v6.18.55 + OpenWrt patches (generic pending 801-01..804, mediatek 805, 969, 970, 974, 976, 977) + PR #24990 patches 978, 979 (commit e9b11a6).
- Control build without the PR patches has the same symbols as the official `as21xxx.ko` (only difference: `intree=Y` modinfo).
- Loads as an out-of-tree module (kernel taint "O"), only for testing.
- sha256 `74a10a292512b6a3db1ce340250a20f60eff745a5527de3d4a20ae882c7087d5`
