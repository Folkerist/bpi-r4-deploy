#!/bin/sh
# /usr/bin/speedtest.sh - speed test for LuCI (Status -> Speed test).
#   speedtest.sh start main|lte [10|100|1000|10000]   run in the background (main = default route,
#                                 lte = bound to the modem); size = MB downloaded per download test
#   speedtest.sh status           current/last result as JSON
#   speedtest.sh history [N]      last N (default 20) results, one per line:
#                                 date|iface|ping|loss|dl1|dl4|up|rsrp|size|sinr|t_dl1|t_dl4|t_up|ip
DIR=/tmp/speedtest
ST=$DIR/state.json
HIST=/root/speedtest-history.txt
URL_DL=http://speedtest.selectel.ru/10GB	# 10 GiB file, supports byte ranges
URL_UP=https://speed.cloudflare.com/__up
PING_HOST=77.88.8.8

uptime_s() { cut -d' ' -f1 /proc/uptime; }
dur() { awk -v a="$1" -v b="$2" 'BEGIN { printf "%.1f", b - a }'; }
# sum of "speed size" lines from parallel curls -> "speed_total size_total"
sum2() { cat "$@" 2>/dev/null | awk '{ s += $1; b += $2 } END { printf "%.0f %.0f", s, b }'; }
cleanip() { tr -cd '0-9a-fA-F:.' | head -c 45; }

mbit() { awk -v b="${1:-0}" 'BEGIN { printf "%.1f", b * 8 / 1000000 }'; }

state() { # running step
	printf '{"running":%s,"iface":"%s","size":"%s","step":"%s","ping":"%s","loss":"%s","dl1":"%s","dl4":"%s","up":"%s","rsrp":"%s","sinr":"%s","bands":"%s","error":"%s","ts":%s,"t_dl1":"%s","t_dl4":"%s","t_up":"%s","b_dl1":"%s","b_dl4":"%s","b_up":"%s","ip":"%s","ip_cf":"%s"}\n' \
		"$1" "$IFACE" "$SIZE" "$2" "$PING" "$LOSS" "$DL1" "$DL4" "$UP" "$RSRP" "$SINR" "$BANDS" "$ERR" "$(date +%s)" \
		"$T_DL1" "$T_DL4" "$T_UP" "$B_DL1" "$B_DL4" "$B_UP" "$IP" "$IP_CF" > "$ST.tmp"
	mv "$ST.tmp" "$ST"
}

# live progress: interface byte counters (covers all 4 parallel streams at once)
prog() { # rx|tx expected_bytes
	[ -n "$NETDEV" ] && [ -d /sys/class/net/$NETDEV ] || { rm -f $DIR/prog; return; }
	echo "$NETDEV $1 $(cat /sys/class/net/$NETDEV/statistics/${1}_bytes 2>/dev/null || echo 0) $2 $(cut -d' ' -f1 /proc/uptime)" > $DIR/prog
}

show_status() {
	[ -f $ST ] || { echo '{}'; return; }
	if [ -f $DIR/prog ] && grep -q '"running":true' $ST; then
		read -r dev kind base total t0 < $DIR/prog
		now=$(cat /sys/class/net/$dev/statistics/${kind}_bytes 2>/dev/null || echo "$base")
		got=$((now - base)); [ "$got" -gt "$total" ] && got=$total; [ "$got" -lt 0 ] && got=0
		el=$(awk -v a="$t0" -v b="$(cut -d' ' -f1 /proc/uptime)" 'BEGIN { printf "%.2f", b - a }')
		sed "s/}\$/,\"p_done\":$got,\"p_total\":$total,\"p_el\":$el}/" $ST
	else
		cat $ST
	fi
}

sig() { sed -n "s/^$1='\{0,1\}\([^']*\)'\{0,1\}$/\1/p" /tmp/modem-signal 2>/dev/null | head -1; }

run() {
	IFACE=$1 SIZE=$2 PING="" LOSS="" DL1="" DL4="" UP="" RSRP="" SINR="" BANDS="" ERR=""
	T_DL1="" T_DL4="" T_UP="" B_DL1="" B_DL4="" B_UP="" IP="" IP_CF=""
	CURL="" PINGI="" NETDEV=$(ip route get $PING_HOST 2>/dev/null | sed -n 's/.* dev \([^ ]*\).*/\1/p')
	if [ "$IFACE" = lte ]; then
		dev=$(ifstatus mm 2>/dev/null | jsonfilter -e '@.l3_device')
		if [ -z "$dev" ] || [ "$(ifstatus mm | jsonfilter -e '@.up')" != true ]; then
			ERR="LTE не подключён"; state false done; return
		fi
		CURL="--interface $dev" PINGI="-I $dev" NETDEV=$dev
		RSRP=$(sig LTE_RSRP) SINR=$(sig LTE_SNR) BANDS=$(sig BANDS)
	fi

	# external IP of this path; Cloudflare's view too (the upload goes there - may differ behind a proxy)
	state true ip
	IP=$(curl $CURL -s -m 6 https://ifconfig.me/ip | cleanip)
	IP_CF=$(curl $CURL -s -m 6 https://speed.cloudflare.com/cdn-cgi/trace | sed -n 's/^ip=//p' | cleanip)

	state true ping
	out=$(ping -c 5 -W 2 $PINGI $PING_HOST 2>&1)
	PING=$(echo "$out" | sed -n 's#.*= [0-9.]*/\([0-9.]*\)/.*#\1#p')
	LOSS=$(echo "$out" | sed -n 's/.* \([0-9]*\)% packet loss.*/\1/p')

	# the whole chosen volume is downloaded (time limit only as a safety net)
	case "$SIZE" in 10) T=30 ;; 100) T=90 ;; 1000) T=400 ;; *) T=1800 ;; esac
	bytes=$((SIZE * 1048576)) part=$((SIZE * 262144))

	prog rx $bytes; state true dl1
	t0=$(uptime_s)
	set -- $(curl $CURL -o /dev/null -m $T -s -r 0-$((bytes - 1)) -w '%{speed_download} %{size_download}' $URL_DL)
	T_DL1=$(dur "$t0" "$(uptime_s)") DL1=$(mbit "$1") B_DL1=${2:-0}

	prog rx $bytes; state true dl4
	# 4 parallel streams, each fetches its own quarter of the volume
	t0=$(uptime_s)
	for i in 0 1 2 3; do
		curl $CURL -o /dev/null -m $T -s -r $((i * part))-$(((i + 1) * part - 1)) \
			-w '%{speed_download} %{size_download}\n' $URL_DL > $DIR/dl$i &
	done
	wait
	set -- $(sum2 $DIR/dl0 $DIR/dl1 $DIR/dl2 $DIR/dl3)
	T_DL4=$(dur "$t0" "$(uptime_s)") DL4=$(mbit "$1") B_DL4=${2:-0}

	# upload: 4 parallel streams, a quarter each, at most 100 MB in total
	up=$SIZE; [ "$up" -gt 100 ] && up=100
	upart=$((up * 262144))
	prog tx $((up * 1048576)); state true up
	t0=$(uptime_s)
	for i in 0 1 2 3; do
		head -c $upart /dev/zero | curl $CURL -m 60 -s -o /dev/null -X POST --data-binary @- \
			-w '%{speed_upload} %{size_upload}\n' $URL_UP > $DIR/up$i &
	done
	wait
	set -- $(sum2 $DIR/up0 $DIR/up1 $DIR/up2 $DIR/up3)
	T_UP=$(dur "$t0" "$(uptime_s)") UP=$(mbit "$1") B_UP=${2:-0}

	rm -f $DIR/prog; state false done
	echo "$(date '+%Y-%m-%d %H:%M')|$IFACE|$PING|$LOSS|$DL1|$DL4|$UP|$RSRP|$SIZE|$SINR|$T_DL1|$T_DL4|$T_UP|$IP" >> "$HIST"
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
	history) tail -n "${2:-20}" "$HIST" 2>/dev/null ;;
	*) echo "usage: $0 start main|lte [10|100|1000|10000] | status | history"; exit 1 ;;
esac
