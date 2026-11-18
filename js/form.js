// Contact form: validates, then sends the message to Ahmed's inbox through FormSubmit
// (a free form-to-email relay; no account, no database). If the relay can't be reached,
// it falls back to a pre-filled email in the visitor's own mail app.
const EMAIL = 'aaa.bawazir0@gmail.com';
const ENDPOINT = 'https://formsubmit.co/ajax/' + EMAIL;
const okEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export function initForm(form, toast, L) {
  if (!form) return;
  const f = form.elements;
  const count = form.querySelector('.cnt');
  const btn = form.querySelector('.cform-submit');

  const check = (el, ok) => { el.closest('.field').classList.toggle('invalid', !ok); return ok; };
  const valid = () => {
    const a = check(f.name, f.name.value.trim().length >= 2);
    const m = check(f.email, okEmail(f.email.value));
    const b = check(f.message, f.message.value.trim().length >= 10);
    return a && m && b;
  };

  f.message.addEventListener('input', () => {
    count.textContent = f.message.value.length;
    count.parentElement.classList.toggle('near', f.message.value.length > 900);
  });
  const rule = { name: v => v.trim().length >= 2, email: okEmail, message: v => v.trim().length >= 10 };
  ['name', 'email', 'message'].forEach(n => f[n].addEventListener('blur', () => { if (f[n].value) check(f[n], rule[n](f[n].value)); }));
  form.addEventListener('input', e => {
    const field = e.target.closest('.field');
    if (field && field.classList.contains('invalid')) valid();
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!valid()) {
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      form.querySelector('.invalid input, .invalid textarea')?.focus();
      return;
    }
    if (f._honey.value) return; // a bot filled the hidden field
    const topic = f.topic.value;
    const name = f.name.value.trim(), email = f.email.value.trim(), company = f.company.value.trim();
    const subject = `${topic} — ${name}${company ? ' (' + company + ')' : ''}`;
    const message = f.message.value.trim();
    form.dataset.state = 'busy';
    const finish = ok => {
      form.dataset.state = ok ? 'done' : '';
      toast(ok ? L().formDone : L().formFail);
      try { window.goatcounter && goatcounter.count({ path: ok ? 'form-sent' : 'form-fallback', event: true }); } catch {}
      if (ok) { form.reset(); count.textContent = '0'; setTimeout(() => { form.dataset.state = ''; }, 4000); }
    };
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 12000);
    fetch(ENDPOINT, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ _subject: 'Portfolio: ' + subject, _template: 'table', _captcha: 'false', _replyto: email, name, email, company, topic, message }),
    }).then(r => r.json()).then(d => {
      clearTimeout(timer);
      if (d && (d.success === true || d.success === 'true')) return finish(true);
      throw new Error(d && d.message || 'failed');
    }).catch(() => {
      clearTimeout(timer);
      // fall back: open the visitor's mail app with everything filled in
      const body = `${message}\n\n— ${name}\n${email}${company ? '\n' + company : ''}`;
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      finish(false);
    });
  });
  btn.addEventListener('animationend', () => form.classList.remove('shake'));
}
