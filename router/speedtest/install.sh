#!/bin/sh
# Installs LuCI "Status -> Speed test". Usage: sh install.sh <base-url-of-this-dir>
set -e
U=$1
wget -q -O /usr/bin/speedtest.sh "$U/speedtest.sh"
wget -q -O /www/luci-static/resources/view/speedtest.js "$U/speedtest.js"
wget -q -O /usr/share/luci/menu.d/luci-app-speedtest.json "$U/menu.json"
wget -q -O /usr/share/rpcd/acl.d/luci-app-speedtest.json "$U/acl.json"
chmod +x /usr/bin/speedtest.sh
for f in /usr/bin/speedtest.sh /www/luci-static/resources/view/speedtest.js \
	/usr/share/luci/menu.d/luci-app-speedtest.json /usr/share/rpcd/acl.d/luci-app-speedtest.json; do
	grep -qxF "$f" /etc/sysupgrade.conf || echo "$f" >> /etc/sysupgrade.conf
done
rm -rf /tmp/luci-indexcache* /tmp/luci-modulecache 2>/dev/null || true
/etc/init.d/rpcd reload
echo "OK: LuCI -> Status -> Speed test"
