// Lógica del juego: Tabla de Schulte.
// Hay que tocar los números del 1 al N*N en orden, lo más rápido posible.

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Puntuación máxima 1000: tiempo "de referencia" = 1 s por casilla.
// Cada fallo penaliza como 2 segundos extra.
export function calcScore(size, duration, errors) {
  const par = size * size;
  return Math.min(1000, Math.round((1000 * par) / (duration + errors * 2)));
}

export function ratingFor(score) {
  if (score >= 900) return 'Excelente';
  if (score >= 600) return 'Bueno';
  if (score >= 300) return 'Regular';
  return 'Mejorable';
}

export function mountGame(el, { size, onFinish }) {
  const total = size * size;
  const numbers = shuffle(Array.from({ length: total }, (_, i) => i + 1));
  let next = 1;
  let errors = 0;
  let finished = false;
  const t0 = performance.now();

  el.innerHTML = `
    <div class="hud">
      <div><span class="hud-l">Busca</span><strong id="target">1</strong></div>
      <div><span class="hud-l">Tiempo</span><strong id="clock">0,0</strong></div>
      <div><span class="hud-l">Fallos</span><strong id="errs">0</strong></div>
    </div>
    <div class="board" id="board" style="--n:${size}" role="grid" aria-label="Tabla de Schulte ${size} por ${size}">
      ${numbers
        .map((n) => `<button type="button" class="cell" data-n="${n}" role="gridcell">${n}</button>`)
        .join('')}
    </div>`;

  const board = el.querySelector('#board');
  const targetEl = el.querySelector('#target');
  const clockEl = el.querySelector('#clock');
  const errsEl = el.querySelector('#errs');

  const tick = setInterval(() => {
    clockEl.textContent = ((performance.now() - t0) / 1000).toFixed(1).replace('.', ',');
  }, 100);

  function onPress(e) {
    const cell = e.target.closest('.cell');
    if (!cell || finished || cell.classList.contains('found')) return;
    e.preventDefault();
    const n = Number(cell.dataset.n);

    if (n === next) {
      cell.classList.add('found');
      next++;
      if (next > total) {
        finished = true;
        clearInterval(tick);
        const duration = Math.round(((performance.now() - t0) / 1000) * 100) / 100;
        clockEl.textContent = duration.toFixed(1).replace('.', ',');
        targetEl.textContent = '✓';
        const score = calcScore(size, duration, errors);
        onFinish({ size, duration, errors, score, rating: ratingFor(score) });
      } else {
        targetEl.textContent = next;
      }
    } else {
      errors++;
      errsEl.textContent = errors;
      cell.classList.remove('bad');
      void cell.offsetWidth; // reinicia la animación
      cell.classList.add('bad');
    }
  }

  board.addEventListener('pointerdown', onPress);

  return () => {
    finished = true;
    clearInterval(tick);
    board.removeEventListener('pointerdown', onPress);
  };
}
