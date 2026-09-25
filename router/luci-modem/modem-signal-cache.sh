#!/bin/sh
# /usr/bin/modem-signal-cache.sh - cron (every minute, as root): samples ModemManager signal twice
# (0 s and 30 s) into /tmp/modem-signal. collectd's exec plugin can't run as root and may not be
# allowed to talk to ModemManager over D-Bus, so modem_collectd.sh (as nobody) only reads this file.
OUT=/tmp/modem-signal

num() { printf '%s\n' "$1" | sed -n "s/^$2 *: *//p" | head -1 | grep -E '^-?[0-9]+(\.[0-9]+)?$'; }

sample() {
	s=$(mmcli -m any --signal-get -K 2>/dev/null) || return
	m=$(mmcli -m any -K 2>/dev/null)
	{
		echo "TS=$(date +%s)"
		for t in lte:LTE 5g:NR; do
			for f in rssi:RSSI rsrp:RSRP rsrq:RSRQ snr:SNR; do
				v=$(num "$s" "modem.signal.${t%%:*}.${f%%:*}")
				[ -n "$v" ] && echo "${t##*:}_${f##*:}=$v"
			done
		done
		v=$(num "$m" "modem.generic.signal-quality.value")
		[ -n "$v" ] && echo "QUALITY=$v"
	} > "$OUT.tmp" && mv "$OUT.tmp" "$OUT"
}

sample
sleep 30
sample
