#!/bin/sh
# /usr/libexec/collectd/modem_collectd.sh - collectd exec plugin (runs as nobody).
# Publishes the values cached by modem-signal-cache.sh as collectd PUTVALs for plugin "modem".
HOST="${COLLECTD_HOSTNAME:-localhost}"
INT="${COLLECTD_INTERVAL:-30}"; INT="${INT%.*}"
F=/tmp/modem-signal

put() { [ -n "$3" ] && echo "PUTVAL \"$HOST/modem-$1/$2\" interval=$INT N:$3"; }

while sleep "$INT"; do
	[ -r "$F" ] || continue
	unset TS LTE_RSSI LTE_RSRP LTE_RSRQ LTE_SNR NR_RSSI NR_RSRP NR_RSRQ NR_SNR QUALITY MODEM_TEMP MODEM_TEMP_MAX
	. "$F"
	[ $(( $(date +%s) - ${TS:-0} )) -gt 180 ] && continue
	put lte signal_power-rssi "$LTE_RSSI"
	put lte signal_power-rsrp "$LTE_RSRP"
	put lte signal_power-rsrq "$LTE_RSRQ"
	put lte gauge-sinr "$LTE_SNR"
	put nr signal_power-rssi "$NR_RSSI"
	put nr signal_power-rsrp "$NR_RSRP"
	put nr signal_power-rsrq "$NR_RSRQ"
	put nr gauge-sinr "$NR_SNR"
	put status percent-quality "$QUALITY"
	put status temperature-modem "$MODEM_TEMP"
	put status temperature-modem_max "$MODEM_TEMP_MAX"
done
