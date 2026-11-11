#!/bin/sh
# Live per-core CPU widget on Status -> Overview + CPU/frequency/temperature graphs in Statistics.
set -e
R=https://raw.githubusercontent.com/Folkerist/bpi-r4-deploy/claude/bpi-r4-pcie-link-down-x51z5y/router/cpu-widget
W=/www/luci-static/resources/view/status/include/12_cpu.js
A=/usr/share/rpcd/acl.d/luci-mod-status-cpu-widget.json
wget -q -O $W $R/12_cpu.js
wget -q -O $A $R/acl.json
for f in $W $A; do grep -qxF "$f" /etc/sysupgrade.conf || echo "$f" >> /etc/sysupgrade.conf; done

# graphs: per-core load is on by default in luci-app-statistics; add frequency and temperature
apk update >/dev/null
apk add luci-app-statistics collectd-mod-cpu collectd-mod-cpufreq collectd-mod-thermal collectd-mod-load
uci set luci_statistics.collectd_cpu.enable='1'
uci set luci_statistics.collectd_cpu.ReportByCpu='1'
uci set luci_statistics.collectd_cpu.ValuesPercentage='1'
uci set luci_statistics.collectd_cpufreq.enable='1'
uci set luci_statistics.collectd_thermal.enable='1'
uci set luci_statistics.collectd_load.enable='1'
uci commit luci_statistics
/etc/init.d/luci_statistics enable; /etc/init.d/collectd enable
/etc/init.d/luci_statistics restart; /etc/init.d/collectd restart

rm -rf /tmp/luci-indexcache* /tmp/luci-modulecache 2>/dev/null || true
/etc/init.d/rpcd reload
echo "OK: Overview -> CPU (live), Statistics -> Graphs -> Processor / CPU Frequency / Thermal / System Load"
