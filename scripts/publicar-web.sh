#!/bin/bash
# Publica web/portfolio (el portfolio y la guía) en la VM 103 y lo comprueba.
#
#  1. Copia lo que hay publicado ahora en /srv/data/portfolio-backup-web-FECHA,
#     fuera de la carpeta publicada.
#  2. Sube los ficheros con dueño juanma y permisos de lectura. No borra nada
#     de lo que haya en el servidor y no esté en el repositorio.
#  3. Comprueba en público que las páginas dan 200.
#
# Uso (Git Bash, desde la raíz del repositorio):  scripts/publicar-web.sh
#
# Si cambias un CSS, sube también su "?v=FECHA" en los HTML que lo enlazan:
# Cloudflare guarda los CSS en caché hasta 4 horas.

set -euo pipefail
raiz="$(cd "$(dirname "$0")/.." && pwd)"
carpetaWeb="$raiz/web/portfolio"
paginas="index.html sobre-mi.html habilidades.html proyectos.html contacto.html servidor/ guia-dual-w11-mint/ guia-dual-w11-mint/img/paso-32.webp"

# Avisa si se va a publicar algo que todavía no está en un commit
avisarCambiosSinCommit() {
  if [ -n "$(git -C "$raiz" status --porcelain -- web/)" ]; then
    echo "Aviso: hay cambios en web/ sin commit. Se publica lo que hay en disco." >&2
  fi
}

# Hace la copia en la VM y sube los ficheros
subirAlServidor() {
  tar -C "$carpetaWeb" -cf - . | ssh -o BatchMode=yes profesional '
    set -e
    copia=/srv/data/portfolio-backup-web-$(date +%Y%m%d-%H%M)
    mkdir "$copia"
    cp -a /srv/data/portfolio/. "$copia"/
    echo "  copia: $copia ($(find "$copia" -type f | wc -l) ficheros)"
    tar -xf - -C /srv/data/portfolio --no-same-owner
    chmod -R a+rX /srv/data/portfolio
    echo "  ficheros de otro dueño: $(find /srv/data/portfolio ! -user juanma | wc -l)"
  '
}

# Pide cada página a la web pública y devuelve error si alguna no da 200
comprobarEnPublico() {
  local hayFallos=0
  local pagina
  local codigo
  for pagina in "" $paginas; do
    codigo=$(curl -s -o /dev/null -w "%{http_code}" "https://juanmarosado.com/$pagina")
    printf "  %-22s %s\n" "/$pagina" "$codigo"
    if [ "$codigo" != 200 ]; then
      hayFallos=1
    fi
  done
  return $hayFallos
}

avisarCambiosSinCommit
echo "== Copia y subida a la VM 103"
subirAlServidor
echo "== Comprobación pública"
comprobarEnPublico
