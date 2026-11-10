// Contact form: validates, then composes a pre-filled email in the visitor's
// mail app (no backend, no third-party data collection).
const EMAIL = 'aaa.bawazir0@gmail.com';

export function initForm(form, toast, L) {
  if (!form) return;
  const f = form.elements;
  const count = form.querySelector('.cnt');
  const btn = form.querySelector('.cform-submit');

  const check = (el, ok) => { el.closest('.field').classList.toggle('invalid', !ok); return ok; };
  const valid = () => {
    const a = check(f.name, f.name.value.trim().length >= 2);
    const b = check(f.message, f.message.value.trim().length >= 10);
    return a && b;
  };

  f.message.addEventListener('input', () => {
    count.textContent = f.message.value.length;
    count.parentElement.classList.toggle('near', f.message.value.length > 900);
  });
  ['name', 'message'].forEach(n => f[n].addEventListener('blur', () => {
    if (f[n].value) check(f[n], n === 'name' ? f[n].value.trim().length >= 2 : f[n].value.trim().length >= 10);
  }));
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
    const topic = f.topic.value;
    const name = f.name.value.trim(), company = f.company.value.trim();
    const subject = `${topic} — ${name}${company ? ' (' + company + ')' : ''}`;
    const body = `${f.message.value.trim()}\n\n— ${name}${company ? '\n' + company : ''}`;
    form.dataset.state = 'busy';
    setTimeout(() => {
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      form.dataset.state = 'done';
      toast(L().formDone);
      setTimeout(() => { form.dataset.state = ''; }, 4000);
    }, 900);
  });
  btn.addEventListener('animationend', () => form.classList.remove('shake'));
}
