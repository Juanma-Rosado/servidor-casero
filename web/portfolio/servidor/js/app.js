// Navegación por capítulos, progreso guardado y botones de copiar.
(function () {
  var chapters = Array.prototype.slice.call(document.querySelectorAll('.chapter'));
  var nav = document.getElementById('nav');
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem('guia-hecho') || '[]'); } catch (e) { return []; } },
    set: function (v) { try { localStorage.setItem('guia-hecho', JSON.stringify(v)); } catch (e) {} }
  };
  var done = store.get();

  // Barra lateral generada a partir de los capítulos
  chapters.forEach(function (c, i) {
    var li = document.createElement('li');
    li.dataset.id = c.id;
    var a = document.createElement('a');
    a.href = '#' + c.id;
    a.innerHTML = '<span class="n">' + String(i).padStart(2, '0') + '</span><span>' + c.dataset.title + '</span><span class="done" aria-label="completado">✓</span>';
    li.appendChild(a);
    nav.appendChild(li);
  });

  function refreshProgress() {
    var total = chapters.length - 1; // el inicio no cuenta
    var n = done.filter(function (id) { return id !== chapters[0].id; }).length;
    document.getElementById('bar').style.width = Math.round(n / total * 100) + '%';
    document.getElementById('plabel').textContent = n + ' de ' + total + ' capítulos completados';
    nav.querySelectorAll('li').forEach(function (li) { li.classList.toggle('is-done', done.indexOf(li.dataset.id) > -1); });
    chapters.forEach(function (c) {
      var b = c.querySelector('.donebtn');
      if (b) { var on = done.indexOf(c.id) > -1; b.setAttribute('aria-pressed', on); b.textContent = on ? '✓ Capítulo completado' : 'Marcar como completado'; }
    });
  }

  function show() {
    var id = location.hash.slice(1);
    var idx = chapters.findIndex(function (c) { return c.id === id; });
    if (idx < 0) idx = 0;
    chapters.forEach(function (c, i) { c.classList.toggle('active', i === idx); });
    nav.querySelectorAll('a').forEach(function (a, i) { if (i === idx) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.getElementById('topbar-title').textContent = chapters[idx].dataset.title;
    document.title = chapters[idx].dataset.title + ' · Servidor casero con Proxmox';
    document.body.classList.remove('menu');
    window.scrollTo(0, 0);
  }

  // Botones anterior / siguiente y "completado"
  chapters.forEach(function (c, i) {
    var p = document.createElement('div');
    p.className = 'pager';
    var prev = chapters[i - 1], next = chapters[i + 1];
    p.innerHTML = (prev ? '<a href="#' + prev.id + '"><small>← Anterior</small>' + prev.dataset.title + '</a>' : '<span></span>') +
                  (next ? '<a class="next" href="#' + next.id + '"><small>Siguiente →</small>' + next.dataset.title + '</a>' : '');
    if (i > 0) {
      var b = document.createElement('button');
      b.className = 'donebtn'; b.type = 'button';
      b.addEventListener('click', function () {
        var k = done.indexOf(c.id);
        if (k > -1) done.splice(k, 1); else done.push(c.id);
        store.set(done); refreshProgress();
      });
      c.appendChild(b);
    }
    c.appendChild(p);
  });

  // Botón copiar en cada bloque de código
  document.querySelectorAll('pre').forEach(function (pre) {
    var btn = document.createElement('button');
    btn.className = 'copy'; btn.type = 'button'; btn.textContent = 'Copiar';
    btn.addEventListener('click', function () {
      var text = pre.querySelector('code').innerText;
      var ok = function () { btn.textContent = '¡Copiado!'; setTimeout(function () { btn.textContent = 'Copiar'; }, 1500); };
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents(pre.querySelector('code'));
        var s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Selecciona y copia';
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
    });
    pre.appendChild(btn);
  });

  // Si una captura no existe, se muestra un hueco que explica qué foto poner
  document.querySelectorAll('.shot img').forEach(function (img) {
    var ph = function () {
      var d = document.createElement('div');
      d.className = 'shot-ph';
      d.innerHTML = '<b>Aquí va una captura</b>' + (img.dataset.hint || img.alt) + '<br><code>' + img.getAttribute('src') + '</code>';
      img.replaceWith(d);
    };
    img.addEventListener('error', ph);
    if (img.complete && img.naturalWidth === 0) ph();
    img.addEventListener('click', function () {
      var box = document.createElement('div');
      box.className = 'lightbox';
      box.innerHTML = '<img alt="">';
      box.firstChild.src = img.currentSrc || img.src;
      box.firstChild.alt = img.alt;
      box.addEventListener('click', function () { box.remove(); });
      document.body.appendChild(box);
    });
  });

  document.getElementById('menu-btn').addEventListener('click', function () { document.body.classList.toggle('menu'); });
  nav.addEventListener('click', function () { document.body.classList.remove('menu'); });
  window.addEventListener('hashchange', show);
  refreshProgress(); show();
})();
