import ReactDOM from 'react-dom/client';
import { App } from '../ui/App';
// Import Tailwind + custom CSS inline via Vite
import styles from '../ui/styles/globals.css?inline';

const HOST_ID = 'writetex-extension-root';

export function mountWriteTexUI(): { unmount: () => void } | null {
  if (document.getElementById(HOST_ID)) {
    console.log('[WriteTex] Host already mounted');
    return null;
  }

  // 1. Create Host Element
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647;';
  document.body.appendChild(host);

  // 2. Attach Shadow DOM
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // 3. Inject CSS Styles
  try {
    if ('adoptedStyleSheets' in shadowRoot && typeof CSSStyleSheet !== 'undefined') {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(styles);
      shadowRoot.adoptedStyleSheets = [sheet];
    } else {
      const styleEl = document.createElement('style');
      styleEl.textContent = styles;
      shadowRoot.appendChild(styleEl);
    }
  } catch {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    shadowRoot.appendChild(styleEl);
  }

  // 4. Create App Container and Mount React
  const mountPoint = document.createElement('div');
  mountPoint.id = 'writetex-app-mount';
  shadowRoot.appendChild(mountPoint);

  const root = ReactDOM.createRoot(mountPoint);
  root.render(<App />);

  return {
    unmount: () => {
      root.unmount();
      host.remove();
    },
  };
}
