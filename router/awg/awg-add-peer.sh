#!/bin/sh
# awg-add-peer.sh NAME [LAST_OCTET] - add an AmneziaWG client to awg0 and print its config as a QR code.
# Files: /etc/amneziawg/NAME.{key,pub,conf}. The client config holds the client's private key: do not share it.
set -e
NAME=$1; N=$2
D=/etc/amneziawg; CONF=$D/awg0.conf
ENDPOINT=${ENDPOINT:-hgg09v8e2f8.sn.mynetname.net:51820}
[ -n "$NAME" ] || { echo "usage: $0 NAME [LAST_OCTET]"; exit 1; }
[ -e "$D/$NAME.key" ] && { echo "$NAME already exists"; exit 1; }
if [ -z "$N" ]; then
	N=2; while grep -q "AllowedIPs = 10.20.20.$N/32" "$CONF"; do N=$((N+1)); done
fi
grep -q "AllowedIPs = 10.20.20.$N/32" "$CONF" && { echo "10.20.20.$N is taken"; exit 1; }
cd "$D"; umask 077
awg genkey > "$NAME.key"; awg pubkey < "$NAME.key" > "$NAME.pub"
printf '\n[Peer]\n# %s\nPublicKey = %s\nAllowedIPs = 10.20.20.%s/32\n' "$NAME" "$(cat "$NAME.pub")" "$N" >> "$CONF"
awg syncconf awg0 "$CONF"
{ printf '[Interface]\nPrivateKey = %s\nAddress = 10.20.20.%s/32\nDNS = 192.168.88.1\nMTU = 1380\n' "$(cat "$NAME.key")" "$N"
  grep -E '^(Jc|Jmin|Jmax|S1|S2|H1|H2|H3|H4) ' "$CONF"
  printf '\n[Peer]\nPublicKey = %s\nEndpoint = %s\nAllowedIPs = 0.0.0.0/0, ::/0\nPersistentKeepalive = 25\n' "$(cat server.pub)" "$ENDPOINT"
} > "$NAME.conf"
echo "added $NAME = 10.20.20.$N"
command -v qrencode >/dev/null && qrencode -t ansiutf8 < "$NAME.conf" || echo "config: $D/$NAME.conf (apk add qrencode for a QR code)"
