import { communityRequest } from '../../../js/data/community-api.js';

(() => {
  const feed = document.querySelector('#feed');
  const search = document.querySelector('#post-search');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const empty = document.querySelector('#empty-state');
  const dialog = document.querySelector('#compose-dialog');
  const form = document.querySelector('#compose-form');
  const toast = document.querySelector('#toast');
  const live = document.body.dataset.communityMode === 'server';
  const morePosts = document.querySelector('#load-posts');
  const newPost = document.querySelector('#new-post');
  const postStatus = {Draft:'Awaiting approval', Hidden:'Hidden by moderation', Removed:'Removed'};
  const postPath = id => '/posts/' + encodeURIComponent(id);
  const hiddenThisVisit = new Set();
  const posts = new Map();
  let nextPage, loading = false, feedError = '', generation = 0, searchTimer, editing;
  if (live) {
    document.querySelector('[data-filter="mine"]').hidden = false;
    form.querySelector('.dialog-note').textContent = 'Your post appears in the Community feed after Admin approval.';
  } else {
    feed.prepend(document.querySelector('#demo-posts').content.cloneNode(true));
  }
  const storageKey = 'deepsprout-community-demo-v1';
  let state = { posts: [], liked: {}, saved: {}, reports: [], moderation: {} };
  let activeFilter = 'all';
  let toastTimer;

  try {
    if (!live) {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      state = { ...state, ...saved };
      if (!Array.isArray(state.posts)) state.posts = [];
      // Retire the demo check-in posts. Quiz rooms use a different key.
      const currentPosts = state.posts.filter(post => post.category !== 'challenges' && !post.challengeId);
      if (currentPosts.length !== state.posts.length) {
        state.posts = currentPosts;
        localStorage.setItem(storageKey, JSON.stringify(state));
      }
    }
    localStorage.removeItem('deepsprout-community-challenges-v1');
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
  const cards = () => [...feed.querySelectorAll('.post-card, .challenge-room-card')];
  const cardId = card => card.dataset.id || [...cards()].indexOf(card).toString();
  const applyFilters = () => {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    cards().forEach(card => {
      if (live && card.matches('.post-card')) {
        card.hidden = activeFilter === 'challenges' || hiddenThisVisit.has(cardId(card));
        if (!card.hidden) shown++;
        return;
      }
      const categoryMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
      const textMatch = !query || `${card.dataset.search || ''} ${card.textContent}`.toLowerCase().includes(query);
      card.hidden = ['hidden','pending','removed','rejected'].includes(state.moderation?.[cardId(card)]) || !(categoryMatch && textMatch);
      if (!card.hidden) shown++;
    });
    empty.hidden = shown > 0 && !(live && feedError && activeFilter !== 'challenges');
    // Say plainly when a category is empty rather than implying a search miss.
    const noChallenges = activeFilter === 'challenges' && !query;
    document.querySelector('#empty-text').textContent = live && loading ? 'Loading posts…'
      : live && feedError && activeFilter !== 'challenges' ? feedError
      : noChallenges ? 'No challenge rooms yet. Create one and a second player can join here.'
      : activeFilter === 'mine' && !query ? 'Your posts will appear here, including posts awaiting approval.'
      : 'No posts match your search yet. Try another category.';
    document.querySelector('#empty-create').hidden = !noChallenges;
    morePosts.hidden = !live || activeFilter === 'challenges' || (!nextPage && !feedError);
    morePosts.textContent = feedError ? 'Try again' : 'Load more posts';
    morePosts.disabled = loading;
  };
  const setFilter = filter => {
    activeFilter = filter;
    filters.forEach(button => {
      const selected = button.dataset.filter === filter;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    if (live) loadPosts();
    else applyFilters();
  };
  filters.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
  search.addEventListener('input', () => {
    if (!live || activeFilter === 'challenges') return applyFilters();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadPosts(), 250);
  });

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
    card.id = post.id;
    card.dataset.search = `${post.title} ${post.message} You ${post.category}`.toLowerCase();
    const avatar = document.createElement('img');
    avatar.className = 'post-avatar';
    avatar.src = live ? '../../../../assets/brand/floral-mark.png' : '../../../../assets/community/avatar-sara.png';
    avatar.alt = '';
    const author = document.createElement('div');
    author.className = 'post-author';
    const name = document.createElement('strong'); name.textContent = live ? post.author : 'You';
    const time = document.createElement('time'); time.textContent = 'Just now';
    if (live) {
      time.dateTime = post.publishedAt || post.createdAt;
      time.textContent = new Date(time.dateTime).toLocaleDateString(undefined, {dateStyle:'medium'});
    }
    author.append(name, time);
    const body = document.createElement('div'); body.className = 'post-body';
    const badge = document.createElement('span');
    badge.className = `post-badge ${post.category}`;
    badge.textContent = ({progress:'✓ Progress',tips:'! Tips & Resources',questions:'? Questions',challenges:'★ Challenges',wins:'★ Wins'})[post.category] || 'Progress';
    const title = document.createElement('h2'); title.textContent = post.title;
    const message = document.createElement('p'); message.textContent = post.message;
    const actions = document.createElement('div'); actions.className = 'post-actions';
    if (!live || post.status === 'Published') {
      actions.append(button('like-button', 'Like post', 'heart', post.likes ?? 0),
        button('comment-button', 'Show comments', 'comment', post.comments ?? 0), button('save-button', 'Save post', 'bookmark'));
      if (live) {
        actions.querySelector('.like-button').setAttribute('aria-pressed', String(post.liked));
        actions.querySelector('.save-button').setAttribute('aria-pressed', String(post.saved));
      }
    } else {
      const status = document.createElement('span');
      status.textContent = postStatus[post.status];
      actions.append(status);
    }
    body.append(badge, title, message, actions);
    const art = document.createElement('img');
    art.className = 'post-image'; art.src = '../../../../assets/community/post-win.png'; art.alt = 'A sprout in a sunset landscape';
    const more = document.createElement('button'); more.className = 'post-more'; more.type = 'button'; more.textContent = '•••'; more.setAttribute('aria-label', 'More options for post');
    const comments = document.createElement('div'); comments.className = 'post-comments'; comments.hidden = true;
    const heading = document.createElement('strong'); heading.textContent = 'Conversation';
    const text = document.createElement('p'); text.textContent = 'Be the first to add encouragement.';
    const commentForm = document.createElement('form'); commentForm.className = 'comment-form';
    const input = document.createElement('input'); input.placeholder = 'Add some encouragement...'; input.setAttribute('aria-label', 'Write a comment');
    input.maxLength = 2000;
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = 'Post';
    commentForm.append(input, submit); comments.append(heading, text, commentForm);
    card.append(avatar, author, body, art, more, comments);
    return card;
  };
  const addPost = post => {
    if (posts.has(post.id)) return;
    posts.set(post.id, post);
    feed.insertBefore(makePost(post), empty);
  };
  const loadPosts = async ({append = false, openLink = false} = {}) => {
    clearTimeout(searchTimer);
    const version = ++generation;
    if (!append) {
      feed.querySelectorAll('.post-card').forEach(card => card.remove());
      posts.clear();
      nextPage = null;
    }
    feedError = '';
    if (activeFilter === 'challenges') { loading = false; applyFilters(); return; }
    loading = true;
    applyFilters();
    const query = new URLSearchParams({ search: search.value.trim() });
    if (activeFilter === 'mine') query.set('mine', 'true');
    else if (activeFilter !== 'all') query.set('category', activeFilter);
    if (append && nextPage) for (const [key, value] of Object.entries(nextPage)) query.set(key, value);
    try {
      const page = await communityRequest('/posts?' + query);
      if (version !== generation) return;
      const linked = openLink && /^[a-f0-9-]{36}$/i.test(location.hash.slice(1)) ? location.hash.slice(1) : '';
      if (linked && !page.posts.some(post => post.id === linked)) {
        try {
          const post = await communityRequest(postPath(linked));
          if (version !== generation) return;
          addPost(post);
        } catch (error) {
          if (version !== generation) return;
          notify(error.message);
        }
      }
      page.posts.forEach(addPost);
      nextPage = page.next;
      if (linked) document.getElementById(linked)?.scrollIntoView({block:'start'});
    } catch (error) {
      if (version !== generation) return;
      feedError = error.message;
    } finally {
      if (version === generation) { loading = false; applyFilters(); }
    }
  };
  morePosts.addEventListener('click', () => loadPosts({append: !!nextPage}));
  search.maxLength = 100;
  state.posts.slice().reverse().forEach(post => feed.insertBefore(makePost(post), feed.firstChild));
  feed.querySelectorAll('.post-card').forEach(card => {
    const id = cardId(card);
    card.id = id;
    card.querySelector('.like-button')?.setAttribute('aria-pressed', String(!!state.liked[id]));
    card.querySelector('.save-button')?.setAttribute('aria-pressed', String(!!state.saved[id]));
    if (state.liked[id]) {
      const count = card.querySelector('.like-button span');
      count.textContent = String(Number(count.textContent) + 1);
    }
  });

  feed.addEventListener('click', async event => {
    const target = event.target.closest('button');
    const card = target?.closest('.post-card');
    if (!card) return;
    const id = cardId(card);
    if (live) {
      await usingButton(target, () => liveAction(target, card, posts.get(id)));
      return;
    }
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
  feed.addEventListener('submit', async event => {
    if (!event.target.matches('.comment-form')) return;
    event.preventDefault();
    const input = event.target.querySelector('input');
    const message = input.value.trim();
    if (!message) return;
    if (live) {
      const card = event.target.closest('.post-card');
      await usingButton(event.submitter || event.target.querySelector('button[type=submit]'), async () => {
        const body = withRequestId(event.target, {body:message});
        await communityRequest(postPath(card.id) + '/comments', 'POST', body);
        delete event.target.dataset.requestId;
        input.value = '';
        await loadComments(card);
        const updated = await communityRequest(postPath(card.id));
        card.querySelector('.comment-button span').textContent = updated.comments;
        notify('Comment added.');
      });
      return;
    }
    const line = document.createElement('p');
    line.textContent = `You: ${message}`;
    event.target.before(line);
    const count = event.target.closest('.post-card').querySelector('.comment-button span');
    count.textContent = String(Number(count.textContent) + 1);
    input.value = '';
    notify('Comment added for this visit.');
  });

  async function usingButton(control, work, errorLine) {
    if (control.disabled) return;
    control.disabled = true;
    if (errorLine) errorLine.textContent = '';
    try { await work(); }
    catch (error) {
      if (errorLine) errorLine.textContent = error.message;
      else notify(error.message);
      if (error.status === 404) await loadPosts();
    } finally { control.disabled = false; }
  }

  function withRequestId(form, data) {
    const signature = JSON.stringify(data);
    if (form.dataset.requestBody !== signature || !form.dataset.requestId) {
      form.dataset.requestBody = signature;
      form.dataset.requestId = crypto.randomUUID();
    }
    return {...data, requestId: form.dataset.requestId};
  }

  async function loadComments(card, after = 0) {
    const panel = card.querySelector('.post-comments');
    const { comments, next } = await communityRequest(postPath(card.id) + '/comments?after=' + after);
    if (!after) panel.querySelectorAll('p, [data-more-comments]').forEach(line => line.remove());
    const commentForm = panel.querySelector('form');
    for (const comment of comments) {
      const line = document.createElement('p');
      line.textContent = comment.author + ': ' + comment.body;
      if (!comment.own) {
        const report = document.createElement('button');
        report.type = 'button';
        report.className = 'cancel-button';
        report.dataset.action = 'report-comment';
        report.dataset.comment = comment.id;
        report.textContent = 'Report';
        line.append(' ', report);
      }
      commentForm.before(line);
    }
    if (next) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'cancel-button';
      more.dataset.moreComments = next;
      more.textContent = 'Load more comments';
      commentForm.before(more);
    }
  }

  async function liveAction(target, card, post) {
    if (!post) return;
    const path = postPath(post.id);
    if (target.matches('.like-button, .save-button')) {
      const kind = target.matches('.like-button') ? 'like' : 'bookmark';
      const apply = target.getAttribute('aria-pressed') !== 'true';
      await communityRequest(path + '/interactions/' + kind, apply ? 'PUT' : 'DELETE');
      const updated = await communityRequest(path);
      if (updated.status !== 'Published') return loadPosts();
      posts.set(updated.id, updated);
      card.querySelector('.like-button').setAttribute('aria-pressed', String(updated.liked));
      card.querySelector('.like-button span').textContent = updated.likes;
      card.querySelector('.save-button').setAttribute('aria-pressed', String(updated.saved));
      if (kind === 'bookmark') notify(updated.saved ? 'Post saved.' : 'Post removed from saved items.');
      return;
    }
    if (target.matches('.comment-button')) {
      const panel = card.querySelector('.post-comments');
      if (panel.hidden) {
        await loadComments(card);
        panel.hidden = false;
        panel.querySelector('input').focus();
      } else panel.hidden = true;
      return;
    }
    if (target.dataset.moreComments) {
      await loadComments(card, target.dataset.moreComments);
      target.remove();
      return;
    }
    if (target.matches('.post-more')) {
      const open = card.querySelector('.post-menu');
      document.querySelectorAll('.post-menu').forEach(menu => menu.remove());
      if (open) return;
      const menu = document.createElement('div');
      menu.className = 'post-menu';
      const actions = [['copy','Copy post link'], ['hide','Hide for now']];
      if (!post.own) actions.push(['report','Report to moderation']);
      if (post.canEdit) actions.push(['edit','Edit post']);
      if (post.canDelete) actions.push(['delete','Delete post']);
      for (const [action, label] of actions) {
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.action = action; button.textContent = label;
        menu.append(button);
      }
      card.append(menu);
      return;
    }
    target.closest('.post-menu')?.remove();
    switch (target.dataset.action) {
      case 'copy':
        if (!navigator.clipboard) throw new Error('Copy is unavailable in this browser.');
        await navigator.clipboard.writeText(location.href.split('#')[0] + '#' + post.id);
        notify('Post link copied.');
        break;
      case 'hide':
        hiddenThisVisit.add(post.id);
        applyFilters();
        notify('Post hidden for this visit.');
        break;
      case 'report':
      case 'report-comment':
        openReport(post.id, target.dataset.comment);
        break;
      case 'edit':
        openComposer(post);
        break;
      case 'delete':
        if (!window.confirm('Delete this post? It will be removed from the feed.')) break;
        await communityRequest(path, 'DELETE');
        notify('Post deleted.');
        await loadPosts();
        break;
    }
  }

  const reportDialog=document.createElement('dialog');
  reportDialog.id='report-dialog';reportDialog.setAttribute('aria-labelledby','report-title');
  reportDialog.innerHTML='<form><h2 id="report-title">Report this post</h2><p>Tell the Admin what needs reviewing.</p><label>Reason<select name="reason" required><option value="Spam or advertising">Spam or advertising</option><option value="Harassment or abuse">Harassment or abuse</option><option value="Harmful or misleading content">Harmful or misleading content</option><option value="Privacy concern">Privacy concern</option><option value="Other concern">Other concern</option></select></label><label>Additional details (optional)<textarea name="detail" maxlength="1000" rows="3"></textarea></label><div class="dialog-actions"><button type="button" class="cancel-button">Cancel</button><button type="submit" class="publish-button">Send report</button></div></form>';
  document.body.append(reportDialog);
  const reportForm = reportDialog.querySelector('form');
  const reportError = document.createElement('p');
  reportError.setAttribute('role', 'alert');
  if (live) reportForm.append(reportError);
  function openReport(postId, commentId) {
    reportDialog.dataset.post = postId;
    reportDialog.dataset.comment = commentId || '';
    reportDialog.querySelector('#report-title').textContent = commentId ? 'Report this comment' : 'Report this post';
    reportForm.reset();
    reportError.textContent = '';
    reportDialog.showModal();
  }
  reportDialog.querySelector('.cancel-button').addEventListener('click',()=>reportDialog.close());
  reportForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if (live) {
      const { post, comment } = reportDialog.dataset;
      const values = new FormData(reportForm);
      await usingButton(reportForm.querySelector('[type=submit]'), async () => {
        await communityRequest((comment ? '/comments/' + encodeURIComponent(comment) : postPath(post)) + '/reports',
          'POST', {reason:values.get('reason'), details:values.get('detail')});
        reportDialog.close();
        notify('Report sent to Admin for review.');
      }, reportError);
      return;
    }
    refreshModeration();const postId=reportDialog.dataset.post,card=cards().find(c=>cardId(c)===postId);
    if(!card)return;
    if(state.reports.some(r=>r.postId===postId&&r.status==='pending')){notify('This post is already awaiting review.');reportDialog.close();return;}
    const values=new FormData(event.target),report={id:`report-${Date.now()}`,postId,reason:values.get('reason')+(String(values.get('detail')).trim()?': '+String(values.get('detail')).trim():''),status:'pending',created:new Date().toISOString(),post:{id:postId,title:card.querySelector('h2')?.textContent||'Community post',body:card.querySelector('.post-body > p')?.textContent||'',author:card.querySelector('.post-author strong')?.textContent||'Member'}};
    state.reports.push(report);
    try { localStorage.setItem(storageKey,JSON.stringify(state));reportDialog.close();notify('Report sent to Admin for review.'); }
    catch { state.reports.pop();notify('The report could not be saved. Please try again.'); }
  });

  const composeError = document.createElement('p');
  composeError.setAttribute('role', 'alert');
  if (live) form.append(composeError);
  function openComposer(post) {
    editing = post?.id;
    form.reset();
    delete form.dataset.requestId;
    composeError.textContent = '';
    dialog.querySelector('#compose-title').textContent = post ? 'Edit your post' : 'Share with the community';
    form.querySelector('button[type=submit]').textContent = post ? 'Save changes' : 'Share post';
    if (post) {
      form.elements.category.value = post.category;
      form.elements.title.value = post.title;
      form.elements.message.value = post.message;
    }
    dialog.showModal();
  }
  newPost.addEventListener('click', () => live ? openComposer() : dialog.showModal());
  dialog.querySelectorAll('[data-close]').forEach(close => close.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const fields = new FormData(form);
    if (live) {
      const data = {category:fields.get('category'), title:String(fields.get('title')).trim(),
        message:String(fields.get('message')).trim()};
      await usingButton(form.querySelector('[type=submit]'), async () => {
        await communityRequest(editing ? postPath(editing) : '/posts', editing ? 'PATCH' : 'POST',
          editing ? data : withRequestId(form, data));
        form.reset();
        delete form.dataset.requestId;
        dialog.close();
        search.value = '';
        setFilter('mine');
        notify('Your post was saved and is awaiting Admin approval.');
      }, composeError);
      return;
    }
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
  // A room is discoverable from the Challenges filter; it is not a moderated post.
  const challengeDialog = document.querySelector('#challenge-dialog');
  const challengeForm = document.querySelector('#challenge-form');
  const dateField = challengeForm.querySelector('[name="date"]');
  const timeField = challengeForm.querySelector('[name="time"]');
  const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  document.querySelectorAll('#create-challenge, #empty-create').forEach(trigger => trigger.addEventListener('click', () => {
    const suggested = new Date(Date.now() + 86400000);
    suggested.setMinutes(0, 0, 0);
    dateField.min = localDate(new Date());
    if (!dateField.value) dateField.value = localDate(suggested);
    if (!timeField.value) timeField.value = `${String(suggested.getHours()).padStart(2, '0')}:00`;
    challengeDialog.showModal();
    challengeForm.querySelector('[name="title"]').focus();
  }));
  challengeDialog.querySelectorAll('[data-close]').forEach(close => close.addEventListener('click', () => challengeDialog.close()));
  challengeDialog.addEventListener('click', event => { if (event.target === challengeDialog) challengeDialog.close(); });
  const errorLine = challengeForm.querySelector('.challenge-error');
  const formError = message => { errorLine.textContent = message; errorLine.hidden = !message; };
  challengeForm.addEventListener('input', () => formError(''));
  challengeForm.addEventListener('submit', event => {
    event.preventDefault();
    const fields = new FormData(challengeForm);
    const title = String(fields.get('title')).trim();
    const startAt = new Date(`${fields.get('date')}T${fields.get('time')}`);
    if (!title || Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) { formError('Choose a start date and time in the future.'); return; }
    let challengeId;
    try { challengeId = window.DeepSproutChallenges.add({ title, startAt }); }
    catch (error) { formError(error.message || 'Your room could not be saved. Check browser storage and try again.'); return; }
    challengeForm.reset(); formError(''); challengeDialog.close();
    search.value = '';
    setFilter('challenges');
    window.DeepSproutChallenges.open(challengeId);
  });
  window.addEventListener('deepsprout:challenge-change', applyFilters);
  window.addEventListener('deepsprout:challenge-joined', event => notify(`Both players are in. ${event.detail.title} starts ${window.DeepSproutChallenges.formatStart(event.detail.startAt)}.`));
  document.querySelectorAll('[data-info]').forEach(button => button.addEventListener('click', () => notify(`${button.dataset.info} information is coming soon.`)));
  if (live) {
    loadPosts({openLink:true});
    window.addEventListener('pageshow', event => { if (event.persisted) loadPosts({openLink:true}); });
  } else {
    applyFilters();
    window.addEventListener('storage',event=>{if(event.key===storageKey){refreshModeration();applyFilters();}});
  }

  // Arriving from "Share" on the Garden: open the composer prefilled. The
  // person still decides whether to post — nothing is shared automatically.
  const shared = new URLSearchParams(location.search).get('share');
  if (shared) {
    if (live) openComposer();
    form.querySelector('[name="category"]').value = 'wins';
    form.querySelector('[name="title"]').value = shared.slice(0, 100);
    form.querySelector('[name="message"]').value = '';
    if (!live) dialog.showModal();
    form.querySelector('[name="message"]').focus();
  }
})();
