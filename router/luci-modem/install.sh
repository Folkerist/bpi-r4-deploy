#!/bin/sh
# Installs the LuCI "Status -> Modem" page on the router.
set -e
R=https://raw.githubusercontent.com/Folkerist/bpi-r4-deploy/claude/bpi-r4-pcie-link-down-x51z5y/router/luci-modem
wget -q -O /www/luci-static/resources/view/modem-status.js $R/modem-status.js
wget -q -O /usr/share/luci/menu.d/luci-app-modem-status.json $R/menu.json
wget -q -O /usr/share/rpcd/acl.d/luci-app-modem-status.json $R/acl.json
wget -q -O /etc/hotplug.d/iface/35-modem-signal $R/35-modem-signal
chmod +x /etc/hotplug.d/iface/35-modem-signal
for f in /www/luci-static/resources/view/modem-status.js /usr/share/luci/menu.d/luci-app-modem-status.json \
	/usr/share/rpcd/acl.d/luci-app-modem-status.json /etc/hotplug.d/iface/35-modem-signal; do
	grep -qxF "$f" /etc/sysupgrade.conf || echo "$f" >> /etc/sysupgrade.conf
done
mmcli -m any --signal-setup=10 >/dev/null 2>&1 || true
mmcli -m any --location-enable-3gpp >/dev/null 2>&1 || true
rm -rf /tmp/luci-indexcache* /tmp/luci-modulecache 2>/dev/null || true
/etc/init.d/rpcd reload
echo "OK: LuCI -> Status -> Modem"
