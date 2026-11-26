#!/bin/bash
# Compara la configuración del servidor con la del repositorio y, si se pide,
# la copia en un sentido o en otro.
#
# Uso (Git Bash, desde la raíz del repositorio):
#   scripts/sincronizar.sh             compara y no cambia nada
#   scripts/sincronizar.sh traer       servidor -> repositorio, solo lo que cambia de verdad
#   scripts/sincronizar.sh llevar      repositorio -> servidor, con copia previa
#   scripts/sincronizar.sh llevar RUTA lleva ese fichero aunque cambie de verdad
#                                      (por ejemplo, un script que has reescrito)
#
# "Cambia de verdad" quiere decir que es distinto aunque se quiten los
# comentarios, las líneas en blanco y los espacios. Así un fichero comentado en
# el repositorio no se pisa con la versión sin comentarios del servidor.
#
# Los secretos se sustituyen en el servidor antes de copiar: nunca salen de él.
# Los ficheros que llevan secretos (como notifications.cfg) no se llevan nunca
# al servidor desde aquí.
#
# Necesita los alias SSH "pve", "personal" y "profesional" en ~/.ssh/config.

set -euo pipefail
raiz="$(cd "$(dirname "$0")/.." && pwd)"
cd "$raiz"
modo="${1:-comprobar}"
soloEste="${2:-}"
temporal="$(mktemp -d)"
trap 'rm -rf "$temporal"' EXIT

# Lo que se quita antes de que el fichero salga del servidor (el repositorio es público):
#  - valores secretos, que pasan a ${VARIABLE}
#  - la URL, la cabecera y el cuerpo del webhook de Telegram, que llevan el token del bot
#  - correos electrónicos (root@pam no lo es y se queda)
#  - direcciones MAC y los identificadores únicos de las VMs (smbios1 y vmgenid)
limpiarSecretos='s/^([[:space:]]*-?[[:space:]]*)([A-Za-z0-9_]*(PASS|PASSWORD|SECRET|TOKEN|KEY)[A-Za-z0-9_]*)([:=])[[:space:]]*([^$[:space:]].*)$/\1\2\4 ${\2}/I; s/-p"[^"$]+"/-p"***"/g; s/^([[:space:]]*(url|body|header)[[:space:]]).*/\1***/; s/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]{2,}/correo@ejemplo.com/g; s/([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}/XX:XX:XX:XX:XX:XX/g; s/^(smbios1: uuid=)[0-9a-f-]+/\1quitado/; s/^(vmgenid: ).*/\1quitado/'

# Lista de ficheros: ruta en el repositorio | dónde está | ruta en el servidor | se puede llevar
# "dónde está" es pve, lxc101, vm102 (agente QEMU, como root), personal o profesional
ficheros() {
  cat <<'LISTA'
pve/usr/local/bin/backup-config.sh|pve|/usr/local/bin/backup-config.sh|si
pve/etc/cron.d/backup-config|pve|/etc/cron.d/backup-config|si
pve/etc/sanoid/sanoid.conf|pve|/etc/sanoid/sanoid.conf|no
pve/etc/pve/jobs.cfg|pve|/etc/pve/jobs.cfg|no
pve/etc/pve/storage.cfg|pve|/etc/pve/storage.cfg|no
pve/etc/pve/notifications.cfg|pve|/etc/pve/notifications.cfg|no
pve/etc/pve/firewall/cluster.fw|pve|/etc/pve/firewall/cluster.fw|no
pve/etc/pve/firewall/103.fw|pve|/etc/pve/firewall/103.fw|no
pve/etc/pve/nodes/pve/host.fw|pve|/etc/pve/nodes/pve/host.fw|no
pve/etc/ssh/sshd_config.d/00-solo-claves.conf|pve|/etc/ssh/sshd_config.d/00-solo-claves.conf|no
pve/guests/lxc-100.conf|pve|/etc/pve/lxc/100.conf|no
pve/guests/lxc-101.conf|pve|/etc/pve/lxc/101.conf|no
pve/guests/vm-102.conf|pve|/etc/pve/qemu-server/102.conf|no
pve/guests/vm-103.conf|pve|/etc/pve/qemu-server/103.conf|no
lxc101-npm/opt/npm/docker-compose.yml|lxc101|/opt/npm/docker-compose.yml|si
lxc101-npm/opt/cloudflared/docker-compose.yml|lxc101|/opt/cloudflared/docker-compose.yml|si
lxc101-npm/etc/docker/daemon.json|lxc101|/etc/docker/daemon.json|no
vm102-personal/usr-local-bin-dbdump.sh|vm102|/usr/local/bin/dbdump.sh|si
vm102-personal/stacks/nextcloud/docker-compose.yml|personal|/srv/data/stacks/nextcloud/docker-compose.yml|si
vm102-personal/stacks/utilidades/docker-compose.yml|personal|/srv/data/stacks/utilidades/docker-compose.yml|si
vm102-personal/stacks/portainer/docker-compose.yml|personal|/srv/data/stacks/portainer/docker-compose.yml|si
vm102-personal/etc-docker-daemon.json|personal|/etc/docker/daemon.json|no
vm102-personal/crontab-juanma.txt|personal|crontab|no
vm103-profesional/stacks/portfolio/docker-compose.yml|profesional|/srv/data/stacks/portfolio/docker-compose.yml|si
vm103-profesional/stacks/portfolio/default.conf|profesional|/srv/data/stacks/portfolio/default.conf|si
vm103-profesional/stacks/portainer/docker-compose.yml|profesional|/srv/data/stacks/portainer/docker-compose.yml|si
vm103-profesional/stacks/reserfy/docker-compose.yml|profesional|/srv/data/stacks/reserfy/docker-compose.yml|si
vm103-profesional/stacks/reserfy/nginx/default.conf.template|profesional|/srv/data/stacks/reserfy/nginx/default.conf.template|si
vm103-profesional/stacks/reserfy/php/subidas.ini|profesional|/srv/data/stacks/reserfy/php/subidas.ini|si
vm103-profesional/stacks/reserfy/bases/02-usuario-gestion.sh|profesional|/srv/data/stacks/reserfy/bases/02-usuario-gestion.sh|no
vm103-profesional/stacks/reserfy/gestion/Dockerfile|profesional|/srv/data/stacks/reserfy/gestion/Dockerfile|si
vm103-profesional/stacks/reserfy/gestion/requirements.txt|profesional|/srv/data/stacks/reserfy/gestion/requirements.txt|si
vm103-profesional/stacks/reserfy/gestion/app.py|profesional|/srv/data/stacks/reserfy/gestion/app.py|si
vm103-profesional/stacks/reserfy/wordpress/mu-plugins/aviso-demo.php|profesional|/srv/data/stacks/reserfy/wordpress/mu-plugins/aviso-demo.php|si
vm103-profesional/stacks/reserfy/wordpress/mu-plugins/validacion-reservas.php|profesional|/srv/data/stacks/reserfy/wordpress/mu-plugins/validacion-reservas.php|si
vm103-profesional/stacks/reserfy/wordpress/mu-plugins/correo-demo.php|profesional|/srv/data/stacks/reserfy/wordpress/mu-plugins/correo-demo.php|si
vm103-profesional/stacks/reserfy/wordpress/mu-plugins/limpieza-reservas.php|profesional|/srv/data/stacks/reserfy/wordpress/mu-plugins/limpieza-reservas.php|si
vm103-profesional/stacks/reserfy/wordpress/mu-plugins/proteccion-reservas.php|profesional|/srv/data/stacks/reserfy/wordpress/mu-plugins/proteccion-reservas.php|si
vm103-profesional/stacks/reserfy/wordpress/mu-plugins/seguridad-wordpress.php|profesional|/srv/data/stacks/reserfy/wordpress/mu-plugins/seguridad-wordpress.php|si
vm103-profesional/etc-docker-daemon.json|profesional|/etc/docker/daemon.json|no
LISTA
}

# Lee un fichero del servidor, ya sin secretos, y lo escribe en la salida.
# Se le quita la entrada estándar para que ssh no se coma la lista de ficheros.
leerDelServidor() {
  local donde="$1"
  local ruta="$2"
  exec 3<&0 < /dev/null
  case "$donde" in
    pve)
      ssh -o BatchMode=yes pve "sed -E '$limpiarSecretos' $ruta"
      ;;
    lxc101)
      ssh -o BatchMode=yes pve "pct exec 101 -- sed -E '$limpiarSecretos' $ruta"
      ;;
    vm102)
      # qm guest exec codifica en UTF-8 cada byte de la salida, así que las tildes
      # llegan dos veces codificadas: se leen como UTF-8 y se escriben con latin-1
      # (un byte por carácter). Se escribe en binario: en Windows, sys.stdout.write
      # añadiría \r a cada línea.
      ssh -o BatchMode=yes pve "qm guest exec 102 -- sed -E '$limpiarSecretos' $ruta" \
        | python -I -c "import sys,json; sys.stdout.buffer.write(json.loads(sys.stdin.buffer.read().decode('utf-8')).get('out-data','').encode('latin-1'))"
      ;;
    personal|profesional)
      if [ "$ruta" = crontab ]; then
        ssh -o BatchMode=yes "$donde" 'crontab -l'
      else
        ssh -o BatchMode=yes "$donde" "sed -E '$limpiarSecretos' $ruta"
      fi
      ;;
  esac
  exec 0<&3 3<&-
}

# Deja solo lo que importa: sin comentarios, sin líneas en blanco y sin espacios
normalizar() {
  sed -E 's/\r$//; s/^[[:space:]]*#.*$//; s/[[:space:]]+#[^"'"'"']*$//; s/[[:space:]]+//g' "$1" | grep -v '^$' || true
}

# Devuelve "igual", "formato" (solo comentarios o espacios) o "distinto"
compararFichero() {
  local delRepo="$1"
  local delServidor="$2"
  if [ ! -f "$delRepo" ]; then
    echo "nuevo"
  elif cmp -s <(sed 's/\r$//' "$delRepo") "$delServidor"; then
    echo "igual"
  elif cmp -s <(normalizar "$delRepo") <(normalizar "$delServidor"); then
    echo "formato"
  else
    echo "distinto"
  fi
}

# Copia un fichero del repositorio al servidor, guardando antes el que había
llevarAlServidor() {
  local delRepo="$1"
  local donde="$2"
  local ruta="$3"
  local sufijo
  sufijo=".bak-$(date +%Y%m%d-%H%M)"
  case "$donde" in
    pve)
      ssh -o BatchMode=yes pve "cp -a $ruta $ruta$sufijo && cat > $ruta.nuevo && sed -i 's/\r$//' $ruta.nuevo && cat $ruta.nuevo > $ruta && rm $ruta.nuevo" < "$delRepo"
      ;;
    lxc101)
      ssh -o BatchMode=yes pve "pct exec 101 -- bash -c 'cp -a $ruta $ruta$sufijo && sed \"s/\r\$//\" > $ruta.nuevo && cat $ruta.nuevo > $ruta && rm $ruta.nuevo'" < "$delRepo"
      ;;
    vm102)
      ssh -o BatchMode=yes pve "qm guest exec 102 --pass-stdin 1 -- bash -c 'cp -a $ruta $ruta$sufijo && sed \"s/\r\$//\" > $ruta.nuevo && cat $ruta.nuevo > $ruta && rm $ruta.nuevo'" < "$delRepo" > /dev/null
      ;;
    personal|profesional)
      ssh -o BatchMode=yes "$donde" "cp -a $ruta $ruta$sufijo && sed 's/\r\$//' > $ruta.nuevo && cat $ruta.nuevo > $ruta && rm $ruta.nuevo" < "$delRepo"
      ;;
  esac
  echo "    copia anterior: $ruta$sufijo"
}

hayDistintos=0
while IFS='|' read -r delRepo donde ruta sePuedeLlevar; do
  # Con una ruta concreta, solo se mira ese fichero
  if [ -n "$soloEste" ] && [ "$delRepo" != "$soloEste" ]; then
    continue
  fi
  delServidor="$temporal/$(echo "$delRepo" | tr '/' '_')"
  leerDelServidor "$donde" "$ruta" > "$delServidor"
  estado=$(compararFichero "$delRepo" "$delServidor")
  printf "  %-9s %s\n" "$estado" "$delRepo"

  if [ "$estado" = distinto ] || [ "$estado" = nuevo ]; then
    hayDistintos=1
  fi

  # traer: solo lo que cambia de verdad, para no perder comentarios del repositorio
  if [ "$modo" = traer ] && { [ "$estado" = distinto ] || [ "$estado" = nuevo ]; }; then
    mkdir -p "$(dirname "$delRepo")"
    cp "$delServidor" "$delRepo"
    echo "    traído al repositorio"
  fi

  # llevar: solo los ficheros marcados. Si cambia de verdad, solo cuando se nombra
  if [ "$modo" = llevar ] && [ "$sePuedeLlevar" = si ]; then
    if [ "$estado" = formato ]; then
      llevarAlServidor "$delRepo" "$donde" "$ruta"
    elif [ "$estado" = distinto ] && [ -n "$soloEste" ]; then
      llevarAlServidor "$delRepo" "$donde" "$ruta"
    elif [ "$estado" = distinto ]; then
      echo "    NO se lleva: cambia de verdad. Revisa la diferencia y, si es lo que quieres:"
      echo "    scripts/sincronizar.sh llevar $delRepo"
    fi
  fi
done < <(ficheros)

echo
echo "igual: idénticos | formato: solo cambian comentarios o espacios | distinto: cambia la configuración"
if [ "$modo" = comprobar ] && [ $hayDistintos = 1 ]; then
  echo "Hay diferencias reales: revisa con 'scripts/sincronizar.sh traer' y 'git diff'."
fi
