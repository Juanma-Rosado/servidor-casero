# Servidor casero con Proxmox

Configuración y web de mi servidor casero: Proxmox VE con ZFS, dos contenedores LXC y dos máquinas virtuales con Docker. Está publicado en https://juanmarosado.com sin abrir puertos del router, gracias a Cloudflare Tunnel.

La guía completa, paso a paso, está en https://juanmarosado.com/servidor/

## Contenido

| Carpeta | Qué hay | Dónde vive en el servidor |
|---|---|---|
| `web/portfolio/` | Portfolio (HTML, CSS y JS sin frameworks) | VM 103, `/srv/data/portfolio` |
| `web/portfolio/servidor/` | Guía del servidor | VM 103, `/srv/data/portfolio/servidor` |
| `vm103-profesional/stacks/portfolio/` | Compose y nginx del portfolio | VM 103, `/srv/data/stacks/portfolio` |
| `vm102-personal/stacks/nextcloud/` | Nextcloud, MariaDB y Redis | VM 102, `/srv/data/stacks/nextcloud` |
| `vm102-personal/stacks/utilidades/` | Uptime Kuma y Homepage | VM 102, `/srv/data/stacks/utilidades` |
| `vm102-personal/crontab-juanma.txt` | Cron de las tareas de fondo de Nextcloud | VM 102, crontab de juanma |
| `vm102-personal/usr-local-bin-dbdump.sh` | Volcado de la BD de Nextcloud | VM 102, `/usr/local/bin/dbdump.sh` |
| `vm10x-*/stacks/portainer/` | Portainer en cada VM | VM 102 y 103, `/srv/data/stacks/portainer` |
| `vm10x-*/etc-docker-daemon.json` | Límite de logs de Docker | `/etc/docker/daemon.json` |
| `lxc101-npm/` | Compose de NPM y cloudflared y `daemon.json` | LXC 101, `/opt/npm`, `/opt/cloudflared` |
| `pve/` | Nodo Proxmox: script de copias, cron, sanoid, vzdump, almacenamiento, avisos, firewall, SSH y configuración de cada máquina | Nodo `pve` |
| `CAMBIOS.md` | Registro de cada cambio y su motivo | — |

## Mapa

- Nodo Proxmox `pve`, 192.168.0.254: ZFS en espejo y copias vzdump diarias.
- LXC 100 `adguard`, 192.168.0.253: AdGuard Home y Tailscale.
- LXC 101 `npm`, 192.168.0.252: Nginx Proxy Manager y cloudflared.
- VM 102 `personal`, 192.168.0.250: Nextcloud, Uptime Kuma, Homepage y Portainer.
- VM 103 `profesional`, 192.168.0.251: el portfolio. No puede alcanzar la LAN, por diseño.

## Secretos

Las contraseñas **no** están en este repositorio. En los compose aparecen como `${VARIABLE}` y su valor real está solo en el servidor. Usa `.env.example` como plantilla. Del aviso de Telegram (`pve/etc/pve/notifications.cfg`) se han quitado la URL, la cabecera y el cuerpo, porque contienen el token del bot.

No están a propósito, porque contienen secretos: la configuración de AdGuard Home (hash de la contraseña), los `.env` de cloudflared y Nextcloud, la base de datos de NPM y la carpeta de configuración de Homepage, que puede tener claves de API.
