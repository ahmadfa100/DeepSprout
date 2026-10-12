(() => {
  const main = document.getElementById('story-main');
  const garden = document.getElementById('garden-scene');
  const count = document.getElementById('garden-count');
  const progress = document.getElementById('progress-fill');
  const accents = [...document.querySelectorAll('[data-growth-min]')];
  if (!main || !garden) return;

  let currentStage = 0;
  const setGrowthStage = value => {
    const stage = Math.min(7, Math.max(0, Math.round(value)));
    if (stage === currentStage && main.dataset.growthStage === String(stage)) return;
    currentStage = stage;
    main.dataset.growthStage = String(stage);
    main.style.setProperty('--story-sky-warmth', String(Math.min(.42, stage * .06)));
    main.style.setProperty('--story-flower-opacity', String(Math.max(0, (stage - 5) / 2)));
    main.style.setProperty('--story-flower-scale', String(Math.max(.25, Math.min(1, (stage - 5) / 2))));
    accents.forEach(accent => accent.classList.toggle('is-grown', stage >= Number(accent.dataset.growthMin)));
  };
  const setHabitProgress = (completed, total) => {
    const safeTotal = Math.max(1, total);
    const safeCompleted = Math.min(safeTotal, Math.max(0, completed));
    setGrowthStage(Math.round(safeCompleted / safeTotal * 7));
    if (count) count.textContent = `${safeCompleted} / ${safeTotal}`;
    if (progress) progress.style.width = `${safeCompleted / safeTotal * 100}%`;
    garden.style.setProperty('--plant-scale', String(.32 + safeCompleted * .2));
    garden.style.setProperty('--garden-reveal', `${safeCompleted / safeTotal * 100}%`);
  };
  setGrowthStage(0);
  setHabitProgress(0, document.querySelectorAll('[data-habit]').length);
  window.DeepSproutGrowth = { setGrowthStage, setHabitProgress, getStage: () => currentStage };
})();
