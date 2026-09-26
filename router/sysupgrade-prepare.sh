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

# where the extroot lives now (needed to re-attach it after the upgrade)
block info 2>/dev/null | grep mmcblk0p6 > /root/extroot-before-upgrade.txt
uci -q show fstab.extroot >> /root/extroot-before-upgrade.txt

echo
echo "sysupgrade will keep $(sysupgrade -l | wc -l) files. Check:"
for f in /usr/bin/modem-signal-cache.sh /etc/init.d/docker-graceful /root/pkgs-third-party.txt; do
	sysupgrade -l | grep -qxF "$f" && echo "  OK   $f" || echo "  MISS $f"
done
