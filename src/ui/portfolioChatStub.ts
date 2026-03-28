import { handlePortfolioChatQuery } from '@/ui/portfolioNavigator';

/**
 * Journey chat: local navigation commands (Active Theory–style) plus optional API hook.
 */
export function initPortfolioChat(formId = 'journey-chat-form'): void {
  const form = document.getElementById(formId) as HTMLFormElement | null;
  if (!form) return;

  const replyEl = document.getElementById('journey-chat-reply');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector<HTMLInputElement>('input[name="q"]');
    const q = input?.value?.trim() ?? '';
    if (!q) return;

    const endpoint = import.meta.env.VITE_PORTFOLIO_CHAT_URL as string | undefined;
    if (endpoint) {
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      }).catch(() => {});
    }

    const local = handlePortfolioChatQuery(q);
    if (replyEl) {
      replyEl.textContent = local.reply || (endpoint ? 'Sent.' : '');
    }
    if (!endpoint) {
      console.info('[Inkblot] Portfolio chat — query:', q, local);
    }
    if (input) input.value = '';
  });
}
