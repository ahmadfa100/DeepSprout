(() => {
  const button = document.querySelector('.motion-toggle');
  const label = button.querySelector('span');
  const icon = button.querySelector('path');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = preference.matches;

  const render = () => {
    document.body.classList.toggle('motion-paused', paused);
    button.setAttribute('aria-pressed', String(paused));
    label.textContent = paused ? 'Resume animation' : 'Pause animation';
    icon.setAttribute('d', paused ? 'm5 3 8 5-8 5Z' : 'M5 3v10m6-10v10');
    // The system preference takes precedence; a static illustration needs no pause control.
    button.hidden = preference.matches;
  };

  button.addEventListener('click', () => {
    paused = !paused;
    render();
  });
  preference.addEventListener('change', () => {
    paused = preference.matches;
    render();
  });
  render();
})();
