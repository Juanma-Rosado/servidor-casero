// tema.js: pone el modo claro u oscuro que se eligió la última vez.
// Va en el <head> sin defer para que la página no parpadee al cargar.
// El botón que lo cambia está en main.js.

const temaGuardado = localStorage.getItem("tema");

if (temaGuardado === "claro" || temaGuardado === "oscuro") {
  document.documentElement.dataset.tema = temaGuardado;
}
