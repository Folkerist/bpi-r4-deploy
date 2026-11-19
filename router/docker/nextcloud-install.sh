#!/bin/sh
# Prepares folders and secrets for nextcloud-compose.yml and starts it.
# Usage: sh nextcloud-install.sh <url-of-nextcloud-compose.yml>
set -e
D=/mnt/nvme/nextcloud
DATA=/mnt/ssd2/nextcloud-data

fs=$(awk '$2 == "/mnt/ssd2" { print $3 }' /proc/mounts)
case "$fs" in
	ext4|btrfs|xfs|f2fs) ;;
	*) echo "ошибка: /mnt/ssd2 = '${fs:-не смонтирован}', нужен ext4/btrfs/xfs (права www-data)"; exit 1 ;;
esac
for p in 8080 5432 6379; do
	netstat -lnt | grep -q ":$p " && { echo "ошибка: порт $p уже занят"; exit 1; }
done

mkdir -p "$D/db" "$D/html" "$DATA"
chown 33:33 "$D/html" "$DATA"
chmod 750 "$DATA"
wget -q -O "$D/docker-compose.yml" "$1"
if [ ! -f "$D/.env" ]; then
	echo "DB_PASSWORD=$(head -c 32 /dev/urandom | base64 | tr -d '/+=\n' | head -c 32)" > "$D/.env"
	chmod 600 "$D/.env"
fi

cd "$D"
if command -v docker-compose >/dev/null; then DC=docker-compose; else DC="docker compose"; fi
$DC pull
$DC up -d
echo "Подождите 1-3 минуты (первый запуск копирует файлы), затем откройте http://192.168.1.1:8080"
