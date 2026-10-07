#!/bin/sh
# sysupgrade-prepare.sh - run before an attended sysupgrade (owut / LuCI ASU).
# Fixes what sysupgrade-audit.sh reported as LOST and writes package lists to /root (kept).
KEEPF=/etc/sysupgrade.conf
THIRD="forkop luci-app-forkop luci-i18n-forkop-ru sing-box-extended luci-theme-proton2025 luci-app-temp-status luci-i18n-temp-status-ru"

keep() { [ -e "$1" ] || [ -L "$1" ] || return 0; grep -qxF "$1" "$KEEPF" || { echo "$1" >> "$KEEPF"; echo "+ keep $1"; }; }

# our files that the audit showed as LOST
keep /usr/bin/modem-signal-cache.sh
keep /usr/libexec/collectd/modem_collectd.sh
keep /www/luci-static/resources/statistics/rrdtool/definitions/modem.js
keep /etc/init.d/docker-graceful
for l in /etc/rc.d/*docker-graceful; do keep "$l"; done

# everything else on the overlay that belongs to no package and would be LOST (hand-installed
# scripts, hotplug, nftables.d, LuCI views...). Same rules as sysupgrade-audit.sh.
UP=/overlay/upper
sysupgrade -l 2>/dev/null | sort -u > /tmp/.keep.$$
find "$UP" -xdev -type f 2>/dev/null | sed "s#^$UP##" | grep -vE \
	'^/(etc/config/|etc/apk/|lib/apk/|usr/lib/apk/|etc/uci-defaults/|etc/\.extroot-uuid|etc/\.|etc/board\.json|etc/urandom\.seed|usr/share/sing-box/|tmp/|var/|root/\.ash_history|usr/lib/python|usr/lib/node_modules|opt/)' |
while read -r f; do
	grep -qxF "$f" /tmp/.keep.$$ && continue
	apk info -W "$f" >/dev/null 2>&1 && continue
	keep "$f"
done
rm -f /tmp/.keep.$$

# custom init scripts: keep the script and its rc.d links (enabled state)
for s in /etc/init.d/*; do
	apk info -W "$s" >/dev/null 2>&1 && continue
	keep "$s"
	for l in /etc/rc.d/[SK]??"${s##*/}"; do keep "$l"; done
done

# state to restore/compare after the upgrade (all in /root, which is kept)
grep -qxF /root/ "$KEEPF" || { echo /root/ >> "$KEEPF"; echo "+ keep /root/"; }
for s in /etc/init.d/*; do "$s" enabled 2>/dev/null && echo "${s##*/}"; done > /root/services-enabled.txt
fw_printenv > /root/uboot-env-before-upgrade.txt 2>/dev/null
cp /etc/apk/repositories.d/*.list /root/ 2>/dev/null
ls /etc/apk/keys/ > /root/apk-keys-before-upgrade.txt 2>/dev/null
echo "services enabled: $(wc -l < /root/services-enabled.txt) -> /root/services-enabled.txt"

# modem signal cache must refresh every minute (the modem page and graphs read it)
if [ -x /usr/bin/modem-signal-cache.sh ] && ! grep -q modem-signal-cache /etc/crontabs/root; then
	echo '* * * * * /usr/bin/modem-signal-cache.sh' >> /etc/crontabs/root
	/etc/init.d/cron restart
	echo "+ cron: modem-signal-cache.sh"
fi

# package lists for the upgrade request and for reinstalling afterwards
tr ' ' '\n' < /etc/apk/world | sed 's/[<>=~].*//' | grep -v '^$' | sort -u > /root/pkgs-world.txt
: > /root/pkgs-third-party.txt
for p in $THIRD; do grep -qxF "$p" /root/pkgs-world.txt && echo "$p" >> /root/pkgs-third-party.txt; done
grep -vxF -f /root/pkgs-third-party.txt /root/pkgs-world.txt > /root/pkgs-asu.txt
echo "pkgs: $(wc -l < /root/pkgs-world.txt) installed, third-party (not buildable by ASU): $(tr '\n' ' ' < /root/pkgs-third-party.txt)"

# After a sysupgrade the first boot runs on the internal overlay (fstab is restored late), but
# the next boot mounts the OLD extroot again (its uuid check passes on this eMMC/fitblk layout):
# old r365xx files on top of the new firmware. Disable the extroot on the first boot of a
# different firmware revision; recreate it fresh afterwards.
if [ "$(uci -q get fstab.extroot.enabled)" = 1 ]; then
	. /etc/openwrt_release
	cat > /etc/uci-defaults/99-disable-old-extroot <<EOT
#!/bin/sh
. /etc/openwrt_release
[ "\$DISTRIB_REVISION" = "$DISTRIB_REVISION" ] && exit 1
uci -q set fstab.extroot.enabled='0' && uci commit fstab
logger -t sysupgrade "old extroot disabled after upgrade from $DISTRIB_REVISION"
exit 0
EOT
	keep /etc/uci-defaults/99-disable-old-extroot
	echo "+ extroot will be disabled on the first boot of the new firmware"
fi

# where the extroot lives now (needed to re-attach it after the upgrade)
block info 2>/dev/null | grep mmcblk0p6 > /root/extroot-before-upgrade.txt
uci -q show fstab.extroot >> /root/extroot-before-upgrade.txt

echo
echo "sysupgrade will keep $(sysupgrade -l | wc -l) files. Check:"
for f in /usr/bin/modem-signal-cache.sh /etc/init.d/docker-graceful /root/pkgs-third-party.txt; do
	sysupgrade -l | grep -qxF "$f" && echo "  OK   $f" || echo "  MISS $f"
done
