#!/bin/sh
# wg-tun — управление WireGuard-туннелями на OpenWrt из обычного .conf
# (формат wg-quick, который выдаёт MikroTik/провайдер).
#
#   wg-tun add  <имя> <файл.conf|-> [списки forkop...]  создать или обновить туннель
#   wg-tun lists <имя> [списки forkop...]                поменять списки (без списков — убрать из forkop)
#   wg-tun del  <имя>                                    удалить туннель
#   wg-tun list                                          показать туннели и их состояние
#
# Туннель создаётся без маршрута по умолчанию (route_allowed_ips=0):
# трафик в него направляет только forkop по указанным спискам.
# Если в .conf есть DNS — он станет резолвером доменов из списков.

set -e

die() { echo "ошибка: $*" >&2; exit 1; }

check_name() {
	echo "$1" | grep -qE '^[a-z][a-z0-9_]{0,11}$' ||
		die "имя '$1': латиница/цифры/_, с буквы, до 12 символов (например wg1, mikrotik)"
}

wan_zone() {
	uci show firewall | sed -n "s/^firewall\.\([^.=]*\)\.name='wan'$/\1/p" | head -1
}

peer_sections() {
	uci -q show network | sed -n "s/^network\.\([^.=]*\)=wireguard_$1$/\1/p"
}

# section_interface forkop, привязанные к интерфейсу (по option name)
forkop_iface_sections() {
	uci -q show forkop | sed -n "s/^forkop\.\([^.=]*\)\.name='$1'$/\1/p" |
		while read -r s; do [ "$(uci -q get "forkop.$s")" = section_interface ] && echo "$s"; done
}

# секция forkop (action connection), которая ведёт в интерфейс
forkop_section_of() {
	for s in $(forkop_iface_sections "$1"); do uci -q get "forkop.$s.section" && return; done
	return 0
}

forkop_remove() {
	sec=$(forkop_section_of "$1")
	for s in $(forkop_iface_sections "$1"); do uci -q delete "forkop.$s"; done
	[ -n "$sec" ] && uci -q delete "forkop.$sec"
	return 0
}

forkop_set() { # интерфейс dns списки...
	name=$1; dns=$2; shift 2
	sec=$(forkop_section_of "$name"); [ -n "$sec" ] || sec=$name
	forkop_remove "$name"
	[ $# -gt 0 ] || return 0
	uci set "forkop.$sec=section"
	uci set "forkop.$sec.label=$name"
	uci set "forkop.$sec.enabled=1"
	uci set "forkop.$sec.action=connection"
	for l in "$@"; do uci add_list "forkop.$sec.community_lists=$l"; done
	s=$(uci add forkop section_interface)
	uci set "forkop.$s.section=$sec"
	uci set "forkop.$s.name=$name"
	if [ -n "$dns" ]; then
		uci set "forkop.$s.domain_resolver_enabled=1"
		uci set "forkop.$s.domain_resolver_dns_type=udp"
		uci set "forkop.$s.domain_resolver_dns_server=$dns"
	else
		uci set "forkop.$s.domain_resolver_enabled=0"
	fi
}

forkop_lists_of() {
	sec=$(forkop_section_of "$1")
	[ -n "$sec" ] && uci -q get "forkop.$sec.community_lists"
	return 0
}

forkop_dns_of() {
	for s in $(forkop_iface_sections "$1"); do
		[ "$(uci -q get "forkop.$s.domain_resolver_enabled")" = 1 ] && uci -q get "forkop.$s.domain_resolver_dns_server" && return
	done
	return 0
}

forkop_apply() {
	[ -f /etc/config/forkop ] || return 0
	uci commit forkop
	/etc/init.d/forkop restart >/dev/null 2>&1 || true
}

# .conf → команды uci batch
conf_to_uci() { # файл имя
	awk -v N="$2" '
	function trim(s) { gsub(/^[ \t\r]+|[ \t\r]+$/, "", s); return s }
	function q(s) { return "'\''" s "'\''" }
	/^[ \t]*#/ || /^[ \t\r]*$/ { next }
	/^[ \t]*\[Interface\]/ { sec = "i"; next }
	/^[ \t]*\[Peer\]/ { sec = "p"; np++; P = N "_peer" np
		print "set network." P "=wireguard_" N
		print "set network." P ".description=" q("peer" np)
		print "set network." P ".route_allowed_ips=" q("0")
		next }
	{
		i = index($0, "="); if (!i) next
		k = tolower(trim(substr($0, 1, i - 1))); v = trim(substr($0, i + 1))
		if (sec == "i") {
			if (k == "privatekey") print "set network." N ".private_key=" q(v)
			else if (k == "listenport") print "set network." N ".listen_port=" q(v)
			else if (k == "mtu") print "set network." N ".mtu=" q(v)
			else if (k == "address") { n = split(v, a, ","); for (j = 1; j <= n; j++) print "add_list network." N ".addresses=" q(trim(a[j])) }
			else if (k == "dns") { n = split(v, a, ","); for (j = 1; j <= n; j++) { d = trim(a[j]); if (d ~ /^[0-9.]+$/ && dns == "") dns = d } }
			else if (k ~ /^(jc|jmin|jmax|s1|s2|h1|h2|h3|h4)$/) awg = 1
		} else if (sec == "p") {
			if (k == "publickey") print "set network." P ".public_key=" q(v)
			else if (k == "presharedkey") print "set network." P ".preshared_key=" q(v)
			else if (k == "persistentkeepalive") print "set network." P ".persistent_keepalive=" q(v)
			else if (k == "allowedips") { n = split(v, a, ","); for (j = 1; j <= n; j++) print "add_list network." P ".allowed_ips=" q(trim(a[j])) }
			else if (k == "endpoint") {
				h = v; p = ""
				if (match(v, /:[0-9]+$/)) { h = substr(v, 1, RSTART - 1); p = substr(v, RSTART + 1) }
				gsub(/^\[|\]$/, "", h)
				print "set network." P ".endpoint_host=" q(h)
				if (p != "") print "set network." P ".endpoint_port=" q(p)
			}
		}
	}
	END {
		if (awg) { print "#AWG"; exit }
		if (np == 0) { print "#NOPEER"; exit }
		print "#DNS " dns
	}' "$1"
}

wait_handshake() {
	i=0
	while [ $i -lt 15 ]; do
		hs=$(wg show "$1" latest-handshakes 2>/dev/null | awk '$2 > 0 { print; exit }')
		[ -n "$hs" ] && return 0
		sleep 1; i=$((i + 1))
	done
	return 1
}

show_one() {
	n=$1
	up=$(ifstatus "$n" 2>/dev/null | jsonfilter -e '@.up' 2>/dev/null)
	printf '%-12s up=%-5s' "$n" "${up:-?}"
	wg show "$n" latest-handshakes 2>/dev/null | awk -v now="$(date +%s)" '{ if ($2 > 0) printf " handshake %ds назад", now - $2; else printf " handshake нет" }'
	wg show "$n" transfer 2>/dev/null | awk '{ printf "  rx %.1f MiB tx %.1f MiB", $2 / 1048576, $3 / 1048576 }'
	lists=$(forkop_lists_of "$n")
	[ -z "$lists" ] || printf '\n%12s forkop: %s' "" "$lists"
	echo
}

cmd_add() {
	[ $# -ge 2 ] || die "использование: wg-tun add <имя> <файл.conf|-> [списки...]"
	name=$1; src=$2; shift 2
	check_name "$name"
	tmp=/tmp/wg-tun.$$
	trap 'rm -f "$tmp" "$tmp.uci"' EXIT
	if [ "$src" = "-" ]; then cat > "$tmp"; else [ -r "$src" ] || die "нет файла $src"; cp "$src" "$tmp"; fi
	grep -qi '^[[:space:]]*\[Interface\]' "$tmp" || die "в конфиге нет [Interface]"

	conf_to_uci "$tmp" "$name" > "$tmp.uci"
	grep -q '^#AWG' "$tmp.uci" && die "это конфиг AmneziaWG (Jc/Jmin/...), нужен amneziawg, не wireguard"
	grep -q '^#NOPEER' "$tmp.uci" && die "в конфиге нет [Peer]"
	dns=$(sed -n 's/^#DNS *//p' "$tmp.uci")

	existed=0; uci -q get "network.$name" >/dev/null && existed=1
	if [ $existed = 1 ] && [ "$(uci -q get "network.$name.proto")" != wireguard ]; then
		die "интерфейс $name уже есть и это не WireGuard"
	fi
	uci -q delete "network.$name" || true
	for p in $(peer_sections "$name"); do uci delete "network.$p"; done

	{
		echo "set network.$name=interface"
		echo "set network.$name.proto='wireguard'"
		grep -v '^#' "$tmp.uci"
	} | uci batch
	uci commit network

	z=$(wan_zone)
	if [ -n "$z" ]; then
		uci -q del_list "firewall.$z.network=$name" || true
		uci add_list "firewall.$z.network=$name"
		uci commit firewall
	fi

	if [ -f /etc/config/forkop ]; then
		if [ $# -gt 0 ]; then
			forkop_set "$name" "$dns" "$@"
		else
			# обновление ключей/endpoint: списки оставляем, резолвер берём из нового конфига
			old=$(forkop_lists_of "$name")
			# shellcheck disable=SC2086
			[ -z "$old" ] || forkop_set "$name" "$dns" $old
		fi
	fi

	/etc/init.d/network reload
	ifup "$name"
	fw4 reload >/dev/null 2>&1 || true
	if [ -f /etc/config/forkop ]; then forkop_apply; fi

	if wait_handshake "$name"; then echo "OK: $name поднят"; else echo "ВНИМАНИЕ: нет рукопожатия за 15 с (проверьте ключи/endpoint)"; fi
	show_one "$name"
}

cmd_lists() {
	[ $# -ge 1 ] || die "использование: wg-tun lists <имя> [списки...]"
	name=$1; shift
	[ "$(uci -q get "network.$name.proto")" = wireguard ] || die "нет WireGuard-интерфейса $name"
	[ -f /etc/config/forkop ] || die "forkop не установлен"
	dns=$(forkop_dns_of "$name")
	forkop_set "$name" "$dns" "$@"
	forkop_apply
	show_one "$name"
}

cmd_del() {
	[ $# -eq 1 ] || die "использование: wg-tun del <имя>"
	name=$1
	[ "$(uci -q get "network.$name.proto")" = wireguard ] || die "нет WireGuard-интерфейса $name"
	ifdown "$name" 2>/dev/null || true
	uci delete "network.$name"
	for p in $(peer_sections "$name"); do uci delete "network.$p"; done
	uci commit network
	z=$(wan_zone)
	[ -n "$z" ] && { uci -q del_list "firewall.$z.network=$name" || true; uci commit firewall; }
	if [ -f /etc/config/forkop ]; then forkop_remove "$name"; forkop_apply; fi
	/etc/init.d/network reload
	fw4 reload >/dev/null 2>&1 || true
	echo "удалён: $name"
}

cmd_list() {
	names=$(uci -q show network | sed -n "s/^network\.\([^.=]*\)\.proto='wireguard'$/\1/p")
	[ -n "$names" ] || { echo "WireGuard-туннелей нет"; return; }
	for n in $names; do show_one "$n"; done
}

case "$1" in
	add) shift; cmd_add "$@" ;;
	lists) shift; cmd_lists "$@" ;;
	del|delete|rm) shift; cmd_del "$@" ;;
	list|ls|"") cmd_list ;;
	*) sed -n '2,13s/^# \{0,1\}//p' "$0"; exit 1 ;;
esac
