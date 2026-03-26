import '@citron-systems/citron-ds/css';
import { Button } from '@citron-systems/citron-ui';
import { useCallback, useState, type CSSProperties } from 'react';
import { BloomSpacing } from '../bloom-core/tokens';

export interface BloomHudProps {
  onBloomMore?: () => void;
  onBloomLess?: () => void;
  title?: string;
}

/**
 * Minimal overlay: Citron UI buttons + Inkblot `:root` palette from the host page.
 */
export function BloomHud({ onBloomMore, onBloomLess, title = 'Citron Bloom' }: BloomHudProps) {
  const [open, setOpen] = useState(true);
  const pad = BloomSpacing.s4;

  const panelStyle: CSSProperties = {
    position: 'fixed',
    right: pad,
    bottom: pad,
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    gap: BloomSpacing.s2,
    padding: BloomSpacing.s4,
    maxWidth: 280,
    pointerEvents: 'auto',
    borderRadius: '12px',
    background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    fontFamily: "'Montserrat', system-ui, sans-serif",
    fontSize: '0.8125rem',
  };

  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: pad }}>
        <span style={{ fontWeight: 600, letterSpacing: '0.04em' }}>{title}</span>
        <Button type="button" variant="secondary" onClick={toggle}>
          {open ? 'Hide' : 'Show'}
        </Button>
      </div>
      {open && (
        <>
          <p style={{ opacity: 0.85, lineHeight: 1.5, margin: 0 }}>
            Scroll the page to open the flowers slowly, or use the buttons to smooth-scroll to closed or full bloom.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: BloomSpacing.s2 }}>
            <Button type="button" variant="primary" onClick={onBloomMore}>
              Scroll to full bloom
            </Button>
            <Button type="button" variant="secondary" onClick={onBloomLess}>
              Scroll to bud
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
