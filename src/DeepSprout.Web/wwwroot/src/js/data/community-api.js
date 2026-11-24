export async function communityRequest(path, method = 'GET', body) {
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') {
    const session = await fetch('/account/session', { cache: 'no-store', redirect: 'manual' });
    if (!session.ok) throw new Error('Sign in again to continue.');
    const { requestToken } = await session.json();
    headers.RequestVerificationToken = requestToken;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
  }
  const response = await fetch('/api/community' + path, {
    cache: 'no-store', method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    const detail = response.status < 500 && response.headers.get('content-type')?.includes('text/plain')
      ? await response.text() : '';
    const message = {401:'Sign in again to continue.', 403:'Platform Admin access is required.',
      404:'This content is no longer available.', 409:'This content has changed. Refresh and try again.'};
    const error = new Error(detail || message[response.status] || 'Community could not complete this request. Try again.');
    error.status = response.status;
    throw error;
  }
  return response.headers.get('content-type')?.includes('application/json') ? response.json() : null;
}
