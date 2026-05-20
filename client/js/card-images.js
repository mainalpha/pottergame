/**
 * Card image URLs — encode paths (spaces in filenames) and build same-origin absolute URLs.
 */

function normalizeCardImageSrc(src) {
  if (!src) return '';
  const raw = String(src).trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return path
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
}

/** Full URL on the same host — fewer issues across browsers / Brave Shields. */
function absoluteCardImageSrc(src) {
  const normalized = normalizeCardImageSrc(src);
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${window.location.origin}${normalized}`;
}

function cardImageFromCard(card) {
  return absoluteCardImageSrc(card?.imageUrl || card?.image_url || '');
}

function bindCardImgFallback(img, fallbackClass = 'card-art-fallback') {
  if (!img) return;
  img.addEventListener('error', () => {
    img.style.display = 'none';
    const parent = img.parentElement;
    if (!parent || parent.querySelector(`.${fallbackClass}`)) return;
    const span = document.createElement('span');
    span.className = fallbackClass;
    span.setAttribute('aria-hidden', 'true');
    span.textContent = '✨';
    parent.appendChild(span);
  }, { once: true });
}

window.normalizeCardImageSrc = normalizeCardImageSrc;
window.absoluteCardImageSrc = absoluteCardImageSrc;
window.cardImageFromCard = cardImageFromCard;
window.bindCardImgFallback = bindCardImgFallback;
