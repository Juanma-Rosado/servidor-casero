# Comprueba la web antes de publicarla (también lo ejecuta GitHub en cada push).
#
#  - Cada página tiene título, descripción, canonical, lang="es" y un solo h1.
#  - Los bloques JSON-LD son JSON válido.
#  - Los enlaces y recursos internos (href, src) apuntan a ficheros que existen.
#  - Las imágenes tienen alt, width y height.
#  - Cada dirección del sitemap corresponde a una página que existe.
#
# Uso (desde la raíz del repositorio):  python scripts/comprobar-web.py
# Sale con código 1 si encuentra algún problema.

import json
import pathlib
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urlparse

RAIZ_WEB = pathlib.Path(__file__).resolve().parent.parent / "web" / "portfolio"
DOMINIO = "juanmarosado.com"

# Páginas que no se indexan y no necesitan canonical ni descripción
SIN_SEO = {"404.html"}


class LectorPagina(HTMLParser):
  """Recoge de una página lo que hay que comprobar."""

  def __init__(self):
    super().__init__()
    self.lang = None
    self.titulo = ""
    self.enTitulo = False
    self.descripcion = None
    self.canonical = None
    self.numeroH1 = 0
    self.enlaces = []
    self.imagenes = []
    self.bloquesJson = []
    self.enJson = False

  def handle_starttag(self, etiqueta, atributos):
    datos = dict(atributos)
    if etiqueta == "html":
      self.lang = datos.get("lang")
    elif etiqueta == "title":
      self.enTitulo = True
    elif etiqueta == "meta" and datos.get("name") == "description":
      self.descripcion = datos.get("content")
    elif etiqueta == "link" and datos.get("rel") == "canonical":
      self.canonical = datos.get("href")
    elif etiqueta == "h1":
      self.numeroH1 += 1
    elif etiqueta == "img":
      self.imagenes.append(datos)
    elif etiqueta == "script" and datos.get("type") == "application/ld+json":
      self.enJson = True
      self.bloquesJson.append("")

    for nombre in ("href", "src"):
      if datos.get(nombre):
        self.enlaces.append(datos[nombre])

  def handle_endtag(self, etiqueta):
    if etiqueta == "title":
      self.enTitulo = False
    elif etiqueta == "script":
      self.enJson = False

  def handle_data(self, texto):
    if self.enTitulo:
      self.titulo += texto
    if self.enJson:
      self.bloquesJson[-1] += texto


def rutaDeEnlace(pagina, enlace):
  """Devuelve el fichero local al que apunta un enlace interno, o None si es externo."""
  partes = urlparse(enlace)
  if partes.scheme in ("mailto", "tel", "data", "javascript"):
    return None
  if partes.netloc and partes.netloc != DOMINIO:
    return None
  ruta = partes.path
  if not ruta:
    return None
  if ruta.startswith("/"):
    destino = RAIZ_WEB / ruta.lstrip("/")
  else:
    destino = pagina.parent / ruta
  if ruta.endswith("/"):
    destino = destino / "index.html"
  return destino


def comprobarPagina(pagina, problemas):
  lector = LectorPagina()
  lector.feed(pagina.read_text(encoding="utf-8"))
  nombre = pagina.relative_to(RAIZ_WEB).as_posix()

  def anotar(texto):
    problemas.append(nombre + ": " + texto)

  if lector.lang != "es":
    anotar('falta lang="es"')
  if not lector.titulo.strip():
    anotar("falta el título")
  if lector.numeroH1 != 1:
    anotar("tiene %d h1 (debe tener 1)" % lector.numeroH1)
  if nombre not in SIN_SEO:
    if not lector.descripcion:
      anotar("falta la meta descripción")
    if not lector.canonical:
      anotar("falta el canonical")

  for bloque in lector.bloquesJson:
    try:
      json.loads(bloque)
    except json.JSONDecodeError as error:
      anotar("JSON-LD no válido: %s" % error)

  for imagen in lector.imagenes:
    for atributo in ("alt", "width", "height"):
      if atributo not in imagen:
        anotar("imagen %s sin %s" % (imagen.get("src"), atributo))

  for enlace in lector.enlaces:
    destino = rutaDeEnlace(pagina, enlace)
    if destino is not None and not destino.exists():
      anotar("enlace roto: " + enlace)


def comprobarSitemap(problemas):
  texto = (RAIZ_WEB / "sitemap.xml").read_text(encoding="utf-8")
  for direccion in re.findall(r"<loc>(.*?)</loc>", texto):
    ruta = urlparse(direccion).path.lstrip("/")
    destino = RAIZ_WEB / (ruta + "index.html" if ruta.endswith("/") or not ruta else ruta)
    if not destino.exists():
      problemas.append("sitemap.xml: no existe la página de " + direccion)


def main():
  problemas = []
  paginas = sorted(p for p in RAIZ_WEB.rglob("*.html") if not p.name.startswith("google"))
  for pagina in paginas:
    comprobarPagina(pagina, problemas)
  comprobarSitemap(problemas)

  if problemas:
    print("Problemas encontrados:")
    for problema in problemas:
      print("  - " + problema)
    sys.exit(1)
  print("Web correcta: %d páginas comprobadas." % len(paginas))


main()
