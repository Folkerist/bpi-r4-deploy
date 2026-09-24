#!/bin/sh
# cron: * * * * * - forwards received SMS by e-mail, then deletes them from the modem.
# An SMS is deleted only after the mail was accepted by the SMTP server, otherwise it is retried next minute.
LOCK=/tmp/sms-notify.lock
find /tmp -maxdepth 1 -name sms-notify.lock -mmin +5 -exec rmdir {} \; 2>/dev/null
mkdir "$LOCK" 2>/dev/null || exit 0
trap 'rmdir "$LOCK"' EXIT

for s in $(mmcli -m any --messaging-list-sms 2>/dev/null | grep -o '/org/freedesktop/ModemManager1/SMS/[0-9]*'); do
	info=$(mmcli -s "$s" -K 2>/dev/null) || continue
	get() { printf '%s\n' "$info" | sed -n "s/^$1 *: //p" | head -1; }
	# mmcli -K prints non-ASCII bytes as octal escapes (\320\222) and CR/LF as \r\n
	dec() { printf '%b' "$(printf '%s\n' "$1" | sed 's/\\\([0-7][0-7][0-7]\)/\\0\1/g')" | tr -d '\r'; }
	[ "$(get sms.properties.state)" = received ] || continue
	num=$(dec "$(get sms.content.number)")
	ts=$(get sms.properties.timestamp)
	text=$(dec "$(get sms.content.text)")
	if /usr/bin/mail-send.sh "SMS from $num" "SMS от $num
$ts

$text"; then
		mmcli -m any --messaging-delete-sms="$s" >/dev/null 2>&1
		logger -t sms-notify "forwarded SMS from $num"
	else
		logger -t sms-notify "mail not sent, SMS $s kept"
		break
	fi
done
