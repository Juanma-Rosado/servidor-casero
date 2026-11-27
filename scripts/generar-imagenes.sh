#!/bin/bash
# Genera las imágenes de la web a partir de las plantillas HTML de scripts/imagenes:
#
#  - web/portfolio/img/og.png              imagen al compartir la web (1200 × 630)
#  - web/portfolio/guia-dual-w11-mint/img/og.png  la de la guía de arranque dual (1200 × 630)
#  - web/portfolio/img/favicon-48.png      icono de la pestaña (48 × 48)
#  - web/portfolio/img/apple-touch-icon.png icono del iPhone (180 × 180, sin esquinas)
#  - web/portfolio/favicon.ico             el mismo icono de 48 en formato .ico
#
# Usa Microsoft Edge sin ventana (--headless) para hacer una captura de cada plantilla.
# Si cambias logo.svg u og.html, vuelve a ejecutarlo y publica la web.
#
# Uso (Git Bash, desde la raíz del repositorio):  scripts/generar-imagenes.sh

set -euo pipefail
raiz="$(cd "$(dirname "$0")/.." && pwd)"
plantillas="$(cygpath -m "$raiz/scripts/imagenes")"
carpetaImagenes="$raiz/web/portfolio/img"
edge="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"

# Hace una captura de una plantilla: capturar PLANTILLA ANCHO ALTO DESTINO
capturar() {
  local plantilla="$1"
  local ancho="$2"
  local alto="$3"
  local destino="$4"
  # --allow-file-access-from-files deja cargar las fuentes desde el disco
  # --default-background-color=00000000 deja el fondo transparente (para las esquinas del icono)
  # --virtual-time-budget espera a que cargue todo; sin él, a veces salía el icono sin la J
  "$edge" --headless --disable-gpu --hide-scrollbars \
    --allow-file-access-from-files \
    --virtual-time-budget=3000 \
    --default-background-color=00000000 \
    --window-size="$ancho,$alto" \
    --screenshot="$(cygpath -w "$destino")" \
    "file:///$plantillas/$plantilla" > /dev/null 2>&1
  echo "  $(basename "$destino") ($ancho × $alto)"
}

# Un .ico puede llevar dentro un PNG tal cual: cabecera de 6 bytes,
# una entrada de 16 bytes con el tamaño y la posición, y después el PNG
crearIco() {
  python - "$carpetaImagenes/favicon-48.png" "$raiz/web/portfolio/favicon.ico" <<'EOF'
import struct
import sys

png = open(sys.argv[1], "rb").read()
cabecera = struct.pack("<HHH", 0, 1, 1)
entrada = struct.pack("<BBBBHHII", 48, 48, 0, 0, 1, 32, len(png), 6 + 16)
open(sys.argv[2], "wb").write(cabecera + entrada + png)
EOF
  echo "  favicon.ico (48 × 48)"
}

echo "== Generando imágenes"
capturar "og.html" 1200 630 "$carpetaImagenes/og.png"
capturar "og-guia-dual.html" 1200 630 "$raiz/web/portfolio/guia-dual-w11-mint/img/og.png"
capturar "icono.html?tam=48" 48 48 "$carpetaImagenes/favicon-48.png"
capturar "icono.html?tam=180&cuadrado" 180 180 "$carpetaImagenes/apple-touch-icon.png"
crearIco
