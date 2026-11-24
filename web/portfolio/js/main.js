// main.js: código de todas las páginas del portfolio.
// Cada parte comprueba antes si su elemento existe en la página.

const REDUCIR_MOVIMIENTO = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EMAIL_DESTINO = "rosadotrujillojuanma@gmail.com";
// Clave pública de Web3Forms (la pide Juanma en web3forms.com con su correo).
// Mientras esté vacía, el formulario abre el programa de correo como antes.
const CLAVE_WEB3FORMS = "";
const URL_WEB3FORMS = "https://api.web3forms.com/submit";
const RETARDO_SALIDA = 250;
const DISTANCIA_LINEA = 120;
const MAX_PUNTOS = 70;

// Con la clase "js" se activan las animaciones de .reveal.
// Si el JavaScript falla, el contenido se sigue viendo.
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  iniciarMenu();
  marcarEnlaceActivo();
  iniciarTransiciones();
  iniciarBarraProgreso();
  iniciarApariciones();
  iniciarInclinacion();
  iniciarLuz();
  iniciarEscritura();
  iniciarParticulas();
  iniciarFormulario();
  document.getElementById("year").textContent = new Date().getFullYear();
});

// Menú hamburguesa del móvil
function iniciarMenu() {
  const boton = document.querySelector(".nav__toggle");
  const menu = document.querySelector(".nav__menu");

  boton.addEventListener("click", () => {
    const abierto = !menu.classList.contains("open");
    menu.classList.toggle("open", abierto);
    boton.setAttribute("aria-expanded", String(abierto));
    boton.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
  });
}

// Resalta en el menú la página en la que estamos
function marcarEnlaceActivo() {
  const paginaActual = location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".nav__menu a").forEach((enlace) => {
    if (enlace.getAttribute("href") === paginaActual) {
      enlace.classList.add("active");
    }
  });
}

// Al pulsar un enlace interno, la página se desvanece antes de cambiar
function iniciarTransiciones() {
  document.querySelectorAll('a[href$=".html"]').forEach((enlace) => {
    enlace.addEventListener("click", (evento) => {
      const nuevaPestana = evento.ctrlKey || evento.metaKey || enlace.target === "_blank";
      if (nuevaPestana || REDUCIR_MOVIMIENTO) {
        return;
      }
      evento.preventDefault();
      document.body.classList.add("leaving");
      setTimeout(() => {
        window.location.href = enlace.href;
      }, RETARDO_SALIDA);
    });
  });

  // Al volver atrás con el navegador, se quita el desvanecido
  window.addEventListener("pageshow", () => {
    document.body.classList.remove("leaving");
  });
}

// Barra de arriba que muestra cuánto se ha bajado en la página
function iniciarBarraProgreso() {
  const barra = document.querySelector(".progress");

  window.addEventListener("scroll", () => {
    const maximo = document.documentElement.scrollHeight - window.innerHeight;
    let porcentaje = 0;
    if (maximo > 0) {
      porcentaje = window.scrollY / maximo * 100;
    }
    barra.style.width = porcentaje + "%";
  }, { passive: true });
}

// Los elementos .reveal aparecen al llegar a ellos, uno detrás de otro
function iniciarApariciones() {
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("show");
        // Solo hace falta animarlo la primera vez
        observador.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".reveal").forEach((elemento, i) => {
    elemento.style.transitionDelay = (i % 4) * 90 + "ms";
    observador.observe(elemento);
  });
}

// Las tarjetas .tilt se inclinan hacia donde está el ratón
function iniciarInclinacion() {
  if (REDUCIR_MOVIMIENTO) {
    return;
  }

  document.querySelectorAll(".tilt").forEach((tarjeta) => {
    tarjeta.addEventListener("mousemove", (evento) => {
      const caja = tarjeta.getBoundingClientRect();
      // Posición del ratón dentro de la tarjeta, de -0.5 a 0.5
      const x = (evento.clientX - caja.left) / caja.width - 0.5;
      const y = (evento.clientY - caja.top) / caja.height - 0.5;
      tarjeta.style.setProperty("--ry", x * 10 + "deg");
      tarjeta.style.setProperty("--rx", -y * 10 + "deg");
    });

    tarjeta.addEventListener("mouseleave", () => {
      tarjeta.style.setProperty("--rx", "0deg");
      tarjeta.style.setProperty("--ry", "0deg");
    });
  });
}

// Luz de fondo que sigue al ratón (solo en ordenador)
function iniciarLuz() {
  const hayRaton = window.matchMedia("(hover: hover)").matches;
  if (REDUCIR_MOVIMIENTO || !hayRaton) {
    return;
  }

  const luz = document.createElement("div");
  luz.className = "glow";
  document.body.prepend(luz);

  window.addEventListener("mousemove", (evento) => {
    luz.style.transform = `translate(${evento.clientX}px, ${evento.clientY}px)`;
  });
}

// Efecto de máquina de escribir del inicio
function iniciarEscritura() {
  const texto = document.getElementById("typed");
  if (!texto) {
    return;
  }

  const palabras = texto.dataset.words.split("|");
  if (REDUCIR_MOVIMIENTO) {
    texto.textContent = palabras[0];
    return;
  }

  let numPalabra = 0;
  let numLetras = 0;
  let borrando = false;

  function escribir() {
    const palabra = palabras[numPalabra];
    texto.textContent = palabra.slice(0, numLetras);

    // Palabra completa: espera un poco y empieza a borrar
    if (!borrando && numLetras === palabra.length) {
      borrando = true;
      setTimeout(escribir, 1500);
      return;
    }

    // Palabra borrada: pasa a la siguiente
    if (borrando && numLetras === 0) {
      borrando = false;
      numPalabra = (numPalabra + 1) % palabras.length;
    }

    if (borrando) {
      numLetras--;
      setTimeout(escribir, 35);
    } else {
      numLetras++;
      setTimeout(escribir, 75);
    }
  }

  escribir();
}

// Red de puntos que se mueven en el fondo del inicio
function iniciarParticulas() {
  const lienzo = document.getElementById("net");
  if (!lienzo || REDUCIR_MOVIMIENTO) {
    return;
  }

  const ctx = lienzo.getContext("2d");
  let ancho;
  let alto;
  let puntos;

  // Ajusta el tamaño del lienzo y crea los puntos
  function preparar() {
    ancho = lienzo.offsetWidth;
    alto = lienzo.offsetHeight;
    lienzo.width = ancho;
    lienzo.height = alto;

    const cantidad = Math.min(MAX_PUNTOS, Math.floor(ancho / 18));
    puntos = [];
    for (let i = 0; i < cantidad; i++) {
      puntos.push({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4
      });
    }
  }

  function dibujar() {
    ctx.clearRect(0, 0, ancho, alto);

    for (let i = 0; i < puntos.length; i++) {
      const p = puntos[i];
      p.x += p.vx;
      p.y += p.vy;

      // Si llega a un borde, rebota
      if (p.x < 0 || p.x > ancho) {
        p.vx *= -1;
      }
      if (p.y < 0 || p.y > alto) {
        p.vy *= -1;
      }

      ctx.fillStyle = "rgba(43,179,201,.8)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();

      // Une con una línea los puntos cercanos; cuanto más lejos, más transparente
      for (let j = i + 1; j < puntos.length; j++) {
        const otro = puntos[j];
        const distancia = Math.hypot(p.x - otro.x, p.y - otro.y);
        if (distancia < DISTANCIA_LINEA) {
          const opacidad = 0.35 * (1 - distancia / DISTANCIA_LINEA);
          ctx.strokeStyle = `rgba(124,92,255,${opacidad})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(otro.x, otro.y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(dibujar);
  }

  preparar();
  dibujar();
  window.addEventListener("resize", preparar);
}

// Formulario de contacto: valida los campos y abre el correo
function iniciarFormulario() {
  const formulario = document.getElementById("form");
  if (!formulario) {
    return;
  }

  const estado = formulario.querySelector(".form__status");
  // La casilla trampa para robots no se valida
  const campos = formulario.querySelectorAll(".field input, .field textarea");

  campos.forEach((campo) => {
    campo.addEventListener("blur", () => validar(campo));
  });

  formulario.addEventListener("submit", (evento) => {
    // Evita que la página se recargue
    evento.preventDefault();

    // Se validan todos para que salgan todos los errores a la vez
    const resultados = [...campos].map(validar);
    if (!resultados.every(Boolean)) {
      estado.textContent = "Revisa los campos marcados.";
      return;
    }

    const mensaje = {
      nombre: formulario.nombre.value.trim(),
      email: formulario.email.value.trim(),
      texto: formulario.mensaje.value.trim(),
    };

    if (CLAVE_WEB3FORMS) {
      enviarConWeb3Forms(formulario, estado, mensaje);
    } else {
      abrirCorreo(estado, mensaje);
      formulario.reset();
    }
  });
}

// Envía el mensaje a Web3Forms, que lo reenvía al correo de Juanma
async function enviarConWeb3Forms(formulario, estado, mensaje) {
  const boton = formulario.querySelector("button[type=submit]");
  boton.disabled = true;
  estado.textContent = "Enviando…";

  try {
    const respuesta = await fetch(URL_WEB3FORMS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        access_key: CLAVE_WEB3FORMS,
        subject: "Contacto desde el portfolio: " + mensaje.nombre,
        from_name: "Portfolio juanmarosado.com",
        name: mensaje.nombre,
        email: mensaje.email,
        message: mensaje.texto,
        botcheck: formulario.botcheck.checked,
      }),
    });
    const resultado = await respuesta.json();
    if (!resultado.success) {
      throw new Error(resultado.message);
    }
    estado.textContent = "¡Mensaje enviado! Te responderé lo antes posible.";
    formulario.reset();
  } catch (error) {
    // Si el servicio falla, se ofrece el correo para no perder el mensaje
    abrirCorreo(estado, mensaje);
    estado.textContent = "No se pudo enviar. Abriendo tu aplicación de correo…";
  } finally {
    boton.disabled = false;
  }
}

// Abre el programa de correo del visitante con el mensaje ya escrito
function abrirCorreo(estado, mensaje) {
  const asunto = "Contacto desde el portfolio: " + mensaje.nombre;
  const cuerpo = mensaje.texto + "\n\nDe: " + mensaje.nombre + " (" + mensaje.email + ")";
  window.location.href = "mailto:" + EMAIL_DESTINO
      + "?subject=" + encodeURIComponent(asunto)
      + "&body=" + encodeURIComponent(cuerpo);
  estado.textContent = "Abriendo tu aplicación de correo…";
}

// Comprueba un campo y escribe el error debajo. Devuelve true si está bien.
function validar(campo) {
  const caja = campo.closest(".field");
  const valor = campo.value.trim();
  let mensaje = "";

  if (!valor) {
    mensaje = "Este campo es obligatorio.";
  } else if (campo.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
    mensaje = "Escribe un correo válido, por ejemplo nombre@correo.com.";
  } else if (campo.name === "mensaje" && valor.length < 10) {
    mensaje = "El mensaje debe tener al menos 10 caracteres.";
  }

  caja.querySelector(".error").textContent = mensaje;
  caja.classList.toggle("invalid", mensaje !== "");
  return mensaje === "";
}
