Static aarch64 binaries for the BPI-R4 Pro (OpenWrt, musl), built from upstream sources:

- `amneziawg-go`: github.com/amnezia-vpn/amneziawg-go @ b5928ef (2026-08-28),
  `CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags="-s -w"`
- `awg`: github.com/amnezia-vpn/amneziawg-tools @ ee0f0a9 (2026-08-12), `src/` built with
  `zig cc -target aarch64-linux-musl`, `LDFLAGS=-static`, stripped

Userspace AmneziaWG: does not depend on the kernel version (needs kmod-tun).
