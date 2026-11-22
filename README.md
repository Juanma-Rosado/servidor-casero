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
| `CAMBIOS.md` | Registro de cada cambio y su motivo | — |

## Mapa

- Nodo Proxmox `pve`, 192.168.0.254: ZFS en espejo y copias vzdump diarias.
- LXC 100 `adguard`, 192.168.0.253: AdGuard Home y Tailscale.
- LXC 101 `npm`, 192.168.0.252: Nginx Proxy Manager y cloudflared.
- VM 102 `personal`, 192.168.0.250: Nextcloud, Uptime Kuma, Homepage y Portainer.
- VM 103 `profesional`, 192.168.0.251: el portfolio. No puede alcanzar la LAN, por diseño.

## Secretos

Las contraseñas **no** están en este repositorio. En los compose aparecen como `${VARIABLE}` y su valor real está solo en el servidor. Usa `.env.example` como plantilla.

Todavía faltan aquí, porque no he tenido acceso a ellos: la configuración del nodo Proxmox, de los LXC 100 y 101 y la carpeta de configuración de Homepage, que puede contener claves de API.
