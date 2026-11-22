#!/bin/bash
# Copia diaria de la configuración de Proxmox y volcado de la BD de Nextcloud.
# Se ejecuta a las 02:45, antes de vzdump (03:00), para que la copia
# nocturna de la VM 102 ya lleve dentro el volcado del día.
# Registro en /var/log/backup-config.log. Los errores también van al journal.

set -u
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
umask 077

DESTINO=/datos/backups/config
REGISTRO=/var/log/backup-config.log
DIAS_GUARDADOS=14
FALLO=0

# Escribe una línea con la fecha en el registro
apuntar() {
  echo "$(date '+%F %T') $*" >> "$REGISTRO"
}

# Apunta el error, lo manda al journal y marca que algo ha fallado
avisarError() {
  apuntar "ERROR $*"
  logger -t backup-config -p user.err "$*"
  FALLO=1
}

mkdir -p "$DESTINO"
chmod 700 "$DESTINO"

# 1. Configuración de Proxmox
copia="$DESTINO/pve-config-$(date +%F).tar.gz"
tar czf "$copia" /etc/pve /etc/network/interfaces /etc/hosts /etc/hostname /etc/sanoid \
    /etc/postfix /etc/cron.d /usr/local/bin 2>/dev/null
resultado=$?
# tar devuelve 1 si algún archivo cambió mientras copiaba; eso no es un fallo
if [ $resultado -le 1 ] && [ -s "$copia" ]; then
  apuntar "OK configuracion ($(du -h "$copia" | cut -f1))"
else
  avisarError "copia de configuracion (tar rc=$resultado)"
fi

# 2. Volcado de la BD de Nextcloud dentro de la VM 102, con el agente QEMU
salida=$(qm guest exec 102 --timeout 600 -- bash /usr/local/bin/dbdump.sh 2>&1)
if echo "$salida" | grep -q '"exitcode" : 0'; then
  apuntar "OK volcado BD Nextcloud"
else
  avisarError "volcado BD Nextcloud: $(echo "$salida" | tr -d '\n' | cut -c1-300)"
fi

# 3. Borra las copias de configuración más antiguas
find "$DESTINO" -name 'pve-config-*.tar.gz' -mtime +$DIAS_GUARDADOS -delete
chmod 600 "$DESTINO"/* 2>/dev/null

exit $FALLO
