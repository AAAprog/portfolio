// AB's body: a liquid drop drawn with a shader, in the same liquid as the page background.
// It breathes and wobbles on its own, leans toward the pointer, stretches while the page
// scrolls, squishes when poked, ripples faster while thinking and pulses while talking.
// One shared WebGL context draws every face (the corner character and the chat avatar)
// and copies it into small 2D canvases, at up to 3× for sharp edges.

export const mood = { lx: 0, ly: 0, talk: 0, think: 0, poke: 0, vel: 0 };

const FS = `precision highp float;
uniform vec2 R; uniform float T; uniform vec2 L; uniform float talk, think, poke, vel;
vec3 spec(float t){ return clamp(vec3(1.5-abs(4.*t-3.4), 1.5-abs(4.*t-2.), 1.5-abs(4.*t-.6)), 0., 1.); }
float liquid(vec2 p, float t){
  p+=.3*vec2(sin(p.y*1.3+t*.9), cos(p.x*1.1-t*.76));
  return sin(p.x*1.4+t*.6+sin(p.y*1.6-t*.5)*1.5)+.8*sin(p.y*1.2-t*.44+sin(p.x*.9+t*.36)*1.8)+.45*sin((p.x-p.y)*1.9+t*.8);
}
vec3 tone(float v){ float a=clamp(.46+v*.22,0.,1.); vec3 c=mix(vec3(.015,.015,.025), vec3(.2,.21,.26), smoothstep(.1,.47,a)); return mix(c, vec3(1.), smoothstep(.5,.6,a)); }
void main(){
  vec2 p=(gl_FragCoord.xy/R-.5)*2.;
  // stretch with scroll speed, squash when poked
  float st=1.+abs(vel)*.16-poke*.14; p.y/=st; p.x*=mix(1., st, .55);
  p.y-=vel*.06;
  float ang=atan(p.y,p.x), len=length(p);
  float t=T*(1.+think*1.6);
  float wob=.045*sin(ang*3.+t*1.5)+.03*sin(ang*5.-t*1.1+1.)+.022*sin(ang*2.+t*.7+2.);
  wob*=1.+think*.9+talk*.5;
  float lean=.06*dot(p/max(len,1e-4), L);
  float rad=.72+wob+lean+talk*.022*sin(T*13.)+poke*.07*cos(ang*2.);
  float d=len-rad;
  if(d>.03){ gl_FragColor=vec4(0.); return; }
  // the liquid inside, split into the spectrum along its flow
  vec2 q=p*1.7+L*.3+vec2(0.,T*.05);
  float e=.02; vec2 g=vec2(liquid(q+vec2(e,0.),t)-liquid(q-vec2(e,0.),t), liquid(q+vec2(0.,e),t)-liquid(q-vec2(0.,e),t));
  vec2 dir=normalize(g+1e-5); vec3 col=vec3(0.), ws=vec3(0.);
  for(int i=0;i<7;i++){ float k=float(i)/6.; vec3 w=spec(k); col+=w*tone(liquid(q+dir*.09*(k-.5),t)); ws+=w; }
  col/=ws;
  // keep the middle dark so the eyes always read
  float face=smoothstep(.5,.2,length((p-L*.1-vec2(0.,.03))*vec2(1.,1.25)));
  col=mix(col, vec3(.02,.02,.03), face*.92);
  // a round body: darker toward the edge, a soft highlight top-left, a thin spectral rim
  float z=sqrt(max(0.,1.-(len/rad)*(len/rad)));
  col*=.55+.45*z;
  col+=pow(max(0.,dot(normalize(vec3(p, z*.9)), normalize(vec3(-.5,.62,.6)))),18.)*.75;
  float rim=exp(-abs(d+.035)*34.);
  col+=rim*(.28+.5*spec(.5+.5*sin(ang*1.5+T*.6)));
  float a=smoothstep(.012,-.012,d);
  gl_FragColor=vec4(clamp(col,0.,1.)*a, a);
}`;

export function initBlob(getFaces) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
  const glc = document.createElement('canvas');
  let gl = null;
  try { gl = glc.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }); } catch {}
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null; };
  let U = null;
  if (gl) {
    const vs = sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }'), fs = sh(gl.FRAGMENT_SHADER, FS);
    const pr = vs && fs && gl.createProgram();
    if (pr) { gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); }
    if (!pr || !gl.getProgramParameter(pr, gl.LINK_STATUS)) gl = null;
    else {
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      U = {}; ['R', 'T', 'L', 'talk', 'think', 'poke', 'vel'].forEach(k => { U[k] = gl.getUniformLocation(pr, k); });
    }
  }
  const faces = [];
  const adopt = () => getFaces().forEach(f => {
    if (f._blob) return;
    const c = document.createElement('canvas'); c.className = 'ab-blob'; f.prepend(c); f._blob = c;
    f.classList.add(gl ? 'liquid' : 'liquid-flat');
    faces.push({ f, c, x: c.getContext('2d') });
  });
  adopt();
  if (!gl) return { adopt };
  // smoothed copies of the mood, so every change eases in
  const s = { lx: 0, ly: 0, talk: 0, think: 0, poke: 0, vel: 0 };
  const draw = now => {
    for (const k in s) s[k] += (mood[k] - s[k]) * (k === 'poke' || k === 'vel' ? .22 : .1);
    mood.poke *= .9; mood.vel *= .86;
    for (const { c, x } of faces) {
      const w = c.clientWidth; if (!w) continue;
      const px = Math.round(w * Math.min(devicePixelRatio || 1, 3));
      if (c.width !== px) { c.width = c.height = px; }
      if (glc.width !== px) { glc.width = glc.height = px; }
      gl.viewport(0, 0, px, px); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.R, px, px); gl.uniform1f(U.T, now / 1000); gl.uniform2f(U.L, s.lx, -s.ly);
      gl.uniform1f(U.talk, s.talk); gl.uniform1f(U.think, s.think); gl.uniform1f(U.poke, s.poke); gl.uniform1f(U.vel, s.vel);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      x.clearRect(0, 0, px, px); x.drawImage(glc, 0, 0);
    }
  };
  if (reduce) { draw(4000); return { adopt }; }
  const loop = now => { if (!document.hidden) draw(now); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  return { adopt };
}
