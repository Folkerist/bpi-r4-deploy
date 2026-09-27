#!/bin/sh
# Installs friendly Storage names. Usage: sh install.sh <base-url-of-this-dir>
set -e
wget -q -O /usr/bin/gen-storage-labels.sh "$1/gen-storage-labels.sh"
chmod +x /usr/bin/gen-storage-labels.sh
/usr/bin/gen-storage-labels.sh
grep -q gen-storage-labels /etc/rc.local || sed -i 's#^exit 0#/usr/bin/gen-storage-labels.sh\nexit 0#' /etc/rc.local
for f in /usr/bin/gen-storage-labels.sh /etc/storage-labels; do
	grep -qxF "$f" /etc/sysupgrade.conf || echo "$f" >> /etc/sysupgrade.conf
done
rm -rf /tmp/luci-indexcache* /tmp/luci-modulecache 2>/dev/null || true
echo "OK. Labels:"
grep -E '^\s+"' /www/luci-static/resources/view/status/include/26_storage_labels.js
