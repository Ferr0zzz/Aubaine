import { FAVORITES_KEY, PREFERENCES_KEY } from '../config.js';

const DEFAULT_PREFERENCES = {
  mode: 'relevance',
  currency: 'USD',
  search: '',
  storeId: '',
  sortBy: 'Deal Rating',
  minRating: '0',
  maxPrice: '60'
};

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
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites.values()]));
  } catch (error) {
    console.warn('Impossible de sauvegarder les favoris.', error);
  }
}

export function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}');
    const preferences = { ...DEFAULT_PREFERENCES, ...(saved && typeof saved === 'object' ? saved : {}) };
    return {
      ...preferences,
      mode: ['relevance', 'free', 'favorites'].includes(preferences.mode) ? preferences.mode : DEFAULT_PREFERENCES.mode,
      currency: ['USD', 'EUR'].includes(preferences.currency) ? preferences.currency : DEFAULT_PREFERENCES.currency
    };
  } catch (error) {
    console.warn('Impossible de charger les préférences sauvegardées.', error);
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences) {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Impossible de sauvegarder les préférences.', error);
  }
}
