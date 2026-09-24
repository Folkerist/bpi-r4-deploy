#!/bin/sh
# cron: * * * * * - forwards received SMS to Telegram, then deletes them from the modem.
# An SMS is deleted only after Telegram confirmed delivery, otherwise it is retried next minute.
LOCK=/tmp/sms-notify.lock
find /tmp -maxdepth 1 -name sms-notify.lock -mmin +5 -exec rmdir {} \; 2>/dev/null
mkdir "$LOCK" 2>/dev/null || exit 0
trap 'rmdir "$LOCK"' EXIT

for s in $(mmcli -m any --messaging-list-sms 2>/dev/null | grep -o '/org/freedesktop/ModemManager1/SMS/[0-9]*'); do
	info=$(mmcli -s "$s" -K 2>/dev/null) || continue
	get() { echo "$info" | sed -n "s/^$1 *: //p" | head -1; }
	[ "$(get sms.properties.state)" = received ] || continue
	num=$(get sms.content.number)
	ts=$(get sms.properties.timestamp)
	text=$(get sms.content.text)
	if /usr/bin/tg-send.sh "SMS от $num
$ts

$text"; then
		mmcli -m any --messaging-delete-sms="$s" >/dev/null 2>&1
		logger -t sms-notify "forwarded SMS from $num"
	else
		logger -t sms-notify "Telegram unavailable, SMS $s kept"
		break
	fi
done
