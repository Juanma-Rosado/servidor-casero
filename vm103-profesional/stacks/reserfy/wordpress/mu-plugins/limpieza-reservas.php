<?php
/*
 * Plugin Name: Limpieza de reservas (Reserfy)
 * Description: Borra cada día las reservas de prueba con más de una semana y las marcadas como spam.
 * Author: Juanma Rosado
 *
 * El formulario de la demo es público: cualquiera puede dejar su nombre, teléfono y correo.
 * No hace falta guardarlos más de unos días, así que una tarea diaria de WordPress los borra.
 * Las reservas de ejemplo que enseña la aplicación de gestión llevan la marca
 * _reserva_demo_fija y no se borran nunca.
 * También se puede lanzar a mano: wp reserfy-limpiar
 */

if (!defined('ABSPATH')) {
  exit;
}

// Días que se guarda una reserva de prueba
const LIMPIEZA_DIAS_GUARDADAS = 7;

// Nombre de la tarea diaria en WP-Cron
const LIMPIEZA_TAREA = 'reserfy_limpiar_reservas';

// Marca de las reservas de ejemplo que no se borran
const LIMPIEZA_MARCA_FIJA = '_reserva_demo_fija';

// Busca las reservas que sobran: las antiguas sin marca y las de spam, sean de cuando sean
function buscarReservasParaBorrar() {
  $antiguas = get_posts([
    'post_type' => 'flamingo_inbound',
    'post_status' => 'any',
    'numberposts' => -1,
    'fields' => 'ids',
    'date_query' => [
      [
        'before' => LIMPIEZA_DIAS_GUARDADAS . ' days ago',
      ],
    ],
    'meta_query' => [
      [
        'key' => LIMPIEZA_MARCA_FIJA,
        'compare' => 'NOT EXISTS',
      ],
    ],
  ]);
  $spam = get_posts([
    'post_type' => 'flamingo_inbound',
    'post_status' => ['flamingo-spam', 'trash'],
    'numberposts' => -1,
    'fields' => 'ids',
  ]);
  return array_unique(array_merge($antiguas, $spam));
}

// Borra del todo las reservas que sobran y los contactos que Flamingo guarda aparte
function limpiarReservasAntiguas() {
  if (!post_type_exists('flamingo_inbound')) {
    return 0;
  }
  $borradas = 0;
  foreach (buscarReservasParaBorrar() as $reservaId) {
    if (wp_delete_post($reservaId, true)) {
      $borradas++;
    }
  }
  $contactos = get_posts([
    'post_type' => 'flamingo_contact',
    'post_status' => 'any',
    'numberposts' => -1,
    'fields' => 'ids',
    'date_query' => [
      [
        'before' => LIMPIEZA_DIAS_GUARDADAS . ' days ago',
      ],
    ],
  ]);
  foreach ($contactos as $contactoId) {
    wp_delete_post($contactoId, true);
  }
  return $borradas;
}
add_action(LIMPIEZA_TAREA, 'limpiarReservasAntiguas');

// Programa la tarea una vez al día, solo en la web que tiene Flamingo
function programarLimpiezaReservas() {
  if (post_type_exists('flamingo_inbound') && !wp_next_scheduled(LIMPIEZA_TAREA)) {
    wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', LIMPIEZA_TAREA);
  }
}
add_action('init', 'programarLimpiezaReservas', 20);

// Orden para lanzarla a mano desde WP-CLI
if (defined('WP_CLI') && WP_CLI) {
  WP_CLI::add_command('reserfy-limpiar', function () {
    $borradas = limpiarReservasAntiguas();
    WP_CLI::success("Reservas borradas: $borradas");
  });
}
