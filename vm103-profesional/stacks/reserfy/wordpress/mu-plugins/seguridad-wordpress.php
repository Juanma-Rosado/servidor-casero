<?php
/*
 * Plugin Name: Seguridad básica (Reserfy)
 * Description: Cierra XML-RPC, oculta la lista de usuarios y frena los intentos de contraseña.
 * Author: Juanma Rosado
 *
 * Las dos webs son públicas y no usan XML-RPC ni necesitan enseñar sus usuarios.
 * Los intentos fallidos de inicio de sesión se cuentan por IP (guardada como resumen,
 * no en claro): tras INTENTOS_LOGIN_MAXIMOS fallos, esa IP espera unos minutos.
 */

if (!defined('ABSPATH')) {
  exit;
}

// Fallos de contraseña permitidos antes de bloquear
const INTENTOS_LOGIN_MAXIMOS = 5;

// Minutos que dura el bloqueo
const INTENTOS_LOGIN_MINUTOS = 15;

// IP del visitante. Las visitas llegan por Cloudflare -> NPM -> nginx de entrada,
// así que REMOTE_ADDR es la del nginx: la real viene en CF-Connecting-IP.
// La VM solo acepta conexiones de NPM, así que la cabecera no se puede falsear desde Internet.
function obtenerIpVisitante() {
  $cabeceras = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
  foreach ($cabeceras as $cabecera) {
    $valor = isset($_SERVER[$cabecera]) ? trim((string) $_SERVER[$cabecera]) : '';
    if ($valor !== '' && filter_var($valor, FILTER_VALIDATE_IP)) {
      return $valor;
    }
  }
  return 'desconocida';
}

// Clave para guardar algo de una IP sin guardar la IP en claro
function crearClaveIp($prefijo) {
  return $prefijo . substr(hash_hmac('sha256', obtenerIpVisitante(), wp_salt()), 0, 32);
}

// XML-RPC: xmlrpc.php contesta 403 antes de hacer nada (aun sin métodos, seguía
// respondiendo a system.multicall), y desaparece la cabecera que lo anuncia
if (defined('XMLRPC_REQUEST') && XMLRPC_REQUEST) {
  status_header(403);
  exit;
}
add_filter('xmlrpc_enabled', '__return_false');
add_filter('xmlrpc_methods', '__return_empty_array');
function quitarCabeceraPingback($cabeceras) {
  unset($cabeceras['X-Pingback']);
  return $cabeceras;
}
add_filter('wp_headers', 'quitarCabeceraPingback');

// La API REST no lista los usuarios a quien no ha iniciado sesión
function ocultarUsuariosEnApi($rutas) {
  if (is_user_logged_in()) {
    return $rutas;
  }
  foreach (array_keys($rutas) as $ruta) {
    if (strpos($ruta, '/wp/v2/users') === 0) {
      unset($rutas[$ruta]);
    }
  }
  return $rutas;
}
add_filter('rest_endpoints', 'ocultarUsuariosEnApi');

// /?author=1 redirigía a /author/nombre/ y descubría el usuario: ahora va a la portada
function evitarListadoDeAutores() {
  if (!is_user_logged_in() && isset($_GET['author'])) {
    wp_safe_redirect(home_url('/'), 301);
    exit;
  }
}
add_action('template_redirect', 'evitarListadoDeAutores', 1);

// Cuenta un fallo de contraseña para la IP del visitante
function contarFalloLogin() {
  $clave = crearClaveIp('fallos_login_');
  $fallos = (int) get_transient($clave);
  set_transient($clave, $fallos + 1, INTENTOS_LOGIN_MINUTOS * MINUTE_IN_SECONDS);
}
add_action('wp_login_failed', 'contarFalloLogin');

// Si la IP ha fallado demasiadas veces, ni siquiera comprueba la contraseña
function frenarIntentosLogin($usuario) {
  $fallos = (int) get_transient(crearClaveIp('fallos_login_'));
  if ($fallos >= INTENTOS_LOGIN_MAXIMOS) {
    return new WP_Error('demasiados_intentos', 'Demasiados intentos fallidos. Espera ' . INTENTOS_LOGIN_MINUTOS . ' minutos y vuelve a probar.');
  }
  return $usuario;
}
add_filter('authenticate', 'frenarIntentosLogin', 30);

// Al entrar bien, se olvidan los fallos
function olvidarFallosLogin() {
  delete_transient(crearClaveIp('fallos_login_'));
}
add_action('wp_login', 'olvidarFallosLogin');
