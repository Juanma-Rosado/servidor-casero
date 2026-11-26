<?php
/*
 * Plugin Name: Aviso de demo (Reserfy)
 * Description: Franja que avisa de que la web es un proyecto de clase ficticio y cierre de comentarios.
 * Author: Juanma Rosado
 *
 * Es un "must-use plugin": WordPress lo carga siempre y no se puede desactivar desde el panel.
 * El mismo archivo sirve a las dos webs; el texto cambia según el dominio.
 */

if (!defined('ABSPATH')) {
  exit;
}

// Dirección del proyecto en el portfolio, donde se explica qué es Reserfy
const AVISO_DEMO_ENLACE = 'https://juanmarosado.com/proyectos.html#reserfy';

// Indica si la web que se está sirviendo es la del restaurante de ejemplo
function esWebRestaurante() {
  $dominio = (string) wp_parse_url(home_url(), PHP_URL_HOST);
  return strpos($dominio, 'echalequeso') === 0;
}

// Texto de la franja para cada web
function obtenerTextoAvisoDemo() {
  if (esWebRestaurante()) {
    return 'Restaurante ficticio: demo del proyecto Reserfy. Las reservas son de prueba y no se envía ningún correo.';
  }
  return 'Empresa ficticia: proyecto final de 2.º SMR, restaurado como demo.';
}

// Pinta la franja al principio de la página
function mostrarAvisoDemo() {
  $texto = obtenerTextoAvisoDemo();
  echo '<div class="aviso-demo" role="note">';
  echo esc_html($texto) . ' ';
  echo '<a href="' . esc_url(AVISO_DEMO_ENLACE) . '">Más información</a>';
  echo '</div>';
}
add_action('wp_body_open', 'mostrarAvisoDemo', 1);

// Estilos de la franja: discreta, legible y sin tapar el menú
function anadirEstilosAvisoDemo() {
  $estilos = '
.aviso-demo {
  background: #1f2937;
  color: #f9fafb;
  font: 500 14px/1.4 system-ui, sans-serif;
  padding: 8px 16px;
  text-align: center;
}
.aviso-demo a {
  color: #fcd34d;
  text-decoration: underline;
}
.aviso-demo-formulario {
  color: #555555;
  font-size: 14px;
  line-height: 1.5;
}';
  wp_register_style('aviso-demo', false);
  wp_enqueue_style('aviso-demo');
  wp_add_inline_style('aviso-demo', $estilos);
}
add_action('wp_enqueue_scripts', 'anadirEstilosAvisoDemo');

// Comentarios y pingbacks cerrados en las dos webs: solo atraerían spam
add_filter('comments_open', '__return_false', 20);
add_filter('pings_open', '__return_false', 20);
