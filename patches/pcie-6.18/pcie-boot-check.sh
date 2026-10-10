#!/bin/sh
# PCIe per-boot logger for BPI-R4 Pro 8X (OpenWrt).
# Install:  cp pcie-boot-check.sh /root/ && chmod +x /root/pcie-boot-check.sh
#           add line  "/root/pcie-boot-check.sh &"  to /etc/rc.local BEFORE "exit 0"
# Result:   one line per boot in /root/pcie-boots.log, dmesg of failed boots in /root/pcie-fail-*.txt
#           on a failed boot also an e-mail via /usr/bin/mail-send.sh (router/mail-send.sh), if installed
#
# EXPECTED = number of PCIe endpoints that must be present
# (BE14 = 2 links: 0000 + 0001, plus 2 NVMe SSDs = 4). Adjust if your setup differs.
EXPECTED=${EXPECTED:-4}
LOG=/root/pcie-boots.log

sleep 15
# boot type: before rebooting run  echo warm > /root/next-boot; reboot
#                               or  echo cold > /root/next-boot; poweroff
BT=$(cat /root/next-boot 2>/dev/null || echo '?'); rm -f /root/next-boot
N=$(ls /sys/bus/pci/devices 2>/dev/null | grep -c ':01:00.0$')
DEVS=$(ls /sys/bus/pci/devices 2>/dev/null | grep ':01:00.0$' | cut -c1-4 | tr '\n' ',')
CIU=$(grep -q clk_ignore_unused /proc/cmdline && echo ciu || echo -)
KVER=$(uname -v | cut -c1-40)
if [ "$N" -ge "$EXPECTED" ]; then RES=OK; else RES=FAIL; fi
DOWN=$(dmesg | grep -oE '11[23][0-9]0000\.pcie: PCIe link down.*' | sed 's/PCIe link down, current LTSSM state: //' | tr '\n' ';')
CLKT=$(dmesg | grep -m1 -E 'clk: (Disabling|Not disabling) unused clocks' | cut -d']' -f1 | tr -d '[ ')
PCIT=$(dmesg | grep -E 'mtk-pcie-gen3 .*: host bridge' | tail -1 | cut -d']' -f1 | tr -d '[ ')
echo "$(date '+%F %T') $RES $BT eps=$N/$EXPECTED [$DEVS] $CIU clk_unused@${CLKT:-?} pcie_probe@${PCIT:-?} down=[$DOWN] k=[$KVER]" >> $LOG

if [ "$RES" = FAIL ]; then
	F=/root/pcie-fail-$(date +%Y%m%d-%H%M%S).txt
	{
		cat /proc/cmdline
		dmesg | grep -iE 'pcie|ltssm|clk|mt7996|nvme'
		echo "--- clk_summary (pextp/xtp/pcie/sspxtp) ---"
		grep -iE 'pextp|xtp_glb|pcie|sspxtp|da_sel|ckm_sel' /sys/kernel/debug/clk/clk_summary 2>/dev/null
		echo "--- gpio ---"
		grep -iE 'gpio-(63|79) ' /sys/kernel/debug/gpio 2>/dev/null
	} > "$F" 2>&1
fi

# Mail the failure; LTE may not be up yet this early in boot, so retry for ~10 minutes.
if [ "$RES" = FAIL ] && [ -x /usr/bin/mail-send.sh ]; then
	BODY="$(tail -1 $LOG)

Ожидалось PCIe-устройств: $EXPECTED, найдено: $N [$DEVS].
cmdline: $(cat /proc/cmdline)
$([ "$CIU" = - ] && echo "ВНИМАНИЕ: в bootargs нет clk_ignore_unused (без патча 980 это и есть причина сбоя).")
Подробности: $F

$(head -60 "$F")"
	for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
		/usr/bin/mail-send.sh "PCIe FAIL on $(uci -q get system.@system[0].hostname)" "$BODY" && break
		sleep 30
	done
fi
