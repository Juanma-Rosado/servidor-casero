// guia.js: código común de las guías (servidor y arranque dual).
// Índice de capítulos, anterior/siguiente, botones de copiar y capturas que se amplían.
// El botón de modo claro/oscuro lo lleva /js/main.js, el mismo del portfolio.

// Cada guía pone su nombre en el body (data-nombre-guia)
const NOMBRE_GUIA = document.body.dataset.nombreGuia;

// Título de la página tal como viene en el HTML: es el que ven los buscadores en el inicio
const TITULO_PAGINA = document.title;

const capitulos = [...document.querySelectorAll(".capitulo")];
const indice = document.getElementById("indice");

crearIndice();
crearPaginadores();
prepararBloquesCodigo();
prepararCapturas();

// En el móvil, el índice se abre y se cierra con el botón de arriba
document.getElementById("boton-menu").addEventListener("click", () => {
  document.body.classList.toggle("menu-abierto");
});
indice.addEventListener("click", () => {
  document.body.classList.remove("menu-abierto");
});
window.addEventListener("hashchange", mostrarCapitulo);

mostrarCapitulo();

// Crea el índice lateral a partir de los capítulos de la página
function crearIndice() {
  capitulos.forEach((capitulo, i) => {
    const elemento = document.createElement("li");
    const enlace = document.createElement("a");
    enlace.href = "#" + capitulo.id;

    const numero = document.createElement("span");
    numero.className = "numero";
    numero.textContent = String(i).padStart(2, "0");

    const titulo = document.createElement("span");
    titulo.textContent = capitulo.dataset.titulo;

    enlace.append(numero, titulo);
    elemento.append(enlace);
    indice.append(elemento);
  });
}

// Añade al final de cada capítulo los enlaces al anterior y al siguiente
function crearPaginadores() {
  capitulos.forEach((capitulo, i) => {
    const paginador = document.createElement("nav");
    paginador.className = "paginador";
    paginador.setAttribute("aria-label", "Capítulos anterior y siguiente");

    const anterior = capitulos[i - 1];
    const siguiente = capitulos[i + 1];

    // Si no hay anterior, un hueco vacío para que el siguiente quede a la derecha
    if (anterior) {
      paginador.append(crearEnlaceCapitulo(anterior, "← Anterior", ""));
    } else {
      paginador.append(document.createElement("span"));
    }
    if (siguiente) {
      paginador.append(crearEnlaceCapitulo(siguiente, "Siguiente →", "siguiente"));
    }

    capitulo.append(paginador);
  });
}

function crearEnlaceCapitulo(capitulo, texto, clase) {
  const enlace = document.createElement("a");
  enlace.href = "#" + capitulo.id;
  if (clase) {
    enlace.className = clase;
  }
  const pequeno = document.createElement("small");
  pequeno.textContent = texto;
  enlace.append(pequeno, capitulo.dataset.titulo);
  return enlace;
}

// Enseña solo el capítulo que pone en la dirección (#capitulo)
function mostrarCapitulo() {
  const id = location.hash.slice(1);
  let actual = capitulos.findIndex((capitulo) => capitulo.id === id);
  if (actual < 0) {
    actual = 0;
  }

  capitulos.forEach((capitulo, i) => {
    capitulo.classList.toggle("visible", i === actual);
  });

  indice.querySelectorAll("a").forEach((enlace, i) => {
    if (i === actual) {
      enlace.setAttribute("aria-current", "page");
    } else {
      enlace.removeAttribute("aria-current");
    }
  });

  const titulo = capitulos[actual].dataset.titulo;
  document.getElementById("titulo-movil").textContent = titulo;

  // En el inicio se deja el título del HTML; en los capítulos, el del capítulo
  if (actual === 0) {
    document.title = TITULO_PAGINA;
  } else {
    document.title = titulo + " · " + NOMBRE_GUIA;
  }
  document.body.classList.remove("menu-abierto");
  window.scrollTo(0, 0);
}

// Pone un botón "Copiar" en cada bloque de código
function prepararBloquesCodigo() {
  document.querySelectorAll("pre").forEach((bloque) => {
    const codigo = bloque.querySelector("code");
    const boton = document.createElement("button");
    boton.className = "boton-copiar";
    boton.type = "button";
    boton.textContent = "Copiar";

    boton.addEventListener("click", () => {
      // Si el navegador deja usar el portapapeles, lo copio directamente
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codigo.innerText).then(
          () => avisarCopiado(boton),
          () => seleccionarTexto(codigo, boton)
        );
      } else {
        seleccionarTexto(codigo, boton);
      }
    });

    bloque.append(boton);
  });
}

function avisarCopiado(boton) {
  boton.textContent = "¡Copiado!";
  setTimeout(() => {
    boton.textContent = "Copiar";
  }, 1500);
}

// Si no se puede copiar, dejo el texto seleccionado para copiarlo a mano
function seleccionarTexto(codigo, boton) {
  const rango = document.createRange();
  rango.selectNodeContents(codigo);
  const seleccion = getSelection();
  seleccion.removeAllRanges();
  seleccion.addRange(rango);
  boton.textContent = "Selecciona y copia";
}

// Las capturas se amplían al pulsarlas.
// Si una no carga, pongo un hueco que dice qué imagen falta.
function prepararCapturas() {
  document.querySelectorAll(".captura img").forEach((imagen) => {
    imagen.addEventListener("error", () => ponerHueco(imagen));
    if (imagen.complete && imagen.naturalWidth === 0) {
      ponerHueco(imagen);
    }
    imagen.addEventListener("click", () => abrirVisor(imagen));
  });
}

function ponerHueco(imagen) {
  const hueco = document.createElement("div");
  hueco.className = "captura-falta";

  const aviso = document.createElement("b");
  aviso.textContent = "Aquí va una captura";
  const ruta = document.createElement("code");
  ruta.textContent = imagen.getAttribute("src");

  hueco.append(aviso, imagen.alt, document.createElement("br"), ruta);
  imagen.replaceWith(hueco);
}

// Enseña la captura en grande. Se cierra con un clic o con Esc.
function abrirVisor(imagen) {
  const visor = document.createElement("div");
  visor.className = "visor";

  const grande = document.createElement("img");
  grande.src = imagen.currentSrc || imagen.src;
  grande.alt = imagen.alt;
  visor.append(grande);

  function cerrarConEscape(evento) {
    if (evento.key === "Escape") {
      cerrarVisor();
    }
  }

  function cerrarVisor() {
    visor.remove();
    document.removeEventListener("keydown", cerrarConEscape);
  }

  visor.addEventListener("click", cerrarVisor);
  document.addEventListener("keydown", cerrarConEscape);
  document.body.append(visor);
}
