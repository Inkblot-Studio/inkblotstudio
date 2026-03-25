import { useEffect, useState } from 'react';

const PHRASES = ['> embed', '> transform', '> orchestrate', '> model', '> inference', '> { }'];
const CYCLE_MS = 2500;

export function CodeStreamOverlay() {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setIndex((i) => (i + 1) % PHRASES.length);
		}, CYCLE_MS);
		return () => clearInterval(id);
	}, []);

	return (
		<div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-sm text-inkblot-cyan-soft/80">
			<span className="tabular-nums">{PHRASES[index]}</span>
			<span className="animate-pulse">_</span>
		</div>
	);
}
