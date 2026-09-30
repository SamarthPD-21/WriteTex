import { mountWriteTexUI } from './shadow-host';
import { isOverleafProjectUrl } from '../shared/overleaf-url';

// The manifest already limits where this runs; this guards injected copies too
if (isOverleafProjectUrl(window.location.href)) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountWriteTexUI());
  } else {
    mountWriteTexUI();
  }
}
