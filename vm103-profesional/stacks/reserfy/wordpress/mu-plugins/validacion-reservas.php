<?php
/*
 * Plugin Name: Validación de reservas (Reserfy)
 * Description: Comprobaciones en el servidor para el formulario de reservas de Échale Queso.
 * Author: Juanma Rosado
 *
 * Contact Form 7 solo comprobaba lo que pedía el formulario, y la fecha mínima la ponía
 * un JavaScript del navegador, que se puede saltar. Aquí se valida en el servidor:
 *   - teléfono español de 9 cifras, admitiendo espacios, guiones y +34;
 *   - fecha entre hoy y RESERVAS_DIAS_MAXIMOS días, sin lunes (cerrado), y hora futura si es para hoy;
 *   - nada de reservas repetidas (mismo día y mismo correo o teléfono).
 */

if (!defined('ABSPATH')) {
  exit;
}

// Hasta cuántos días por delante se puede reservar
const RESERVAS_DIAS_MAXIMOS = 60;

// Minutos de margen para reservar el mismo día
const RESERVAS_MARGEN_MINUTOS = 30;

// Día de cierre del restaurante (formato ISO: 1 es lunes, 7 es domingo)
const RESERVAS_DIA_CERRADO = 1;

// Solo se aplica al formulario cuyo título empieza así
const RESERVAS_TITULO_FORMULARIO = 'Reserva de Mesa';

// Indica si el envío que se está validando es el del formulario de reservas
function esFormularioReservas() {
  if (!class_exists('WPCF7_ContactForm')) {
    return false;
  }
  $formulario = WPCF7_ContactForm::get_current();
  return $formulario && strpos($formulario->title(), RESERVAS_TITULO_FORMULARIO) === 0;
}

// Lee un campo enviado, sin barras invertidas ni espacios en los extremos
function leerCampoEnviado($nombre) {
  $valor = isset($_POST[$nombre]) ? wp_unslash($_POST[$nombre]) : '';
  if (is_array($valor)) {
    $valor = reset($valor);
  }
  return trim((string) $valor);
}

// Deja el teléfono en 9 cifras: quita espacios, puntos, guiones, paréntesis y el prefijo de España
function normalizarTelefono($telefono) {
  $soloCifras = preg_replace('/[\s.\-()]/', '', $telefono);
  return preg_replace('/^(\+34|0034)/', '', $soloCifras);
}

// Un teléfono español empieza por 6, 7, 8 o 9 y tiene 9 cifras
function esTelefonoValido($telefono) {
  return preg_match('/^[6789][0-9]{8}$/', normalizarTelefono($telefono)) === 1;
}

// Comprueba el teléfono
function validarTelefonoReserva($resultado, $etiqueta) {
  if ($etiqueta->name !== 'telefono' || !esFormularioReservas()) {
    return $resultado;
  }
  $telefono = leerCampoEnviado('telefono');
  if ($telefono !== '' && !esTelefonoValido($telefono)) {
    $resultado->invalidate($etiqueta, 'Escribe un teléfono de 9 cifras, por ejemplo 612 345 678.');
  }
  return $resultado;
}
add_filter('wpcf7_validate_tel*', 'validarTelefonoReserva', 20, 2);

// Busca otra reserva activa el mismo día con el mismo correo o teléfono
function existeReservaRepetida($fecha, $correo, $telefono) {
  $reservas = get_posts([
    'post_type' => 'flamingo_inbound',
    'post_status' => 'publish',
    'numberposts' => 200,
    'fields' => 'ids',
    'meta_key' => '_field_fecha',
    'meta_value' => $fecha,
  ]);
  foreach ($reservas as $reservaId) {
    if (get_post_meta($reservaId, '_submission_status', true) === 'cancelada') {
      continue;
    }
    $mismoCorreo = strcasecmp((string) get_post_meta($reservaId, '_field_email', true), $correo) === 0;
    $mismoTelefono = normalizarTelefono((string) get_post_meta($reservaId, '_field_telefono', true)) === $telefono;
    if ($mismoCorreo || $mismoTelefono) {
      return true;
    }
  }
  return false;
}

// Devuelve el error de la fecha y la hora, o una cadena vacía si son correctas
function buscarErrorFecha($textoFecha, $textoHora) {
  $zona = wp_timezone();
  $ahora = new DateTimeImmutable('now', $zona);
  $fecha = DateTimeImmutable::createFromFormat('!Y-m-d', $textoFecha, $zona);
  if (!$fecha) {
    return 'Elige una fecha válida.';
  }
  $hoy = $ahora->setTime(0, 0);
  $ultimoDia = $hoy->modify('+' . RESERVAS_DIAS_MAXIMOS . ' days');
  if ($fecha < $hoy) {
    return 'Esa fecha ya ha pasado.';
  }
  if ($fecha > $ultimoDia) {
    return 'Solo se puede reservar con ' . RESERVAS_DIAS_MAXIMOS . ' días de antelación como máximo.';
  }
  if ((int) $fecha->format('N') === RESERVAS_DIA_CERRADO) {
    return 'Los lunes el restaurante está cerrado. Elige otro día.';
  }
  if ($fecha == $hoy && preg_match('/^([01][0-9]|2[0-3]):[0-5][0-9]$/', $textoHora)) {
    $horaReserva = DateTimeImmutable::createFromFormat('Y-m-d H:i', $textoFecha . ' ' . $textoHora, $zona);
    $horaMinima = $ahora->modify('+' . RESERVAS_MARGEN_MINUTOS . ' minutes');
    if ($horaReserva < $horaMinima) {
      return 'Para hoy, elige una hora con al menos ' . RESERVAS_MARGEN_MINUTOS . ' minutos de margen.';
    }
  }
  return '';
}

// Comprueba la fecha, la hora y que la reserva no esté repetida
function validarFechaReserva($resultado, $etiqueta) {
  if ($etiqueta->name !== 'fecha' || !esFormularioReservas()) {
    return $resultado;
  }
  $textoFecha = leerCampoEnviado('fecha');
  if ($textoFecha === '') {
    return $resultado;
  }
  $error = buscarErrorFecha($textoFecha, leerCampoEnviado('hora'));
  if ($error === '') {
    $correo = leerCampoEnviado('email');
    $telefono = normalizarTelefono(leerCampoEnviado('telefono'));
    if (existeReservaRepetida($textoFecha, $correo, $telefono)) {
      $error = 'Ya hay una reserva para ese día con este correo o teléfono.';
    }
  }
  if ($error !== '') {
    $resultado->invalidate($etiqueta, $error);
  }
  return $resultado;
}
add_filter('wpcf7_validate_date*', 'validarFechaReserva', 20, 2);

// Guarda el teléfono ya normalizado, para que la app de gestión los vea todos igual
function guardarTelefonoNormalizado($datosEnviados) {
  if (isset($datosEnviados['telefono']) && is_string($datosEnviados['telefono']) && esFormularioReservas()) {
    $datosEnviados['telefono'] = normalizarTelefono($datosEnviados['telefono']);
  }
  return $datosEnviados;
}
add_filter('wpcf7_posted_data', 'guardarTelefonoNormalizado');
