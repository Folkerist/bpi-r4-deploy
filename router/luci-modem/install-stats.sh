#!/bin/sh
# Installs modem signal graphs into LuCI -> Statistics -> Graphs -> Modem.
set -e
R=https://raw.githubusercontent.com/Folkerist/bpi-r4-deploy/claude/bpi-r4-pcie-link-down-x51z5y/router/luci-modem
RRD=/mnt/ssd2/collectd-rrd

apk update >/dev/null
apk add luci-app-statistics collectd-mod-exec

mkdir -p /usr/libexec/collectd /www/luci-static/resources/statistics/rrdtool/definitions
wget -q -O /usr/bin/modem-signal-cache.sh $R/modem-signal-cache.sh
wget -q -O /usr/libexec/collectd/modem_collectd.sh $R/modem_collectd.sh
wget -q -O /www/luci-static/resources/statistics/rrdtool/definitions/modem.js $R/modem.js
chmod +x /usr/bin/modem-signal-cache.sh /usr/libexec/collectd/modem_collectd.sh

# keep history on the SSD instead of RAM (/tmp/rrd is lost on reboot)
mkdir -p $RRD
uci set luci_statistics.collectd_rrdtool.DataDir="$RRD"

uci set luci_statistics.collectd_exec.enable='1'
for s in $(uci -q show luci_statistics | sed -n "s/^luci_statistics\.\([^.]*\)\.cmdline='.*modem_collectd.*/\1/p"); do
	uci delete luci_statistics.$s
done
uci add luci_statistics collectd_exec_input >/dev/null
uci set luci_statistics.@collectd_exec_input[-1].cmdline='/usr/libexec/collectd/modem_collectd.sh'
uci set luci_statistics.@collectd_exec_input[-1].cmduser='nobody'
uci set luci_statistics.@collectd_exec_input[-1].cmdgroup='nogroup'
uci commit luci_statistics

grep -q modem-signal-cache /etc/crontabs/root || echo '* * * * * /usr/bin/modem-signal-cache.sh' >> /etc/crontabs/root
/etc/init.d/cron restart
/usr/bin/modem-signal-cache.sh &

for f in /usr/bin/modem-signal-cache.sh /usr/libexec/collectd/modem_collectd.sh \
	/www/luci-static/resources/statistics/rrdtool/definitions/modem.js /etc/config/luci_statistics; do
	grep -qxF "$f" /etc/sysupgrade.conf || echo "$f" >> /etc/sysupgrade.conf
done

/etc/init.d/luci_statistics enable
/etc/init.d/collectd enable
/etc/init.d/luci_statistics restart
/etc/init.d/collectd restart
rm -rf /tmp/luci-indexcache* /tmp/luci-modulecache 2>/dev/null || true
echo "OK: LuCI -> Statistics -> Graphs -> Modem (first points appear in 1-2 minutes)"
