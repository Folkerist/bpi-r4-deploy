#!/bin/sh
# move-behind-rb5009.sh - turns the BPI-R4 into a server + Wi-Fi AP inside the RB5009 LAN.
#   RB5009 (192.168.88.1) stays the only router/DHCP; mihomo on it handles blocked sites for everyone.
#   BPI-R4 gets 192.168.88.2 on br-lan, no DHCP/RA of its own, forkop + wg0 off, LTE kept for SMS.
#
#   sh move-behind-rb5009.sh     apply in 5 s; auto-rollback after 10 min unless confirmed
#   touch /tmp/keep-new          confirm the new setup (run it from 192.168.88.2)
#   sh move-behind-rb5009.sh undo  restore the saved pre-move config at any time
IP=192.168.88.2
GW=192.168.88.1
BK=/root/pre-rb5009
FILES="network dhcp firewall wireless forkop"

log() { logger -t rb5009-move "$*"; }

restore() {
	for f in $FILES; do [ -f "$BK/$f" ] && cp "$BK/$f" /etc/config/; done
	rm -f /etc/uplink-mode.off
	/etc/init.d/forkop enable 2>/dev/null
	/etc/init.d/network restart
	/etc/init.d/dnsmasq restart; /etc/init.d/odhcpd restart
	/etc/init.d/forkop start 2>/dev/null
}

apply() {
	sleep 5
	/etc/init.d/forkop stop 2>/dev/null; /etc/init.d/forkop disable 2>/dev/null
	touch /etc/uplink-mode.off

	uci set network.lan.proto='static'
	uci set network.lan.ipaddr="$IP"
	uci set network.lan.netmask='255.255.255.0'
	uci set network.lan.gateway="$GW"
	uci -q delete network.lan.dns; uci add_list network.lan.dns="$GW"
	uci set network.lan.metric='5'
	uci -q delete network.lan.ip6assign
	uci set network.wg0.auto='0'
	uci set network.mm.peerdns='0'
	uci set dhcp.lan.ignore='1'
	uci set dhcp.lan.ra='disabled'
	uci set dhcp.lan.dhcpv6='disabled'
	uci commit network; uci commit dhcp

	ifdown wg0 2>/dev/null
	/etc/init.d/network restart
	/etc/init.d/dnsmasq restart; /etc/init.d/odhcpd restart
	log "applied: br-lan $IP via $GW, waiting 10 min for /tmp/keep-new"

	sleep 600
	if [ -f /tmp/keep-new ]; then
		log "confirmed, keeping the new setup"
	else
		log "not confirmed, rolling back"
		restore
	fi
}

case "$1" in
	run) apply ;;
	undo) restore; log "manual undo done" ;;
	*)
		if [ ! -d "$BK" ]; then
			mkdir -p "$BK"
			for f in $FILES; do cp "/etc/config/$f" "$BK/"; done
			echo "backup: $BK"
		fi
		rm -f /tmp/keep-new
		cp "$0" /tmp/move-behind-rb5009.sh
		if command -v setsid >/dev/null; then
			setsid sh /tmp/move-behind-rb5009.sh run </dev/null >/dev/null 2>&1 &
		else
			( trap '' HUP; sh /tmp/move-behind-rb5009.sh run ) </dev/null >/dev/null 2>&1 &
		fi
		echo "Через 5 с BPI-R4 станет $IP. Подключите кабель RB5009 -> LAN BPI-R4, зайдите по ssh root@$IP"
		echo "и выполните: touch /tmp/keep-new   (иначе через 10 мин всё вернётся назад)"
		;;
esac
