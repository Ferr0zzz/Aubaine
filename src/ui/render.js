import { escapeHtml, ratingColor } from '../utils/format.js';

export function renderSkeletons(grid, count = 9) {
  grid.innerHTML = Array.from({ length: count }, () =>
    '<div class="skeleton"><div class="thumb-wrap"></div><div class="line" style="width:80%"></div><div class="line" style="width:50%"></div></div>'
  ).join('');
  grid.setAttribute('aria-busy', 'true');
}

export function renderMessage(grid, title, message) {
  grid.innerHTML = `<div class="empty-state"><span class="big">${escapeHtml(title)}</span>${escapeHtml(message)}</div>`;
  grid.setAttribute('aria-busy', 'false');
}

export function renderCards(grid, deals, state, append = false) {
  if (!append) grid.innerHTML = '';
  if (!deals.length && !append) {
    renderMessage(grid, state.mode === 'favorites' ? 'Aucun favori' : 'Rayon vide',
      state.mode === 'favorites' ? "Cliquez sur l'étoile d'un jeu pour l'ajouter ici." : 'Aucune offre ne correspond à ces filtres.');
    return;
  }
  deals.forEach((deal) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.gameId = deal.gameID;
    card.__deal = deal;
    card.innerHTML = cardTemplate(deal, state);
    grid.appendChild(card);
  });
  grid.setAttribute('aria-busy', 'false');
}

function cardTemplate(deal, state) {
  const store = state.stores[deal.storeID];
  const savings = Math.round(Number(deal.savings));
  const catalogResult = deal.isCatalogResult;
  const free = !catalogResult && Number(deal.salePrice) === 0;
  const score = deal.steamRatingPercent ? Number.parseInt(deal.steamRatingPercent, 10) : null;
  const favorite = state.favorites.has(String(deal.gameID));
  return `<div class="thumb-wrap">
    <img src="${escapeHtml(deal.thumb)}" alt="${escapeHtml(deal.title)}" loading="lazy">
    <div class="badge-discount ${free || catalogResult ? 'free' : ''}">${catalogResult ? 'JEU' : free ? 'GRATUIT' : `-${savings}%`}</div>
    <button class="fav-btn ${favorite ? 'active' : ''}" data-action="favorite" aria-label="${favorite ? 'Retirer' : 'Ajouter'} ${escapeHtml(deal.title)} des favoris" aria-pressed="${favorite}">★</button>
    ${store ? `<div class="badge-store">${escapeHtml(store.storeName)}</div>` : ''}
  </div><div class="card-body">
    <div class="card-title">${escapeHtml(deal.title)}</div>
    <div class="price-row">${!free && !catalogResult ? `<span class="price-old">${state.format.price(deal.normalPrice)}</span>` : ''}<span class="price-new ${free || catalogResult ? 'free-price' : ''}">${catalogResult ? (deal.salePrice ? `Dès ${state.format.price(deal.salePrice)}` : 'Prix indisponible') : free ? 'Gratuit' : state.format.price(deal.salePrice)}</span></div>
    ${!free && deal.salePrice ? `<span class="price-eur">${state.format.euroNote(deal.salePrice)}</span>` : ''}
    <div class="meta-row"><span><span class="dot" style="background:${ratingColor(score)}"></span>${score === null ? 'N/A' : `${score}% Steam`}</span><span>★ ${deal.dealRating ? Number(deal.dealRating).toFixed(1) : '—'}</span></div>
  </div>`;
}

export function renderSpotlight(element, deal, state) {
  if (!deal) return;
  element.innerHTML = `<div class="spotlight-img"><img src="${escapeHtml(deal.thumb)}" alt="${escapeHtml(deal.title)}"><div class="spotlight-scan"></div></div><div class="spotlight-body"><div class="spotlight-title">${escapeHtml(deal.title)}</div><div class="spotlight-price-row"><span class="spotlight-old">${state.format.price(deal.normalPrice)}</span><span class="spotlight-new">${state.format.price(deal.salePrice)}</span></div><div class="spotlight-eur">${state.format.euroNote(deal.salePrice)} · -${Math.round(Number(deal.savings))}%</div><a class="spotlight-cta" href="https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID)}" target="_blank" rel="noopener">Voir l'offre</a></div>`;
}
