/**
 * Scroll progress for hero choreography.
 * 0–0.15 hero | 0.15–0.4 capability | 0.4–0.7 proof | 0.7–1 conversion
 */

import { useEffect, useState } from 'react';

export function useHeroScroll() {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		let rafId: number | null = null;

		const onScroll = () => {
			if (rafId !== null) return;
			rafId = requestAnimationFrame(() => {
				const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
				const raw = scrollHeight <= 0 ? 0 : Math.min(window.scrollY / scrollHeight, 1);
				setProgress(raw);
				rafId = null;
			});
		};

		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', onScroll);
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	}, []);

	return progress;
}
