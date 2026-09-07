export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character]));
}

export function createFormatter(currency, fxRate) {
  return {
    price(amount) {
      const value = currency === 'EUR' ? Number(amount) * fxRate : Number(amount);
      return `${value === 0 ? '0' : value.toFixed(2).replace('.', ',')}${currency === 'EUR' ? '€' : '$'}`;
    },
    euroNote(amount) {
      return currency === 'EUR' ? '' : `≈ ${(Number(amount) * fxRate).toFixed(2).replace('.', ',')}€`;
    }
  };
}

export function ratingColor(score) {
  if (score === null || Number.isNaN(score)) return 'var(--text-faint)';
  if (score >= 80) return 'var(--mint)';
  if (score >= 50) return 'var(--accent)';
  return '#FF4D4D';
}
