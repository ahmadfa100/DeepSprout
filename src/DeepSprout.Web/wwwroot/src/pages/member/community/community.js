(() => {
  const feed = document.querySelector('#feed');
  const search = document.querySelector('#post-search');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const empty = document.querySelector('#empty-state');
  const dialog = document.querySelector('#compose-dialog');
  const form = document.querySelector('#compose-form');
  const toast = document.querySelector('#toast');
  const storageKey = 'deepsprout-community-demo-v1';
  let state = { posts: [], liked: {}, saved: {}, reports: [], moderation: {} };
  let activeFilter = 'all';
  let toastTimer;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    state = { ...state, ...saved };
    if (!Array.isArray(state.posts)) state.posts = [];
  } catch { /* The demo still works when storage is unavailable. */ }
  const refreshModeration = () => {
    try { const latest=JSON.parse(localStorage.getItem(storageKey)||'{}');state.reports=Array.isArray(latest.reports)?latest.reports:[];state.moderation=latest.moderation||{};state.moderationHistory=latest.moderationHistory||[]; } catch {}
  };
  const persist = () => { refreshModeration();try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {} };
  const notify = message => {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  };
  const queuePost = post => {
    refreshModeration();
    state.posts.push(post);state.moderation[post.id]='pending';
    try { localStorage.setItem(storageKey,JSON.stringify(state));return true; }
    catch { state.posts.pop();delete state.moderation[post.id];notify('Your post could not be saved. Please try again.');return false; }
  };
  const cards = () => [...feed.querySelectorAll('.post-card')];
  const cardId = card => card.dataset.id || [...cards()].indexOf(card).toString();
  const applyFilters = () => {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    cards().forEach(card => {
      const categoryMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
      const textMatch = !query || `${card.dataset.search || ''} ${card.textContent}`.toLowerCase().includes(query);
      card.hidden = ['hidden','pending','removed','rejected'].includes(state.moderation?.[cardId(card)]) || !(categoryMatch && textMatch);
      if (!card.hidden) shown++;
    });
    empty.hidden = shown > 0;
    // Say plainly when a category is empty rather than implying a search miss.
    const noChallenges = activeFilter === 'challenges' && !query;
    document.querySelector('#empty-text').textContent = noChallenges
      ? 'No challenges have been shared yet. Start one and it will appear here.'
      : 'No posts match your search yet. Try another category.';
    document.querySelector('#empty-create').hidden = !noChallenges;
  };
  const setFilter = filter => {
    activeFilter = filter;
    filters.forEach(button => {
      const selected = button.dataset.filter === filter;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    applyFilters();
  };
  filters.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
  search.addEventListener('input', applyFilters);

  const button = (className, label, icon, count) => {
    const element = document.createElement('button');
    element.className = className;
    element.type = 'button';
    element.setAttribute('aria-label', label);
    if (className !== 'comment-button') element.setAttribute('aria-pressed', 'false');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#icon-${icon}`);
    svg.append(use);
    element.append(svg);
    if (count !== undefined) {
      const span = document.createElement('span');
      span.textContent = String(count);
      element.append(span);
    }
    return element;
  };
  const makePost = post => {
    const card = document.createElement('article');
    card.className = 'post-card user-post';
    card.dataset.category = post.category;
    card.dataset.topics = '';
    card.dataset.id = post.id;
    card.dataset.search = `${post.title} ${post.message} You ${post.category}`.toLowerCase();
    const avatar = document.createElement('img');
    avatar.className = 'post-avatar';
    avatar.src = '../../../../assets/community/avatar-sara.png';
    avatar.alt = '';
    const author = document.createElement('div');
    author.className = 'post-author';
    const name = document.createElement('strong'); name.textContent = 'You';
    const time = document.createElement('time'); time.textContent = 'Just now';
    author.append(name, time);
    const body = document.createElement('div'); body.className = 'post-body';
    const badge = document.createElement('span');
    badge.className = `post-badge ${post.category}`;
    badge.textContent = ({progress:'✓ Progress',tips:'! Tips & Resources',questions:'? Questions',challenges:'★ Challenges',wins:'★ Wins'})[post.category] || 'Progress';
    const title = document.createElement('h2'); title.textContent = post.title;
    const message = document.createElement('p'); message.textContent = post.message;
    const actions = document.createElement('div'); actions.className = 'post-actions';
    actions.append(button('like-button', 'Like your post', 'heart', 0), button('comment-button', 'Show comments on your post', 'comment', 0), button('save-button', 'Save your post', 'bookmark'));
    if (post.challengeId && window.DeepSproutChallenges?.exists(post.challengeId)) {
      const view = document.createElement('button');
      view.type = 'button'; view.className = 'post-challenge-open'; view.dataset.openChallenge = post.challengeId;
      view.textContent = 'View challenge';
      actions.append(view);
    }
    body.append(badge, title, message, actions);
    const art = document.createElement('img');
    art.className = 'post-image'; art.src = '../../../../assets/community/post-win.png'; art.alt = 'A sprout in a sunset landscape';
    const more = document.createElement('button'); more.className = 'post-more'; more.type = 'button'; more.textContent = '•••'; more.setAttribute('aria-label', 'More options for your post');
    const comments = document.createElement('div'); comments.className = 'post-comments'; comments.hidden = true;
    const heading = document.createElement('strong'); heading.textContent = 'Conversation';
    const text = document.createElement('p'); text.textContent = 'Be the first to add encouragement.';
    const commentForm = document.createElement('form'); commentForm.className = 'comment-form';
    const input = document.createElement('input'); input.placeholder = 'Add some encouragement...'; input.setAttribute('aria-label', 'Write a comment');
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = 'Post';
    commentForm.append(input, submit); comments.append(heading, text, commentForm);
    card.append(avatar, author, body, art, more, comments);
    return card;
  };
  state.posts.slice().reverse().forEach(post => feed.insertBefore(makePost(post), feed.firstChild));
  cards().forEach(card => {
    const id = cardId(card);
    card.id = id;
    card.querySelector('.like-button')?.setAttribute('aria-pressed', String(!!state.liked[id]));
    card.querySelector('.save-button')?.setAttribute('aria-pressed', String(!!state.saved[id]));
    if (state.liked[id]) {
      const count = card.querySelector('.like-button span');
      count.textContent = String(Number(count.textContent) + 1);
    }
  });

  feed.addEventListener('click', event => {
    const target = event.target.closest('button');
    const card = target?.closest('.post-card');
    if (!card) return;
    const id = cardId(card);
    if (target.classList.contains('like-button')) {
      const liked = target.getAttribute('aria-pressed') !== 'true';
      target.setAttribute('aria-pressed', String(liked));
      const count = target.querySelector('span');
      count.textContent = String(Number(count.textContent) + (liked ? 1 : -1));
      state.liked[id] = liked; persist();
    } else if (target.classList.contains('save-button')) {
      const saved = target.getAttribute('aria-pressed') !== 'true';
      target.setAttribute('aria-pressed', String(saved));
      state.saved[id] = saved; persist();
      notify(saved ? 'Post saved on this device.' : 'Post removed from saved items.');
    } else if (target.classList.contains('comment-button')) {
      const comments = card.querySelector('.post-comments');
      comments.hidden = !comments.hidden;
      if (!comments.hidden) comments.querySelector('input').focus();
    } else if (target.classList.contains('post-more')) {
      const menu = card.querySelector('.post-menu');
      if (menu) { menu.remove(); return; }
      document.querySelectorAll('.post-menu').forEach(open => open.remove());
      const popover = document.createElement('div');
      popover.className = 'post-menu';
      popover.innerHTML = '<button type="button" data-action="copy">Copy post link</button><button type="button" data-action="hide">Hide for now</button><button type="button" data-action="report">Report to moderation</button>';
      card.append(popover);
    } else if (target.dataset.action === 'copy') {
      const link = `${location.href.split('#')[0]}#${id}`;
      navigator.clipboard?.writeText(link).then(() => notify('Post link copied.')).catch(() => notify('Copy is unavailable in this browser.'));
      target.closest('.post-menu').remove();
    } else if (target.dataset.action === 'report') {
      refreshModeration();
      if (state.reports.some(report=>report.postId===id&&report.status==='pending')) {
        notify('This post is already awaiting review.');
      } else {
        reportDialog.dataset.post=id;
        reportDialog.querySelector('form').reset();
        reportDialog.showModal();
      }
      target.closest('.post-menu').remove();
    } else if (target.dataset.action === 'hide') {
      card.dataset.hiddenByUser = 'true';
      card.remove();
      applyFilters();
      notify('Post hidden for this visit.');
    }
  });
  feed.addEventListener('submit', event => {
    if (!event.target.matches('.comment-form')) return;
    event.preventDefault();
    const input = event.target.querySelector('input');
    const message = input.value.trim();
    if (!message) return;
    const line = document.createElement('p');
    line.textContent = `You: ${message}`;
    event.target.before(line);
    const count = event.target.closest('.post-card').querySelector('.comment-button span');
    count.textContent = String(Number(count.textContent) + 1);
    input.value = '';
    notify('Comment added for this visit.');
  });

  const reportDialog=document.createElement('dialog');
  reportDialog.id='report-dialog';reportDialog.setAttribute('aria-labelledby','report-title');
  reportDialog.innerHTML='<form><h2 id="report-title">Report this post</h2><p>Tell the Admin what needs reviewing.</p><label>Reason<select name="reason" required><option value="Spam or advertising">Spam or advertising</option><option value="Harassment or abuse">Harassment or abuse</option><option value="Harmful or misleading content">Harmful or misleading content</option><option value="Privacy concern">Privacy concern</option><option value="Other concern">Other concern</option></select></label><label>Additional details (optional)<textarea name="detail" maxlength="1000" rows="3"></textarea></label><div class="dialog-actions"><button type="button" class="cancel-button">Cancel</button><button type="submit" class="publish-button">Send report</button></div></form>';
  document.body.append(reportDialog);
  reportDialog.querySelector('.cancel-button').addEventListener('click',()=>reportDialog.close());
  reportDialog.querySelector('form').addEventListener('submit',event=>{
    event.preventDefault();refreshModeration();const postId=reportDialog.dataset.post,card=cards().find(c=>cardId(c)===postId);
    if(!card)return;
    if(state.reports.some(r=>r.postId===postId&&r.status==='pending')){notify('This post is already awaiting review.');reportDialog.close();return;}
    const values=new FormData(event.target),report={id:`report-${Date.now()}`,postId,reason:values.get('reason')+(String(values.get('detail')).trim()?': '+String(values.get('detail')).trim():''),status:'pending',created:new Date().toISOString(),post:{id:postId,title:card.querySelector('h2')?.textContent||'Community post',body:card.querySelector('.post-body > p')?.textContent||'',author:card.querySelector('.post-author strong')?.textContent||'Member'}};
    state.reports.push(report);
    try { localStorage.setItem(storageKey,JSON.stringify(state));reportDialog.close();notify('Report sent to Admin for review.'); }
    catch { state.reports.pop();notify('The report could not be saved. Please try again.'); }
  });

  document.querySelector('#new-post').addEventListener('click', () => dialog.showModal());
  dialog.querySelectorAll('[data-close]').forEach(close => close.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const fields = new FormData(form);
    const post = { id: `local-${Date.now()}`, category: String(fields.get('category')), title: String(fields.get('title')).trim(), message: String(fields.get('message')).trim() };
    if (!post.title || !post.message) return;
    if (!queuePost(post)) return;
    feed.insertBefore(makePost(post), feed.firstChild);
    feed.firstChild.id = post.id;
    search.value = '';
    setFilter('all');
    form.reset(); dialog.close();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    notify('Your post was saved and is awaiting Admin approval.');
  });
  // Challenges: create one (posted to the feed under Challenges) or browse them.
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const showFeed = () => document.querySelector('#feed').scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' });
  const challengeDialog = document.querySelector('#challenge-dialog');
  const challengeForm = document.querySelector('#challenge-form');
  document.querySelectorAll('#create-challenge, #empty-create').forEach(trigger => trigger.addEventListener('click', () => challengeDialog.showModal()));
  challengeDialog.querySelectorAll('[data-close]').forEach(close => close.addEventListener('click', () => challengeDialog.close()));
  challengeDialog.addEventListener('click', event => { if (event.target === challengeDialog) challengeDialog.close(); });
  // Partner picker: one partner, or up to three for a small group.
  const picker = challengeForm.querySelector('.partner-picker');
  const whoSelect = challengeForm.querySelector('[name="who"]');
  const partnerBoxes = [...challengeForm.querySelectorAll('[name="partners"]')];
  const partnerLimit = () => (whoSelect.value === 'Small group' ? 3 : whoSelect.value === 'With a partner' ? 1 : 0);
  const syncPicker = () => {
    const limit = partnerLimit();
    picker.hidden = !limit;
    picker.querySelector('.partner-hint').textContent = limit === 1 ? 'Pick one partner.' : 'Pick up to three people.';
    const chosen = partnerBoxes.filter(box => box.checked);
    chosen.slice(limit).forEach(box => { box.checked = false; });
  };
  const errorLine = challengeForm.querySelector('.challenge-error');
  const formError = message => { errorLine.textContent = message; errorLine.hidden = !message; };
  whoSelect.addEventListener('change', () => { syncPicker(); formError(''); });
  challengeForm.addEventListener('change', event => { if (event.target.name === 'partners') formError(''); });
  partnerBoxes.forEach(box => box.addEventListener('change', () => {
    const limit = partnerLimit();
    if (!box.checked) return;
    const chosen = partnerBoxes.filter(other => other.checked && other !== box);
    if (limit === 1) chosen.forEach(other => { other.checked = false; });
    else if (chosen.length >= limit) box.checked = false;
  }));
  challengeForm.addEventListener('submit', event => {
    event.preventDefault();
    const fields = new FormData(challengeForm);
    const title = String(fields.get('title')).trim();
    const goal = String(fields.get('goal')).trim();
    if (!title || !goal) return;
    const who = String(fields.get('who'));
    const partners = fields.getAll('partners').map(String);
    if (partnerLimit() && !partners.length) { formError(who === 'Small group' ? 'Choose who joins your group.' : 'Choose your partner.'); picker.querySelector('input').focus(); return; }
    const names = partners.map(id => window.DeepSproutChallenges?.people[id]?.name).filter(Boolean);
    let challengeId = '';
    try { challengeId = window.DeepSproutChallenges?.add({ title, goal, days: fields.get('days'), who, partners }) || ''; }
    catch { formError('Your challenge could not be saved. Free some device storage and try again.'); return; }
    const post = { id: `local-${Date.now()}`, category: 'challenges', title, message: `${goal} · ${fields.get('days')}-day challenge · ${names.length ? `with ${names.join(', ')}` : who}`, challengeId };
    // The challenge itself is already saved; the feed post is a separate, moderated copy.
    if (queuePost(post)) {
      const card = makePost(post);
      card.id = post.id;
      feed.insertBefore(card, feed.firstChild);
      search.value = '';
      setFilter('challenges');
    } else if (!challengeId) return;
    challengeForm.reset(); syncPicker(); formError(''); challengeDialog.close();
    if (challengeId) window.DeepSproutChallenges.open(challengeId);
    else notify('Your challenge was saved and is awaiting Admin approval.');
  });
  document.querySelector('#explore-challenges').addEventListener('click', () => {
    search.value = '';
    setFilter('challenges');
    showFeed();
    notify('Showing challenges from the community.');
  });
  document.querySelectorAll('[data-info]').forEach(button => button.addEventListener('click', () => notify(`${button.dataset.info} information is coming soon.`)));
  applyFilters();
  window.addEventListener('storage',event=>{if(event.key===storageKey){refreshModeration();applyFilters();}});

  // Arriving from "Share" on the Garden: open the composer prefilled. The
  // person still decides whether to post — nothing is shared automatically.
  const shared = new URLSearchParams(location.search).get('share');
  if (shared) {
    form.querySelector('[name="category"]').value = 'wins';
    form.querySelector('[name="title"]').value = shared.slice(0, 100);
    form.querySelector('[name="message"]').value = '';
    dialog.showModal();
    form.querySelector('[name="message"]').focus();
  }
})();
