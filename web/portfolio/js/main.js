// main.js: el JavaScript de todas las páginas del portfolio (español e inglés).
// Cada función mira primero si lo que necesita está en la página.

const EMAIL_DESTINO = "rosadotrujillojuanma@gmail.com";

// Clave pública de Web3Forms (se pide en web3forms.com con mi correo).
// Si el envío falla, el formulario abre el programa de correo.
const CLAVE_WEB3FORMS = "83db4c5a-e69f-4e5c-8b49-cccac787a5d7";
const URL_WEB3FORMS = "https://api.web3forms.com/submit";

// Idioma de la página, para los textos que escribe este fichero
const IDIOMA = document.documentElement.lang === "en" ? "en" : "es";

const TEXTOS = {
  es: {
    pasarAOscuro: "Modo oscuro",
    pasarAClaro: "Modo claro",
    obligatorio: "Este campo es obligatorio.",
    correoMal: "Escribe un correo válido, por ejemplo nombre@correo.com.",
    mensajeCorto: "El mensaje tiene que tener al menos 10 caracteres.",
    revisa: "Revisa los campos marcados.",
    enviando: "Enviando…",
    enviado: "Mensaje enviado. Te contesto lo antes posible.",
    abriendoCorreo: "Abriendo tu programa de correo…",
    falloEnvio: "No se pudo enviar. Abriendo tu programa de correo…",
    asunto: "Contacto desde el portfolio: ",
    de: "De: "
  },
  en: {
    pasarAOscuro: "Dark mode",
    pasarAClaro: "Light mode",
    obligatorio: "This field is required.",
    correoMal: "Please write a valid email, for example name@mail.com.",
    mensajeCorto: "The message needs at least 10 characters.",
    revisa: "Please check the marked fields.",
    enviando: "Sending…",
    enviado: "Message sent. I'll reply as soon as I can.",
    abriendoCorreo: "Opening your email app…",
    falloEnvio: "It couldn't be sent. Opening your email app…",
    asunto: "Contact from the portfolio: ",
    de: "From: "
  }
};

const texto = TEXTOS[IDIOMA];

document.addEventListener("DOMContentLoaded", () => {
  iniciarBotonTema();
  ponerAnio();
  iniciarFormulario();
});

// ---------- Modo claro / oscuro ----------

// Devuelve el tema que se ve ahora mismo
function temaActual() {
  const elegido = document.documentElement.dataset.tema;
  if (elegido) {
    return elegido;
  }
  // Si no se ha elegido nada, manda lo que diga el sistema
  const sistemaOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return sistemaOscuro ? "oscuro" : "claro";
}

function iniciarBotonTema() {
  const boton = document.querySelector(".boton-tema");
  if (!boton) {
    return;
  }

  // El botón dice a qué modo vas a pasar, no en cuál estás
  function actualizarTextoBoton() {
    boton.textContent = temaActual() === "oscuro" ? texto.pasarAClaro : texto.pasarAOscuro;
  }

  boton.addEventListener("click", () => {
    const nuevoTema = temaActual() === "oscuro" ? "claro" : "oscuro";
    document.documentElement.dataset.tema = nuevoTema;
    localStorage.setItem("tema", nuevoTema);
    actualizarTextoBoton();
  });

  actualizarTextoBoton();
}

// Año del pie de página
function ponerAnio() {
  const anio = document.getElementById("anio");
  if (anio) {
    anio.textContent = new Date().getFullYear();
  }
}

// ---------- Formulario de contacto ----------

function iniciarFormulario() {
  const formulario = document.getElementById("formulario");
  if (!formulario) {
    return;
  }

  const estado = formulario.querySelector(".estado");
  // La casilla trampa para robots no está dentro de un .campo, así que no se valida
  const campos = formulario.querySelectorAll(".campo input, .campo textarea");

  campos.forEach((campo) => {
    campo.addEventListener("blur", () => validar(campo));
  });

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();

    // Valido todos a la vez para que salgan todos los errores juntos
    const resultados = [...campos].map(validar);
    if (!resultados.every(Boolean)) {
      estado.textContent = texto.revisa;
      return;
    }

    const mensaje = {
      nombre: formulario.nombre.value.trim(),
      email: formulario.email.value.trim(),
      texto: formulario.mensaje.value.trim()
    };

    if (CLAVE_WEB3FORMS) {
      enviarConWeb3Forms(formulario, estado, mensaje);
    } else {
      abrirCorreo(estado, mensaje);
      formulario.reset();
    }
  });
}

// Manda el mensaje a Web3Forms, que me lo reenvía al correo
async function enviarConWeb3Forms(formulario, estado, mensaje) {
  const boton = formulario.querySelector("button[type=submit]");
  boton.disabled = true;
  estado.textContent = texto.enviando;

  try {
    const respuesta = await fetch(URL_WEB3FORMS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        access_key: CLAVE_WEB3FORMS,
        subject: texto.asunto + mensaje.nombre,
        from_name: "Portfolio juanmarosado.com",
        name: mensaje.nombre,
        email: mensaje.email,
        message: mensaje.texto,
        botcheck: formulario.botcheck.checked
      })
    });
    const resultado = await respuesta.json();
    if (!resultado.success) {
      throw new Error(resultado.message);
    }
    estado.textContent = texto.enviado;
    formulario.reset();
  } catch (error) {
    // Si el servicio falla, abro el correo para que el mensaje no se pierda
    abrirCorreo(estado, mensaje);
    estado.textContent = texto.falloEnvio;
  } finally {
    boton.disabled = false;
  }
}

// Abre el programa de correo del visitante con el mensaje ya escrito
function abrirCorreo(estado, mensaje) {
  const asunto = texto.asunto + mensaje.nombre;
  const cuerpo = mensaje.texto + "\n\n" + texto.de + mensaje.nombre + " (" + mensaje.email + ")";
  window.location.href = "mailto:" + EMAIL_DESTINO
    + "?subject=" + encodeURIComponent(asunto)
    + "&body=" + encodeURIComponent(cuerpo);
  estado.textContent = texto.abriendoCorreo;
}

// Comprueba un campo y escribe el error debajo. Devuelve true si está bien.
function validar(campo) {
  const caja = campo.closest(".campo");
  const valor = campo.value.trim();
  let error = "";

  if (!valor) {
    error = texto.obligatorio;
  } else if (campo.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
    error = texto.correoMal;
  } else if (campo.name === "mensaje" && valor.length < 10) {
    error = texto.mensajeCorto;
  }

  caja.querySelector(".error").textContent = error;
  caja.classList.toggle("invalido", error !== "");
  // aria-invalid avisa a los lectores de pantalla de que el campo está mal;
  // el texto del error lo leen gracias al aria-describedby del HTML
  if (error) {
    campo.setAttribute("aria-invalid", "true");
  } else {
    campo.removeAttribute("aria-invalid");
  }
  return error === "";
}
