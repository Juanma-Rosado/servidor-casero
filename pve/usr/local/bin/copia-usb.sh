#!/bin/bash
# Copia fuera de casa en un USB cifrado (LUKS).
#
# Copia en el USB la última copia vzdump de cada máquina y la última copia de
# la configuración del nodo, comprueba que se han copiado bien, conserva las
# últimas copias semanales y avisa por los avisos de Proxmox (correo a root,
# que la regla default-matcher manda también a Telegram).
#
# Se lanza sola al conectar el USB (regla de udev y copia-usb.service) o a mano:
#   copia-usb.sh
#
# Preparación del USB, una sola vez: ver «Copia fuera de casa» en CAMBIOS.md.
# Registro en /var/log/copia-usb.log.

set -u
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
umask 077

# El USB se reconoce por la etiqueta que se le pone al cifrarlo
DISPOSITIVO=/dev/disk/by-label/copia-usb
CLAVE=/root/.copia-usb.key
NOMBRE_CIFRADO=copia-usb
MONTAJE=/mnt/copia-usb
ORIGEN_VZDUMP=/datos/backups/dump
ORIGEN_CONFIG=/datos/backups/config
COPIAS_GUARDADAS=3
MAQUINAS="100 101 102 103"
REGISTRO=/var/log/copia-usb.log
CANDADO=/run/copia-usb.lock

# Escribe una línea con la fecha en el registro
apuntar() {
  echo "$(date '+%F %T') $*" >> "$REGISTRO"
}

# Manda el aviso a root: Proxmox lo reenvía por sus avisos (Telegram y correo)
avisar() {
  local asunto="$1"
  local texto="$2"
  printf 'Subject: %s\n\n%s\n' "$asunto" "$texto" | sendmail root
}

# Desmonta y cierra el USB, pase lo que pase
cerrarUsb() {
  sync
  mountpoint -q "$MONTAJE" && umount "$MONTAJE"
  [ -e "/dev/mapper/$NOMBRE_CIFRADO" ] && cryptsetup close "$NOMBRE_CIFRADO"
}

# Para con un aviso de error
fallar() {
  apuntar "ERROR $*"
  logger -t copia-usb -p user.err "$*"
  avisar "Copia en USB: ERROR" "$*"
  cerrarUsb
  exit 1
}

# Abre el cifrado y monta el USB
abrirUsb() {
  [ -e "$DISPOSITIVO" ] || fallar "no está conectado el USB ($DISPOSITIVO)"
  [ -r "$CLAVE" ] || fallar "falta el fichero de clave $CLAVE"
  if [ ! -e "/dev/mapper/$NOMBRE_CIFRADO" ]; then
    cryptsetup open --key-file "$CLAVE" "$DISPOSITIVO" "$NOMBRE_CIFRADO" || fallar "no se pudo abrir el cifrado"
  fi
  mkdir -p "$MONTAJE"
  mountpoint -q "$MONTAJE" || mount "/dev/mapper/$NOMBRE_CIFRADO" "$MONTAJE" || fallar "no se pudo montar el USB"
}

# Devuelve la copia más reciente que cumple un patrón, o nada
masReciente() {
  ls -1t $1 2>/dev/null | head -1
}

# Copia un fichero al USB y comprueba que llega idéntico
copiarYComprobar() {
  local fichero="$1"
  local carpeta="$2"
  cp "$fichero" "$carpeta/" || fallar "no se pudo copiar $(basename "$fichero")"
  local sumaOrigen
  local sumaUsb
  sumaOrigen=$(sha256sum "$fichero" | cut -d' ' -f1)
  sumaUsb=$(sha256sum "$carpeta/$(basename "$fichero")" | cut -d' ' -f1)
  [ "$sumaOrigen" = "$sumaUsb" ] || fallar "$(basename "$fichero") no coincide tras copiarlo"
  echo "$sumaOrigen  $(basename "$fichero")" >> "$carpeta/SHA256SUMS"
}

# Borra las copias más antiguas y deja solo las últimas que se indiquen
borrarAntiguas() {
  local mantener="$1"
  ls -1d "$MONTAJE"/copia-* 2>/dev/null | sort | head -n -"$mantener" | while read -r antigua; do
    rm -rf -- "$antigua"
    apuntar "borrada la copia antigua $(basename "$antigua")"
  done
}

# Solo una copia a la vez
exec 9> "$CANDADO"
flock -n 9 || exit 0

apuntar "inicio"
abrirUsb

# Lista de ficheros que se van a copiar y su tamaño total
ficheros=()
for id in $MAQUINAS; do
  copia=$(masReciente "$ORIGEN_VZDUMP/vzdump-*-$id-*.zst")
  [ -n "$copia" ] || fallar "no hay copia vzdump de la máquina $id"
  ficheros+=("$copia")
done
configuracion=$(masReciente "$ORIGEN_CONFIG/pve-config-*.tar.gz")
[ -n "$configuracion" ] || fallar "no hay copia de la configuración"
ficheros+=("$configuracion")
necesario=$(du -cb "${ficheros[@]}" | tail -1 | cut -f1)

# Antes de copiar se hace sitio: se dejan las anteriores justas para que,
# con la nueva, queden COPIAS_GUARDADAS. Si aun así no cabe, se borran más.
mantener=$((COPIAS_GUARDADAS - 1))
borrarAntiguas "$mantener"
libre=$(df -B1 --output=avail "$MONTAJE" | tail -1)
while [ "$libre" -lt "$necesario" ] && [ "$mantener" -gt 0 ]; do
  mantener=$((mantener - 1))
  borrarAntiguas "$mantener"
  libre=$(df -B1 --output=avail "$MONTAJE" | tail -1)
done
[ "$libre" -ge "$necesario" ] || fallar "no cabe la copia: hacen falta $((necesario / 1024 / 1024)) MB"

carpeta="$MONTAJE/copia-$(date +%F_%H%M)"
mkdir -p "$carpeta"
for fichero in "${ficheros[@]}"; do
  copiarYComprobar "$fichero" "$carpeta"
done

total=$(du -sh "$carpeta" | cut -f1)
guardadas=$(ls -1d "$MONTAJE"/copia-* | wc -l)
espacioLibre=$(df -h --output=avail "$MONTAJE" | tail -1 | tr -d ' ')
cerrarUsb

apuntar "OK $(basename "$carpeta") ($total, $guardadas copias en el USB, $espacioLibre libres)"
avisar "Copia en USB: OK" "Copia $(basename "$carpeta") de $total terminada y comprobada. Hay $guardadas copias en el USB y quedan $espacioLibre libres. Ya puedes desconectarlo."
exit 0
