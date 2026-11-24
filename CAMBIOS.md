# Registro de cambios

## 2026-11-24 · Auditoría de seguridad: cortafuegos del nodo, rpcbind y reinicio de las VMs

**Qué**
- Cortafuegos del nodo (`cluster.fw` y el nuevo `host.fw`):
  - política de entrada DROP;
  - el conjunto `management` (web 8006, SSH 22, consolas) contiene solo el PC de Juanma (192.168.0.135) y Tailscale (192.168.0.253, la IP con la que sale lo que llega por la VPN);
  - el alias `local_network` se redefine como solo el nodo (192.168.0.254), porque si no Proxmox mete toda la red de casa en `management`;
  - excepciones al 8006: VM 102 (Uptime Kuma y Homepage) y LXC 101 (NPM, para `proxmox.casa`). Ping permitido desde la red de casa.
- `rpcbind` apagado y desactivado en el nodo (no hay almacenamiento NFS).
- VMs 102 y 103 reiniciadas con `qm reboot` para cargar el kernel de seguridad 6.12.118, que estaba instalado pero sin usar. El proceso de la VM 102 deja de usar la librería Kerberos antigua de la actualización del nodo.
- `scripts/sincronizar.sh` incluye `/etc/pve/nodes/pve/host.fw`. `jobs.cfg` solo cambia de orden (lo reescribe Proxmox).
- Guía del servidor: nuevo paso «Cierra el nodo al resto de la red» en el capítulo de seguridad, con la trampa de `local_network`, y pruebas nuevas.

**Por qué**
- La auditoría vio que el cortafuegos del nodo estaba activado pero sin reglas: cualquier equipo de casa (móviles, tele, VMs y contenedores) llegaba a la web de Proxmox, al SSH del nodo, a la consola SPICE (3128) y a `rpcbind` (111). Si se compromete un servicio, no debe poder saltar al nodo.
- Las VMs tenían el aviso de reinicio pendiente por el kernel.

**Copia previa**
- `/root/cluster.fw.antes-20261124-2058` en el nodo (antes no existía `host.fw`).
- Copias vzdump de las VMs 102 y 103 de esa madrugada (03:08 y 03:12).
- Mientras se probaba, un temporizador (`systemd-run --on-active=300`) devolvía la configuración anterior si se perdía el acceso. Se canceló tras las pruebas.

**Comprobación**
- Abierto: SSH y 8006 desde el PC, 8006 desde la VM 102 y NPM, `proxmox.casa` a través de NPM, SSH y 8006 desde el LXC 100 (Tailscale), ping desde el LXC 101.
- Bloqueado: SSH del nodo desde la VM 102 y el LXC 101, 3128 y 111 desde el LXC 101.
- El nodo sigue saliendo hacia las VMs (agente de la VM 102 responde). Web pública 200.
- VMs 102 y 103 con kernel 6.12.118, sin reinicio pendiente, todos los contenedores arriba; Nextcloud, Kuma y Homepage responden.

**Cómo deshacerlo**
- `cp /root/cluster.fw.antes-20261124-2058 /etc/pve/firewall/cluster.fw; rm /etc/pve/nodes/pve/host.fw`
- `systemctl enable --now rpcbind.socket rpcbind.service`
- Si el PC cambia de IP, deja de entrar por SSH: entra por Tailscale o por `proxmox.casa` y añade la nueva IP a `management`. Conviene fijar la IP del PC en el router.

**Pendiente (Juanma)**
- Activar la verificación en dos pasos (TOTP) en Proxmox (`root@pam` y `juanma@pve`) y en Nextcloud.

## 2026-11-24 · Formulario de contacto preparado para Web3Forms (VM 103)

**Qué**
- `js/main.js` envía el formulario a Web3Forms (`api.web3forms.com/submit`) cuando la constante `CLAVE_WEB3FORMS` tiene valor. Mientras esté vacía, abre el programa de correo (`mailto:`) como antes. Si Web3Forms falla, también abre el correo, para que no se pierda el mensaje.
- La función se ha dividido en `enviarConWeb3Forms` y `abrirCorreo`.
- En `contacto.html` hay una casilla trampa para robots (`botcheck`), oculta para las personas y excluida de la validación.
- `main.js` y `styles.css` se enlazan con `?v=20261124` en todas las páginas, por la caché de Cloudflare.

**Por qué**
- Con `mailto:`, quien no tiene un programa de correo configurado no puede escribir. Juanma eligió Web3Forms.

**Pendiente (Juanma)**
- Pedir la clave en web3forms.com con su correo. Después hay que ponerla en `CLAVE_WEB3FORMS`, publicar y enviar un mensaje de prueba.

**Copia previa**
- `/srv/data/portfolio-backup-web-20261124-2041`.

**Comprobación**
- En local, el envío vacío muestra los 3 errores y la casilla trampa no se valida ni se ve.
- `enviarConWeb3Forms` se probó con un `fetch` simulado: manda los 7 campos a la URL correcta, enseña «¡Mensaje enviado!» y vacía el formulario.
- En público, `main.js?v=20261124` lleva el código nuevo y `contacto.html`, la casilla trampa.

## 2026-11-24 · Copia fuera de casa en USB: script preparado (sin instalar)

**Qué**
- Están en el repositorio, sin instalar en el nodo:
  - `pve/usr/local/bin/copia-usb.sh`;
  - `pve/etc/systemd/system/copia-usb.service`;
  - `pve/etc/udev/rules.d/99-copia-usb.rules`.
- Al conectar el USB cifrado (etiqueta LUKS `copia-usb`), udev lanza el servicio y el script:
  1. abre el cifrado con `/root/.copia-usb.key` y lo monta;
  2. copia la última copia vzdump de las 4 máquinas y la última `pve-config-*.tar.gz`, y comprueba cada fichero con SHA-256 (también deja un `SHA256SUMS` en el USB);
  3. guarda 3 copias y borra las más antiguas antes de copiar, para hacer sitio;
  4. desmonta, cierra el cifrado y avisa con un correo a root, que la regla `default-matcher` manda también a Telegram.

**Por qué**
- Todas las copias estaban dentro del mismo servidor. Juanma tiene un USB de 64 GB para llevarse una copia fuera de casa.

**Comprobación**
- `bash -n` correcto en el PC y en el nodo.
- Se probó en el nodo con una carpeta temporal en lugar del USB, solo con la copia de la máquina 100 y sin avisos, guardando 2 copias. La primera prueba guardaba una copia de más; se corrigió y, en la segunda, la tercera ejecución borró la más antigua y dejó 2. Los SHA-256 coinciden.
- Después se borraron la carpeta y el registro de prueba.

**Pendiente (con Juanma en casa, el USB conectado al nodo y su permiso)**
1. `apt install cryptsetup-bin`: no está instalado en el nodo.
2. Cifrar el USB, que borra todo lo que tenga:
   - `cryptsetup luksFormat --label copia-usb /dev/sdX`; la contraseña de respaldo la escribe Juanma y la guarda en su gestor;
   - crear la clave con `dd if=/dev/urandom of=/root/.copia-usb.key bs=64 count=1` y `chmod 400`, y añadirla con `cryptsetup luksAddKey`;
   - `cryptsetup open`, `mkfs.ext4`, `close`.
3. Instalar los tres ficheros con `sincronizar.sh` y hacer `systemctl daemon-reload` y `udevadm control --reload`.
4. Primera copia con el USB conectado, comprobando que llega el aviso a Telegram.

## 2026-11-24 · Guías con código común y comprobaciones automáticas de la web

**Qué**
- `web/portfolio/comun/` contiene `css/guia.css`, `css/fonts.css` (con las fuentes IBM Plex) y `js/guia.js`, compartidos por las dos guías.
  - Antes, cada guía tenía su propia copia, que ya empezaba a ser distinta: la del servidor no cerraba la captura ampliada con Esc.
  - Cada guía indica en el `body` su clave de progreso (`data-clave-progreso`) y su nombre (`data-nombre-guia`). Se mantienen las claves de antes (`guia-hecho` y `guia-dual-hecho`), así que nadie pierde su progreso.
  - Lo propio de la guía del arranque dual queda en `guia-dual-w11-mint/css/propio.css`.
- `scripts/comprobar-web.py` revisa cada página: título, descripción, canonical, `lang="es"` y un solo `h1`. Revisa también el JSON-LD, los enlaces internos, que las imágenes tengan `alt`, `width` y `height`, y el sitemap.
  - Lo ejecuta `publicar-web.sh` antes de subir nada, y para si hay problemas.
  - Lo ejecuta también GitHub Actions (`.github/workflows/comprobar-web.yml`) en cada push. Solo usa Python de serie.
- La guía del servidor tiene un apartado nuevo, «Prueba a restaurar una copia», en el capítulo de copias.

**Por qué**
- Que las guías no se diferencien con el tiempo y que un error en la web se vea antes de publicarla.

**Copia previa**
- `/srv/data/portfolio-backup-web-20261124-2029`.

**Comprobación**
- `comprobar-web.py` da correctas las 8 páginas. Con una página rota de prueba detecta los 10 problemas que tenía.
- La primera ejecución en GitHub Actions es correcta.
- En local y en público, las dos guías cargan su CSS común, las fuentes, el menú, el título y los botones Copiar. La captura ampliada se cierra con Esc.

**Pendiente**
- `publicar-web.sh` no borra nada, así que en la VM 103 siguen los ficheros antiguos de las guías: `servidor/css/`, `servidor/js/`, `guia-dual-w11-mint/css/fonts*`, `guia-dual-w11-mint/css/style.css` y `guia-dual-w11-mint/js/`. Ya no los usa ninguna página. Para borrarlos hace falta el permiso de Juanma.

## 2026-11-24 · Prueba de restauración de la VM 103

**Qué**
- Se restauró la copia vzdump de esa noche de la VM 103 (`vzdump-qemu-103-2026_11_24-03_12_28.vma.zst`, 2 GB) como VM 9103:
  - con `--unique 1`, para que tenga otra MAC;
  - con `onboot 0` y la red desconectada (`link_down=1`), para que no choque con la VM 103 real.
- Se arrancó, se comprobó y se borró con `qm destroy 9103 --purge 1`.

**Por qué**
- Una copia que nunca se ha restaurado no se sabe si sirve.

**Resultado**
- La restauración tardó 80 segundos y el agente QEMU respondió a los 15 segundos de arrancar.
- Dentro de la VM, `systemctl` estaba en `running`, `/srv/data` estaba montado con el portfolio, los contenedores `portfolio` y `portainer` estaban levantados, y `curl localhost:8081` daba 200 con la web de esa noche.
- Después no quedó ningún volumen 9103, la VM 103 real siguió funcionando todo el tiempo y la web pública dio 200.

## 2026-11-24 · Nodo: actualizaciones de seguridad de Kerberos (pve)

**Qué**
- Se instalaron las 5 actualizaciones de seguridad pendientes del nodo: `krb5-locales`, `libgssapi-krb5-2`, `libk5crypto3`, `libkrb5-3` y `libkrb5support0`, que pasan de `1.21.3-5+deb13u1` a `deb13u2`.
- Se instalaron solo esos paquetes (`apt-get install --only-upgrade`), sin `full-upgrade`, para no arrastrar nada más.
- Se reiniciaron `postfix`, `rpcbind` y `zfs-zed`, que seguían usando la librería antigua. La VM 102 (proceso `kvm`) la usará al reiniciarse la próxima vez; no se ha reiniciado ahora.

**Por qué**
- El nodo no tiene unattended-upgrades y la revisión del día encontró estas 5 actualizaciones de seguridad pendientes.

**Copia previa**
- La lista de versiones anteriores está en `/root/paquetes-antes-krb5-20261124.txt` del nodo.

**Comprobación**
- No quedan actualizaciones pendientes, ningún servicio ha fallado, el pool está sano y los tres servicios reiniciados están activos.

**Cómo deshacerlo**
- `apt-get install <paquete>=1.21.3-5+deb13u1` con las versiones de la lista, si siguen en la caché de apt.

## 2026-11-24 · Verificación de Google Search Console (VM 103)

**Qué**
- Se publica `web/portfolio/googleea7266599bfd91a7.html` en la raíz de la web. Es el fichero de verificación de Search Console para la propiedad «Prefijo de URL» `https://juanmarosado.com/`.
- El fichero solo contiene la línea de verificación que da Google. No es un secreto: Google lo comprueba públicamente.

**Por qué**
- Para dar de alta la web en Search Console y enviar el sitemap, sin tocar Cloudflare.

**Copia previa**
- `/srv/data/portfolio-backup-web-20261124-1545`.

**Comprobación**
- `https://juanmarosado.com/googleea7266599bfd91a7.html` da 200 con el contenido esperado.

**Cómo deshacerlo**
- Si se borra el fichero, Google deja de dar la propiedad por verificada. Hay que mantenerlo publicado.

## 2026-11-24 · SEO: sitemap, datos estructurados, página 404 y un h1 por guía (VM 103)

**Qué**
- **Sitemap y robots.**
  - `web/portfolio/sitemap.xml` lista las 7 páginas, cada una con su `lastmod`.
  - `web/portfolio/robots.txt` deja rastrear todo y declara el sitemap. Cloudflare añade delante sus señales de contenido y mantiene nuestras líneas.
- **Datos estructurados (JSON-LD).**
  - Inicio: `WebSite` y `Person`, con nombre, IES Belén, Málaga, GitHub y LinkedIn. No incluye el correo.
  - Sobre mí: `ProfilePage`.
  - Guías: `TechArticle`, con autor, fechas de publicación y modificación, e imagen.
- **Títulos y descripciones** pensados para lo que busca la gente:
  - Inicio: «Juanma Rosado · Estudiante de DAW en Málaga | Portfolio».
  - Guía del servidor: «Servidor casero con Proxmox VE: guía paso a paso | Juanma Rosado».
  - Guía del arranque dual: «Arranque dual Windows 11 y Linux Mint en VirtualBox | Guía paso a paso».
  - La descripción de Proyectos ya no dice «El primero: …».
  - Las guías pasan a `og:type` `article`.
  - En el `app.js` de las guías, el capítulo de inicio deja el título del HTML. Antes lo cambiaba por el del capítulo, que es lo que veía Google al ejecutar el JavaScript.
- **Iconos.**
  - Nuevos `/favicon.ico`, `img/favicon-48.png` y `img/apple-touch-icon.png`, sacados de `logo.svg` con el navegador; el ICO se montó con Python.
  - Todas las páginas los enlazan, también las guías, que antes no tenían icono.
- **Un solo `h1` por guía.**
  - Desde el segundo capítulo, cada título baja un nivel: `h1` → `h2.t1`, `h2` → `h3.t2`, `h3` → `h4.t3`.
  - El CSS da a `.t1`, `.t2` y `.t3` el mismo aspecto que `h1`, `h2` y `h3`, así que no cambia cómo se ven (comprobado con los estilos calculados).
  - La hoja de las guías sube a `?v=20261124`.
- **Enlaces internos.** El pie de cada guía enlaza al autor (Sobre mí), a la otra guía y a Proyectos. Las dos guías tienen «Última revisión: 24 de noviembre de 2026».
- **Página 404 propia.**
  - `web/portfolio/404.html` tiene el estilo del portfolio, rutas absolutas, `noindex` y enlaces a las guías.
  - En `default.conf` (VM 103) se añade `error_page 404 /404.html;`, y la guía del servidor muestra el `default.conf` nuevo.
- `publicar-web.sh` comprueba también `sitemap.xml`, `robots.txt` y `favicon.ico`.

**Por qué**
- Juanma pidió mejorar el posicionamiento. Antes no había sitemap (404), ni datos estructurados, ni favicon en las guías, y las guías tenían 14 y 7 `h1`. Además, las direcciones inexistentes mostraban la página 404 de serie de nginx.

**Copia previa**
- Web: `/srv/data/portfolio-backup-web-20261124-1537`.
- nginx: `/srv/data/stacks/portfolio/default.conf.bak-20261124-1537`, hecha por `sincronizar.sh llevar`.

**Comprobación**
- Los 4 bloques JSON-LD son JSON válido (comprobado con Python).
- En local, las guías tienen un solo `h1` y los títulos se ven con el mismo tamaño y borde que antes.
- `nginx -t` correcto dentro del contenedor y recarga con `nginx -s reload`, sin reiniciarlo.
- En público:
  - todas las páginas, `sitemap.xml`, `robots.txt`, `favicon.ico` y `apple-touch-icon.png` dan 200;
  - `/no-existe` y `/servidor/no-existe` dan 404 con la página propia;
  - inicio, sobre mí y las dos guías llevan su JSON-LD.

**Pendiente (lo hace Juanma)**
- Dar de alta `https://juanmarosado.com/` en Google Search Console y en Bing Webmaster Tools, y enviar `https://juanmarosado.com/sitemap.xml`. Con la propiedad «Prefijo de URL» se puede verificar con un fichero HTML, sin tocar Cloudflare.

**Cómo deshacerlo**
- Web: `git revert` y publicar con `scripts/publicar-web.sh`, o restaurar la copia.
- nginx: `cp /srv/data/stacks/portfolio/default.conf.bak-20261124-1537 /srv/data/stacks/portfolio/default.conf` y `docker exec portfolio nginx -s reload`. Hay que copiarlo con `cp` sobre el mismo fichero, porque el montaje es de un solo fichero.

## 2026-11-23 · Proyectos por categorías y con fecha; capturas en WebP

**Qué**
- **Proyectos** se ordena por relevancia y se divide en categorías:
  - «Servidores y virtualización» va primero, con Proxmox;
  - «Sistemas operativos» va después, con el arranque dual.

  Arriba hay un índice con enlaces a cada categoría. Las categorías son `h2` y los proyectos `h3`.
- Cada proyecto lleva la fecha con `<time>`:
  - Proxmox: «Desde octubre de 2026 · En marcha». Juanma confirmó que lo empezó en octubre.
  - Arranque dual: «23 de noviembre de 2026 · Práctica de clase», la fecha de sus capturas.
- En el **inicio** vuelve a destacarse Proxmox, con el título «Proyecto destacado» en vez de «Último proyecto».
- `styles.css`: estilos de las categorías (`.categorias`, `.categoria`), y `.project h2` pasa a ser `.project h3`. En todas las páginas, el enlace sube a `?v=20261123` por la caché de Cloudflare.
- **Guía del arranque dual**:
  - las 32 capturas pasan de PNG a WebP con calidad 95, de 5,5 MB a 1,4 MB (un 75 % menos);
  - `paso-22.png` se queda solo como imagen al compartir (`og:image`), porque algunas redes no aceptan WebP;
  - `publicar-web.sh` comprueba ahora `paso-32.webp`.

**Por qué**
- Juanma quiere ver primero los proyectos más relevantes, agrupados por categorías y con su fecha.
- Con WebP, la guía carga mucho más rápido.

**Cómo se convirtieron las capturas**
- En este PC no hay `cwebp` ni Pillow, y tampoco en el nodo ni en la VM 102. Se usó el codificador WebP del navegador (`canvas.toBlob`, calidad 0.95), servido por un pequeño servidor local que guardaba los ficheros. No se instaló nada.
- Calidad: el PSNR frente al PNG va de 33,6 a 57,1 dB. En la captura peor (`paso-04`), ampliada al doble, no se distingue del PNG.

**Copia previa**
- `/srv/data/portfolio-backup-web-20261123-2145` en la VM 103.

**Comprobación**
- En local: las 32 capturas WebP cargan, Proyectos se ve con sus dos categorías y el inicio destaca Proxmox.
- En público: `publicar-web.sh` da 200 en todas las páginas, y con `curl` dan 200 las 32 capturas WebP, `paso-22.png` y `styles.css?v=20261123`.

**Limpieza en el servidor**
- `publicar-web.sh` no borra nada, así que en la VM 103 quedaron los 31 PNG antiguos de `guia-dual-w11-mint/img/`. Con permiso de Juanma, se borraron uno a uno con `rm` (todos menos `paso-22.png`). Antes se comprobó que estaban en la copia `portfolio-backup-web-20261123-2145`. Ahora quedan las 32 WebP y `paso-22.png`, y la guía, la imagen al compartir y Proyectos siguen dando 200.

**Cómo deshacerlo**
- `git revert` de este commit y publicar con `scripts/publicar-web.sh`, o restaurar la copia previa.

## 2026-11-23 · Portfolio: la guía del arranque dual, como último proyecto

**Qué**
- La guía del arranque dual tiene ahora imagen al compartir el enlace (`og:image`, con la captura del menú de GRUB) y `twitter:card`, como las demás páginas.
- En el inicio, «Último proyecto» pasa a ser la guía del arranque dual, que es el proyecto más reciente. La tarjeta de Proxmox sigue en Proyectos.
- En Proyectos, «Próximamente» dice «Estoy preparando más proyectos de DAW», porque ya hay uno publicado.
- En el README se añade la carpeta de la guía.

**Por qué**
- Era lo que faltaba al revisar la publicación anterior: sin `og:image`, el enlace salía sin imagen en WhatsApp o LinkedIn, y los textos del portfolio se habían quedado anticuados.

**Copia previa**
- `/srv/data/portfolio-backup-web-20261123-2138` en la VM 103.

**Comprobación**
- En local se ve bien la tarjeta destacada del inicio.
- En público, `publicar-web.sh` da 200 en todas las páginas, y con `curl` se ven el `og:image` de la guía, el título nuevo en el inicio y el texto nuevo de «Próximamente».

**Cómo deshacerlo**
- Volver a la versión anterior de los tres HTML (`git revert`) y publicar con `scripts/publicar-web.sh`.

## 2026-11-23 · Nueva guía: instalación dual de Windows 11 y Linux Mint

**Qué**
- Nueva guía web de la práctica de Sistemas Informáticos (1.º DAW, Unidad 2): Windows 11 Pro y Linux Mint XFCE con arranque dual en una misma máquina virtual. Está en `web/portfolio/guia-dual-w11-mint/` y se publica en `https://juanmarosado.com/guia-dual-w11-mint/`.
- Usa el mismo estilo que la guía del servidor: se copiaron su `style.css`, las fuentes IBM Plex y `app.js`, con tres cambios:
  - el progreso de capítulos se guarda con otra clave (`guia-dual-hecho`), para no mezclarse con el de la otra guía;
  - las capturas ampliadas también se cierran con Esc;
  - al final de `style.css` hay un apartado con lo propio de esta guía: los colores del diagrama del disco, la marca ✔ de las comprobaciones y la licencia CC BY 4.0 del pie.
- En el portfolio, la página de proyectos tiene la tarjeta «Proyecto 02»; en el inicio, la tarjeta de proyectos la nombra; y en habilidades se añaden «Linux Mint» y «Arranque dual (GRUB, UEFI)».
- `scripts/publicar-web.sh` comprueba también la guía nueva y una de sus capturas.

**Por qué**
- Juanma quería tener la práctica publicada como guía, junto al resto de proyectos del portfolio.

**Copia previa**
- La hizo `publicar-web.sh` en la VM 103: `/srv/data/portfolio-backup-web-20261123-2132` (96 ficheros).

**Comprobación**
- En local (`python -m http.server`): las 32 capturas cargan, los capítulos y la numeración de los pasos (1 a 32) son correctos, y las capturas se amplían y se cierran con Esc. También se probó en modo claro, en modo oscuro y en móvil.
- En público, `publicar-web.sh` da 200 en todas las páginas. Además, con `curl`, dan 200 las 32 capturas, `style.css`, `fonts.css` y `app.js`.
- Se revisaron las 32 capturas antes de publicarlas. No hay contraseñas, correos ni datos personales: solo el usuario genérico «Alumno» del PC de clase y la respuesta «usuario» a una pregunta de seguridad de la cuenta de prueba de la máquina virtual.

**Cómo deshacerlo**
- Borrar `/srv/data/portfolio/guia-dual-w11-mint/` en la VM 103 y volver a publicar `proyectos.html`, `index.html` y `habilidades.html` desde el commit anterior. Otra opción es restaurar la copia previa entera con `cp -a /srv/data/portfolio-backup-web-20261123-2132/. /srv/data/portfolio/`.

## 2026-11-22 · sincronizar.sh lee bien los ficheros de la VM 102

**Qué pasaba**
- `dbdump.sh` salía siempre como `formato` aunque era idéntico en el servidor y en el repositorio (el SHA-256 coincidía).
- La causa estaba en la lectura con `qm guest exec`, que devuelve la salida en JSON:
  - `qm guest exec` codifica en UTF-8 cada byte de la salida, así que las tildes llegan codificadas dos veces (`contraseña` llegaba como `contraseÃ±a`).
  - Python en Windows añade `\r` a cada línea cuando escribe en modo texto.
- No afectaba al servidor, pero `traer` habría metido en el repositorio tildes rotas y finales de línea de Windows.

**Cambio**
- En `scripts/sincronizar.sh`, el JSON se lee como UTF-8, el texto se vuelve a bytes con latin-1 (un byte por carácter) y se escribe en binario.
- Además se llevó `dbdump.sh` a la VM 102 con `sincronizar.sh llevar` (copia previa: `/usr/local/bin/dbdump.sh.bak-20261122-2108`). No cambió nada porque ya era el mismo fichero.
- Se ha restaurado el título de la entrada anterior, que se había cortado.

**Comprobación**
- `scripts/sincronizar.sh`: los 26 ficheros dan `igual`.
- `bash -n` sobre el `dbdump.sh` del servidor: sintaxis correcta.

## 2026-11-22 · Repositorio público: menos datos personales

**Revisión** (el repositorio ya era público)
- Se buscaron contraseñas, tokens, claves privadas, el token y el chat ID de Telegram y claves de Tailscale en los ficheros y en los 8 commits del historial. No apareció nada, así que no hay nada que cambiar en el servidor.
- Sí se veían algunos datos personales o identificadores innecesarios. Se ha dejado lo que es contenido del proyecto: las IPs privadas, los nombres `*.casa` y las reglas de firewall, que la guía ya explica y no se pueden alcanzar desde Internet.

**Cambios**
- `scripts/sincronizar.sh` quita ahora en el servidor, antes de copiar:
  - los correos electrónicos, que pasan a `correo@ejemplo.com`;
  - las direcciones MAC (`XX:XX:XX:XX:XX:XX`);
  - los identificadores únicos de las VMs (`smbios1` y `vmgenid`).
- Las configuraciones de las 4 máquinas (`pve/guests/`) entran en la lista del script como "solo traer". Se limpiaron junto con `notifications.cfg`, que tenía tu Gmail en tres líneas.
- Los commits de este repositorio usan ahora el correo privado de GitHub (`…@users.noreply.github.com`), configurado solo para este repositorio. La configuración global de git no cambia.
- Tu Gmail sigue en `web/` (página de contacto y formulario) porque es tu contacto público, a propósito.

**Lo que no se ha cambiado**
- El historial: los commits anteriores siguen mostrando tu Gmail como autor y los MAC y UUID antiguos. No son secretos (las MAC son virtuales, generadas por Proxmox) y reescribir el historial de un repositorio público no compensa.

## 2026-11-22 · Todo sincronizado: contraseñas en .env, limpieza, guía al día y scripts

**1. Contraseñas de Nextcloud fuera del compose (VM 102)**
- Estaban escritas en `/srv/data/stacks/nextcloud/docker-compose.yml`. El `.env` que ya existía usaba otros nombres y otros valores, y nada lo leía.
- Las contraseñas contienen `$`, que Docker Compose trata como variable. Por eso no se copió el texto escrito, sino lo que reciben de verdad los contenedores (`docker compose config`). Se guardó en un `.env` nuevo, con los valores entre comillas simples y permisos `600`.
- Ahora el compose solo tiene `${MARIADB_ROOT_PASSWORD}`, `${MARIADB_PASSWORD}` y `${MYSQL_PASSWORD}`.
- Comprobación: el hash de `docker compose config` es idéntico antes y después, así que los contenedores no se reiniciaron.
- Copias: `.env.bak-20261122` (el `.env` antiguo) y `docker-compose.yml.bak-20261122-antes-env`, ambos `600`. El `docker-compose.yml.bak` antiguo también pasa a `600`.

**2. Limpieza de imágenes Docker**
- VM 102: se borraron `nextcloud:apache`, `mariadb:11` y `hello-world`, sin uso, y se liberaron 2,6 GB.
- VM 102 y LXC 101: se quitaron las etiquetas sobrantes (`latest`, `gethomepage/homepage:v2.7.0`), que apuntaban a imágenes en uso. Las imágenes se conservan.
- Las carpetas de copia de hoy se mantienen unos días, por si acaso.

**3. Guía (`/servidor/`) al día con el servidor real**
- Discos de sistema y del LXC 101 en el espejo ZFS, con cómo moverlos en caliente.
- Pasos nuevos en las VMs: límite de logs de Docker y `unattended-upgrades`.
- Compose de Nextcloud con `.env` (y el error del `$`), tareas de fondo con cron, versiones fijas (Kuma 2.5.8, Redis 7.4.12) y Portainer en compose.
- Portfolio: nginx con versión fija y su `default.conf` (redirecciones relativas, cabeceras y www).
- Seguridad: SSH solo con clave y comprobaciones nuevas.
- Copias: `dbdump.sh` y `backup-config.sh` iguales a los del repositorio (estilo de clase), con el cron a las 02:45 y el `PATH`.
- 6 recuadros de "Error real" y 8 filas nuevas en la tabla de errores: cron sin `PATH`, Nextcloud en AJAX, compose sin recrear, `$` en contraseñas, DNS bloqueado, `ssh.socket`, matcher sin Telegram y caché de Cloudflare. Dos lecciones nuevas.
- "Última revisión: 22 de noviembre de 2026" en la portada.
- Incidencia: al insertar los scripts en la guía, se borró el principio de tres bloques de código. Lo detectó la comprobación de etiquetas, se corrigió antes de publicar y se revisó en el navegador.

**4. Repositorio y servidor iguales**
- `scripts/sincronizar.sh` compara los 22 ficheros de configuración del servidor con los del repositorio y dice si son iguales, si solo cambian comentarios o espacios, o si son distintos.
  - `traer` copia al repositorio solo lo que cambia de verdad, sin secretos. Así no pisa los comentarios.
  - `llevar` sube lo editado aquí, con copia previa en el servidor. Si el cambio es real, solo lo sube cuando se nombra el fichero.
- Sustituye a `traer-config.sh`, que se creó y se retiró en esta misma sesión porque sobrescribía los comentarios.
- `scripts/publicar-web.sh` publica `web/portfolio` en la VM 103 con copia previa y comprueba que las páginas dan 200.
- Llevado al servidor (copia previa `*.bak-20261122-2041` junto a cada fichero):
  - los compose de NPM, cloudflared, Nextcloud, utilidades y portfolio;
  - `default.conf`;
  - `backup-config.sh` y `dbdump.sh`, con la versión de estilo de clase.
- Comprobación:
  - la configuración efectiva de los 7 compose es idéntica antes y después;
  - `nginx -t` correcto y nginx recargado;
  - `backup-config.sh` probado como lo lanza cron: copia y volcado OK;
  - www y `/servidor` redirigen bien y las cabeceras siguen ahí.
- Web publicada con el script (copia `/srv/data/portfolio-backup-web-20261122-2043`). Las 7 páginas dan 200, y el CSS y el JS públicos coinciden con el repositorio.

## 2026-11-22 · Código y comentarios con mi estilo de clase

**Qué y por qué**
- Antes de hacer público el repositorio, he pasado el código a las reglas de estilo de clase: 2 espacios de sangría, llaves siempre, comentarios en su propia línea antes de lo que explican, nombres descriptivos en camelCase y constantes en MAYÚSCULAS.
- `main.js` y `app.js`: reescritos en funciones pequeñas con nombres en español. Hacen exactamente lo mismo.
- `styles.css` y `style.css`: una propiedad por línea y comentarios por secciones. Comprobado que, quitando espacios y comentarios, el CSS es idéntico al anterior.
- `backup-config.sh`, `dbdump.sh`, `default.conf` y los compose: mismos comandos y opciones, solo cambian nombres de variables, sangría y comentarios.
- README más sencillo, escrito en primera persona.

**Comprobación**
- Probé el portfolio y la guía en local: menú, enlace activo, barra de progreso, animaciones, validación del formulario, capítulos, botón de completado y botones de copiar. Sin errores en la consola.

**Pendiente**
- ~~Estos archivos todavía no están copiados al servidor.~~ Copiados con `scripts/sincronizar.sh llevar` y publicados con `scripts/publicar-web.sh`: ver la entrada "Todo sincronizado".

## 2026-11-22 · Reinicio del nodo Proxmox (kernel nuevo)

**Qué y por qué**
- Lo reinició Juanma hacia las 19:36 para que el nodo use el kernel instalado en la actualización (7.0.14-26 → **7.0.14-30-pve**).

**Comprobación** (50 min después del arranque)
- Nodo:
  - kernel 7.0.14-30-pve y pve-manager 9.2.32;
  - pool ZFS sano, firewall activo y ningún servicio fallido;
  - en el registro de errores del arranque solo hay avisos sin efecto: el driver `nouveau` de la tarjeta gráfica y `blkmapd` de NFS, que no se usa.
- Las 4 máquinas arrancaron solas (`onboot: 1`). En los LXC, SSH funciona y no hay servicios fallidos.
- Todos los contenedores están en marcha con sus versiones fijas.
- Nextcloud está en la 35.0.2, sin modo mantenimiento. Su cron se ejecutó a las 20:25.
- La VM 103 resuelve DNS.
- Webs y servicios:
  - juanmarosado.com, la guía y Nextcloud, Homepage y Kuma responden;
  - www redirige con un 301;
  - la interfaz de Proxmox responde y AdGuard resuelve los nombres `*.casa`.

## 2026-11-22 · Firewall de la VM 103: DNS antes del bloqueo de la LAN

**Problema**
- En `/etc/pve/firewall/103.fw`, la regla `OUT DROP -dest 192.168.0.0/24` iba antes que las dos que permiten DNS hacia AdGuard (192.168.0.253, puerto 53). Proxmox aplica la primera regla que coincide, así que las consultas DNS se bloqueaban.
- La web funcionaba, pero la VM no podía resolver nombres y por eso no podía actualizarse.

**Cambio** (con tu permiso explícito)
- Las dos reglas `OUT ACCEPT ... -dport 53` se pusieron encima del `OUT DROP`. No se añadió ni se quitó ninguna regla.
- Copia previa: `/root/cambios-20261122-1717/103.fw.antes`.

**Comprobación**
- La VM 103 resuelve `deb.debian.org`.
- Sigue sin alcanzar la LAN: AdGuard :80, la VM 102 :8080 y Proxmox :8006 siguen bloqueados.
- La web pública da 200.
- Con DNS ya funcionando, se instaló `unattended-upgrades` (solo seguridad) en la VM 103. No había actualizaciones pendientes.

**Cómo deshacerlo**
- `cp /root/cambios-20261122-1717/103.fw.antes /etc/pve/firewall/103.fw`

## 2026-11-22 · Revisión completa del servidor: copias, avisos, SSH, discos y actualizaciones

**Copias previas**
- Nodo: `/root/cambios-20261122-1717/` con el cron y el script de copias, `notifications.cfg`, `sshd_config`, la configuración de las 4 máquinas, la lista de paquetes y `/etc/ssh` y `/etc/docker` de los LXC.
- VMs: `/srv/data/backups/cambios-20261122-vm/` con todos los stacks y `daemon.json`.
- Además está la copia vzdump de las 4 máquinas de esa misma madrugada (03:00).

**1. Volcado de la BD de Nextcloud (no se había ejecutado nunca)**
- Causa: `/etc/cron.d/backup-config` no definía `PATH` y `qm` está en `/usr/sbin`. El error se descartaba con `>/dev/null 2>&1`, así que nadie lo veía.
- Cambios:
  - `backup-config.sh` define `PATH`, usa `umask 077` y da a `qm guest exec` 600 s de margen.
  - Comprueba que el volcado termina con código 0 y anota el resultado en `/var/log/backup-config.log`. Los errores van además al journal.
  - El cron pasa de las 03:30 a las **02:45**, para que la copia vzdump de las 03:00 ya lleve el volcado del día.
- `dbdump.sh` (VM 102): `umask 077` y carpeta `/srv/data/dumps` con permisos `700`. Antes, los volcados los podía leer cualquier usuario.
- `/datos/backups/config`: permisos `700` y ficheros `600`. Incluye `/etc/pve`, que tiene claves privadas.
- Prueba con un entorno mínimo, igual que cron: OK. El volcado tiene 337 tablas.

**2. Avisos de Proxmox a Telegram**
- El webhook `telegram` existía, pero la regla `default-matcher` solo enviaba al correo, y en una semana 14 correos rebotaron y 7 llegaron.
- Ahora la regla envía a `mail-to-root` y a `telegram`. Se quitó el destino `email`, un SMTP que estaba desactivado. Se envió un aviso de prueba.

**3. SSH solo con clave**
- Se añadió tu clave personal (`id_ed25519`) a root en el nodo y en los LXC 100 y 101, y se comprobó que entraba en los 5 equipos.
- En el nodo, los 2 LXC y las 2 VMs se creó `/etc/ssh/sshd_config.d/00-solo-claves.conf` con `PasswordAuthentication no`, `KbdInteractiveAuthentication no` y `PermitRootLogin prohibit-password`.
- Comprobado: en los 5 equipos entra con clave y rechaza la contraseña.
- La consola web de Proxmox sigue funcionando con contraseña y sirve de acceso de emergencia.
- Incidencia: en los LXC estaban activados `ssh.socket` y `ssh.service` a la vez y competían por el puerto 22. La recarga dejó el SSH del LXC 101 sin escuchar unos minutos. Se arregló dejando solo `ssh.service`, en los dos LXC.

**4. Discos del SSD al espejo ZFS**
- Los discos de sistema de las VMs 102 y 103 y el del LXC 101 estaban en `local-lvm`, el SSD único sin redundancia. Se movieron a `datos`:
  - las VMs, en caliente con `qm disk move --delete 1`;
  - el LXC 101, parado unos 80 s con `pct move-volume`.
- Ahora todo está en el espejo, tiene instantáneas de sanoid y `local-lvm` queda vacío. En el SSD solo queda el sistema de Proxmox.

**5. Versiones fijas y contenedores alineados**
- NPM 2.16.0 y cloudflared 2026.10.7 funcionaban con `:latest`, aunque su compose ya fijaba la versión. Se comprobó que eran las mismas imágenes y se recrearon sin descargar nada.
- Versiones fijadas con digest, las mismas que ya estaban en marcha:
  - Redis `7.4.12-alpine`
  - Uptime Kuma `2.5.8`
  - Portainer `2.45.3`
- Portainer, que se había lanzado a mano en las dos VMs, pasa a `/srv/data/stacks/portainer` con el mismo volumen de datos.
- En la VM 102, `nextcloud/docker-compose.yml` y `.env` tienen ahora permisos `600`, porque contienen contraseñas.

**6. Logs de Docker con límite**
- `/etc/docker/daemon.json` en las VMs 102 y 103 y en el LXC 101: 10 MB × 3 ficheros por contenedor. Se reinició Docker y se recrearon todos los contenedores.

**7. www.juanmarosado.com**
- Ahora redirige con un 301 a `https://juanmarosado.com`, manteniendo la ruta. Se hizo con un bloque `server` en el nginx del portfolio, sin tocar NPM ni Cloudflare.

**8. Actualizaciones**
- Proxmox: 83 paquetes actualizados (pve-manager 9.2.24 → 9.2.32), registro en `/root/cambios-upgrade-20261122.log`. **Se instaló el kernel 7.0.14-30, pero el nodo sigue con el 7.0.14-26 hasta que se reinicie.**
- LXC 100: 87 paquetes. LXC 101 ya estaba al día.
- `unattended-upgrades` activo, solo con el repositorio de seguridad de Debian, en los LXC 100 y 101 y en la VM 102.
- En la VM 103 no se pudo instalar: no tiene DNS (ver más abajo).
- No se activó en el nodo Proxmox, que conviene actualizar a mano.
- Se limpió el estado `failed` de `wtmpdb-rotate.timer` en el LXC 101.

**Detectado y no tocado (firewall)**
- En `/etc/pve/firewall/103.fw`, la regla `OUT DROP -dest 192.168.0.0/24` va **antes** que las que permiten DNS a 192.168.0.253, y gana la primera regla que coincide. Por eso la VM 103 no puede resolver nombres. Sí sale a Internet, pero `apt` no funciona.
- Corregido después, con tu permiso: ver la entrada "Firewall de la VM 103".

**Pendiente**
- Copia fuera del servidor: decidido dejarlo para más adelante.
- ~~Reiniciar el nodo para usar el kernel nuevo.~~ Hecho: ver "Reinicio del nodo Proxmox".

**Comprobación final**
- Pool ZFS sano y firewall de Proxmox activo.
- Las webs pública e internas responden: juanmarosado.com, la guía, Nextcloud, Homepage, Kuma, la interfaz de Proxmox y AdGuard.
- Nextcloud: 35.0.2, sin modo mantenimiento y con el cron activo.
- El túnel de Cloudflare tiene 4 conexiones registradas.

## 2026-11-22 · Nueva URL de LinkedIn en el portfolio (VM 103)

**Qué y por qué**
- La URL del perfil de LinkedIn pasó de `linkedin.com/in/juanma-rosado-trujillo-b841962b5` a `linkedin.com/in/juanma-rosado-trujillo`. LinkedIn no redirige la URL antigua, así que los enlaces de la web dejaban de funcionar.
- Se cambió el enlace en `index.html`, `sobre-mi.html`, `habilidades.html`, `proyectos.html` y `contacto.html` (6 enlaces). La guía `servidor/` no enlaza a LinkedIn.

**Copia previa**
- `/srv/data/portfolio-backup-linkedin-20261122-1734/` contiene las cinco páginas antes del cambio.

**Comprobación**
- En la VM no queda ninguna página con la URL antigua; los permisos siguen siendo `juanma:juanma 644`.
- En público las cinco páginas dan 200 y enlazan a la URL nueva (Cloudflare no las guarda en caché: `DYNAMIC`).

**Cómo deshacerlo**
- `cp -p /srv/data/portfolio-backup-linkedin-20261122-1734/*.html /srv/data/portfolio/`

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
