// Hero background: a slow liquid of light and dark whose edges split into the spectrum
// (seven wavelengths), like light bending through thick glass. Follows the pointer.
// The side behind the text is calmed with the page colour so the text stays readable.
// WebGL1, paused off-screen, one still frame for reduced motion, CSS fallback without WebGL.

const FS = `precision highp float;
uniform vec2 R; uniform float T; uniform vec2 M;
uniform vec3 cA, cB, cC, cBg; uniform float rtl, veil, heroK;
#define N 7
vec3 spec(float t){ return clamp(vec3(1.5-abs(4.*t-3.4), 1.5-abs(4.*t-2.), 1.5-abs(4.*t-.6)), 0., 1.); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float liquid(vec2 p){
  p*=2.4; vec2 m=(M/R-.5)*vec2(R.x/R.y,1.)*2.4;
  p+=.3*vec2(sin(p.y*1.3+T*.45), cos(p.x*1.1-T*.38));
  p+=.25*(p-m)*exp(-dot(p-m,p-m)*1.2);
  return sin(p.x*1.4+T*.3+sin(p.y*1.6-T*.25)*1.5)+.8*sin(p.y*1.2-T*.22+sin(p.x*.9+T*.18)*1.8)+.45*sin((p.x-p.y)*1.9+T*.4);
}
vec3 tone(float v){ float a=clamp(.5+v*.22,0.,1.); vec3 c=mix(cC,cB,smoothstep(.1,.47,a)); return mix(c,cA,smoothstep(.5,.6,a)); }
void main(){
  vec2 uv=gl_FragCoord.xy/R; vec2 p=(uv-.5)*vec2(R.x/R.y,1.);
  float e=.01; vec2 g=vec2(liquid(p+vec2(e,0.))-liquid(p-vec2(e,0.)), liquid(p+vec2(0.,e))-liquid(p-vec2(0.,e)));
  vec2 dir=normalize(g+1e-5); vec3 col=vec3(0.), ws=vec3(0.);
  for(int i=0;i<N;i++){ float t=float(i)/float(N-1); vec3 w=spec(t); col+=w*tone(liquid(p+dir*.03*(t-.5))); ws+=w; }
  col/=ws; col+=pow(clamp(.5+liquid(p)*.22,0.,1.),14.)*.25;
  // calm the side where the text sits (left, or right in Arabic)
  float side=rtl>.5 ? 1.-uv.x : uv.x;
  // everywhere: calm enough to read; in the hero, the side away from the text shows more liquid
  float v=mix(veil, .3, heroK*smoothstep(.42,.95,side));
  col=mix(col, cBg, v);
  col+=(hash(gl_FragCoord.xy+fract(T*7.))-.5)/255.*2.;
  gl_FragColor=vec4(col,1.);
}`;

const PAL = {
  dark: { a: [.92, .92, .96], b: [.32, .33, .38], c: [.02, .02, .03], veil: .74 },
  light: { a: [1, 1, 1], b: [.78, .79, .84], c: [.36, .37, .43], veil: .74 },
};

export function initLiquidBg(canvas) {
  if (!canvas) return;
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === 'off';
  let gl = null;
  try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false }); } catch {}
  if (!gl) { canvas.classList.add('no-gl'); return; }
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null; };
  const vs = sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }'), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { canvas.classList.add('no-gl'); return; }
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { canvas.classList.add('no-gl'); return; }
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['R', 'T', 'M', 'cA', 'cB', 'cC', 'cBg', 'rtl', 'veil', 'heroK'].forEach(k => { U[k] = gl.getUniformLocation(pr, k); });

  const colours = () => {
    const t = root.dataset.theme; const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const p = dark ? PAL.dark : PAL.light;
    const css = getComputedStyle(root).getPropertyValue('--bg').trim(); let m = dark ? [0, 0, 0] : [242, 241, 238];
    if (/^#[0-9a-f]{6}$/i.test(css)) m = [1, 3, 5].map(i => parseInt(css.substr(i, 2), 16)); else { const k = css.match(/[\d.]+/g); if (k) m = k; }
    gl.uniform3fv(U.cA, p.a); gl.uniform3fv(U.cB, p.b); gl.uniform3fv(U.cC, p.c);
    gl.uniform3fv(U.cBg, m.slice(0, 3).map(v => +v / 255)); gl.uniform1f(U.veil, p.veil);
    gl.uniform1f(U.rtl, root.dir === 'rtl' ? 1 : 0);
  };
  let W = 0, H = 0;
  const size = () => {
    const d = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.25);
    W = Math.max(1, canvas.clientWidth * d | 0); H = Math.max(1, canvas.clientHeight * d | 0);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H); }
  };
  let target = null, mouse = null, user = false, raf = 0, visible = true, t0 = performance.now() - 20000;
  addEventListener('pointermove', e => { const d = W / innerWidth; target = [e.clientX * d, (innerHeight - e.clientY) * d]; user = true; }, { passive: true });
  const draw = now => {
    const t = (now - t0) / 1000, a = t * .3;
    const auto = [W * (.62 + .22 * Math.cos(a)), H * (.5 + .25 * Math.sin(a * 1.3))];
    const tg = user && target ? target : auto; mouse = mouse ? [mouse[0] + (tg[0] - mouse[0]) * .05, mouse[1] + (tg[1] - mouse[1]) * .05] : tg;
    const hk = Math.max(0, 1 - scrollY / (innerHeight * .8)); gl.uniform1f(U.heroK, hk);
    gl.uniform2f(U.R, W, H); gl.uniform1f(U.T, t); gl.uniform2f(U.M, mouse[0], mouse[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const loop = now => { draw(now); raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0; };
  const start = () => { if (reduce) { draw(performance.now()); return; } if (!raf) raf = requestAnimationFrame(loop); };
  size(); colours(); start();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); if (reduce) draw(performance.now()); }, 120); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) start(); });
  new MutationObserver(() => { colours(); if (reduce) draw(performance.now()); }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'dir'] });
}
