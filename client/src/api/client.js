const BASE = '/api';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getMe: () => req('/me'),
  getGroups: () => req('/groups'),
  getFriends: () => req('/friends'),
  previewExpense: (body) => req('/expenses/preview', { method: 'POST', body: JSON.stringify(body) }),
  createExpense: (body) => req('/expenses', { method: 'POST', body: JSON.stringify(body) }),
};
