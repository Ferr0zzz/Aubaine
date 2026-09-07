import { FAVORITES_KEY } from '../config.js';

export function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Map(Array.isArray(saved) ? saved.map((deal) => [String(deal.gameID), deal]) : []);
  } catch (error) {
    console.warn('Impossible de charger les favoris sauvegardés.', error);
    return new Map();
  }
}

export function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites.values()]));
}
