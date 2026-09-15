import { mountWriteTexUI } from './shadow-host';

console.log('[WriteTex] Content script loaded on Overleaf');

// Mount WriteTex UI once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    mountWriteTexUI();
  });
} else {
  mountWriteTexUI();
}
