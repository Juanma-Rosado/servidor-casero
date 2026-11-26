<?php
/*
 * Plugin Name: Correo de la demo (Reserfy)
 * Description: Tras reservar, enseña en pantalla el correo de confirmación que recibiría el cliente.
 * Author: Juanma Rosado
 *
 * En la demo los correos no salen del servidor (se quedan en Mailpit): enviarlos de verdad
 * permitiría usar el formulario para mandar correos a cualquier dirección. Para que se vea
 * que esa parte funciona, la respuesta del formulario lleva el correo ya montado con los
 * datos de la reserva, y un JavaScript lo pinta debajo del formulario.
 * Usa esFormularioReservas() del plugin validacion-reservas.php.
 */

if (!defined('ABSPATH')) {
  exit;
}

// En los correos, la fecha se escribe como «sábado, 28 de noviembre de 2026» y no 2026-11-28.
// Solo cambia el texto del correo: Flamingo y la aplicación de gestión siguen guardando 2026-11-28.
function escribirFechaLegible($sustituto, $enviado, $esHtml, $etiqueta) {
  if ($etiqueta->field_name() !== 'fecha') {
    return $sustituto;
  }
  $texto = is_array($enviado) ? (string) reset($enviado) : (string) $enviado;
  $fecha = DateTimeImmutable::createFromFormat('!Y-m-d', $texto, wp_timezone());
  if (!$fecha) {
    return $sustituto;
  }
  return wp_date('l, j \d\e F \d\e Y', $fecha->getTimestamp());
}
add_filter('wpcf7_mail_tag_replaced', 'escribirFechaLegible', 10, 4);

// Monta el correo al cliente (el "Correo 2" de Contact Form 7) con los datos enviados
function montarCorreoDemo($formulario) {
  $correo = $formulario->prop('mail_2');
  if (empty($correo['active'])) {
    return null;
  }
  $opcionesCuerpo = [
    'html' => !empty($correo['use_html']),
    'exclude_blank' => !empty($correo['exclude_blank']),
  ];
  return [
    'para' => wpcf7_mail_replace_tags($correo['recipient']),
    'de' => wpcf7_mail_replace_tags($correo['sender']),
    'asunto' => wpcf7_mail_replace_tags($correo['subject']),
    'cuerpo' => wpcf7_mail_replace_tags($correo['body'], $opcionesCuerpo),
    'esHtml' => !empty($correo['use_html']),
  ];
}

// Añade el correo a la respuesta del formulario, solo si la reserva se ha guardado
function anadirCorreoDemoARespuesta($respuesta, $resultado) {
  $reservaGuardada = isset($respuesta['status']) && $respuesta['status'] === 'mail_sent';
  if (!$reservaGuardada || !function_exists('esFormularioReservas') || !esFormularioReservas()) {
    return $respuesta;
  }
  $correo = montarCorreoDemo(WPCF7_ContactForm::get_current());
  if ($correo) {
    $respuesta['correo_demo'] = $correo;
  }
  return $respuesta;
}
add_filter('wpcf7_feedback_response', 'anadirCorreoDemoARespuesta', 10, 2);

// JavaScript que pinta el correo cuando Contact Form 7 avisa de que la reserva se ha enviado
function obtenerScriptCorreoDemo() {
  return <<<'JS'
// Crea una línea de cabecera del correo, como "Para: ..."
function crearLineaCabecera(etiqueta, valor) {
  const linea = document.createElement('p');
  const nombre = document.createElement('strong');
  nombre.textContent = etiqueta + ': ';
  linea.append(nombre, valor);
  return linea;
}

// Ajusta el alto del marco al del correo, para que no salga barra de desplazamiento
function ajustarAltoMarco(marco) {
  marco.style.height = marco.contentDocument.documentElement.scrollHeight + 'px';
}

// Pinta el correo debajo del formulario, en un marco aislado sin scripts
function mostrarCorreoDemo(formulario, correo) {
  const anterior = document.querySelector('.correo-demo');
  if (anterior) {
    anterior.remove();
  }
  const caja = document.createElement('section');
  caja.className = 'correo-demo';
  const titulo = document.createElement('h2');
  titulo.textContent = 'Este es el correo que recibirías';
  const nota = document.createElement('p');
  nota.className = 'correo-demo__nota';
  nota.textContent = 'Es una demo: el correo se ha generado con tus datos, pero no se ha enviado.';
  const cabecera = document.createElement('div');
  cabecera.className = 'correo-demo__cabecera';
  cabecera.append(
    crearLineaCabecera('De', correo.de),
    crearLineaCabecera('Para', correo.para),
    crearLineaCabecera('Asunto', correo.asunto)
  );
  const marco = document.createElement('iframe');
  marco.className = 'correo-demo__marco';
  marco.title = 'Correo de confirmación de la reserva';
  marco.setAttribute('sandbox', 'allow-same-origin');
  const cuerpo = correo.esHtml ? correo.cuerpo : '<pre style="white-space:pre-wrap">' + correo.cuerpo + '</pre>';
  marco.srcdoc = '<!DOCTYPE html><meta charset="utf-8"><base target="_blank"><body style="margin:0;padding:16px;background:#f4f4f4">' + cuerpo;
  marco.addEventListener('load', function () {
    ajustarAltoMarco(marco);
  });
  caja.append(titulo, nota, cabecera, marco);
  formulario.insertAdjacentElement('afterend', caja);
  caja.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

document.addEventListener('wpcf7mailsent', function (evento) {
  const respuesta = evento.detail && evento.detail.apiResponse;
  if (respuesta && respuesta.correo_demo) {
    mostrarCorreoDemo(evento.target, respuesta.correo_demo);
  }
});
JS;
}

// Estilos de la caja del correo
function obtenerEstilosCorreoDemo() {
  return '
.correo-demo {
  border: 2px dashed #c0392b;
  border-radius: 12px;
  margin: 32px 0;
  padding: 20px;
}
.correo-demo h2 {
  font-size: 1.4rem;
  margin: 0 0 4px;
}
.correo-demo__nota {
  color: #555555;
  font-size: 14px;
  margin: 0 0 12px;
}
.correo-demo__cabecera {
  background: #ffffff;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 12px;
  padding: 8px 16px;
}
.correo-demo__cabecera p {
  margin: 4px 0;
  overflow-wrap: anywhere;
}
.correo-demo__marco {
  border: 0;
  border-radius: 8px;
  height: 640px;
  width: 100%;
}';
}

// Carga el script y los estilos solo donde está el formulario de Contact Form 7
function anadirRecursosCorreoDemo() {
  if (!wp_script_is('contact-form-7', 'registered')) {
    return;
  }
  wp_add_inline_script('contact-form-7', obtenerScriptCorreoDemo());
  wp_register_style('correo-demo', false);
  wp_enqueue_style('correo-demo');
  wp_add_inline_style('correo-demo', obtenerEstilosCorreoDemo());
}
add_action('wp_enqueue_scripts', 'anadirRecursosCorreoDemo', 20);
