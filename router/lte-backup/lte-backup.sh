#!/bin/sh
# lte-backup.sh - BPI-R4 as the LTE backup gateway for the RB5009 LAN.
# RB5009 sends traffic to 192.168.88.2 only when its fiber route is down (distance-2 default route).
# Packets that arrive on br-lan to be routed (i.e. from RB5009) go out via LTE (table 100);
# the router's own traffic and LAN/static routes keep using the main table.
#
#   sh lte-backup.sh          install (uci rules + hotplug) and apply now
#   sh lte-backup.sh undo     remove everything
TABLE=100
HP=/etc/hotplug.d/iface/45-lte-backup

del_rules() {
	for s in $(uci -q show network | sed -n "s/^network\.\([^.=]*\)\.comment='lte-backup'$/\1/p"); do
		uci delete "network.$s"
	done
}

case "$1" in
undo)
	del_rules; uci commit network
	rm -f "$HP"; sed -i "\#^$HP\$#d" /etc/sysupgrade.conf
	ip route flush table $TABLE 2>/dev/null
	/etc/init.d/network reload
	echo "lte-backup removed"
	exit 0 ;;
esac

cat > "$HP" <<EOF
#!/bin/sh
# keep the LTE default route in table $TABLE (used for traffic routed from the LAN, see lte-backup.sh)
[ "\$INTERFACE" = mm ] || exit 0
case "\$ACTION" in
	ifup|ifupdate)
		dev=\$(ifstatus mm | jsonfilter -e '@.l3_device')
		[ -n "\$dev" ] && ip route replace default dev "\$dev" table $TABLE && logger -t lte-backup "table $TABLE: default via \$dev" ;;
	ifdown) ip route flush table $TABLE ;;
esac
EOF
chmod +x "$HP"
grep -qxF "$HP" /etc/sysupgrade.conf || echo "$HP" >> /etc/sysupgrade.conf

del_rules
s=$(uci add network rule)
uci set network.$s.comment='lte-backup'
uci set network.$s.in='lan'
uci set network.$s.lookup='main'
uci set network.$s.suppress_prefixlength='0'
uci set network.$s.priority='100'
s=$(uci add network rule)
uci set network.$s.comment='lte-backup'
uci set network.$s.in='lan'
uci set network.$s.lookup="$TABLE"
uci set network.$s.priority='101'
uci commit network
/etc/init.d/network reload
sleep 3

# mm is already up: fill the table now
ACTION=ifup INTERFACE=mm sh "$HP"

echo "== rules";   ip rule | grep -E '^10[01]:'
echo "== table $TABLE"; ip route show table $TABLE
echo "== lan -> wan forwarding"; uci show firewall | grep -A2 "=forwarding" | grep -E "src='lan'|dest='wan'" | head -2
