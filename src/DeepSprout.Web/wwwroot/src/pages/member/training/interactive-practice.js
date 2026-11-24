(() => {
  const types = {
    'visual-observation': {
      label: 'Visual Observation & Analysis',
      stages: ['Visual details', 'Relationships and changes', 'Visual reasoning'],
      guide: 'Look carefully at the composition. When you are ready, it will fold away and you will answer four questions. Take as long as you need. Your score comes from your answers.'
    },
    'digital-judgment': {
      label: 'Reasoning & Digital Judgment',
      stages: ['Facts and claims', 'Evidence evaluation', 'Complex reasoning'],
      guide: 'Read the fictional claim, then open the source cards. Keep the evidence in view as you decide what it supports. Each answer reveals the reasoning behind it.'
    }
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
  const shapes = {
    circle: '<circle cx="32" cy="32" r="20"/>',
    ring: '<circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" stroke-width="7"/>',
    square: '<rect x="13" y="13" width="38" height="38" rx="4"/>',
    triangle: '<path d="M32 10 55 51H9Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    diamond: '<path d="M32 6 58 32 32 58 6 32Z"/>',
    arch: '<path d="M11 53V30a21 21 0 0 1 42 0v23Z"/>',
    cross: '<path d="M25 10h14v15h15v14H39v15H25V39H10V25h15z"/>'
  };
  const arrows = { right: 0, down: 90, left: 180, up: 270 };
  const shapeName = token => {
    if (token === '.') return 'Empty';
    const [kind, item] = token.split('-');
    if (kind === 'map') return item === 'X' ? 'Blocked' : item;
    return kind === 'arrow' ? `Arrow pointing ${item}` : `${kind} ${item === 'circle' ? 'filled circle' : item}`;
  };
  function glyph(token) {
    if (token === '.') return '<i class="ip-grid-point" aria-hidden="true"></i>';
    const [kind, item] = token.split('-');
    if (kind === 'map') return `<span class="ip-map-mark${item === 'X' ? ' ip-map-block' : ''}" aria-hidden="true">${escape(item === 'X' ? '×' : item)}</span>`;
    if (kind === 'arrow') return `<svg class="ip-arrow" viewBox="0 0 64 64" aria-hidden="true"><path transform="rotate(${arrows[item]} 32 32)" d="M12 32h41M40 19l13 13-13 13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `<svg class="ip-glyph" data-ink="${escape(kind)}" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">${shapes[item]}</svg>`;
  }

  function sceneMarkup(scene) {
    return `<div class="ip-boards" data-count="${scene.boards.length}">${scene.boards.map(board => `
      <table class="ip-board" data-columns="${scene.columns}">
        <caption>${escape(board.label)}</caption>
        <thead><tr>${Array.from({ length: scene.columns }, (_, index) => `<th scope="col"><span class="ip-sr">Column </span>${index + 1}</th>`).join('')}</tr></thead>
        <tbody>${Array.from({ length: board.cells.length / scene.columns }, (_, index) => `
          <tr>${board.cells.slice(index * scene.columns, (index + 1) * scene.columns).map((token, column) => `
            <td>${column === 0 ? `<span class="ip-sr">Row ${index + 1}. </span>` : ''}<span class="ip-sr">${escape(shapeName(token))}</span>${glyph(token)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`).join('')}</div>`;
  }
  function sceneDescription(scene) {
    return `<details class="ip-description"><summary>Read the scene as text</summary>${scene.boards.map(board => `
      <h4>${escape(board.label)}</h4><ol>${Array.from({ length: board.cells.length / scene.columns }, (_, index) => `
        <li>${escape(board.cells.slice(index * scene.columns, (index + 1) * scene.columns).map(shapeName).join(' · '))}</li>`).join('')}</ol>`).join('')}</details>`;
  }

  function evidenceMarkup(definition, opened, relevant = []) {
    return `<aside class="ip-file" aria-label="Case evidence">
      <p class="ip-label">The claim</p><blockquote>${escape(definition.claim)}</blockquote>
      <p class="ip-label">Sources</p>
      <div class="ip-sources">${definition.evidence.map((source, index) => `
        <details class="ip-source" data-source="${escape(source.id)}" ${opened.has(source.id) || relevant.includes(source.id) ? 'open' : ''} ${relevant.includes(source.id) ? 'data-relevant' : ''}>
          <summary><span class="ip-source-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span><strong>${escape(source.title)}</strong><small>${escape(source.detail)}</small></span><span class="ip-source-toggle" aria-hidden="true"></span></summary>
          <div class="ip-source-body">${relevant.includes(source.id) ? '<strong class="ip-relevant">Relevant to this answer</strong>' : ''}<p>${escape(source.body)}</p></div>
        </details>`).join('')}</div>
    </aside>`;
  }

  function reviewAnswers(run) {
    const answers = run.responses?.answers || [];
    if (!answers.length) return '<p>No answers submitted.</p>';
    return `<ol>${answers.map((answer, index) => {
      const item = run.definitionSnapshot.questions[index];
      return `<li><strong>${escape(item.prompt)}</strong><p>Your answer: ${escape(item.options[answer])}</p>
        ${run.status === 'Completed' ? `<p>Correct answer: ${escape(item.options[item.answer])}</p><p>${escape(item.explanation)}</p>` : ''}</li>`;
    }).join('')}</ol>`;
  }

  function intro({ root, type, level, definitions, draft, draftName, canResume, start, resume, interrupt, focus = false }) {
    const family = types[type];
    root.innerHTML = `<section class="ip-intro ip-enter">
      <div class="ip-intro-copy"><p class="ip-label">${level ? `Level ${level} · ${escape(family.stages[level - 1])}` : 'Practice preview'}</p>
      <h3 tabindex="-1">${type === 'visual-observation' ? 'A closer look' : 'Follow the evidence'}</h3><p>${escape(family.guide)}</p></div>
      <div class="ip-intro-examples">
        ${draft ? `<div class="ip-draft"><p><strong>${escape(draftName)}</strong> has an unfinished attempt.</p><div class="ip-actions">
          ${canResume ? '<button class="ip-button" type="button" data-resume>Resume attempt</button>' : '<p>The original responses remain in History.</p>'}
          <button class="ip-button ip-secondary" type="button" data-interrupt>End draft</button></div></div>` : ''}
        <p class="ip-label">Choose an example</p>
        ${definitions.length ? definitions.map(definition => `<button type="button" class="ip-example" data-definition="${escape(definition.id)}" ${draft || !definition.access.allowed ? 'disabled' : ''}>
          <span><strong>${escape(definition.title)}</strong><small>${escape(definition.access.reason || `${definition.estimatedMinutes} min · ${definition.questionCount ?? definition.questions?.length ?? 4} questions`)}</small></span><span class="ip-round-arrow" aria-hidden="true">↗</span>
        </button>`).join('') : '<p>Activate your Recovery Plan to open the Level 1 examples.</p><a class="ip-button" href="../recovery-plan/recovery-plan.html">Open your Roadmap</a>'}
      </div></section>`;
    root.querySelectorAll('[data-definition]').forEach(button => button.addEventListener('click', () => start(button.dataset.definition)));
    root.querySelector('[data-resume]')?.addEventListener('click', resume);
    root.querySelector('[data-interrupt]')?.addEventListener('click', interrupt);
    if (focus) root.querySelector('h3').focus({ preventScroll: true });
  }

  function play({ root, attempt, progress, submit, getLevel, onDone, onRetry, onClose, fail }) {
    let run = attempt;
    const definition = run.definitionSnapshot, visual = definition.responseMethod === 'observation-questions';
    const opened = new Set(), questions = definition.questions;
    const dialog = root.closest('dialog');
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const heading = () => {
      const target = root.querySelector('[data-step-heading]');
      if (!target) return;
      target.focus({ preventScroll: true });
      const bounds = target.getBoundingClientRect();
      if (bounds.top < 20 || bounds.bottom > window.innerHeight - 32) target.scrollIntoView({block:'center',behavior:'instant'});
    };
    const show = (markup, resetScroll = true) => {
      root.innerHTML = markup;
      if (resetScroll && dialog?.open) dialog.scrollTop = 0;
      heading();
    };
    const handle = fn => async event => {
      const control = event.currentTarget;
      try { await fn(event); }
      catch (error) { fail(error); }
      finally { if (control.isConnected) control.disabled = false; }
    };
    const track = (index, phase) => `<div class="ip-track">
      <span>${phase || `Question ${index + 1} of ${questions.length}`}</span>
      <span aria-hidden="true" class="ip-segments">${questions.map((_, i) => `<i ${i < (run.responses.answers?.length || 0) ? 'data-done' : ''} ${i === index ? 'data-current' : ''}></i>`).join('')}</span>
    </div>`;
    const observe = () => {
      show(`<section class="ip-observe ip-enter">${track(-1, 'Observation')}
        <h3 data-step-heading tabindex="-1">${escape(definition.title)}</h3><p>${escape(definition.subtitle)}</p>
        <p class="ip-observe-note">Start with about ${[20, 30, 45][definition.level - 1]} seconds. Take more time whenever you need it.</p>
        <div class="ip-scene">${sceneMarkup(definition.scene)}${sceneDescription(definition.scene)}</div>
        <button type="button" class="ip-button" data-see-questions>Continue to questions <span class="ip-round-arrow" aria-hidden="true">→</span></button>
      </section>`);
      root.querySelector('[data-see-questions]').onclick = handle(async event => {
        event.currentTarget.disabled = true;
        const stage = root.firstElementChild;
        const animation = reduceMotion.matches || !stage.animate ? null : stage.animate(
          [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)' }], {
          duration: 260, easing: 'cubic-bezier(.4,0,.55,1)', fill: 'forwards'
        });
        try {
          [run] = await Promise.all([progress('observe'), animation?.finished]);
          if (stage.isConnected && dialog.open) question(0);
        } catch (error) {
          animation?.cancel();
          throw error;
        }
      });
    };

    function question(index, feedback = false) {
      const item = questions[index];
      const selection = feedback ? run.responses.answers[index] : null;
      const correct = item.answer === selection;
      const shape = visual && feedback ? item.options[item.answer].toLowerCase().replace(/^filled /, '') : '';
      const token = Object.hasOwn(shapes, shape) && definition.scene.boards.flatMap(board => board.cells).find(cell => cell.endsWith('-' + shape));
      const visualCue = token ? `<span class="ip-reveal-glyph">${glyph(token)}</span>` : '';
      show(`<section class="ip-session ip-enter">
        ${track(index)}
        <div class="ip-workspace">
          ${visual ? '' : evidenceMarkup(definition, opened, feedback ? item.sources : [])}
          <div class="ip-decision">
            <p class="ip-label">${escape(definition.title)}</p>
            <h3 tabindex="-1" ${feedback ? '' : 'data-step-heading'} id="ip-question">${escape(item.prompt)}</h3>
            ${!visual && !feedback ? '<button type="button" class="ip-inspect" data-inspect>Go to sources</button>' : ''}
            <form class="ip-answer-form" aria-labelledby="ip-question">
              <div class="ip-options" role="radiogroup" aria-labelledby="ip-question">${item.options.map((option, i) => `
                <label class="ip-option" ${feedback && i === item.answer ? 'data-correct' : ''} ${feedback && i === selection && !correct ? 'data-chosen' : ''}>
                  <input type="radio" name="ip-answer" value="${i}" required ${feedback ? 'disabled' : ''} ${i === selection ? 'checked' : ''}>
                  <span class="ip-option-letter" aria-hidden="true">${String.fromCharCode(65 + i)}</span><span>${escape(option)}</span>
                  ${feedback && i === item.answer ? '<strong>Correct answer</strong>' : feedback && i === selection ? '<strong>Your answer</strong>' : ''}
                </label>`).join('')}</div>
              ${feedback ? '' : '<button type="submit" class="ip-button">Check answer <span class="ip-round-arrow" aria-hidden="true">→</span></button>'}
            </form>
            ${feedback ? `<div class="ip-explanation">${visualCue}<h4 tabindex="-1" data-step-heading>${correct ? 'Correct' : visual ? 'Look at the detail' : 'Here is what the evidence shows'}</h4><p>${escape(item.explanation)}</p></div>
              <button type="button" class="ip-button" data-next>${index + 1 === questions.length ? 'Save and see results' : 'Next question'} <span class="ip-round-arrow" aria-hidden="true">→</span></button>` : ''}
          </div>
        </div>
      </section>`, !feedback);
      root.querySelectorAll('[data-source]').forEach(source => source.addEventListener('toggle', () => {
        if (source.open) opened.add(source.dataset.source); else opened.delete(source.dataset.source);
      }));
      const form = root.querySelector('form');
      const inspect = root.querySelector('[data-inspect]');
      if (inspect) inspect.onclick = () => root.querySelector('.ip-source summary')?.focus();
      form.onsubmit = handle(async event => {
        event.preventDefault();
        if (feedback) return;
        const answer = new FormData(form).get('ip-answer');
        if (answer === null) throw new Error('Choose an answer before continuing.');
        const check = form.querySelector('[type="submit"]');
        if (check.disabled) return;
        check.disabled = true;
        try {
          run = await progress('answer', { question: index, answer: Number(answer) });
          questions[index] = run.definitionSnapshot.questions[index];
          if (form.isConnected && dialog.open) question(index, true);
        } finally { if (check.isConnected) check.disabled = false; }
      });
      const next = root.querySelector('[data-next]');
      if (next) next.onclick = handle(async () => {
        next.disabled = true;
        if (index + 1 === questions.length) {
          const saved = await submit(run);
          if (next.isConnected && dialog.open) result(saved);
        }
        else question(index + 1);
      });
    }

    function result(saved) {
      const level = getLevel();
      const threshold = Math.round(saved.requiredScore * 100);
      const progressText = level.atMax ? 'You are practicing at the highest level.'
        : level.eligible ? `Level ${level.level + 1} is ready. Choose it in Practice levels when you want to move up.`
        : `${level.validAtLevel} of ${level.required} distinct examples · ${level.days} of ${level.requiredDays} practice days toward Level ${level.level + 1}.`;
      const rewardText = saved.rewardEligible ? 'This result qualifies for a Garden growth step.'
        : saved.score < saved.requiredScore ? `A score of ${threshold}% or higher is needed for Garden growth and level progress.`
        : 'This example is inside its reward cooldown. Your result is saved in History.';
      show(`<section class="ip-result ip-enter">
        <div><p class="ip-label">Practice complete</p><h3 tabindex="-1" data-step-heading>${escape(definition.title)}</h3><p>${escape(types[run.activityType].label)} · Level ${run.level}</p></div>
        <div class="ip-score"><strong>${Math.round(saved.score * 100)}<small>%</small></strong><span>${saved.correctCount} of ${questions.length} correct</span></div>
        <div class="ip-results-line">${questions.map((item, i) => `<span data-result="${saved.responses.answers[i] === item.answer ? 'correct' : 'review'}" aria-label="Question ${i + 1} ${saved.responses.answers[i] === item.answer ? 'correct' : 'incorrect'}">${i + 1}</span>`).join('')}</div>
        <p class="ip-result-progress">${escape(rewardText)}</p><p class="ip-result-progress">${escape(progressText)}</p>
        <details class="ip-review"><summary>Review your answers</summary>
        ${visual ? `<div class="ip-scene">${sceneMarkup(definition.scene)}${sceneDescription(definition.scene)}</div>` : evidenceMarkup(definition, new Set())}
        ${reviewAnswers(saved)}</details>
        <div class="ip-actions"><button class="ip-button" type="button" data-done>Back to Activities</button><button class="ip-button ip-secondary" type="button" data-retry>Choose another example</button></div>
      </section>`);
      root.querySelector('[data-done]').onclick = onClose;
      root.querySelector('[data-retry]').onclick = onRetry;
      onDone();
    }

    const count = run.responses.answers?.length || 0;
    if (visual && !run.responses.observed) observe();
    else if (count === questions.length) question(count - 1, true);
    else question(count);
  }

  window.DeepSproutInteractivePractice = { types, intro, play, reviewAnswers };
})();
