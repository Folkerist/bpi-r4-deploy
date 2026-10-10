#!/bin/sh
# /usr/bin/speedtest.sh - speed test for LuCI (Status -> Speed test).
#   speedtest.sh start main|lte [SIZE] [MODE] [STREAMS]   run in the background
#       main = default route, lte = bound to the modem
#       SIZE    = 10|100|1000|10000: MB downloaded per download test (upload: at most 100 MB per test)
#       MODE    = both|dl|up: download and upload, download only, upload only (default both)
#       STREAMS = comma list of 1,4,8,16,32: one test per stream count and direction (default 1,4)
#   speedtest.sh status           current/last result as JSON
#   speedtest.sh history [N]      last N (default 20) results, one per line:
#       date|iface|ping|loss|dl1|dl4|up4|rsrp|size|sinr|t_dl1|t_dl4|t_up4|ip|mode|results
#       results = test:mbit:sec:bytes,... with test = d<N> (download) / u<N> (upload), N = streams;
#       dl1/dl4/up4 and their times are duplicated in the old columns (empty if not run)
DIR=/tmp/speedtest
ST=$DIR/state.json
HIST=/root/speedtest-history.txt
URL_DL=http://speedtest.selectel.ru/10GB	# 10 GiB file, supports byte ranges
URL_UP=https://speed.cloudflare.com/__up
PING_HOST=77.88.8.8

uptime_s() { cut -d' ' -f1 /proc/uptime; }
dur() { awk -v a="$1" -v b="$2" 'BEGIN { printf "%.1f", b - a }'; }
# total bytes of "speed size" lines from parallel curls
sumb() { cat "$@" 2>/dev/null | awk '{ b += $2 } END { printf "%.0f", b }'; }
cleanip() { tr -cd '0-9a-fA-F:.' | head -c 45; }

# bytes over seconds -> Mbit/s (all streams together over the wall time of the whole test)
mbit() { awk -v b="${1:-0}" -v t="${2:-0}" 'BEGIN { printf "%.1f", (t > 0) ? b * 8 / t / 1000000 : 0 }'; }

state() { # running step
	printf '{"running":%s,"iface":"%s","size":"%s","mode":"%s","tests":"%s","step":"%s","ping":"%s","loss":"%s","rsrp":"%s","sinr":"%s","bands":"%s","error":"%s","ts":%s,"ip":"%s","ip_cf":"%s","res":[%s]}\n' \
		"$1" "$IFACE" "$SIZE" "$MODE" "$TESTS" "$2" "$PING" "$LOSS" "$RSRP" "$SINR" "$BANDS" "$ERR" "$(date +%s)" \
		"$IP" "$IP_CF" "$RES" > "$ST.tmp"
	mv "$ST.tmp" "$ST"
}

# live progress: interface byte counters (covers all parallel streams at once)
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

# one test: d<N> = download, u<N> = upload, N parallel streams sharing the volume
measure() {
	k=$1 n=${1#?} i=0
	rm -f $DIR/s.*
	if [ "${k%$n}" = d ]; then
		total=$((SIZE * 1048576))
		prog rx $total; state true $k
		part=$((total / n)) t0=$(uptime_s)
		while [ $i -lt $n ]; do
			e=$(((i + 1) * part - 1)); [ $i -eq $((n - 1)) ] && e=$((total - 1))
			curl $CURL -o /dev/null -m $T -s -r $((i * part))-$e \
				-w '%{speed_download} %{size_download}\n' $URL_DL > $DIR/s.$i &
			i=$((i + 1))
		done
	else
		total=$((UPMB * 1048576))
		prog tx $total; state true $k
		part=$((total / n)) t0=$(uptime_s)
		while [ $i -lt $n ]; do
			head -c $part /dev/zero | curl $CURL -m 60 -s -o /dev/null -X POST --data-binary @- \
				-w '%{speed_upload} %{size_upload}\n' $URL_UP > $DIR/s.$i &
			i=$((i + 1))
		done
	fi
	wait
	b=$(sumb $DIR/s.*) t=$(dur "$t0" "$(uptime_s)") v=$(mbit "$b" "$t")
	RES="$RES${RES:+,}{\"k\":\"$k\",\"v\":\"$v\",\"t\":\"$t\",\"b\":\"$b\"}"
	HRES="$HRES${HRES:+,}$k:$v:$t:$b"
	case $k in
		d1) DL1=$v T_DL1=$t ;;
		d4) DL4=$v T_DL4=$t ;;
		u4) UP=$v T_UP=$t ;;
	esac
}

run() {
	IFACE=$1 SIZE=$2 MODE=$3 PING="" LOSS="" RSRP="" SINR="" BANDS="" ERR="" IP="" IP_CF=""
	RES="" HRES="" DL1="" DL4="" UP="" T_DL1="" T_DL4="" T_UP=""
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

	# the whole chosen volume is downloaded (time limit only as a safety net); upload: at most 100 MB
	case "$SIZE" in 10) T=30 ;; 100) T=90 ;; 1000) T=400 ;; *) T=1800 ;; esac
	UPMB=$SIZE; [ "$UPMB" -gt 100 ] && UPMB=100

	for k in $TESTS; do measure $k; done

	rm -f $DIR/prog $DIR/s.*; state false done
	echo "$(date '+%Y-%m-%d %H:%M')|$IFACE|$PING|$LOSS|$DL1|$DL4|$UP|$RSRP|$SIZE|$SINR|$T_DL1|$T_DL4|$T_UP|$IP|$MODE|$HRES" >> "$HIST"
	tail -n 50 "$HIST" > "$HIST.tmp" && mv "$HIST.tmp" "$HIST"
}

mkdir -p $DIR
case "$1" in
	start)
		case "$2" in main|lte) ;; *) echo '{"error":"usage"}'; exit 1 ;; esac
		SIZE=${3:-100}
		case "$SIZE" in 10|100|1000|10000) ;; *) echo '{"error":"size"}'; exit 1 ;; esac
		MODE=${4:-both}
		case "$MODE" in both|dl|up) ;; *) echo '{"error":"mode"}'; exit 1 ;; esac
		STREAMS=$(echo "${5:-1,4}" | tr ',' '\n' | sort -n -u)
		for n in $STREAMS; do
			case "$n" in 1|4|8|16|32) ;; *) echo '{"error":"streams"}'; exit 1 ;; esac
		done
		[ -n "$STREAMS" ] || { echo '{"error":"streams"}'; exit 1; }
		# 10 GB = 10+ GB of download traffic: fixed line only (upload is capped at 100 MB anyway)
		[ "$2" = lte ] && [ "$SIZE" = 10000 ] && [ "$MODE" != up ] && { echo '{"error":"lte10g"}'; exit 1; }
		if [ -f $DIR/pid ] && kill -0 "$(cat $DIR/pid)" 2>/dev/null; then echo '{"error":"busy"}'; exit 0; fi
		TESTS=""
		[ "$MODE" = up ] || for n in $STREAMS; do TESTS="$TESTS d$n"; done
		[ "$MODE" = dl ] || for n in $STREAMS; do TESTS="$TESTS u$n"; done
		TESTS=${TESTS# }
		IFACE=$2 RES=""; state true start
		( run "$2" "$SIZE" "$MODE" ) </dev/null >/dev/null 2>&1 &
		echo $! > $DIR/pid
		echo '{"started":true}' ;;
	status) show_status ;;
	history) tail -n "${2:-20}" "$HIST" 2>/dev/null ;;
	*) echo "usage: $0 start main|lte [10|100|1000|10000] [both|dl|up] [1,4,8,16,32] | status | history"; exit 1 ;;
esac
