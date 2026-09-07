import { DEFAULT_FX_RATE, PAGE_SIZE } from './config.js';
import { api } from './services/api.js';
import { loadFavorites, loadPreferences, saveFavorites, savePreferences } from './services/storage.js';
import { createFormatter, escapeHtml } from './utils/format.js';
import { renderCards, renderMessage, renderSkeletons, renderSpotlight } from './ui/render.js';

const $ = (id) => document.getElementById(id);
const elements = Object.fromEntries([
  'grid', 'resultCount', 'resultSubtitle', 'storeSelect', 'sortSelect', 'searchInput',
  'minRating', 'minRatingVal', 'maxPrice', 'maxPriceVal', 'loadMoreWrap', 'loadMoreBtn',
  'statCount', 'statFree', 'statAvg', 'statFav', 'fxLine', 'curUSD', 'curEUR',
  'minRatingField', 'maxPriceField', 'favCount', 'modalOverlay', 'modal', 'spotlight'
  , 'resetFilters', 'toast'
].map((id) => [id, $(id)]));

const state = {
  ...loadPreferences(),
  page: 0,
  fxRate: DEFAULT_FX_RATE,
  stores: {},
  favorites: loadFavorites(),
  activeDeal: null,
  controller: null,
  format: createFormatter('USD', DEFAULT_FX_RATE)
};
let toastTimer;

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 2400);
}

function syncFavoriteStats() {
  elements.favCount.textContent = `(${state.favorites.size})`;
  elements.statFav.textContent = state.favorites.size;
}

function saveBrowserPreferences() {
  savePreferences({
    mode: state.mode,
    currency: state.currency,
    search: elements.searchInput.value,
    storeId: elements.storeSelect.value,
    sortBy: elements.sortSelect.value,
    minRating: elements.minRating.value,
    maxPrice: elements.maxPrice.value
  });
}

function toggleFavorite(deal) {
  const id = String(deal.gameID);
  state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.set(id, deal);
  saveFavorites(state.favorites);
  syncFavoriteStats();
  showToast(state.favorites.has(id) ? 'Offre ajoutée aux favoris' : 'Offre retirée des favoris');
  if (state.mode === 'favorites') runSearch();
}

function queryFor(page) {
  const params = {
    pageNumber: page,
    sortBy: elements.sortSelect.value,
    title: elements.searchInput.value.trim(),
    storeID: elements.storeSelect.value,
    upperPrice: state.mode === 'free' ? '0' : elements.maxPrice.value
  };
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value));
}

function hasCatalogSearch() {
  return elements.searchInput.value.trim().length > 0;
}

function normalizeGames(games) {
  return games.map((game) => ({
    ...game,
    title: game.external || game.internalName || 'Jeu sans titre',
    thumb: game.thumb || '',
    salePrice: game.cheapestPrice || game.cheapest || '',
    normalPrice: game.cheapestPrice || game.cheapest || '',
    savings: 0,
    steamRatingPercent: null,
    dealRating: null,
    isCatalogResult: true
  }));
}

function applyFilters(deals) {
  const minimum = Number(elements.minRating.value);
  return deals.filter((deal) => {
    if (deal.isCatalogResult) return true;
    if (state.mode === 'relevance' && minimum > 0 && Number(deal.steamRatingPercent || -1) < minimum) return false;
    return state.mode !== 'free' || Number(deal.savings) >= 99.4 || Number(deal.salePrice) === 0;
  });
}

function updateStats(deals) {
  elements.statCount.textContent = deals.length ? `${deals.length}+` : '0';
  elements.statFree.textContent = deals.filter((deal) => Number(deal.salePrice) === 0).length;
  elements.statAvg.textContent = deals.length
    ? `${Math.round(deals.reduce((total, deal) => total + Number(deal.savings), 0) / deals.length)}%`
    : '—';
}

async function runSearch(reset = true) {
  if (state.mode === 'favorites') {
    renderCards(elements.grid, [...state.favorites.values()], state);
    elements.resultCount.textContent = state.favorites.size;
    elements.loadMoreWrap.style.display = 'none';
    return;
  }
  if (reset) {
    state.page = 0;
    renderSkeletons(elements.grid);
    elements.loadMoreWrap.style.display = 'none';
  }
  state.controller?.abort();
  state.controller = new AbortController();
  try {
    const catalogSearch = hasCatalogSearch();
    const raw = catalogSearch
      ? normalizeGames(await api.getGames(elements.searchInput.value.trim(), state.controller.signal))
      : await api.getDeals(queryFor(state.page), state.controller.signal);
    const deals = applyFilters(raw);
    renderCards(elements.grid, deals, state, !reset);
    elements.resultCount.textContent = elements.grid.querySelectorAll('.card').length;
    elements.loadMoreWrap.style.display = catalogSearch ? 'none' : raw.length === PAGE_SIZE ? 'flex' : 'none';
    if (reset) {
      if (catalogSearch) {
        elements.statCount.textContent = `${deals.length}`;
        elements.statFree.textContent = '—';
        elements.statAvg.textContent = '—';
        elements.resultSubtitle.textContent = `Catalogue : ${deals.length} jeu(x) trouvé(s)`;
      } else {
        updateStats(raw);
        elements.resultSubtitle.textContent = state.mode === 'free' ? 'Mode : 100% gratuit' : 'Mode : pertinence';
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error(error);
    renderMessage(elements.grid, 'Oups', 'Le flux est indisponible pour le moment. Réessayez dans quelques instants.');
    elements.loadMoreWrap.style.display = 'none';
    elements.resultCount.textContent = '0';
  }
}

async function loadStores() {
  try {
    const stores = await api.getStores();
    stores.filter((store) => store.isActive === 1).forEach((store) => {
      state.stores[store.storeID] = store;
      elements.storeSelect.insertAdjacentHTML('beforeend', `<option value="${store.storeID}">${escapeHtml(store.storeName)}</option>`);
    });
  } catch (error) {
    console.warn('Les boutiques n’ont pas pu être chargées.', error);
  }
}

async function loadExchangeRate() {
  try {
    const data = await api.getExchangeRate();
    state.fxRate = Number(data.rates.EUR);
    elements.fxLine.textContent = `Taux USD→EUR : ${state.fxRate.toFixed(4)} (${data.date})`;
  } catch (error) {
    elements.fxLine.textContent = `Taux USD→EUR : ${state.fxRate.toFixed(2)} (secours hors-ligne)`;
  }
  state.format = createFormatter(state.currency, state.fxRate);
}

async function loadSpotlight() {
  try {
    const [deal] = await api.getDeals({ pageSize: 1, sortBy: 'Deal Rating' });
    renderSpotlight(elements.spotlight, deal, state);
  } catch (error) {
    elements.spotlight.querySelector('.spotlight-title').textContent = 'Offre indisponible';
  }
}

async function openModal(deal) {
  state.activeDeal = deal;
  elements.modalOverlay.classList.add('open');
  elements.modal.innerHTML = '<div class="empty-state"><span class="big">Comparaison…</span>Récupération des prix chez tous les marchands.</div>';
  try {
    const data = await api.getGame(deal.gameID);
    const deals = (data.deals || []).sort((a, b) => Number(a.price) - Number(b.price));
    const max = Math.max(...deals.map((item) => Number(item.price)), 1);
    const rows = deals.map((item, index) => {
      const store = state.stores[item.storeID];
      return `<div class="store-row ${index === 0 ? 'cheapest' : ''}"><span class="name">${escapeHtml(store?.storeName || `Boutique #${item.storeID}`)}</span><span class="bar-wrap"><span class="bar" style="width:${Math.max(6, Number(item.price) / max * 100)}%"></span></span><span class="amount">${state.format.price(item.price)}</span><a href="https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(item.dealID)}" target="_blank" rel="noopener">Voir →</a></div>`;
    }).join('');
    const historical = data.cheapestPriceEver;
    const favorite = state.favorites.has(String(deal.gameID));
    elements.modal.innerHTML = `<button class="modal-close" data-action="close" aria-label="Fermer">✕</button><h2 class="modal-title" id="modalTitle">${escapeHtml(data.info?.title || deal.title)}</h2><div class="modal-sub">${deals.length} boutique(s) comparée(s)</div>${historical ? `<div class="low-badge">Prix le plus bas historique : <b>${state.format.price(historical.price)}</b> (${new Date(historical.date * 1000).toLocaleDateString('fr-FR')})</div>` : ''}<div class="modal-section-label">Comparateur de prix</div>${rows || '<p class="modal-empty">Aucune donnée de comparaison disponible.</p>'}<button class="modal-fav ${favorite ? 'active' : ''}" data-action="modal-favorite">${favorite ? '★ Retirer des favoris' : '☆ Ajouter aux favoris'}</button>`;
    elements.modal.dataset.gameId = deal.gameID;
  } catch (error) {
    elements.modal.innerHTML = '<button class="modal-close" data-action="close" aria-label="Fermer">✕</button><div class="empty-state"><span class="big">Erreur</span>Impossible de charger le comparateur.</div>';
  }
}

function setMode(mode) {
  state.mode = mode;
  saveBrowserPreferences();
  document.querySelectorAll('.tab-btn').forEach((button) => button.classList.toggle('active', button.dataset.tab === mode));
  elements.resultSubtitle.textContent = { relevance: 'Mode : pertinence', free: 'Mode : 100% gratuit', favorites: 'Mode : mes favoris' }[mode];
  updateFilterVisibility();
  runSearch();
}

function updateFilterVisibility() {
  const catalogSearch = hasCatalogSearch();
  const favorites = state.mode === 'favorites';
  elements.minRatingField.hidden = favorites || state.mode !== 'relevance' || catalogSearch;
  elements.maxPriceField.hidden = favorites || state.mode !== 'relevance' || catalogSearch;
  elements.storeSelect.closest('.field').hidden = favorites || catalogSearch;
  elements.sortSelect.closest('.field').hidden = favorites || catalogSearch;
  elements.resetFilters.hidden = favorites || catalogSearch;
}

function setCurrency(currency) {
  state.currency = currency;
  saveBrowserPreferences();
  state.format = createFormatter(currency, state.fxRate);
  elements.curUSD.classList.toggle('active', currency === 'USD');
  elements.curEUR.classList.toggle('active', currency === 'EUR');
  elements.curUSD.setAttribute('aria-pressed', currency === 'USD');
  elements.curEUR.setAttribute('aria-pressed', currency === 'EUR');
  elements.maxPriceVal.textContent = `${elements.maxPrice.value}${currency === 'EUR' ? '€' : '$'}`;
  runSearch();
  loadSpotlight();
}

function resetFilters() {
  elements.searchInput.value = '';
  elements.storeSelect.value = '';
  elements.sortSelect.value = 'Deal Rating';
  elements.minRating.value = '0';
  elements.minRatingVal.textContent = '0%';
  elements.maxPrice.value = '60';
  elements.maxPriceVal.textContent = `${elements.maxPrice.value}${state.currency === 'EUR' ? '€' : '$'}`;
  saveBrowserPreferences();
  showToast('Filtres réinitialisés');
  runSearch();
}

elements.grid.addEventListener('click', (event) => {
  const card = event.target.closest('.card');
  const favoriteButton = event.target.closest('[data-action="favorite"]');
  if (!card) return;
  const deal = state.favorites.get(String(card.dataset.gameId)) || card.__deal;
  if (favoriteButton) return;
  if (deal) openModal(deal);
});
elements.grid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="favorite"]');
  if (!button) return;
  const card = button.closest('.card');
  const deal = card.__deal;
  if (deal) {
    toggleFavorite(deal);
    button.classList.toggle('active');
    button.setAttribute('aria-pressed', state.favorites.has(String(deal.gameID)));
  }
});
elements.modal.addEventListener('click', (event) => {
  if (event.target.closest('[data-action="close"]')) elements.modalOverlay.classList.remove('open');
  if (event.target.closest('[data-action="modal-favorite"]') && state.activeDeal) {
    toggleFavorite(state.activeDeal);
    const button = event.target.closest('[data-action="modal-favorite"]');
    const favorite = state.favorites.has(String(state.activeDeal.gameID));
    button.classList.toggle('active', favorite);
    button.textContent = favorite ? '★ Retirer des favoris' : '☆ Ajouter aux favoris';
  }
});
elements.modalOverlay.addEventListener('click', (event) => { if (event.target === elements.modalOverlay) elements.modalOverlay.classList.remove('open'); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') elements.modalOverlay.classList.remove('open'); });
document.querySelectorAll('.tab-btn').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.tab)));
elements.curUSD.addEventListener('click', () => setCurrency('USD'));
elements.curEUR.addEventListener('click', () => setCurrency('EUR'));
elements.storeSelect.addEventListener('change', () => { saveBrowserPreferences(); runSearch(); });
elements.sortSelect.addEventListener('change', () => { saveBrowserPreferences(); runSearch(); });
elements.minRating.addEventListener('input', () => { elements.minRatingVal.textContent = `${elements.minRating.value}%`; });
elements.minRating.addEventListener('change', () => { saveBrowserPreferences(); runSearch(); });
elements.maxPrice.addEventListener('input', () => { elements.maxPriceVal.textContent = `${elements.maxPrice.value}${state.currency === 'EUR' ? '€' : '$'}`; });
elements.maxPrice.addEventListener('change', () => { saveBrowserPreferences(); runSearch(); });
let searchTimer;
elements.searchInput.addEventListener('input', () => {
  updateFilterVisibility();
  saveBrowserPreferences();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(), 350);
});
elements.loadMoreBtn.addEventListener('click', () => { state.page += 1; runSearch(false); });
elements.resetFilters.addEventListener('click', resetFilters);

async function init() {
  elements.searchInput.value = state.search;
  elements.sortSelect.value = state.sortBy;
  elements.minRating.value = state.minRating;
  elements.minRatingVal.textContent = `${state.minRating}%`;
  elements.maxPrice.value = state.maxPrice;
  elements.maxPriceVal.textContent = `${state.maxPrice}${state.currency === 'EUR' ? '€' : '$'}`;
  setCurrency(state.currency);
  syncFavoriteStats();
  renderSkeletons(elements.grid);
  await Promise.all([loadStores(), loadExchangeRate()]);
  elements.storeSelect.value = state.storeId;
  document.querySelectorAll('.tab-btn').forEach((button) => button.classList.toggle('active', button.dataset.tab === state.mode));
  elements.resultSubtitle.textContent = { relevance: 'Mode : pertinence', free: 'Mode : 100% gratuit', favorites: 'Mode : mes favoris' }[state.mode];
  updateFilterVisibility();
  saveBrowserPreferences();
  await Promise.all([runSearch(), loadSpotlight()]);
}

init();
