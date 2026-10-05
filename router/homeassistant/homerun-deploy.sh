#!/bin/sh
# Установка/обновление интеграции homerunPET (лоток CS106) в HA на роутере: sh homerun-deploy.sh
# Нужен ssh bpi. Копирует custom_components/homerun и перезапускает контейнер HA.
set -e
cd "$(dirname "$0")"
DST=/mnt/nvme/homeassistant/config/custom_components
tar czf - --exclude='__pycache__' -C custom_components homerun | \
  ssh bpi "mkdir -p $DST && rm -rf $DST/homerun && tar xzf - -C $DST && docker exec homeassistant python3 -m compileall -q /config/custom_components/homerun >/dev/null && docker restart homeassistant >/dev/null"
echo "Готово. Настройки → Устройства и службы → Добавить интеграцию → homerunPET"
