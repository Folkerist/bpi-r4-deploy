#!/bin/sh
# Usage: tg-send.sh "text" - sends a Telegram message, exit 0 on HTTP 200.
# Credentials live only on the router in /etc/tg-notify.conf (TG_TOKEN, TG_CHAT).
. /etc/tg-notify.conf 2>/dev/null
[ -n "$TG_TOKEN" ] && [ -n "$TG_CHAT" ] || { logger -t tg-send "TG_TOKEN/TG_CHAT not set"; exit 1; }
code=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' \
	--data-urlencode "chat_id=$TG_CHAT" --data-urlencode "text=$1" \
	"https://api.telegram.org/bot$TG_TOKEN/sendMessage" 2>/dev/null)
[ "$code" = 200 ] || { logger -t tg-send "send failed, HTTP $code"; exit 1; }
