import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { Suspense, useState, useEffect } from 'react';
import { CodeScene } from './CodeScene';
import { HeroLoadingScreen } from './HeroLoadingScreen';
import { CodeStreamOverlay } from './CodeStreamOverlay';
import { useHeroScroll } from '../../../lib/3d/hero/useHeroScroll';

function CodeCanvas() {
	const scrollProgress = useHeroScroll();
	const [loaded, setLoaded] = useState(false);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const t = setTimeout(() => setProgress(100), 300);
		return () => clearTimeout(t);
	}, []);

	return (
		<>
			{!loaded && <HeroLoadingScreen progress={progress} onComplete={() => setLoaded(true)} />}

			<Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 48 }}>
				<Suspense fallback={null}>
					<CodeScene scrollProgress={scrollProgress} />
					<EffectComposer>
						<Bloom intensity={0.32} luminanceThreshold={0.9} luminanceSmoothing={0.5} />
						<ToneMapping />
					</EffectComposer>
				</Suspense>
			</Canvas>

			<CodeStreamOverlay />
		</>
	);
}

export default function CodeExperience() {
	return (
		<div className="relative h-[260vh]">
			<div className="sticky top-0 h-screen w-full overflow-hidden">
				<CodeCanvas />
				<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
			</div>
		</div>
	);
}
