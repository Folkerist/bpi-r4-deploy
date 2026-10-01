#!/bin/sh
# /usr/bin/speedtest.sh - speed test for LuCI (Status -> Speed test).
#   speedtest.sh start main|lte   run in the background (main = default route, lte = bound to the modem)
#   speedtest.sh status           current/last result as JSON
#   speedtest.sh history          last results, one per line: date|iface|ping|loss|dl1|dl4|up|rsrp
DIR=/tmp/speedtest
ST=$DIR/state.json
HIST=/root/speedtest-history.txt
URL_DL=http://speedtest.selectel.ru/100MB
URL_UP=https://speed.cloudflare.com/__up
PING_HOST=77.88.8.8
T=15	# seconds per transfer test

mbit() { awk -v b="${1:-0}" 'BEGIN { printf "%.1f", b * 8 / 1000000 }'; }

state() { # running step
	printf '{"running":%s,"iface":"%s","step":"%s","ping":"%s","loss":"%s","dl1":"%s","dl4":"%s","up":"%s","rsrp":"%s","sinr":"%s","bands":"%s","error":"%s","ts":%s}\n' \
		"$1" "$IFACE" "$2" "$PING" "$LOSS" "$DL1" "$DL4" "$UP" "$RSRP" "$SINR" "$BANDS" "$ERR" "$(date +%s)" > "$ST.tmp"
	mv "$ST.tmp" "$ST"
}

sig() { sed -n "s/^$1='\{0,1\}\([^']*\)'\{0,1\}$/\1/p" /tmp/modem-signal 2>/dev/null | head -1; }

run() {
	IFACE=$1 PING="" LOSS="" DL1="" DL4="" UP="" RSRP="" SINR="" BANDS="" ERR=""
	CURL="" PINGI=""
	if [ "$IFACE" = lte ]; then
		dev=$(ifstatus mm 2>/dev/null | jsonfilter -e '@.l3_device')
		if [ -z "$dev" ] || [ "$(ifstatus mm | jsonfilter -e '@.up')" != true ]; then
			ERR="LTE не подключён"; state false done; return
		fi
		CURL="--interface $dev" PINGI="-I $dev"
		RSRP=$(sig LTE_RSRP) SINR=$(sig LTE_SNR) BANDS=$(sig BANDS)
	fi

	state true ping
	out=$(ping -c 5 -W 2 $PINGI $PING_HOST 2>&1)
	PING=$(echo "$out" | sed -n 's#.*= [0-9.]*/\([0-9.]*\)/.*#\1#p')
	LOSS=$(echo "$out" | sed -n 's/.* \([0-9]*\)% packet loss.*/\1/p')

	state true dl1
	DL1=$(mbit "$(curl $CURL -o /dev/null -m $T -s -w '%{speed_download}' $URL_DL)")

	state true dl4
	for i in 1 2 3 4; do curl $CURL -o /dev/null -m $T -s -w '%{speed_download}\n' $URL_DL > $DIR/dl$i & done
	wait
	DL4=$(mbit "$(cat $DIR/dl1 $DIR/dl2 $DIR/dl3 $DIR/dl4 2>/dev/null | awk '{ s += $1 } END { print s + 0 }')")

	state true up
	UP=$(mbit "$(dd if=/dev/zero bs=1M count=100 2>/dev/null |
		curl $CURL -m $T -s -o /dev/null -X POST --data-binary @- -w '%{speed_upload}' $URL_UP)")

	state false done
	echo "$(date '+%Y-%m-%d %H:%M')|$IFACE|$PING|$LOSS|$DL1|$DL4|$UP|$RSRP" >> "$HIST"
	tail -n 50 "$HIST" > "$HIST.tmp" && mv "$HIST.tmp" "$HIST"
}

mkdir -p $DIR
case "$1" in
	start)
		case "$2" in main|lte) ;; *) echo '{"error":"usage"}'; exit 1 ;; esac
		if [ -f $DIR/pid ] && kill -0 "$(cat $DIR/pid)" 2>/dev/null; then echo '{"error":"busy"}'; exit 0; fi
		IFACE=$2; state true start
		( run "$2" ) </dev/null >/dev/null 2>&1 &
		echo $! > $DIR/pid
		echo '{"started":true}' ;;
	status) cat $ST 2>/dev/null || echo '{}' ;;
	history) tail -n 20 "$HIST" 2>/dev/null ;;
	*) echo "usage: $0 start main|lte | status | history"; exit 1 ;;
esac
