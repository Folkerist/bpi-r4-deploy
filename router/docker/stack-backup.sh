#!/bin/sh
# /usr/bin/stack-backup.sh - daily backup of the smart-home stack on /mnt/nvme:
# Home Assistant config (+ consistent snapshot of the recorder DB), Zigbee2MQTT (network keys!),
# Mosquitto, Matter Server, go2rtc, compose files, and the router's own config (sysupgrade -b).
# Backups contain keys/tokens: kept in a root-only dir, never copy them anywhere public.
# Install: cp to /usr/bin/, chmod +x; cron: 30 4 * * * /usr/bin/stack-backup.sh
# Restore HA: docker stop homeassistant; tar xzf homeassistant.tgz -C /mnt/nvme;
#   gunzip -c ha-db.sqlite.gz > /mnt/nvme/homeassistant/config/home-assistant_v2.db; docker start homeassistant

N=/mnt/nvme
DEST=${DEST:-$N/backups}
KEEP=${KEEP:-14}
D=$DEST/$(date +%Y-%m-%d)
log() { logger -t stack-backup "$*"; }

mkdir -p "$D" && chmod 700 "$DEST" || { log "cannot create $D"; exit 1; }
err=0

# Recorder DB is written constantly: take it through the sqlite backup API, not a raw file copy.
SNAP=/config/.db-snapshot.sqlite
if docker exec homeassistant python3 -c "import sqlite3; d=sqlite3.connect('$SNAP'); sqlite3.connect('/config/home-assistant_v2.db').backup(d); d.close()"; then
	gzip -c "$N/homeassistant/config/.db-snapshot.sqlite" > "$D/ha-db.sqlite.gz" || err=1
else
	log "HA DB snapshot failed"; err=1
fi
rm -f "$N/homeassistant/config/.db-snapshot.sqlite"

X=/tmp/stack-backup.exclude
printf '%s\n' 'homeassistant/config/home-assistant_v2.db*' 'homeassistant/config/.db-snapshot.sqlite' > "$X"
tar czf "$D/homeassistant.tgz" -X "$X" -C "$N" homeassistant || err=1
rm -f "$X"

for p in zigbee2mqtt mosquitto matter-server go2rtc compose; do
	[ -d "$N/$p" ] && { tar czf "$D/$p.tgz" -C "$N" "$p" || err=1; }
done

sysupgrade -b "$D/router-config.tgz" >/dev/null 2>&1 || err=1
chmod 600 "$D"/*

# Rotation: keep the newest $KEEP daily dirs.
ls -1d "$DEST"/20??-??-?? 2>/dev/null | sort -r | tail -n +$((KEEP + 1)) | xargs -r rm -rf

log "done $D ($(du -sh "$D" | cut -f1)) err=$err"
exit $err
