// app.js: guía del servidor.
// Menú de capítulos, progreso guardado en el navegador y botones de copiar.

const CLAVE_PROGRESO = "guia-hecho";

const capitulos = [...document.querySelectorAll(".chapter")];
const menuLateral = document.getElementById("nav");
const hechos = leerProgreso();

crearMenu();
crearBotones();
prepararBloquesCodigo();
prepararCapturas();

document.getElementById("menu-btn").addEventListener("click", () => {
  document.body.classList.toggle("menu");
});
menuLateral.addEventListener("click", () => {
  document.body.classList.remove("menu");
});
window.addEventListener("hashchange", mostrarCapitulo);

actualizarProgreso();
mostrarCapitulo();

// Lee del navegador los capítulos marcados como hechos
function leerProgreso() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_PROGRESO) || "[]");
  } catch (error) {
    return [];
  }
}

function guardarProgreso() {
  try {
    localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(hechos));
  } catch (error) {
    // Si el navegador no deja guardar, la guía sigue funcionando sin progreso
  }
}

// Crea el menú lateral a partir de los capítulos de la página
function crearMenu() {
  capitulos.forEach((capitulo, i) => {
    const numero = String(i).padStart(2, "0");
    const elemento = document.createElement("li");
    elemento.dataset.id = capitulo.id;
    elemento.innerHTML = '<a href="#' + capitulo.id + '">'
        + '<span class="n">' + numero + "</span>"
        + "<span>" + capitulo.dataset.title + "</span>"
        + '<span class="done" aria-label="completado">✓</span>'
        + "</a>";
    menuLateral.appendChild(elemento);
  });
}

// Añade a cada capítulo los botones "anterior", "siguiente" y "completado"
function crearBotones() {
  capitulos.forEach((capitulo, i) => {
    const anterior = capitulos[i - 1];
    const siguiente = capitulos[i + 1];

    // El inicio (capítulo 0) no lleva botón de completado
    if (i > 0) {
      const boton = document.createElement("button");
      boton.className = "donebtn";
      boton.type = "button";
      boton.addEventListener("click", () => {
        marcarHecho(capitulo.id);
      });
      capitulo.appendChild(boton);
    }

    const paginador = document.createElement("div");
    paginador.className = "pager";
    let html = "<span></span>";
    if (anterior) {
      html = '<a href="#' + anterior.id + '"><small>← Anterior</small>'
          + anterior.dataset.title + "</a>";
    }
    if (siguiente) {
      html += '<a class="next" href="#' + siguiente.id + '"><small>Siguiente →</small>'
          + siguiente.dataset.title + "</a>";
    }
    paginador.innerHTML = html;
    capitulo.appendChild(paginador);
  });
}

// Marca o desmarca un capítulo como completado
function marcarHecho(id) {
  const posicion = hechos.indexOf(id);
  if (posicion > -1) {
    hechos.splice(posicion, 1);
  } else {
    hechos.push(id);
  }
  guardarProgreso();
  actualizarProgreso();
}

// Actualiza la barra de progreso, los ✓ del menú y los botones
function actualizarProgreso() {
  // El inicio no cuenta como capítulo
  const total = capitulos.length - 1;
  const completados = hechos.filter((id) => id !== capitulos[0].id).length;

  document.getElementById("bar").style.width = Math.round(completados / total * 100) + "%";
  document.getElementById("plabel").textContent = completados + " de " + total + " capítulos completados";

  menuLateral.querySelectorAll("li").forEach((elemento) => {
    elemento.classList.toggle("is-done", hechos.includes(elemento.dataset.id));
  });

  capitulos.forEach((capitulo) => {
    const boton = capitulo.querySelector(".donebtn");
    if (boton) {
      const hecho = hechos.includes(capitulo.id);
      boton.setAttribute("aria-pressed", hecho);
      boton.textContent = hecho ? "✓ Capítulo completado" : "Marcar como completado";
    }
  });
}

// Enseña solo el capítulo que pone en la dirección (#capitulo)
function mostrarCapitulo() {
  const id = location.hash.slice(1);
  let actual = capitulos.findIndex((capitulo) => capitulo.id === id);
  if (actual < 0) {
    actual = 0;
  }

  capitulos.forEach((capitulo, i) => {
    capitulo.classList.toggle("active", i === actual);
  });

  menuLateral.querySelectorAll("a").forEach((enlace, i) => {
    if (i === actual) {
      enlace.setAttribute("aria-current", "page");
    } else {
      enlace.removeAttribute("aria-current");
    }
  });

  const titulo = capitulos[actual].dataset.title;
  document.getElementById("topbar-title").textContent = titulo;
  document.title = titulo + " · Servidor casero con Proxmox";
  document.body.classList.remove("menu");
  window.scrollTo(0, 0);
}

// Pone un botón "Copiar" en cada bloque de código
function prepararBloquesCodigo() {
  document.querySelectorAll("pre").forEach((bloque) => {
    const codigo = bloque.querySelector("code");
    const boton = document.createElement("button");
    boton.className = "copy";
    boton.type = "button";
    boton.textContent = "Copiar";

    boton.addEventListener("click", () => {
      const copiado = () => {
        boton.textContent = "¡Copiado!";
        setTimeout(() => {
          boton.textContent = "Copiar";
        }, 1500);
      };

      // Si no se puede usar el portapapeles, se selecciona el texto para copiarlo a mano
      const seleccionar = () => {
        const rango = document.createRange();
        rango.selectNodeContents(codigo);
        const seleccion = getSelection();
        seleccion.removeAllRanges();
        seleccion.addRange(rango);
        boton.textContent = "Selecciona y copia";
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codigo.innerText).then(copiado, seleccionar);
      } else {
        seleccionar();
      }
    });

    bloque.appendChild(boton);
  });
}

// Las capturas se amplían al pulsarlas.
// Si una no carga, se pone un hueco que explica qué imagen falta.
function prepararCapturas() {
  document.querySelectorAll(".shot img").forEach((imagen) => {
    const ponerHueco = () => {
      const hueco = document.createElement("div");
      hueco.className = "shot-ph";
      hueco.innerHTML = "<b>Aquí va una captura</b>" + (imagen.dataset.hint || imagen.alt)
          + "<br><code>" + imagen.getAttribute("src") + "</code>";
      imagen.replaceWith(hueco);
    };

    imagen.addEventListener("error", ponerHueco);
    if (imagen.complete && imagen.naturalWidth === 0) {
      ponerHueco();
    }

    imagen.addEventListener("click", () => {
      const visor = document.createElement("div");
      visor.className = "lightbox";
      const grande = document.createElement("img");
      grande.src = imagen.currentSrc || imagen.src;
      grande.alt = imagen.alt;
      visor.appendChild(grande);
      visor.addEventListener("click", () => {
        visor.remove();
      });
      document.body.appendChild(visor);
    });
  });
}
