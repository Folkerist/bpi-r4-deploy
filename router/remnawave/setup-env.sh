#!/bin/sh
# setup-env.sh - create /mnt/nvme/compose/remnawave/.env from env.sample with fresh secrets.
# Panel: https://panel.home.arpa:8443 (Caddy, LAN/VPN only); subscriptions: https://128.0.136.224:8444/api/sub/<id> (public, Lets Encrypt IP cert)
set -e
D=/mnt/nvme/compose/remnawave
cd "$D"
[ -e .env ] && { echo ".env already exists, not overwriting"; exit 1; }
hex() {
	if command -v hexdump >/dev/null; then head -c "$1" /dev/urandom | hexdump -ve '1/1 "%02x"'
	else head -c "$1" /dev/urandom | od -An -v -tx1 | tr -d ' \n'; fi
}
alnum64() { head -c 2048 /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 64; }
PGPASS=$(hex 24)
[ ${#PGPASS} -eq 48 ] || { echo "random hex generation failed"; exit 1; }
umask 077
sed -e "s|^APP_SECRET=.*|APP_SECRET=$(hex 64)|" \
    -e "s|^METRICS_PASS=.*|METRICS_PASS=$(hex 24)|" \
    -e "s|^WEBHOOK_SECRET_HEADER=.*|WEBHOOK_SECRET_HEADER=$(alnum64)|" \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$PGPASS|" \
    -e "s|^DATABASE_URL=.*|DATABASE_URL=\"postgresql://postgres:$PGPASS@remnawave-db:5432/postgres\"|" \
    -e "s|^PANEL_DOMAIN=.*|PANEL_DOMAIN=panel.home.arpa:8443|" \
    -e "s|^SUB_PUBLIC_DOMAIN=.*|SUB_PUBLIC_DOMAIN=128.0.136.224:8444/api/sub|" \
    env.sample > .env
grep -cE '^(APP_SECRET|METRICS_PASS|WEBHOOK_SECRET_HEADER|POSTGRES_PASSWORD)=..' .env
grep -E '^(PANEL_DOMAIN|SUB_PUBLIC_DOMAIN|FRONT_END_DOMAIN)=' .env
