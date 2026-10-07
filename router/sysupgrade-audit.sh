#!/bin/sh
# sysupgrade-audit.sh - what survives a (attended) sysupgrade on this router and what does not.
# Read-only: prints a report to /tmp/sysupgrade-audit.txt, changes nothing. No keys/passwords are printed.
# Takes a few minutes: every file on the overlay is checked against the package database.
OUT=/tmp/sysupgrade-audit.txt
UP=/overlay/upper
KEEP=/tmp/.sysupgrade-keep.$$

owned() { apk info -W "$1" >/dev/null 2>&1; }

{
echo "== firmware"
. /etc/openwrt_release; echo "$DISTRIB_DESCRIPTION  target=$DISTRIB_TARGET  kernel=$(uname -r)"

echo; echo "== overlay / extroot"
mount | grep -E ' on /(overlay|rom) ' | cut -d' ' -f1-5
uci -q show fstab | grep -E "target='/overlay'" | sed 's/\.target.*//' | while read -r s; do
	uci -q show "$s" | grep -vE '\.uuid='
done
[ -f /overlay/etc/.extroot-uuid ] && echo "extroot-uuid file: present (binds extroot to this firmware build)"
df -h /overlay /rom | tail -2

echo; echo "== U-Boot bootargs (PCIe clk_ignore_unused lives here, not in the firmware)"
fw_printenv bootargs 2>/dev/null || echo "fw_printenv unavailable (uboot-envtools not installed)"

echo; echo "== package repositories"
grep -hv '^\s*#' /etc/apk/repositories /etc/apk/repositories.d/* 2>/dev/null | grep -v '^$'

echo; echo "== packages you installed (apk world) and where they come from"
for p in $(cat /etc/apk/world); do
	n=${p%%[<>=~]*}
	src=$(apk policy "$n" 2>/dev/null | grep -oE 'https?://[^ ]+' | head -1)
	case "$src" in
		*downloads.openwrt.org*|*mirror*openwrt*) tag=official ;;
		"") tag="LOCAL/UNKNOWN (installed from a file?)" ;;
		*) tag="THIRD-PARTY $src" ;;
	esac
	echo "$n  [$tag]"
done

sysupgrade -l 2>/dev/null | sort -u > "$KEEP"

echo; echo "== files on the overlay that belong to no package (added by hand / by scripts)"
echo "   KEEP = saved by sysupgrade, LOST = will disappear"
find "$UP" -xdev -type f 2>/dev/null | sed "s#^$UP##" | grep -vE \
	'^/(etc/config/|etc/apk/|lib/apk/|usr/lib/apk/|etc/uci-defaults/|etc/\.extroot-uuid|etc/\.|etc/board\.json|etc/urandom\.seed|usr/share/sing-box/|tmp/|var/|root/\.ash_history)' |
while read -r f; do
	owned "$f" && continue
	if grep -qxF "$f" "$KEEP"; then echo "KEEP $f"; else echo "LOST $f"; fi
done

echo; echo "== package files you modified (not conffiles => LOST unless listed)"
find "$UP" -xdev -type f -path "$UP/www/*" -o -xdev -type f -path "$UP/usr/share/*" -o -xdev -type f -path "$UP/etc/init.d/*" 2>/dev/null |
	sed "s#^$UP##" | while read -r f; do
	owned "$f" || continue
	grep -qxF "$f" "$KEEP" || echo "MODIFIED? $f  ($(apk info -W "$f" 2>/dev/null | sed 's/.* by //'))"
done | head -40

echo; echo "== /etc/sysupgrade.conf"
grep -v '^\s*#' /etc/sysupgrade.conf | grep -v '^$'

echo; echo "== custom init scripts and their state"
for s in /etc/init.d/*; do
	owned "$s" && continue
	st=disabled; "$s" enabled 2>/dev/null && st=enabled
	k=LOST; grep -qxF "$s" "$KEEP" && k=KEEP
	echo "$k $s ($st)"
done

echo; echo "== cron (root)"
cat /etc/crontabs/root 2>/dev/null
echo; echo "== rc.local"
grep -vE '^\s*(#|$)' /etc/rc.local

echo; echo "== docker (data outside the firmware)"
docker ps -a --format '{{.Names}}  {{.Image}}  {{.Status}}' 2>/dev/null
uci -q get dockerd.globals.data_root

echo; echo "== size of the settings backup (kept files, must fit in RAM)"
du -sh /root 2>/dev/null
sysupgrade -b /tmp/.bk.$$.tgz >/dev/null 2>&1 && ls -lh /tmp/.bk.$$.tgz | awk '{print "backup:", $5}'; rm -f /tmp/.bk.$$.tgz

echo; echo "== disks"
df -h | grep -E '^/dev/'
} > "$OUT" 2>&1

rm -f "$KEEP"
echo "Готово: $OUT ($(wc -l < "$OUT") строк)"
