#!/bin/bash
# Volcado de la base de datos de Nextcloud y copia de los compose (VM 102).
# Lo lanza backup-config.sh desde el nodo Proxmox cada noche.

umask 077

DESTINO=/srv/data/dumps
DIAS_GUARDADOS=7
hoy=$(date +%F)

mkdir -p "$DESTINO" && chmod 700 "$DESTINO"

# La contraseña se lee dentro del contenedor, así no aparece aquí
docker exec nextcloud-db sh -c 'mariadb-dump -uroot -p"${MYSQL_ROOT_PASSWORD:-$MARIADB_ROOT_PASSWORD}" --all-databases --single-transaction' \
    | gzip > "$DESTINO/nextcloud-$hoy.sql.gz"

tar czf "$DESTINO/stacks-$hoy.tar.gz" /srv/data/stacks /srv/data/utilidades/homepage 2>/dev/null

# Borra los volcados de más de una semana
find "$DESTINO" -mtime +$DIAS_GUARDADOS -type f -delete
