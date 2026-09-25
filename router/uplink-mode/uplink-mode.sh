#!/bin/sh
# /usr/bin/uplink-mode.sh - picks the routing mode from the uplink that is up:
#   cable in WAN  -> everything direct (forkop stopped, wg0 down): the upstream MikroTik
#                    handles blocked sites itself;
#   LTE only      -> wg0 up + forkop: blocked sites via the tunnel, the rest direct.
# Run from /etc/hotplug.d/iface/40-uplink-mode on wan up/down and from cron every minute
# (safety net: forkop's own boot retry may start it after the hotplug event).
# Pause the automation: touch /etc/uplink-mode.off

[ -f /etc/uplink-mode.off ] && exit 0
mkdir /var/run/uplink-mode.lock 2>/dev/null || exit 0
trap 'rmdir /var/run/uplink-mode.lock' EXIT

is_up() { [ "$(ifstatus "$1" 2>/dev/null | jsonfilter -e '@.up' 2>/dev/null)" = true ]; }
forkop_running() { /etc/init.d/forkop status >/dev/null 2>&1; }
log() { logger -t uplink-mode "$*"; }

if is_up wan; then
	if forkop_running; then
		log "WAN cable up: direct mode, stopping forkop"
		/etc/init.d/forkop stop >/dev/null 2>&1
	fi
	if is_up wg0; then
		log "WAN cable up: bringing wg0 down"
		ifdown wg0
	fi
else
	if ! is_up wg0; then
		log "LTE only: bringing wg0 up"
		ifup wg0
		sleep 5
	fi
	if ! forkop_running; then
		log "LTE only: starting forkop"
		/etc/init.d/forkop start >/dev/null 2>&1
	fi
fi
