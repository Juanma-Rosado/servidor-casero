<?php
/*
 * Plugin Name: Protección del formulario de reservas (Reserfy)
 * Description: Campo trampa contra bots y límite de reservas por IP.
 * Author: Juanma Rosado
 *
 * Sin protección, un bot podría llenar la base de datos de reservas falsas. Dos frenos sin
 * servicios externos:
 *   - un campo trampa que una persona no ve y un bot rellena;
 *   - como mucho RESERVAS_POR_IP reservas por hora desde la misma IP.
 * Lo que se para se marca como spam: Contact Form 7 no lo da por bueno, la aplicación de
 * gestión no lo enseña y la limpieza diaria lo borra.
 * Usa esFormularioReservas() de validacion-reservas.php y crearClaveIp() de seguridad-wordpress.php.
 */

if (!defined('ABSPATH')) {
  exit;
}

// Reservas que se aceptan por hora desde una misma IP
const RESERVAS_POR_IP = 5;

// Nombre del campo trampa: suena a algo que un bot querría rellenar
const RESERVAS_CAMPO_TRAMPA = 'sitio_web';

// Indica si las funciones de los otros plugins están cargadas
function hayFuncionesDeProteccion() {
  return function_exists('esFormularioReservas') && function_exists('crearClaveIp');
}

// Añade el campo trampa al final del formulario, fuera de la vista y del tabulador
function anadirCampoTrampa($elementos) {
  if (!hayFuncionesDeProteccion() || !esFormularioReservas()) {
    return $elementos;
  }
  $campo = '<p class="campo-trampa" aria-hidden="true"><label>Deja este campo vacío '
    . '<input type="text" name="' . RESERVAS_CAMPO_TRAMPA . '" value="" tabindex="-1" autocomplete="off"></label></p>';
  return $elementos . $campo;
}
add_filter('wpcf7_form_elements', 'anadirCampoTrampa');

// Reservas aceptadas en la última hora desde la IP del visitante
function contarReservasDeLaIp() {
  return (int) get_transient(crearClaveIp('reservas_ip_'));
}

// Marca como spam si el campo trampa trae algo o si la IP ha reservado demasiado
function detectarReservaAbusiva($esSpam, $envio) {
  if ($esSpam || !hayFuncionesDeProteccion() || !esFormularioReservas()) {
    return $esSpam;
  }
  $trampa = isset($_POST[RESERVAS_CAMPO_TRAMPA]) ? trim((string) wp_unslash($_POST[RESERVAS_CAMPO_TRAMPA])) : '';
  if ($trampa !== '') {
    $envio->add_spam_log([
      'agent' => 'campo-trampa',
      'reason' => 'El campo oculto venía relleno',
    ]);
    return true;
  }
  if (contarReservasDeLaIp() >= RESERVAS_POR_IP) {
    $envio->add_spam_log([
      'agent' => 'limite-ip',
      'reason' => 'Demasiadas reservas en una hora desde la misma IP',
    ]);
    return true;
  }
  return false;
}
add_filter('wpcf7_spam', 'detectarReservaAbusiva', 20, 2);

// Cuenta la reserva cuando se acepta
function contarReservaAceptada($formulario) {
  if (!hayFuncionesDeProteccion() || !esFormularioReservas()) {
    return;
  }
  $clave = crearClaveIp('reservas_ip_');
  $reservas = contarReservasDeLaIp();
  set_transient($clave, $reservas + 1, HOUR_IN_SECONDS);
}
add_action('wpcf7_mail_sent', 'contarReservaAceptada');

// El campo trampa no se ve, pero sigue en la página para los bots
function anadirEstilosCampoTrampa() {
  $estilos = '
.campo-trampa {
  height: 1px;
  left: -9999px;
  overflow: hidden;
  position: absolute;
  width: 1px;
}';
  wp_register_style('campo-trampa', false);
  wp_enqueue_style('campo-trampa');
  wp_add_inline_style('campo-trampa', $estilos);
}
add_action('wp_enqueue_scripts', 'anadirEstilosCampoTrampa');
