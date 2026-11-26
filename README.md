# Servidor casero con Proxmox

Este es mi servidor casero: Proxmox VE con ZFS, dos contenedores LXC y dos máquinas virtuales con Docker. Mi web, https://juanmarosado.com, sale de aquí sin abrir puertos del router, gracias a Cloudflare Tunnel.

He escrito una guía paso a paso de cómo lo monté: https://juanmarosado.com/servidor/

## Qué hay en cada carpeta

| Carpeta | Qué hay | Dónde está en el servidor |
|---|---|---|
| `web/portfolio/` | Mi portfolio (HTML, CSS y JavaScript, sin frameworks) | VM 103, `/srv/data/portfolio` |
| `web/portfolio/servidor/` | La guía del servidor | VM 103, `/srv/data/portfolio/servidor` |
| `web/portfolio/guia-dual-w11-mint/` | La guía de la práctica de arranque dual de Windows 11 y Linux Mint | VM 103, `/srv/data/portfolio/guia-dual-w11-mint` |
| `vm103-profesional/stacks/portfolio/` | Compose y nginx del portfolio | VM 103, `/srv/data/stacks/portfolio` |
| `vm102-personal/stacks/nextcloud/` | Nextcloud con MariaDB y Redis | VM 102, `/srv/data/stacks/nextcloud` |
| `vm102-personal/stacks/utilidades/` | Uptime Kuma y Homepage | VM 102, `/srv/data/stacks/utilidades` |
| `vm102-personal/crontab-juanma.txt` | Tareas de fondo de Nextcloud | VM 102, crontab de juanma |
| `vm102-personal/usr-local-bin-dbdump.sh` | Volcado de la base de datos de Nextcloud | VM 102, `/usr/local/bin/dbdump.sh` |
| `vm10x-*/stacks/portainer/` | Portainer en cada VM | VM 102 y 103, `/srv/data/stacks/portainer` |
| `vm10x-*/etc-docker-daemon.json` | Límite de tamaño de los logs de Docker | `/etc/docker/daemon.json` |
| `lxc101-npm/` | Nginx Proxy Manager y cloudflared | LXC 101, `/opt/npm` y `/opt/cloudflared` |
| `pve/` | El nodo Proxmox: copias, cron, sanoid, vzdump, almacenamiento, avisos y SSH | Nodo `pve` |
| `scripts/` | Scripts para mantener el servidor y el repositorio iguales y publicar la web | Mi PC |
| `CAMBIOS.md` | Resumen de lo que voy cambiando | — |

## Cómo trabajo con este repositorio

El repositorio es la referencia: lo que hay aquí es lo que hay en el servidor. Después de cada cambio:

1. Lo apunto arriba del todo en mi registro con detalle (qué, por qué, la copia previa, cómo lo comprobé y cómo deshacerlo), que no se sube, y en una o dos líneas en `CAMBIOS.md`.
2. Comparo el servidor con el repositorio:
   ```bash
   scripts/sincronizar.sh             # solo compara
   scripts/sincronizar.sh traer       # trae lo que cambié en el servidor, sin secretos
   scripts/sincronizar.sh llevar      # sube lo que edité aquí, con copia previa
   ```
   Distingue un cambio de verdad de uno que solo toca comentarios o espacios, para no pisar nunca los comentarios del repositorio.
3. Si el cambio afecta a algo que explica la guía, la actualizo, con su "Error real" si lo hubo.
4. Si es un proyecto nuevo, lo añado al portfolio.
5. Publico la web, que hace una copia antes y comprueba que todo da 200:
   ```bash
   scripts/publicar-web.sh
   ```
   Si cambio el icono (`img/logo.svg`) o la imagen para redes (`scripts/imagenes/og.html`), antes vuelvo a generar los PNG con `scripts/generar-imagenes.sh`.
6. Commit y push.

## Cómo está montado

- Nodo Proxmox `pve`: dos discos en espejo ZFS, donde están todas las máquinas, y copias diarias con vzdump.
- LXC 100 `adguard`: AdGuard Home para el DNS y Tailscale para entrar desde fuera.
- LXC 101 `npm`: Nginx Proxy Manager y el túnel de Cloudflare.
- VM 102 `personal`: Nextcloud, Uptime Kuma, Homepage y Portainer.
- VM 103 `profesional`: el portfolio. Está aislada y no puede llegar al resto de la red de casa.

## Contraseñas

Aquí no hay ninguna contraseña. En los compose aparecen como `${VARIABLE}` y el valor real solo está en el servidor; `.env.example` sirve de plantilla. Del aviso de Telegram (`pve/etc/pve/notifications.cfg`) quité la URL, la cabecera y el cuerpo porque llevan el token del bot.

Tampoco he subido, a propósito, las reglas del firewall ni la configuración de cada máquina, la configuración de AdGuard Home (lleva el hash de la contraseña), los `.env` de cloudflared y Nextcloud, la base de datos de NPM ni la configuración de Homepage, que puede tener claves de API.
