#!/bin/sh
# /usr/bin/modem-signal-cache.sh - cron (every minute, as root): samples ModemManager signal twice
# (0 s and 30 s) into /tmp/modem-signal. collectd's exec plugin can't run as root and may not be
# allowed to talk to ModemManager over D-Bus, so modem_collectd.sh (as nobody) only reads this file.
OUT=/tmp/modem-signal

# Extra modem info over AT: temperature (AT+QTEMP) and active bands / carrier aggregation (AT+QCAINFO).
# ModemManager talks QMI to this modem and keeps the AT ports mostly idle, so one short query
# per sample is safe. Prefer the secondary AT port.
at_cmd() {
	for p in /dev/ttyUSB3 /dev/ttyUSB2; do
		[ -c "$p" ] || continue
		r=$( { printf '%s\r' "$1" >&3; timeout 2 cat <&3; } 3<>"$p" 2>/dev/null )
		case "$r" in *OK*|*ERROR*) echo "$r"; return ;; esac
	done
}

at_info() {
	at_cmd 'AT+QTEMP' | sed -n 's/.*"\([^"]*\)","\([0-9]*\)".*/\1 \2/p' | awk '
		$1 == "modem-ambient-usr" { amb = $2 }
		$2 > 0 && $2 > max { max = $2 }
		END { if (max != "") printf "MODEM_TEMP=%s\nMODEM_TEMP_MAX=%s\n", (amb != "" ? amb : max), max }'
	b=$(at_cmd 'AT+QCAINFO' | sed -n 's/^+QCAINFO: *"\([A-Z]*\)",[^"]*"\([^"]*\)".*/\1 \2/p' |
		sed 's/LTE BAND /B/; s/NR5G BAND /n/' | awk 'BEGIN { ORS = "" } { print (NR > 1 ? ", " : "") $0 }')
	[ -n "$b" ] && echo "BANDS='$b'"
}

num() { printf '%s\n' "$1" | sed -n "s/^$2 *: *//p" | head -1 | grep -E '^-?[0-9]+(\.[0-9]+)?$' | awk '$1 > -3000'; }

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
		at_info
	} > "$OUT.tmp" && mv "$OUT.tmp" "$OUT"
}

sample
sleep 30
sample
