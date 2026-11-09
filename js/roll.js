// Rolling digits: each digit is a 0–9 column; only the digits that change move.
const DIGIT = /\d/;
const shape = s => [...s].map(c => (DIGIT.test(c) ? 'd' : c)).join('');

function build(el, str) {
  el.textContent = '';
  for (const c of str) {
    const s = document.createElement('span');
    if (DIGIT.test(c)) {
      s.className = 'rd';
      const col = document.createElement('span');
      col.className = 'rd-col';
      for (let d = 0; d <= 9; d++) { const n = document.createElement('span'); n.textContent = d; col.append(n); }
      s.append(col);
      s.style.setProperty('--d', 0);
    } else {
      s.className = 'rs';
      s.textContent = c;
    }
    el.append(s);
  }
  el.dataset.shape = shape(str);
}

/** Roll `el` to show `str`. `instant` skips the animation. */
export function roll(el, str, instant = false) {
  str = String(str);
  if (!el.classList.contains('roll')) el.classList.add('roll');
  if (el.dataset.shape !== shape(str)) {
    el.classList.add('no-anim');
    build(el, str.replace(/\d/g, '0'));
    void el.offsetWidth; // commit the zeros so the roll animates from them
    if (!instant) el.classList.remove('no-anim');
  } else if (instant) el.classList.add('no-anim');
  [...str].forEach((c, i) => { if (DIGIT.test(c)) el.children[i].style.setProperty('--d', c); });
  el.setAttribute('aria-label', str);
  if (instant) { void el.offsetWidth; el.classList.remove('no-anim'); }
}
