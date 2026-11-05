#!/bin/sh
# /usr/bin/wifi-steer.sh - moves weak Wi-Fi clients off the BPI-R4 to the Xiaomi mesh (same SSIDs).
# Xiaomi can't talk to OpenWrt, so steering is one-sided: a client of the BPI with a weak signal first gets an
# 802.11v BSS transition request pointing at the Xiaomi 5 GHz BSSIDs (needs the full wpad-mbedtls); if it is still
# here on the next run, it is disconnected and banned from the BPI for BAN_MS, so it re-joins the nearest Xiaomi.
# A client kicked MAX_KICKS times within an hour obviously has nowhere else to go - it is left alone for a day.
# Install: cp to /usr/bin/, chmod +x; cron: * * * * * /usr/bin/wifi-steer.sh
# Off: remove the cron line. Log: logread -e wifi-steer

MIN_5G=${MIN_5G:--75}         # dBm, signal avg below this = steer (5 GHz)
MIN_2G=${MIN_2G:--78}         # dBm (2.4 GHz: mostly IoT, less eager)
MIN_UP=120          # s connected before we touch a client
BAN_MS=60000
MAX_KICKS=3
# Xiaomi 5 GHz BSSIDs (channel 44, op class 115): AX3600 bedroom, AX1800 hall. Neighbor report element:
# BSSID | BSSID info (reachable, security, key scope) | op class | channel | PHY type HE (0x0e).
NB_5G='["88c397c911d4ef080000732c0e","28d12781df8cef080000732c0e"]'
S=/tmp/wifi-steer; mkdir -p $S
now=$(date +%s)
log() { logger -t wifi-steer "$*"; }
# DRY=1 wifi-steer.sh — only print what would be done (thresholds can be overridden the same way).
[ -n "$DRY" ] && { log() { echo "DRY: $*"; }; ubus() { :; }; S=/tmp/wifi-steer-dry; mkdir -p $S; }

steer() { # iface min neighbors
	iw dev "$1" station dump | awk '/^Station/{m=$2} /signal avg:/{s=$3} /connected time:/{print m, s, $3}' |
	while read mac sig up; do
		[ "$sig" -lt "$2" ] && [ "$up" -ge "$MIN_UP" ] || { rm -f "$S/$mac.btm"; continue; }
		[ -f "$S/$mac.skip" ] && [ $((now - $(cat "$S/$mac.skip"))) -lt 86400 ] && continue
		kicks=$(awk -v t=$((now - 3600)) '$1 > t' "$S/$mac.kicks" 2>/dev/null | wc -l)
		if [ "$kicks" -ge "$MAX_KICKS" ]; then echo $now > "$S/$mac.skip"; log "$1 $mac $sig dBm: no better AP, leave for 24h"; continue; fi
		if [ -n "$3" ] && [ ! -f "$S/$mac.btm" ]; then
			ubus call hostapd.$1 bss_transition_request "{\"addr\":\"$mac\",\"disassociation_imminent\":false,\"abridged\":true,\"validity_period\":30,\"neighbors\":$3}" >/dev/null 2>&1
			echo $now > "$S/$mac.btm"; log "$1 $mac $sig dBm: BSS transition request"
		else
			ubus call hostapd.$1 del_client "{\"addr\":\"$mac\",\"reason\":5,\"deauth\":false,\"ban_time\":$BAN_MS}" >/dev/null 2>&1
			echo $now >> "$S/$mac.kicks"; rm -f "$S/$mac.btm"; log "$1 $mac $sig dBm: disconnected, banned ${BAN_MS}ms"
		fi
	done
}

steer phy0.1-ap0 $MIN_5G "$NB_5G"
steer phy0.0-ap0 $MIN_2G ""
