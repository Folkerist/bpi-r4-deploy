#!/bin/sh
# /usr/bin/speedtest.sh - speed test for LuCI (Status -> Speed test).
#   speedtest.sh start main|lte [10|100|1000|10000]   run in the background (main = default route,
#                                 lte = bound to the modem); size = MB downloaded per download test
#   speedtest.sh status           current/last result as JSON
#   speedtest.sh history          last results, one per line: date|iface|ping|loss|dl1|dl4|up|rsrp|size|sinr
DIR=/tmp/speedtest
ST=$DIR/state.json
HIST=/root/speedtest-history.txt
URL_DL=http://speedtest.selectel.ru/10GB	# 10 GiB file, supports byte ranges
URL_UP=https://speed.cloudflare.com/__up
PING_HOST=77.88.8.8

mbit() { awk -v b="${1:-0}" 'BEGIN { printf "%.1f", b * 8 / 1000000 }'; }

state() { # running step
	printf '{"running":%s,"iface":"%s","size":"%s","step":"%s","ping":"%s","loss":"%s","dl1":"%s","dl4":"%s","up":"%s","rsrp":"%s","sinr":"%s","bands":"%s","error":"%s","ts":%s}\n' \
		"$1" "$IFACE" "$SIZE" "$2" "$PING" "$LOSS" "$DL1" "$DL4" "$UP" "$RSRP" "$SINR" "$BANDS" "$ERR" "$(date +%s)" > "$ST.tmp"
	mv "$ST.tmp" "$ST"
}

# live progress: interface byte counters (covers all 4 parallel streams at once)
prog() { # rx|tx expected_bytes
	[ -n "$NETDEV" ] && [ -d /sys/class/net/$NETDEV ] || { rm -f $DIR/prog; return; }
	echo "$NETDEV $1 $(cat /sys/class/net/$NETDEV/statistics/${1}_bytes 2>/dev/null || echo 0) $2 $(date +%s)" > $DIR/prog
}

show_status() {
	[ -f $ST ] || { echo '{}'; return; }
	if [ -f $DIR/prog ] && grep -q '"running":true' $ST; then
		read -r dev kind base total t0 < $DIR/prog
		now=$(cat /sys/class/net/$dev/statistics/${kind}_bytes 2>/dev/null || echo "$base")
		got=$((now - base)); [ "$got" -gt "$total" ] && got=$total; [ "$got" -lt 0 ] && got=0
		sed "s/}\$/,\"p_done\":$got,\"p_total\":$total,\"p_el\":$(($(date +%s) - t0))}/" $ST
	else
		cat $ST
	fi
}

sig() { sed -n "s/^$1='\{0,1\}\([^']*\)'\{0,1\}$/\1/p" /tmp/modem-signal 2>/dev/null | head -1; }

run() {
	IFACE=$1 SIZE=$2 PING="" LOSS="" DL1="" DL4="" UP="" RSRP="" SINR="" BANDS="" ERR=""
	CURL="" PINGI="" NETDEV=$(ip route get $PING_HOST 2>/dev/null | sed -n 's/.* dev \([^ ]*\).*/\1/p')
	if [ "$IFACE" = lte ]; then
		dev=$(ifstatus mm 2>/dev/null | jsonfilter -e '@.l3_device')
		if [ -z "$dev" ] || [ "$(ifstatus mm | jsonfilter -e '@.up')" != true ]; then
			ERR="LTE не подключён"; state false done; return
		fi
		CURL="--interface $dev" PINGI="-I $dev" NETDEV=$dev
		RSRP=$(sig LTE_RSRP) SINR=$(sig LTE_SNR) BANDS=$(sig BANDS)
	fi

	state true ping
	out=$(ping -c 5 -W 2 $PINGI $PING_HOST 2>&1)
	PING=$(echo "$out" | sed -n 's#.*= [0-9.]*/\([0-9.]*\)/.*#\1#p')
	LOSS=$(echo "$out" | sed -n 's/.* \([0-9]*\)% packet loss.*/\1/p')

	# the whole chosen volume is downloaded (time limit only as a safety net)
	case "$SIZE" in 10) T=30 ;; 100) T=90 ;; 1000) T=400 ;; *) T=1800 ;; esac
	bytes=$((SIZE * 1048576)) part=$((SIZE * 262144))

	prog rx $bytes; state true dl1
	DL1=$(mbit "$(curl $CURL -o /dev/null -m $T -s -r 0-$((bytes - 1)) -w '%{speed_download}' $URL_DL)")

	prog rx $bytes; state true dl4
	# 4 parallel streams, each fetches its own quarter of the volume
	for i in 0 1 2 3; do
		curl $CURL -o /dev/null -m $T -s -r $((i * part))-$(((i + 1) * part - 1)) -w '%{speed_download}\n' $URL_DL > $DIR/dl$i &
	done
	wait
	DL4=$(mbit "$(cat $DIR/dl0 $DIR/dl1 $DIR/dl2 $DIR/dl3 2>/dev/null | awk '{ s += $1 } END { print s + 0 }')")

	up=$SIZE; [ "$up" -gt 100 ] && up=100
	prog tx $((up * 1048576)); state true up
	UP=$(mbit "$(dd if=/dev/zero bs=1M count=$up 2>/dev/null |
		curl $CURL -m 60 -s -o /dev/null -X POST --data-binary @- -w '%{speed_upload}' $URL_UP)")

	rm -f $DIR/prog; state false done
	echo "$(date '+%Y-%m-%d %H:%M')|$IFACE|$PING|$LOSS|$DL1|$DL4|$UP|$RSRP|$SIZE|$SINR" >> "$HIST"
	tail -n 50 "$HIST" > "$HIST.tmp" && mv "$HIST.tmp" "$HIST"
}

mkdir -p $DIR
case "$1" in
	start)
		case "$2" in main|lte) ;; *) echo '{"error":"usage"}'; exit 1 ;; esac
		SIZE=${3:-100}
		case "$SIZE" in 10|100|1000|10000) ;; *) echo '{"error":"size"}'; exit 1 ;; esac
		# 10 GB = ~20 GB of traffic: fixed line only
		[ "$2" = lte ] && [ "$SIZE" = 10000 ] && { echo '{"error":"lte10g"}'; exit 1; }
		if [ -f $DIR/pid ] && kill -0 "$(cat $DIR/pid)" 2>/dev/null; then echo '{"error":"busy"}'; exit 0; fi
		IFACE=$2; state true start
		( run "$2" "$SIZE" ) </dev/null >/dev/null 2>&1 &
		echo $! > $DIR/pid
		echo '{"started":true}' ;;
	status) show_status ;;
	history) tail -n 20 "$HIST" 2>/dev/null ;;
	*) echo "usage: $0 start main|lte [10|100|1000|10000] | status | history"; exit 1 ;;
esac
