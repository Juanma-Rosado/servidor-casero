# Registro de cambios

## 2026-11-22 · Repositorio privado en GitHub

**Qué se hizo**
- Se creó el repositorio **privado** `Juanma-Rosado/servidor-casero`. Esta carpeta del PC es ahora su copia local (rama `main`).
- Se subió:
  - la web tal como está en la VM 103: portfolio y guía, en `web/portfolio/`;
  - el compose y `default.conf` del portfolio (`vm103-profesional/`);
  - los compose de Nextcloud y utilidades y el crontab de juanma (`vm102-personal/`);

**Seguridad**
- Las contraseñas de MariaDB están escritas directamente en el compose real de Nextcloud. Se sustituyeron por `${VARIABLE}` **en la propia VM**, antes de copiar, así que nunca han salido de ella. Se añadió un `.env.example` como plantilla.
- Antes del commit se buscaron contraseñas, tokens, claves privadas y cadenas largas aleatorias en todo lo preparado. No apareció nada.
- `.gitignore` excluye `.env`, claves, volcados SQL, `.zip` y copias. Con eso quedó fuera `servidor-web.zip`: la guía ya está descomprimida en `web/portfolio/servidor/`.
- `.gitattributes` fuerza finales de línea LF, porque los ficheros se usan en servidores Linux.

**Pendiente**
- Faltan la configuración de Proxmox, de los LXC 100 y 101 y la de Homepage, que puede contener claves de API. Habría que revisarla antes de subirla.
- El repositorio es una foto del 22-11-2026. Si cambias algo en el servidor, hay que copiarlo aquí y hacer commit.

## 2026-11-22 · Retirada la carpeta `zip/` del portfolio (VM 103)

**Qué y por qué**
- `/srv/data/portfolio/zip/` contenía `files.zip` y `files2.zip`: copias antiguas del código de la web (HTML, CSS, JS y el logo), sin datos sensibles. Se podían descargar públicamente aunque ninguna página las enlazaba.
- No se borró: se movió fuera de la carpeta publicada, a `/srv/data/portfolio-backup-web-20261122-1659/zip-retirada/`. Antes se comprobó con `cmp` que la copia de la misma carpeta era idéntica.

**Comprobación**
- La VM ya no las sirve: con la caché de Cloudflare saltada da 404.
- Cloudflare seguía sirviendo `files.zip` desde su caché (`cf-cache-status: HIT`). Dejará de hacerlo cuando caduque, en 4 horas como máximo. No se purgó la caché porque no se toca Cloudflare sin permiso.

**Cómo deshacerlo**
- `mv /srv/data/portfolio-backup-web-20261122-1659/zip-retirada /srv/data/portfolio/zip`

## 2026-11-22 · Portfolio actualizado: primer proyecto (Proxmox) (VM 103)

**Copia previa**
- `/srv/data/portfolio-backup-web-20261122-1659/` contiene todo el portfolio salvo `servidor/`, que ya tenía su propia copia.

**Qué cambió**
- **Proyectos** (`proyectos.html`):
  - Se sustituyó el aviso "En construcción" por la ficha del proyecto 01, "Instalación y configuración de Proxmox": portada, descripción, puntos clave, tecnologías y un botón a la guía `/servidor/`.
  - Debajo queda un bloque "Próximamente" con el enlace a GitHub.
- **Inicio** (`index.html`): nueva sección "Último proyecto" con enlace a Proyectos. La tarjeta "Proyectos" ya no dice "En construcción".
- **Habilidades** (`habilidades.html`): nueva tarjeta "Servidores y virtualización" con Proxmox VE, Docker, ZFS, proxy inverso, Cloudflare Tunnel y VPN.
- **Todas las páginas**:
  - Las fuentes Bricolage Grotesque y Source Sans 3 (licencia SIL OFL) se sirven desde `css/fonts/` en vez de Google Fonts, igual que en la guía, para no enviar la IP de los visitantes a terceros.
  - Meta descripción en las páginas que no la tenían, `canonical` y etiquetas Open Graph con una imagen nueva, `img/og.png`.
- **CSS** (`styles.css`):
  - Estilos `.project`, `.next` y `.feature`, que pasan a una columna en móvil.
  - El enlace al CSS lleva `?v=20261122`, porque Cloudflare guardaba en caché el `styles.css` anterior hasta 4 horas. Así no hace falta tocar Cloudflare. **Si cambias `styles.css` en el futuro, sube también ese número.**
- La portada `img/proyecto-proxmox.webp` se generó con los colores del portfolio.
- No se tocaron `js/main.js` ni `zip/`.

**Comprobación**
- Vista previa local en escritorio y en móvil (375 px): sin desbordes horizontales ni imágenes rotas.
- En público:
  - Las cinco páginas, las fuentes, las imágenes y `/servidor/` dan 200.
  - Ninguna página carga nada de fuera del dominio.
  - Se ve la ficha del proyecto con su diseño en dos columnas.

**Cómo deshacerlo**
- `cp -a /srv/data/portfolio-backup-web-20261122-1659/. /srv/data/portfolio/`. Después se pueden borrar `css/fonts*`, `img/og.png` e `img/proyecto-proxmox.webp`.

**Nextcloud (continuación del cambio anterior)**
- El cron automático se ejecutó a las 17:00:02, así que el crontab funciona.

## 2026-11-22 · Nextcloud: tareas de fondo con cron y contenedores con versión fija (VM 102)

**Copia previa**
- En `/srv/data/backups/cambios-20261122-1653/` (carpeta `700`, ficheros `600`):
  - volcado completo de MariaDB (`mariadb-all.sql.gz`, 337 tablas, con `--single-transaction`)
  - los dos `docker-compose.yml`
  - `config.php` de Nextcloud
  - el crontab de juanma, que estaba vacío.
- No se hizo una copia vzdump manual porque no hay acceso a Proxmox desde aquí.

**1. Tareas de fondo de Nextcloud**
- Problema: estaban en modo "AJAX", el de por defecto, que solo las lanza cuando alguien abre la web. La última ejecución era del 30 de octubre. Sin ellas no se vacía la papelera, no se limpian versiones ni ficheros temporales y no se envían avisos.
- Solución:
  - `occ background:cron` para pasar al modo Cron.
  - Línea en el crontab de juanma, que pertenece al grupo docker y no necesita sudo: `*/5 * * * * docker exec -u www-data nextcloud php -f /var/www/html/cron.php`
- La primera ejecución manual tardó 1 min 13 s porque recuperó tres semanas de tareas.
- Incidencia: el primer intento dejó el crontab vacío. `set -e` cortó el script al fallar `crontab -l`, porque no existía crontab. Se detectó al comprobarlo y se instaló de nuevo.

**2. Contenedores alineados con el compose**
- Problema: el compose ya tenía versiones fijas, pero los contenedores se habían creado antes de ese cambio y seguían con `nextcloud:apache`, `mariadb:11` y `homepage:latest`.
- Se comprobó antes que el contenido era el mismo: Nextcloud 35.0.2 y MariaDB 11.8.9 en las dos imágenes, y Homepage con el mismo ID. Recrear no cambia ninguna versión.
- Se recrearon con `docker compose up -d --pull never` en `nextcloud` y `utilidades`, sin descargar nada. Redis y Uptime Kuma no cambiaron.

**Comprobación**
- `occ status`: instalado, versión 35.0.2, sin mantenimiento y sin actualización de BD pendiente.
- MariaDB arranca sin errores y el cron funciona en modo `cron`.
- `nextcloud.casa` y `home.casa` dan 200 a través de NPM, y Uptime Kuma responde.

**Cómo deshacerlo**
- Cron: `crontab -r` y `docker exec -u www-data nextcloud php occ background:ajax`
- Contenedores: copiar los compose de la carpeta de copia y ejecutar `docker compose up -d --pull never`.
- Base de datos, solo si hiciera falta: `zcat mariadb-all.sql.gz | docker exec -i nextcloud-db sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD"'`

**Detectado y pendiente**
- Las contraseñas de MariaDB están escritas directamente en `nextcloud/docker-compose.yml`, y tanto ese fichero como el `.env` tienen permisos `664`, así que cualquier usuario de la VM puede leerlos.

## 2026-11-22 · Versión fija de la imagen nginx del portfolio (VM 103)

**Qué se hizo**
- En `/srv/data/stacks/portfolio/docker-compose.yml`, `image: nginx:alpine` pasa a ser `nginx:1.31.8-alpine3.24@sha256:785835ea65db…0606`.
- Es exactamente la imagen que ya estaba funcionando: nginx 1.31.8 sobre Alpine 3.24.3, con el mismo ID. No se descargó ni se actualizó nada, porque el contenedor se recreó con `--pull never`.
- Copia previa: `docker-compose.yml.bak-20261122-antes-version`.

**Por qué**
- La regla del proyecto pide imágenes con versión fija. Con `nginx:alpine`, cualquier `docker compose pull` habría cambiado de versión sin avisar.
- La etiqueta dice qué versión es, y el digest garantiza que siempre sea la misma imagen aunque la etiqueta se reconstruya en Docker Hub.

**Comprobación**
- El contenedor `portfolio` funciona con esa imagen. La portada, `/servidor/` y `contacto.html` dan 200 en local y en público, y las cuatro cabeceras de seguridad siguen presentes.

**Para actualizar en el futuro**
- Cambia la etiqueta y el digest a mano en el compose y ejecuta `docker compose pull && docker compose up -d`.

**Cómo deshacerlo**
- `cp docker-compose.yml.bak-20261122-antes-version docker-compose.yml && docker compose up -d --pull never`

## 2026-11-22 · Mejoras de la guía y del nginx del portfolio (VM 103)

**Copias previas (en la VM)**
- Guía anterior: `/srv/data/portfolio-backup-servidor-20261122/` (75 ficheros, fuera de la carpeta publicada).
- Compose: `/srv/data/stacks/portfolio/docker-compose.yml.bak-20261122`.

**Cambios en la guía (`/srv/data/portfolio/servidor/`)**
1. **Dominio de ejemplo restaurado.** La guía es una plantilla: dice "Donde veas tudominio.com pon tu dominio". El reemplazo por `juanmarosado.com` rompía esa frase y publicaba los nombres internos reales (`*.casa.…`). Vuelve a `tudominio.com`. Las IPs 192.168.0.x se mantienen: son privadas e inalcanzables desde Internet, y la guía las presenta como las de este montaje.
2. **Fuentes alojadas en el propio servidor.** IBM Plex Sans y Mono (licencia SIL OFL) se descargaron una vez de Google Fonts, solo los subconjuntos latin y latin-ext, y se guardan en `css/fonts/` con `css/fonts.css`. Así no se envía la IP de cada visitante a Google (RGPD) y la página ya no depende de terceros.
3. **Vista previa al compartir.** Añadidas las etiquetas Open Graph y Twitter, `canonical` y una imagen `img/og.png` de 1200×630.
4. **Imágenes.**
   - Borradas 4 que no se usaban (059, 082, 125 y 132).
   - Las otras 68 se pasaron de PNG a WebP sin pérdida: de 3,35 MB a 1,87 MB.
   - Cada `<img>` lleva `width`/`height`, y en el CSS se añadió `height:auto` para que no se deformen y el texto no salte al cargar.
- La subida se hizo en una carpeta temporal que luego sustituyó a la anterior, para que la web no quedara a medias. Dueño `juanma` y `chmod -R a+rX`.

**Cambios en nginx del portfolio (`/srv/data/stacks/portfolio/`)**
- Nuevo `default.conf`, basado en el de serie de la imagen y montado en el compose como solo lectura. Antes de usarlo se validó con `nginx -t`. El contenedor se recreó con `docker compose up -d --pull never`, con la misma imagen y sin actualizarla.
- `absolute_redirect off`: antes `https://juanmarosado.com/servidor` (sin barra) redirigía a `http://…`, porque nginx, detrás de NPM y Cloudflare, solo ve http. Ahora redirige de forma relativa a `/servidor/`.
- Cabeceras de seguridad para todo el portfolio:
  - `Strict-Transport-Security: max-age=31536000`, sin `includeSubDomains` para no afectar a `*.casa`.
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: SAMEORIGIN`
  - `server_tokens off` para no mostrar la versión de nginx.
- No se tocó NPM, Cloudflare ni el firewall: las cabeceras se ponen en el origen y llegan tal cual al visitante.

**Comprobación**
- Desde la VM y desde Internet, la guía, `fonts.css`, las fuentes, `app.js`, las imágenes WebP y `og.png` → 200. Las páginas del portfolio (`/`, `contacto.html`, `proyectos.html`) siguen dando 200.
- `/servidor` → 301 a `/servidor/`. Las cuatro cabeceras de seguridad aparecen en la respuesta pública.
- En el navegador: 68 imágenes sin roturas ni deformaciones y fuentes Plex cargadas sin ninguna petición externa.

**Cómo deshacerlo**
- Guía: `rm -r /srv/data/portfolio/servidor && cp -a /srv/data/portfolio-backup-servidor-20261122 /srv/data/portfolio/servidor`
- nginx: `cd /srv/data/stacks/portfolio && cp docker-compose.yml.bak-20261122 docker-compose.yml && docker compose up -d --pull never`. Después se puede borrar `default.conf`.

## 2026-11-22 · Publicada la guía web en https://juanmarosado.com/servidor/

**Qué se hizo**
- Se descomprimió `servidor-web.zip` en una carpeta temporal del PC (75 ficheros: `index.html`, `css/style.css`, `js/app.js` y 72 imágenes en `img/`).
- En `index.html` se sustituyó `tudominio.com` por `juanmarosado.com` (16 líneas; ya no queda ninguna aparición del dominio de ejemplo).
- Antes de subir se revisó el contenido: no hay contraseñas ni tokens reales, solo ejemplos como `${DB_PASS}` o `PEGA_AQUI_TU_TOKEN`, y `app.js` no hace peticiones a otros sitios.
- En la VM 103 (`profesional`) **no existía** `/srv/data/portfolio/servidor`, así que no hubo nada que copiar (no se creó `/srv/data/portfolio-backup-servidor-*`).
- Se subió la carpeta con `tar` por SSH a `/srv/data/portfolio/servidor/`, con dueño `juanma` (sin sudo), y se ejecutó `chmod -R a+rX` sobre ella.
- No se tocó ningún otro archivo de `/srv/data/portfolio`, ni nginx, NPM, el túnel o el firewall.

**Por qué**
- Publicar la guía del servidor casero como subruta del portfolio, que nginx ya sirve en el puerto 8081 y NPM y Cloudflare Tunnel publican en juanmarosado.com.

**Comprobación**
- Desde la VM, `http://localhost:8081/servidor/`, `css/style.css`, `js/app.js` e `img/000.png` → 200.
- Pública, `https://juanmarosado.com/servidor/` y los mismos recursos → 200 a través de Cloudflare.

**Cómo deshacerlo**
- `ssh profesional 'rm -r /srv/data/portfolio/servidor'`
