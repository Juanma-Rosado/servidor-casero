#!/bin/bash
# Copia diaria de la configuracion de Proxmox y volcado de la BD de Nextcloud.
# Se ejecuta a las 02:45, antes de vzdump (03:00), para que la copia nocturna
# de la VM 102 ya lleve el volcado del dia.
# Registro: /var/log/backup-config.log (los errores tambien van al journal).
set -u
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
umask 077

D=/datos/backups/config
LOG=/var/log/backup-config.log
log() { echo "$(date '+%F %T') $*" >> "$LOG"; }
err() { log "ERROR $*"; logger -t backup-config -p user.err "$*"; FALLO=1; }
FALLO=0

mkdir -p "$D"
chmod 700 "$D"

# 1. Configuracion de Proxmox
F="$D/pve-config-$(date +%F).tar.gz"
tar czf "$F" /etc/pve /etc/network/interfaces /etc/hosts /etc/hostname /etc/sanoid \
    /etc/postfix /etc/cron.d /usr/local/bin 2>/dev/null
rc=$?
if [ $rc -le 1 ] && [ -s "$F" ]; then log "OK configuracion ($(du -h "$F" | cut -f1))"
else err "copia de configuracion (tar rc=$rc)"; fi

# 2. Volcado de la BD de Nextcloud dentro de la VM 102 (agente QEMU)
OUT=$(qm guest exec 102 --timeout 600 -- bash /usr/local/bin/dbdump.sh 2>&1)
if echo "$OUT" | grep -q '"exitcode" : 0'; then log "OK volcado BD Nextcloud"
else err "volcado BD Nextcloud: $(echo "$OUT" | tr -d '\n' | cut -c1-300)"; fi

# 3. Limpieza: 14 dias de configuracion
find "$D" -name 'pve-config-*.tar.gz' -mtime +14 -delete
chmod 600 "$D"/* 2>/dev/null

exit $FALLO
