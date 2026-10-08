export type AuxiliaryView = 'editor' | 'reference' | 'preparation';

export function resolveAuxiliaryView(hash: string): AuxiliaryView {
  if (hash === '#preparation') return 'preparation';
  if (hash === '#reference' || hash.startsWith('#reference/')) return 'reference';
  return 'editor';
}

export function navigateAuxiliaryView(view: AuxiliaryView): void {
  const hash = view === 'editor' ? '' : `#${view}`;
  const next = window.location.pathname + window.location.search + hash;
  if (window.location.pathname + window.location.search + window.location.hash !== next) {
    window.history.pushState(null, '', next);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}
