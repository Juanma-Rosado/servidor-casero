#!/bin/bash
umask 077
# Volcado de MariaDB de Nextcloud + config de stacks (VM 102)
O=/srv/data/dumps
mkdir -p "$O" && chmod 700 "$O"
docker exec nextcloud-db sh -c 'mariadb-dump -uroot -p"${MYSQL_ROOT_PASSWORD:-$MARIADB_ROOT_PASSWORD}" --all-databases --single-transaction' | gzip > "$O/nextcloud-$(date +%F).sql.gz"
tar czf "$O/stacks-$(date +%F).tar.gz" /srv/data/stacks /srv/data/utilidades/homepage 2>/dev/null
find "$O" -mtime +7 -type f -delete
