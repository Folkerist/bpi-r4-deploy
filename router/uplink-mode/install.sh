#!/bin/sh
# Installs the WAN-cable/LTE mode switch. Usage: sh install.sh <base-url-of-this-dir>
set -e
U=$1
wget -q -O /usr/bin/uplink-mode.sh "$U/uplink-mode.sh"
wget -q -O /etc/hotplug.d/iface/40-uplink-mode "$U/40-uplink-mode"
chmod +x /usr/bin/uplink-mode.sh
grep -q uplink-mode.sh /etc/crontabs/root 2>/dev/null || echo '* * * * * /usr/bin/uplink-mode.sh' >> /etc/crontabs/root
/etc/init.d/cron restart
for f in /usr/bin/uplink-mode.sh /etc/hotplug.d/iface/40-uplink-mode; do
	grep -qxF "$f" /etc/sysupgrade.conf || echo "$f" >> /etc/sysupgrade.conf
done
# prefer the cable over LTE when both are up
if [ -z "$(uci -q get network.wan.metric)" ] || [ -z "$(uci -q get network.mm.metric)" ]; then
	[ -n "$(uci -q get network.wan.metric)" ] || uci set network.wan.metric='10'
	[ -n "$(uci -q get network.mm.metric)" ] || uci set network.mm.metric='20'
	uci commit network
	echo "metrics changed, reloading network (LTE reconnects, ~30 s)"
	/etc/init.d/network reload
	sleep 30
fi
echo "metrics: wan=$(uci get network.wan.metric) mm=$(uci get network.mm.metric)"
/usr/bin/uplink-mode.sh
echo OK
