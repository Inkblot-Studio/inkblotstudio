import { createRoot, type Root } from 'react-dom/client';
import { BloomHud, type BloomHudProps } from './BloomHud';

export function mountBloomHud(container: HTMLElement, props: BloomHudProps): Root {
  const root = createRoot(container);
  root.render(<BloomHud {...props} />);
  return root;
}
