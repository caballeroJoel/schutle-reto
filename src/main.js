import './style.css';
import { supabase, configOk } from './supabase.js';
import { mountGame } from './game.js';

const app = document.getElementById('app');
let session = null;
let size = 5;
let stopGame = null;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = (s) => Number(s).toFixed(2).replace('.', ',') + ' s';
const fmtDate = (d) =>
  new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ---------- Arranque ---------- */
async function init() {
  if (!configOk) return renderConfigError();
  const { data } = await supabase.auth.getSession(); // también procesa la vuelta desde Google
  session = data.session;
  supabase.auth.onAuthStateChange((_event, s) => {
    const changed = Boolean(s) !== Boolean(session) || s?.user?.id !== session?.user?.id;
    session = s;
    if (changed) route();
  });
  route();
}

function route() {
  stopGame?.();
  stopGame = null;
  session ? renderHome() : renderLogin();
}

/* ---------- Pantallas ---------- */
function renderConfigError() {
  app.innerHTML = `<main class="center"><div class="card">
    <h1>Falta la configuración</h1>
    <p>Define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en el archivo <code>.env</code> (o en las variables de entorno del hosting) y vuelve a compilar.</p>
  </div></main>`;
}

function renderLogin(error = '') {
  const demo = [4, 1, 7, 2, 9, 5, 8, 3, 6];
  app.innerHTML = `
  <main class="center">
    <section class="login">
      <div class="demo" aria-hidden="true">
        ${demo.map((n) => `<span class="cell demo-cell ${n <= 2 ? 'found' : ''}">${n}</span>`).join('')}
      </div>
      <h1>Tabla de Schulte</h1>
      <p class="lead">Encuentra los números en orden, del 1 al final, lo más rápido que puedas. Entrena tu atención y guarda tu historial.</p>
      <button id="google" class="btn primary big">Continuar con Google</button>
      <p class="error" id="login-error" role="alert">${esc(error)}</p>
    </section>
  </main>`;
  document.getElementById('google').addEventListener('click', async () => {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) document.getElementById('login-error').textContent = 'No se pudo iniciar sesión: ' + err.message;
  });
}

function shell(active, inner) {
  const u = session.user;
  const name = u.user_metadata?.full_name || u.email;
  app.innerHTML = `
  <header class="top">
    <div class="brand">Tabla de Schulte</div>
    <nav aria-label="Principal">
      <button data-go="home" class="${active === 'home' ? 'on' : ''}">Jugar</button>
      <button data-go="history" class="${active === 'history' ? 'on' : ''}">Historial</button>
    </nav>
    <div class="who">
      <span class="who-name" title="${esc(u.email)}">${esc(name)}</span>
      <button id="logout" class="btn ghost small">Cerrar sesión</button>
    </div>
  </header>
  <main class="main">${inner}</main>`;

  app.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => {
      stopGame?.();
      stopGame = null;
      b.dataset.go === 'home' ? renderHome() : renderHistory();
    })
  );
  document.getElementById('logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
  });
}

function renderHome() {
  shell(
    'home',
    `<section class="card">
      <h1>Cómo se juega</h1>
      <ol class="rules">
        <li>Verás una cuadrícula con números desordenados.</li>
        <li>Toca los números en orden: 1, 2, 3… hasta el último.</li>
        <li>El tiempo empieza al pulsar «Empezar partida» y se detiene al tocar el último número.</li>
        <li>Cada fallo suma 2 segundos de penalización.</li>
      </ol>
      <p class="hint">Truco: mantén la mirada en el centro y busca con la visión periférica.</p>
      <fieldset class="sizes">
        <legend>Tamaño de la tabla</legend>
        ${[3, 4, 5]
          .map((n) => `<button type="button" class="seg ${n === size ? 'on' : ''}" data-size="${n}">${n}×${n}</button>`)
          .join('')}
      </fieldset>
      <button id="start" class="btn primary big">Empezar partida</button>
    </section>`
  );
  app.querySelectorAll('[data-size]').forEach((b) =>
    b.addEventListener('click', () => {
      size = Number(b.dataset.size);
      app.querySelectorAll('[data-size]').forEach((x) => x.classList.toggle('on', x === b));
    })
  );
  document.getElementById('start').addEventListener('click', renderGame);
}

function renderGame() {
  shell('home', `<section class="game"><div id="game"></div><button id="quit" class="btn ghost">Abandonar partida</button></section>`);
  stopGame = mountGame(document.getElementById('game'), { size, onFinish: renderResult });
  document.getElementById('quit').addEventListener('click', () => {
    stopGame?.();
    stopGame = null;
    renderHome();
  });
}

async function renderResult(r) {
  stopGame = null;
  shell(
    'home',
    `<section class="card result">
      <h1>${esc(r.rating)}</h1>
      <p class="score">${r.score}<span> puntos</span></p>
      <dl class="stats">
        <div><dt>Tiempo</dt><dd>${fmtTime(r.duration)}</dd></div>
        <div><dt>Fallos</dt><dd>${r.errors}</dd></div>
        <div><dt>Tabla</dt><dd>${r.size}×${r.size}</dd></div>
      </dl>
      <p id="save-status" class="status" role="status">Guardando partida…</p>
      <div class="row">
        <button id="again" class="btn primary">Jugar otra vez</button>
        <button id="hist" class="btn ghost">Ver historial</button>
      </div>
    </section>`
  );
  document.getElementById('again').addEventListener('click', renderGame);
  document.getElementById('hist').addEventListener('click', renderHistory);
  saveGame(r);
}

async function saveGame(r) {
  const status = document.getElementById('save-status');
  const { error } = await supabase.from('partidas').insert({
    user_id: session.user.id,
    resultado: r.rating,
    puntuacion: r.score,
    duracion: r.duration,
    tamano: r.size,
    errores: r.errors,
  });
  if (!status) return;
  if (error) {
    status.className = 'status bad';
    status.innerHTML = `No se pudo guardar: ${esc(error.message)} <button id="retry" class="link">Reintentar</button>`;
    document.getElementById('retry')?.addEventListener('click', () => {
      status.className = 'status';
      status.textContent = 'Guardando partida…';
      saveGame(r);
    });
  } else {
    status.className = 'status ok';
    status.textContent = 'Partida guardada en tu historial.';
  }
}

async function renderHistory() {
  shell('history', `<section class="card wide"><h1>Tu historial</h1><p class="status">Cargando…</p></section>`);
  const { data, error, count } = await supabase
    .from('partidas')
    .select('id, fecha, resultado, puntuacion, duracion, tamano, errores', { count: 'exact' })
    .order('fecha', { ascending: false })
    .limit(100);

  const box = app.querySelector('.card');
  if (error) {
    box.innerHTML = `<h1>Tu historial</h1><p class="status bad">No se pudo cargar: ${esc(error.message)}</p>`;
    return;
  }
  if (!data.length) {
    box.innerHTML = `<h1>Tu historial</h1><p>Aún no has jugado ninguna partida.</p><button id="go" class="btn primary">Jugar ahora</button>`;
    document.getElementById('go').addEventListener('click', renderHome);
    return;
  }
  const best = Math.max(...data.map((p) => p.puntuacion));
  box.innerHTML = `
    <h1>Tu historial</h1>
    <dl class="stats">
      <div><dt>Partidas jugadas</dt><dd>${count}</dd></div>
      <div><dt>Mejor puntuación</dt><dd>${best}</dd></div>
    </dl>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Resultado</th><th>Puntos</th><th>Duración</th><th>Tabla</th><th>Fallos</th></tr></thead>
        <tbody>
          ${data
            .map(
              (p) => `<tr>
                <td>${fmtDate(p.fecha)}</td><td>${esc(p.resultado)}</td><td>${p.puntuacion}</td>
                <td>${fmtTime(p.duracion)}</td><td>${p.tamano}×${p.tamano}</td><td>${p.errores}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
    ${count > data.length ? `<p class="hint">Mostrando las ${data.length} partidas más recientes.</p>` : ''}`;
}

init();
