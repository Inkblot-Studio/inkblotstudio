import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { LoadingScreen } from './ui/loading/LoadingScreen';
import { WorkSectionPanel } from './ui/WorkSectionPanel';

const splashEl = document.getElementById('splash-root');
if (splashEl) {
  const splashRoot = createRoot(splashEl);
  splashRoot.render(
    <StrictMode>
      <LoadingScreen
        onExitComplete={() => {
          splashRoot.unmount();
          splashEl.remove();
        }}
      />
    </StrictMode>,
  );
}

const rootEl = document.getElementById('app-root');
if (!rootEl) {
  throw new Error('Missing #app-root element');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const workRoot = document.getElementById('journey-work-root');
if (workRoot) {
  createRoot(workRoot).render(
    <StrictMode>
      <WorkSectionPanel />
    </StrictMode>,
  );
}
