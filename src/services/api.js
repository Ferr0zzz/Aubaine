import { API_BASE, FX_API, PAGE_SIZE } from '../config.js';

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.json();
}

export const api = {
  getStores: () => request(`${API_BASE}/stores`),
  getExchangeRate: () => request(FX_API),
  getDeals: (params, signal) => {
    const query = new URLSearchParams({
      pageSize: PAGE_SIZE,
      pageNumber: 0,
      sortBy: 'Deal Rating',
      desc: '1',
      onSale: '1',
      ...params
    });
    return request(`${API_BASE}/deals?${query}`, { signal });
  },
  getGames: (title, signal) => request(
    `${API_BASE}/games?title=${encodeURIComponent(title)}`,
    { signal }
  ),
  getGame: (gameId, signal) => request(`${API_BASE}/games?id=${encodeURIComponent(gameId)}`, { signal })
};
