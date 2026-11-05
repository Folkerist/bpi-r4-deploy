#!/bin/sh
# Сборка и установка панели на роутер: sh deploy.sh
# Нужны ssh bpi и долгоживущий токен HA в ~/.ha_token. HA не перезапускается.
set -e
cd "$(dirname "$0")"
python3 build.py
V=$(grep -o 'HP_VERSION = "[0-9a-f]*"' home-panel.js | cut -d'"' -f2)
ssh bpi 'mkdir -p /mnt/nvme/homeassistant/config/www/home-panel'
ssh bpi 'cat > /mnt/nvme/homeassistant/config/www/home-panel/home-panel.js' < home-panel.js
ssh bpi 'cat > /tmp/install_ha.py && docker cp /tmp/install_ha.py homeassistant:/tmp/install_ha.py && rm /tmp/install_ha.py' < install_ha.py
tr -d '\r\n ' < ~/.ha_token | ssh bpi "docker exec -i homeassistant python3 /tmp/install_ha.py $V; docker exec homeassistant rm -f /tmp/install_ha.py"
echo "Готово: версия $V. Открыть: http://192.168.88.2:8123/dashboard-dom/home"
