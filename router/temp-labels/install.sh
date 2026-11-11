#!/bin/sh
# Installs readable sensor names for the luci-app-temp-status widget.
set -e
wget -q -O /usr/bin/gen-temp-labels.sh https://raw.githubusercontent.com/Folkerist/bpi-r4-deploy/claude/bpi-r4-pcie-link-down-x51z5y/router/temp-labels/gen-temp-labels.sh
chmod +x /usr/bin/gen-temp-labels.sh
/usr/bin/gen-temp-labels.sh
grep -q gen-temp-labels /etc/rc.local || sed -i 's#^exit 0#/usr/bin/gen-temp-labels.sh\nexit 0#' /etc/rc.local
grep -qxF /usr/bin/gen-temp-labels.sh /etc/sysupgrade.conf || echo /usr/bin/gen-temp-labels.sh >> /etc/sysupgrade.conf
rm -rf /tmp/luci-indexcache* /tmp/luci-modulecache 2>/dev/null || true
echo "OK. Generated labels:"
grep -E '^\s+"|^var NVME' /www/luci-static/resources/view/status/include/28_temp_labels.js
