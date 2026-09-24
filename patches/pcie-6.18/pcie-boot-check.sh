#!/bin/sh
# PCIe per-boot logger for BPI-R4 Pro 8X (OpenWrt).
# Install:  cp pcie-boot-check.sh /root/ && chmod +x /root/pcie-boot-check.sh
#           add line  "/root/pcie-boot-check.sh &"  to /etc/rc.local BEFORE "exit 0"
# Result:   one line per boot in /root/pcie-boots.log, dmesg of failed boots in /root/pcie-fail-*.txt
#
# EXPECTED = number of PCIe endpoints that must be present
# (BE14 = 2 links: 0000 + 0001, plus 1 NVMe SSD = 3). Adjust if your setup differs.
EXPECTED=${EXPECTED:-3}
LOG=/root/pcie-boots.log

sleep 15
N=$(ls /sys/bus/pci/devices 2>/dev/null | grep -c ':01:00.0$')
DEVS=$(ls /sys/bus/pci/devices 2>/dev/null | grep ':01:00.0$' | cut -c1-4 | tr '\n' ',')
CIU=$(grep -q clk_ignore_unused /proc/cmdline && echo ciu || echo -)
KVER=$(uname -v | cut -c1-40)
if [ "$N" -ge "$EXPECTED" ]; then RES=OK; else RES=FAIL; fi
DOWN=$(dmesg | grep -oE '11[23][0-9]0000\.pcie: PCIe link down.*' | sed 's/PCIe link down, current LTSSM state: //' | tr '\n' ';')
CLKT=$(dmesg | grep -m1 -E 'clk: (Disabling|Not disabling) unused clocks' | cut -d']' -f1 | tr -d '[ ')
PCIT=$(dmesg | grep -E 'mtk-pcie-gen3 .*: host bridge' | tail -1 | cut -d']' -f1 | tr -d '[ ')
echo "$(date '+%F %T') $RES eps=$N/$EXPECTED [$DEVS] $CIU clk_unused@${CLKT:-?} pcie_probe@${PCIT:-?} down=[$DOWN] k=[$KVER]" >> $LOG

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
