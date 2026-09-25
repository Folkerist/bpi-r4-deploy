#!/bin/sh
# cron: */2 * * * * - restores the LTE link (ModemManager, interface "mm") when the Internet is lost.
# 1st-2nd failed check: ifup mm; 3rd: restart ModemManager; then every 3rd: reset the modem.
F=/tmp/wwan-watchdog.fails
read up _ < /proc/uptime
[ "${up%.*}" -lt 300 ] && exit 0

# SIM lost (seen after power sag / overheating): resets don't help, only a full power cycle does.
# Mail once per occurrence (retried every run until it is sent, e.g. once a wired uplink works).
reason=$(mmcli -m any -K 2>/dev/null | sed -n 's/^modem.generic.state-failed-reason *: *//p')
if [ "$reason" = sim-missing ]; then
	logger -t wwan-watchdog "modem reports sim-missing, power-cycle the router"
	[ -f /tmp/sim-missing.sent ] || /usr/bin/mail-send.sh "Modem: SIM missing" \
"Модем RM520N не видит SIM-карту (sim-missing). Сброс модема не помогает: полностью обесточьте роутер на 30 секунд.
Вероятная причина: просадка питания (USB-C PD) или перегрев." && touch /tmp/sim-missing.sent
	exit 0
fi
rm -f /tmp/sim-missing.sent

if ping -c2 -W5 -I wwan0 8.8.8.8 >/dev/null 2>&1 || ping -c2 -W5 -I wwan0 1.1.1.1 >/dev/null 2>&1; then
	if [ -f "$F" ]; then
		read n start < "$F"
		rm -f "$F"
		min=$(( ($(date +%s) - start) / 60 ))
		logger -t wwan-watchdog "link restored after $n failed checks (~$min min)"
		/usr/bin/mail-send.sh "LTE restored" "LTE восстановлен: связи не было ~$min мин, неудачных проверок: $n" &
	fi
	exit 0
fi

n=0; start=$(date +%s)
[ -f "$F" ] && read n start < "$F"
n=$((n + 1))
echo "$n $start" > "$F"

if [ "$n" -le 2 ]; then
	logger -t wwan-watchdog "no Internet via wwan0 (check $n): ifup mm"
	ifup mm
elif [ "$n" -eq 3 ]; then
	logger -t wwan-watchdog "no Internet via wwan0 (check $n): restarting ModemManager"
	/etc/init.d/modemmanager restart
elif [ $((n % 3)) -eq 0 ]; then
	logger -t wwan-watchdog "no Internet via wwan0 (check $n): resetting modem"
	mmcli -m any --reset
fi
