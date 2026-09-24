#!/bin/sh
# Usage: mail-send.sh "subject" "body" - sends an e-mail via msmtp, exit 0 on success.
# SMTP account: /etc/msmtprc; recipient: MAIL_TO in /etc/mail-notify.conf (both only on the router).
. /etc/mail-notify.conf 2>/dev/null
[ -n "$MAIL_TO" ] || { logger -t mail-send "MAIL_TO not set"; exit 1; }
{
	printf 'To: %s\nSubject: %s\nMIME-Version: 1.0\n' "$MAIL_TO" "$1"
	printf 'Content-Type: text/plain; charset=UTF-8\nContent-Transfer-Encoding: 8bit\n\n%s\n' "$2"
} | msmtp -C /etc/msmtprc "$MAIL_TO" 2>/tmp/mail-send.err || {
	logger -t mail-send "send failed: $(tail -1 /tmp/mail-send.err)"
	exit 1
}
