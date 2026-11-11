// Liquid-glass lens over text.
// Two text layers are drawn to textures: `base` (seen outside the lens) and
// `reveal` (seen through it). The lens magnifies, bends light at its rim,
// splits colour slightly (chromatic aberration), and carries a specular rim
// and a soft drop shadow. WebGL2 with a 2D-canvas fallback.

const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D uBase, uReveal;
uniform vec2 uRes;      // device px
uniform vec3 uLens;     // centre x, y (device px, top-left origin), radius
uniform float uGlass;   // glass fill strength (0..1)
uniform vec3 uTint;     // glass tint (rgb)
out vec4 o;

vec4 tex(sampler2D t, vec2 p){ return texture(t, p / uRes); }
vec4 over(vec4 top, vec4 bot){ float a = top.a + bot.a * (1. - top.a); return vec4((top.rgb * top.a + bot.rgb * bot.a * (1. - top.a)) / max(a, 1e-4), a); }

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 c = uLens.xy; float r = max(uLens.z, 1.);
  vec2 v = p - c; float d = length(v) / r;

  if (d >= 1.) {
    vec4 col = tex(uBase, p);
    // soft shadow under the lens, offset downwards
    float sd = length(p - (c + vec2(0., r * .1))) / r;
    float sh = smoothstep(1.32, .98, sd) * .16;
    o = over(col, vec4(0., 0., 0., sh));
    return;
  }

  vec2 n = v / r;
  // Magnify in the middle, compress hard at the rim (the light bends there).
  float s = .74 + .62 * pow(d, 5.);
  float ca = .035 * pow(d, 3.);
  vec2 q  = c + v * s;
  vec2 qr = c + v * (s - ca), qb = c + v * (s + ca);
  vec4 tr = tex(uReveal, qr), tg = tex(uReveal, q), tb = tex(uReveal, qb);
  vec4 txt = vec4(tr.r, tg.g, tb.b, max(max(tr.a, tg.a), tb.a));

  // glass body: faint tint, brighter fresnel rim, specular arc top-left
  float rim = smoothstep(.78, 1., d);
  float spec = pow(max(0., dot(n, normalize(vec2(-.62, -.78)))), 10.) * smoothstep(.55, .97, d);
  float low  = pow(max(0., dot(n, normalize(vec2(.5, .86)))), 6.) * smoothstep(.7, .98, d);
  vec4 glass = vec4(uTint, uGlass * (.55 + .45 * rim));
  vec4 col = over(txt, glass);
  col = over(vec4(1., 1., 1., spec * .85 + rim * .22), col);
  col = over(vec4(1., 1., 1., low * .25), col);
  // anti-aliased edge
  col.a *= smoothstep(1., .985, d);
  o = col;
}`;

function makeLayer(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function createGlass(canvas, { drawBase, drawReveal, tint = [1, 1, 1], glass = 0.08 }) {
  const dprMax = 3;
  const SS = 2; // text layers are drawn at 2× so the magnified glass stays sharp
  let W = 0, H = 0, dpr = 1, base, reveal;
  let lens = { x: -9999, y: -9999, r: 80 };
  let gl = null, prog, uni = {}, tBase, tReveal, ctx2d = null;

  try {
    gl = canvas.getContext('webgl2', { premultipliedAlpha: false, antialias: false, alpha: true });
  } catch { gl = null; }

  if (gl) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    prog = vs && fs && gl.createProgram();
    if (prog) { gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); }
    if (!prog || !gl.getProgramParameter(prog, gl.LINK_STATUS)) gl = null;
  }
  if (gl) {
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uBase', 'uReveal', 'uRes', 'uLens', 'uGlass', 'uTint'].forEach(n => { uni[n] = gl.getUniformLocation(prog, n); });
    const mk = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    tBase = mk(); tReveal = mk();
    gl.uniform1i(uni.uBase, 0); gl.uniform1i(uni.uReveal, 1);
    gl.disable(gl.BLEND); // single full-screen pass writes straight alpha; blending would square it
  } else {
    ctx2d = canvas.getContext('2d');
  }

  function layout() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, dprMax);
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    const TS = Math.min(SS, 8192 / Math.max(W, H));
    base = makeLayer(Math.round(W * TS), Math.round(H * TS)); reveal = makeLayer(Math.round(W * TS), Math.round(H * TS));
    const b = base.getContext('2d'), v = reveal.getContext('2d');
    b.scale(dpr * TS, dpr * TS); v.scale(dpr * TS, dpr * TS);
    drawBase(b, r.width, r.height); drawReveal(v, r.width, r.height);
    if (gl) {
      gl.viewport(0, 0, W, H);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tBase);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, base);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tReveal);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, reveal);
    }
    render();
  }

  function render() {
    if (!W) return;
    const x = lens.x * dpr, y = lens.y * dpr, rr = lens.r * dpr;
    if (gl) {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uni.uRes, W, H);
      gl.uniform3f(uni.uLens, x, y, rr);
      gl.uniform1f(uni.uGlass, glass);
      gl.uniform3f(uni.uTint, tint[0], tint[1], tint[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return;
    }
    // 2D fallback: base, then a magnified reveal clipped to the lens + rim light.
    const c = ctx2d;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    c.drawImage(base, 0, 0, W, H);
    c.save();
    c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2);
    c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = rr * .25; c.shadowOffsetY = rr * .08;
    c.fillStyle = `rgba(${tint.map(v => v * 255).join(',')},${glass})`; c.fill();
    c.restore();
    c.save();
    c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.clip();
    const k = 1.3;
    c.drawImage(reveal, x - x * k, y - y * k, W * k, H * k);
    const g = c.createRadialGradient(x - rr * .35, y - rr * .45, rr * .1, x, y, rr);
    g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(.75, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.35)');
    c.fillStyle = g; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    c.restore();
  }

  return {
    webgl: !!gl,
    layout,
    setLens(x, y, r) { lens = { x, y, r }; render(); },
    setGlass(g) { glass = g; },
    get lens() { return lens; },
  };
}

/** Draw a centred one-line wordmark (optionally with the square accent dot). */
export function wordmark(ctx, w, h, { text, size, weight = 600, family, color, accent, dot = false, y: yFrac = 0.5, alpha = 1 }) {
  ctx.clearRect(0, 0, w, h);
  ctx.font = `${weight} ${size}px ${family}, system-ui, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  try { ctx.letterSpacing = /[a-z]/i.test(text) ? '-0.045em' : '0px'; } catch {}
  const m = ctx.measureText(text);
  const dotW = dot ? size * 0.17 : 0, gap = dot ? size * 0.05 : 0;
  const total = m.width + gap + dotW;
  const x = (w - total) / 2, y = h * yFrac + size * 0.32;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
  if (dot) { ctx.fillStyle = accent; ctx.fillRect(x + m.width + gap, y - dotW, dotW, dotW); }
}
