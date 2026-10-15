#!/bin/sh
# Installs a permanent iperf3 server (ports 5201, 5202). Usage: sh install.sh <base-url-of-this-dir>
set -e
U=$1
command -v iperf3 >/dev/null || { apk update && apk add iperf3; }
wget -q -O /etc/init.d/iperf3-server "$U/iperf3-server"
chmod +x /etc/init.d/iperf3-server
/etc/init.d/iperf3-server enable
/etc/init.d/iperf3-server restart
for f in /etc/init.d/iperf3-server /etc/rc.d/S99iperf3-server; do
	grep -qxF "$f" /etc/sysupgrade.conf || echo "$f" >> /etc/sysupgrade.conf
done
sleep 1
netstat -ltn 2>/dev/null | grep -E ':520[12] ' || true
echo "OK: iperf3 -c $(uci -q get network.lan.ipaddr) [-p 5202]"
