#!/bin/bash
# Crea el usuario "gestion" para la app Flask, con los permisos justos.
# En el proyecto original la app entraba como root; ahora solo puede leer, cambiar
# y borrar en las dos tablas donde Flamingo guarda las reservas.
# La imagen de MariaDB lo ejecuta una sola vez, después de importar 01-restaurante_db.sql.
# Sin "set -u": la imagen carga este fichero dentro de su propio script (source).

mariadb --protocol=socket -uroot -p"${MARIADB_ROOT_PASSWORD}" <<SQL
CREATE USER IF NOT EXISTS 'gestion'@'%' IDENTIFIED BY '${GESTION_DB_PASSWORD}';
GRANT SELECT, UPDATE, DELETE ON restaurante_db.wp_posts TO 'gestion'@'%';
GRANT SELECT, UPDATE, DELETE ON restaurante_db.wp_postmeta TO 'gestion'@'%';
FLUSH PRIVILEGES;
SQL
