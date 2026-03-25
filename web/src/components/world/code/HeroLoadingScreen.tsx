/**
 * Loading screen for hero 3D experience.
 */

import { useEffect, useState, useRef } from 'react';

const MIN_DISPLAY_MS = 800;
const FADE_OUT_MS = 400;

export interface HeroLoadingScreenProps {
	progress: number;
	onComplete: () => void;
}

export function HeroLoadingScreen({ progress, onComplete }: HeroLoadingScreenProps) {
	const [visible, setVisible] = useState(true);
	const [opacity, setOpacity] = useState(1);
	const loadStartRef = useRef(Date.now());
	const completedRef = useRef(false);

	useEffect(() => {
		if (progress < 100 || completedRef.current) return;

		const elapsed = Date.now() - loadStartRef.current;
		const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

		const timeoutId = setTimeout(() => {
			completedRef.current = true;
			setOpacity(0);
			setTimeout(() => {
				setVisible(false);
				onComplete();
			}, FADE_OUT_MS);
		}, remaining);

		return () => clearTimeout(timeoutId);
	}, [progress, onComplete]);

	if (!visible) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#0e1631] to-[#070b1b] transition-opacity"
			style={{ opacity, transitionDuration: `${FADE_OUT_MS}ms` }}
		>
			<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-inkblot-cyan/30">
				<svg
					className="h-8 w-8 text-inkblot-cyan-soft"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			</div>
			<p className="mb-6 font-medium text-white/95" style={{ fontFamily: 'var(--font-display)' }}>
				Inkblot Studio
			</p>
			<div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
				<div
					className="h-full rounded-full transition-all duration-150"
					style={{
						width: `${progress}%`,
						backgroundColor: 'var(--inkblot-cyan, #3bd9ff)',
					}}
				/>
			</div>
			<p className="mt-3 text-sm text-white/60">{Math.round(progress)}%</p>
		</div>
	);
}
