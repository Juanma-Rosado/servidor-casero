# Servidor casero con Proxmox

Este es mi servidor casero: Proxmox VE con ZFS, dos contenedores LXC y dos máquinas virtuales con Docker. Mi web, https://juanmarosado.com, sale de aquí sin abrir puertos del router, gracias a Cloudflare Tunnel.

He escrito una guía paso a paso de cómo lo monté: https://juanmarosado.com/servidor/

## Qué hay en cada carpeta

| Carpeta | Qué hay | Dónde está en el servidor |
|---|---|---|
| `web/portfolio/` | Mi portfolio (HTML, CSS y JavaScript, sin frameworks) | VM 103, `/srv/data/portfolio` |
| `web/portfolio/servidor/` | La guía del servidor | VM 103, `/srv/data/portfolio/servidor` |
| `vm103-profesional/stacks/portfolio/` | Compose y nginx del portfolio | VM 103, `/srv/data/stacks/portfolio` |
| `vm102-personal/stacks/nextcloud/` | Nextcloud con MariaDB y Redis | VM 102, `/srv/data/stacks/nextcloud` |
| `vm102-personal/stacks/utilidades/` | Uptime Kuma y Homepage | VM 102, `/srv/data/stacks/utilidades` |
| `vm102-personal/crontab-juanma.txt` | Tareas de fondo de Nextcloud | VM 102, crontab de juanma |
| `vm102-personal/usr-local-bin-dbdump.sh` | Volcado de la base de datos de Nextcloud | VM 102, `/usr/local/bin/dbdump.sh` |
| `vm10x-*/stacks/portainer/` | Portainer en cada VM | VM 102 y 103, `/srv/data/stacks/portainer` |
| `vm10x-*/etc-docker-daemon.json` | Límite de tamaño de los logs de Docker | `/etc/docker/daemon.json` |
| `lxc101-npm/` | Nginx Proxy Manager y cloudflared | LXC 101, `/opt/npm` y `/opt/cloudflared` |
| `pve/` | El nodo Proxmox: copias, cron, sanoid, vzdump, almacenamiento, avisos, firewall, SSH y la configuración de cada máquina | Nodo `pve` |
| `CAMBIOS.md` | Lo que voy cambiando y por qué | — |

## Cómo está montado

- Nodo Proxmox `pve` (192.168.0.254): dos discos en espejo ZFS y copias diarias con vzdump.
- LXC 100 `adguard` (192.168.0.253): AdGuard Home para el DNS y Tailscale para entrar desde fuera.
- LXC 101 `npm` (192.168.0.252): Nginx Proxy Manager y el túnel de Cloudflare.
- VM 102 `personal` (192.168.0.250): Nextcloud, Uptime Kuma, Homepage y Portainer.
- VM 103 `profesional` (192.168.0.251): el portfolio. Está aislada y no puede llegar al resto de la red de casa.

## Contraseñas

Aquí no hay ninguna contraseña. En los compose aparecen como `${VARIABLE}` y el valor real solo está en el servidor; `.env.example` sirve de plantilla. Del aviso de Telegram (`pve/etc/pve/notifications.cfg`) quité la URL, la cabecera y el cuerpo porque llevan el token del bot.

Tampoco he subido, a propósito, la configuración de AdGuard Home (lleva el hash de la contraseña), los `.env` de cloudflared y Nextcloud, la base de datos de NPM ni la configuración de Homepage, que puede tener claves de API.
