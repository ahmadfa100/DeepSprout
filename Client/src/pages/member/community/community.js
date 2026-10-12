(() => {
  const feed = document.querySelector('#feed');
  const search = document.querySelector('#post-search');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const topics = [...document.querySelectorAll('[data-topic]')];
  const empty = document.querySelector('#empty-state');
  const dialog = document.querySelector('#compose-dialog');
  const form = document.querySelector('#compose-form');
  const toast = document.querySelector('#toast');
  const storageKey = 'deepsprout-community-demo-v1';
  let state = { posts: [], liked: {}, saved: {}, joined: false };
  let activeFilter = 'all';
  let activeTopic = '';
  let toastTimer;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    state = { ...state, ...saved };
    if (!Array.isArray(state.posts)) state.posts = [];
  } catch { /* The demo still works when storage is unavailable. */ }
  const persist = () => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {} };
  const notify = message => {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  };
  const cards = () => [...feed.querySelectorAll('.post-card')];
  const cardId = card => card.dataset.id || [...cards()].indexOf(card).toString();
  const applyFilters = () => {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    cards().forEach(card => {
      const categoryMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
      const topicMatch = !activeTopic || (card.dataset.topics || '').split(' ').includes(activeTopic);
      const textMatch = !query || `${card.dataset.search || ''} ${card.textContent}`.toLowerCase().includes(query);
      card.hidden = !(categoryMatch && topicMatch && textMatch);
      if (!card.hidden) shown++;
    });
    empty.hidden = shown > 0;
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
  topics.forEach(button => button.addEventListener('click', () => {
    activeTopic = activeTopic === button.dataset.topic ? '' : button.dataset.topic;
    topics.forEach(item => item.classList.toggle('selected', item.dataset.topic === activeTopic));
    applyFilters();
    document.querySelector('#feed').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
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
      popover.innerHTML = '<button type="button" data-action="copy">Copy post link</button><button type="button" data-action="hide">Hide for now</button>';
      card.append(popover);
    } else if (target.dataset.action === 'copy') {
      const link = `${location.href.split('#')[0]}#${id}`;
      navigator.clipboard?.writeText(link).then(() => notify('Post link copied.')).catch(() => notify('Copy is unavailable in this browser.'));
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

  document.querySelector('#new-post').addEventListener('click', () => dialog.showModal());
  dialog.querySelectorAll('[data-close]').forEach(close => close.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const fields = new FormData(form);
    const post = { id: `local-${Date.now()}`, category: String(fields.get('category')), title: String(fields.get('title')).trim(), message: String(fields.get('message')).trim() };
    if (!post.title || !post.message) return;
    state.posts.push(post); persist();
    feed.insertBefore(makePost(post), feed.firstChild);
    feed.firstChild.id = post.id;
    search.value = '';
    activeTopic = '';
    topics.forEach(item => item.classList.remove('selected'));
    setFilter('all');
    form.reset(); dialog.close();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    notify('Your post was added on this device.');
  });
  const join = document.querySelector('#join-challenge');
  const refreshChallenge = () => { join.textContent = state.joined ? 'Joined ✓' : 'Join Challenge'; join.classList.toggle('joined', !!state.joined); join.setAttribute('aria-pressed', String(!!state.joined)); };
  join.addEventListener('click', () => { state.joined = !state.joined; persist(); refreshChallenge(); notify(state.joined ? 'You joined the reading challenge!' : 'You left the reading challenge.'); });
  refreshChallenge();
  document.querySelectorAll('.see-all').forEach(button => button.addEventListener('click', () => {
    const detail = button.closest('.side-panel').querySelector('.panel-detail');
    detail.hidden = !detail.hidden;
    button.setAttribute('aria-expanded', String(!detail.hidden));
  }));
  document.querySelectorAll('[data-info]').forEach(button => button.addEventListener('click', () => notify(`${button.dataset.info} information is coming soon.`)));
  applyFilters();
})();
