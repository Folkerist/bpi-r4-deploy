#!/bin/sh
# Скриншоты превью в headless Chrome: sh shot.sh <имя> <ширина>x<высота> "<параметры URL>"
cd "$(dirname "$0")/.."
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!
sleep 0.7
OUT=${OUT:-/tmp/hp-shots}; mkdir -p "$OUT"
while [ $# -ge 3 ]; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --disable-gpu --force-device-scale-factor=${SCALE:-1} \
    --window-size="$(echo $2 | tr x ,)" --virtual-time-budget=9000 --screenshot="$OUT/$1.png" "http://localhost:8765/preview/index.html?$3" 2>/dev/null
  echo "$OUT/$1.png"
  shift 3
done
kill $SRV
