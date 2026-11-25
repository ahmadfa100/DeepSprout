export async function workspaceRequest(path, payload, method = payload === undefined ? 'GET' : 'POST') {
  const headers = {Accept:'application/json'};
  if (payload !== undefined) {
    const session = await fetch('/account/session',{cache:'no-store',redirect:'manual'});
    if (!session.ok) throw new Error('Sign in again to continue.');
    headers.RequestVerificationToken = (await session.json()).requestToken;
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(path,{cache:'no-store',headers,method,
    body:payload === undefined ? undefined : JSON.stringify(payload)});
  if (response.ok) return response.json();
  if (response.status === 401) throw new Error('Sign in again to continue.');
  if (response.status === 404) throw new Error('This record or Initiative is unavailable to your account.');
  const type = response.headers.get('content-type') || '';
  if (response.status < 500 && type.includes('text/plain')) throw new Error(await response.text());
  if (response.status < 500 && type.includes('json')) {
    const problem = await response.json();
    if (typeof problem === 'string') throw new Error(problem);
    if (problem.errors) throw new Error(Object.values(problem.errors).flat().join(' '));
  }
  throw new Error('The record could not be loaded or saved. Try again.');
}
