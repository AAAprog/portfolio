// A small fake shell. Output is built with DOM nodes (never innerHTML from input).
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
const EMAIL = 'aaa.bawazir0@gmail.com';

export function initTerminal(root) {
  const out = root.querySelector('.term-out');
  const form = root.querySelector('.term-line');
  const input = root.querySelector('.term-in');
  const history = [];
  let hIdx = 0, booted = false, busy = false;

  /* ── output helpers ── */
  const line = (parts, cls) => {
    const p = document.createElement('p');
    if (cls) p.className = cls;
    (Array.isArray(parts) ? parts : [parts]).forEach(x => {
      if (typeof x === 'string') p.append(x);
      else if (x.href) {
        const a = document.createElement('a');
        a.href = x.href; a.textContent = x.text;
        if (!x.href.startsWith('mailto') && !x.href.startsWith('#') && !x.download) { a.target = '_blank'; a.rel = 'noopener'; }
        if (x.download) a.download = '';
        p.append(a);
      } else {
        const s = document.createElement('span');
        s.className = x.c; s.textContent = x.t;
        p.append(s);
      }
    });
    return p;
  };
  const hl = t => ({ c: 't-hl', t }), dim = t => ({ c: 't-dim', t }), ok = t => ({ c: 't-ok', t }), acc = t => ({ c: 't-acc', t });
  const link = (text, href, download) => ({ text, href, download });

  async function print(lines) {
    for (const l of lines) {
      out.append(typeof l === 'string' ? line(l) : l instanceof Node ? l : line(l));
      out.scrollTop = out.scrollHeight;
      if (!reduce) await new Promise(r => setTimeout(r, 28));
    }
  }

  /* ── commands ── */
  const C = {
    help: () => [
      [hl('Available commands')],
      ...[
        ['whoami', 'who is this guy?'], ['about', 'the short version'], ['experience', 'work history (git log style)'],
        ['projects', 'things I shipped, with links'], ['skills [--code|--data|--hcm|--eng]', 'the toolbox'],
        ['education', 'degree & CGPA'], ['certs', 'certifications'], ['contact', 'ways to reach me'],
        ['cv', 'download the PDF'], ['ls / cat <file>', 'browse files'], ['theme / lang', 'toggle theme or language'],
        ['matrix', 'you know you want to'], ['sudo hire ahmed', 'the best command'], ['clear', 'clean the screen'],
      ].map(([c, d]) => [acc(c.padEnd(36, ' ')), dim(d)]),
    ],
    whoami: () => [[hl('Ahmed Bawazir')], 'Software Engineer · Oracle Fusion HCM Consultant · bug hunter', [dim('📍 Riyadh, Saudi Arabia   🗣 Arabic (native) · English (professional)')]],
    about: () => [
      'Software engineering graduate with hands-on experience in software development,',
      'Oracle Fusion HCM, database design, system configuration and software testing.',
      [dim('I turn business rules into working systems — then hunt for the edge case.')],
    ],
    experience: () => [
      [acc('* a3f9c21 '), ok('(HEAD → riyadh) '), 'Oracle Fusion HCM Consultant Intern @ Macquires ', dim('Jun–Aug 2026')],
      [acc('* 7be14d0 '), dim('(remote/doha) '), 'Software Engineer, part-time @ Sifr IDE ', dim('Feb–May 2026')],
      [acc('* 1c0de23 '), dim('(origin/kajang) '), 'B.CS (Hons.) Software Engineering @ UNITEN ', dim('2023–2026')],
    ],
    projects: () => [
      [hl('codai/       '), 'AI assistant for SDLC, UML, schema design & test cases  ', link('live ↗', 'https://codai-murex.vercel.app/')],
      [hl('ufc-tickets/ '), 'full-stack booking system · PHP + MySQL                ', link('live ↗', 'https://aaaprog.github.io/ufc-event-system/')],
      [hl('easycal/     '), 'Android calorie tracker · C# + .NET MAUI              ', dim('demo on request')],
    ],
    skills: args => {
      const g = {
        code: ['Java · C++ · C# · JavaScript · PHP · HTML · CSS', 'React · Next.js · Tailwind · Node.js · REST · Firebase Functions'],
        data: ['PostgreSQL · MySQL · SQLite · Oracle · SQL Server · Supabase', 'Tableau · text analytics · data visualisation'],
        hcm: ['Core HR · Workforce Structures · Absence Management · DOR · Payroll', 'DFF · Value Sets · Groovy/ADF · OTBI · BI Publisher'],
        eng: ['SDLC · UML · OOP · MVVM · requirements analysis', 'functional testing · debugging · troubleshooting · Docker · Figma'],
      };
      const pick = (args[0] || '').replace(/^--/, '');
      const keys = g[pick] ? [pick] : Object.keys(g);
      return keys.flatMap(k => [[acc(`# ${k}`)], ...g[k].map(s => '  ' + s)]);
    },
    education: () => [[hl('Universiti Tenaga Nasional'), ' — Kajang, Malaysia'], 'B.CS (Hons.) in Software Engineering · 2023–2026', [ok('CGPA 3.63 / 4.00')]],
    certs: () => ['✓ CCNA: Introduction to Networks', '✓ Build Smarter AI with Embeddings', '✓ AI4I® Literacy in AI — AI Singapore', '✓ AI4I® Foundations in AI — AI Singapore', '✓ AI4E® Theory — AI Singapore'],
    contact: () => [
      [dim('email    '), link(EMAIL, 'mailto:' + EMAIL)],
      [dim('linkedin '), link('in/ahmed-bawazir', 'https://www.linkedin.com/in/ahmed-bawazir-14b472383/')],
      [dim('github   '), link('github.com/aaaprog', 'https://github.com/aaaprog')],
    ],
    cv: () => [[ok('↓ '), link('Ahmed_Bawazir_CV.pdf', 'assets/Ahmed_Bawazir_CV.pdf', true), dim('  (click to download)')]],
    ls: () => [[hl('about.txt  '), hl('experience/  '), hl('projects/  '), 'skills.json  ', acc('cv.pdf')]],
    cat: args => {
      const f = (args[0] || '').replace(/\/$/, '');
      const map = { 'about.txt': 'about', experience: 'experience', projects: 'projects', 'skills.json': 'skills', 'cv.pdf': 'cv' };
      if (!f) return [[dim('usage: cat <file>')]];
      return map[f] ? C[map[f]]([]) : [[{ c: 't-err', t: `cat: ${f}: No such file or directory` }]];
    },
    date: () => [new Date().toString()],
    echo: args => [args.join(' ')],
    theme: () => { document.querySelector('[data-action=theme]').click(); return [[ok('✓ '), 'theme toggled']]; },
    lang: () => { document.querySelector('[data-action=lang]').click(); return [[ok('✓ '), 'language toggled · تم تبديل اللغة']]; },
    exit: () => [[dim('There is no escape. Try '), acc('contact'), dim(' instead.')]],
    history: () => history.map((h, i) => `  ${String(i + 1).padStart(3)}  ${h}`),
    clear: () => { out.innerHTML = ''; return []; },
    matrix: () => { matrix(); return [[ok('Wake up, recruiter…')]]; },
    sudo: async args => {
      if (args.join(' ').toLowerCase() !== 'hire ahmed') return [[{ c: 't-err', t: 'Nice try. This incident will be reported. 😄' }]];
      await print([[dim('[sudo] password for recruiter: '), '••••••••']]);
      await new Promise(r => setTimeout(r, reduce ? 0 : 500));
      const r = root.getBoundingClientRect();
      document.dispatchEvent(new CustomEvent('celebrate', { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
      return [
        [ok('✓ Access granted.'), ' Excellent decision.'],
        ['Next step → ', link('send Ahmed an email', `mailto:${EMAIL}?subject=${encodeURIComponent("Let's talk about a role")}`)],
      ];
    },
  };
  const aliases = { exp: 'experience', work: 'experience', '?': 'help', social: 'contact', resume: 'cv', edu: 'education', man: 'help' };
  const names = [...Object.keys(C), 'sudo hire ahmed', 'skills --hcm', 'skills --code', 'skills --data', 'skills --eng'];

  async function run(raw) {
    const cmd = raw.trim();
    out.append(line([acc('ahmed@riyadh:~$ '), cmd]));
    if (!cmd) return;
    history.push(cmd); hIdx = history.length;
    const [name, ...args] = cmd.split(/\s+/);
    const key = aliases[name.toLowerCase()] || name.toLowerCase();
    const fn = C[key];
    busy = true;
    if (!fn) await print([[{ c: 't-err', t: `command not found: ${name}` }, dim('  — try '), acc('help')]]);
    else await print(await fn(args));
    busy = false;
    out.scrollTop = out.scrollHeight;
  }

  /* ── matrix rain ── */
  function matrix() {
    if (reduce || root.querySelector('.term-matrix')) return;
    const c = document.createElement('canvas');
    c.className = 'term-matrix';
    root.append(c);
    const r = root.getBoundingClientRect();
    c.width = r.width; c.height = r.height;
    const ctx = c.getContext('2d');
    const fs = 14, cols = Math.ceil(r.width / fs), drops = Array.from({ length: cols }, () => Math.random() * -40);
    const chars = 'アカサタナハマヤラワ0123456789ABHCMعربي';
    const t0 = performance.now();
    const f = now => {
      ctx.fillStyle = 'rgba(0, 0, 0, .14)'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#3ddc97'; ctx.font = `${fs}px JetBrains Mono, monospace`;
      drops.forEach((y, i) => {
        ctx.fillText(chars[(Math.random() * chars.length) | 0], i * fs, y * fs);
        drops[i] = y * fs > c.height && Math.random() > 0.97 ? 0 : y + 1;
      });
      if (now - t0 < 4200) requestAnimationFrame(f);
      else { c.classList.add('fade'); setTimeout(() => c.remove(), 600); }
    };
    requestAnimationFrame(f);
  }

  /* ── input ── */
  form.addEventListener('submit', e => { e.preventDefault(); if (busy) return; const v = input.value; input.value = ''; run(v); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') { e.preventDefault(); if (hIdx > 0) input.value = history[--hIdx]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; }
    else if (e.key === 'Tab') {
      const v = input.value.toLowerCase();
      if (!v) return;
      e.preventDefault();
      const m = names.find(n => n.startsWith(v));
      if (m) input.value = m;
    } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
  });
  root.addEventListener('click', e => { if (!e.target.closest('a') && !getSelection().toString()) input.focus({ preventScroll: true }); });

  // Chips "type" the command, then run it.
  document.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', async () => {
    if (busy) return;
    const cmd = b.dataset.cmd;
    input.value = '';
    if (!reduce) for (const ch of cmd) { input.value += ch; await new Promise(r => setTimeout(r, 32)); }
    input.value = '';
    run(cmd);
  }));

  // Boot sequence the first time the terminal scrolls into view.
  new IntersectionObserver(([en], io) => {
    if (!en.isIntersecting || booted) return;
    booted = true; io.disconnect();
    print([
      [dim(`Last login: ${new Date().toDateString()} on ttys001`)],
      [ok('✓ '), 'loaded ', hl('ahmed.sh'), dim(' v2026.11')],
      [dim('Type '), acc('help'), dim(' to get started, or tap a command below.')],
    ]);
  }, { threshold: 0.4 }).observe(root);
}
