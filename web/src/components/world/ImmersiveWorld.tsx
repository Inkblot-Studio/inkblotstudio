import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Points, PointMaterial, Sphere } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import type { PerspectiveCamera } from 'three';
import { trackTelemetryEvent } from '../../lib/telemetry/events';
import {
	degradeTier,
	detectInitialQualityTier,
	getRuntimeQuality,
	type QualityTier,
} from '../../lib/3d/quality/adaptive';
import { worldChapters } from '../../lib/3d/runtime/chapters';
import { resolveRendererMode } from '../../lib/3d/webgpu/experimental';
import { useScrollProgress } from '../../lib/3d/camera/useScrollProgress';

function ChapterGeometry({ chapterIndex, z, nodeCount }: { chapterIndex: number; z: number; nodeCount: number }) {
	const groupRef = useRef<Group>(null);

	useFrame((state) => {
		if (!groupRef.current) return;
		groupRef.current.rotation.y = state.clock.elapsedTime * 0.06 + chapterIndex * 0.2;
		groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3 + chapterIndex) * 0.15;
	});

	const nodes = useMemo(() => {
		return Array.from({ length: nodeCount }, (_, idx) => {
			const angle = (idx / nodeCount) * Math.PI * 2;
			const radius = 1.4 + Math.sin(idx * 0.6) * 0.6;
			const y = Math.sin(idx * 0.32) * 1.2;
			return [Math.cos(angle) * radius, y, Math.sin(angle) * radius] as [number, number, number];
		});
	}, [nodeCount]);

	const pointPositions = useMemo(() => {
		const positions = new Float32Array(nodes.length * 3);
		nodes.forEach((n, idx) => {
			positions[idx * 3] = n[0];
			positions[idx * 3 + 1] = n[1];
			positions[idx * 3 + 2] = n[2];
		});
		return positions;
	}, [nodes]);

	return (
		<group ref={groupRef} position={[0, 0, z]}>
			<Sphere args={[1.1, 48, 48]}>
				<meshStandardMaterial
					color={chapterIndex % 2 === 0 ? '#74e8ff' : '#6d7fff'}
					roughness={0.2}
					metalness={0.5}
					emissive="#0b3f5e"
					emissiveIntensity={0.8}
				/>
			</Sphere>
			<Points positions={pointPositions} stride={3}>
				<PointMaterial transparent color="#8aeaff" size={0.035} sizeAttenuation depthWrite={false} />
			</Points>
		</group>
	);
}

function WorldCameraRig({
	progress,
	tier,
	onFrameSample,
}: {
	progress: number;
	tier: QualityTier;
	onFrameSample: (deltaMs: number) => void;
}) {
	const { camera } = useThree();

	useFrame((_, delta) => {
		onFrameSample(delta * 1000);

		const pathZ = -18 * progress;
		camera.position.z += (4 + pathZ - camera.position.z) * 0.08;
		camera.position.x += (Math.sin(progress * Math.PI * 2) * 0.3 - camera.position.x) * 0.08;
		camera.position.y += (Math.cos(progress * Math.PI) * 0.15 - camera.position.y) * 0.08;

		const lookAhead = -2 - progress * 14;
		camera.lookAt(0, 0, lookAhead);

		const perspective = camera as PerspectiveCamera;
		if (tier === 'safe') {
			perspective.fov += (56 - perspective.fov) * 0.08;
		} else {
			perspective.fov += (48 - perspective.fov) * 0.08;
		}
		perspective.updateProjectionMatrix();
	});

	return null;
}

export default function ImmersiveWorld() {
	const [tier, setTier] = useState<QualityTier>('balanced');
	const [rendererMode, setRendererMode] = useState<'webgl' | 'webgpu-experimental'>('webgl');
	const [activeChapterIndex, setActiveChapterIndex] = useState(0);
	const progress = useScrollProgress();
	const quality = getRuntimeQuality(tier);
	const frameSamples = useRef<number[]>([]);
	const degradedRef = useRef(false);

	useEffect(() => {
		setTier(detectInitialQualityTier());
		setRendererMode(resolveRendererMode());
	}, []);

	useEffect(() => {
		const chapter = Math.min(Math.floor(progress * worldChapters.length), worldChapters.length - 1);
		if (chapter !== activeChapterIndex) {
			setActiveChapterIndex(chapter);
			trackTelemetryEvent({
				name: 'immersive_world_chapter_change',
				timestamp: new Date().toISOString(),
				properties: { chapter: worldChapters[chapter]?.id ?? 'unknown' },
			});
		}
	}, [activeChapterIndex, progress]);

	function handleFrameSample(deltaMs: number) {
		frameSamples.current.push(deltaMs);
		if (frameSamples.current.length < 45) return;

		const avg = frameSamples.current.reduce((a, b) => a + b, 0) / frameSamples.current.length;
		frameSamples.current = [];

		// Degrade if frame-time is persistently high; upgrade is intentionally avoided for stability.
		if (avg > 26 && !degradedRef.current) {
			degradedRef.current = true;
			setTier((current) => degradeTier(current));
			trackTelemetryEvent({
				name: 'immersive_world_quality_degrade',
				timestamp: new Date().toISOString(),
				properties: { averageFrameMs: Math.round(avg) },
			});
			setTimeout(() => {
				degradedRef.current = false;
			}, 4000);
		}
	}

	const activeChapter = worldChapters[activeChapterIndex] ?? worldChapters[0];

	return (
		<div className="relative h-[260vh]">
			<div className="sticky top-0 h-screen w-full overflow-hidden">
				<Canvas
					camera={{ position: [0, 0, 4], fov: 48 }}
					dpr={[1, quality.pixelRatio]}
					gl={{ antialias: tier !== 'safe' }}
				>
					<color attach="background" args={['#050915']} />
					<ambientLight intensity={0.55 * quality.effectStrength + 0.2} />
					<pointLight position={[3, 2, 4]} intensity={1.4 * quality.effectStrength + 0.4} color="#8de9ff" />
					<pointLight position={[-2.5, -1, -4]} intensity={1.1 * quality.effectStrength + 0.25} color="#6b82ff" />

					<WorldCameraRig progress={progress} tier={tier} onFrameSample={handleFrameSample} />

					{worldChapters.map((chapter, idx) => (
						<ChapterGeometry key={chapter.id} chapterIndex={idx} z={chapter.z} nodeCount={quality.nodeCount} />
					))}

					<OrbitControls
						enablePan={false}
						enableZoom={false}
						enableRotate={false}
						autoRotate={tier !== 'safe'}
						autoRotateSpeed={quality.effectStrength * 0.2}
					/>
				</Canvas>

				<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

				<div className="site-container pointer-events-none absolute inset-x-0 top-0 z-10 py-10">
					<p className="inline-block rounded-full border border-inkblot-cyan/50 px-4 py-1 text-xs text-inkblot-cyan-soft">
						Single-world immersive runtime | Tier: {tier.toUpperCase()} | Renderer: {rendererMode}
					</p>
				</div>

				<div className="site-container absolute inset-x-0 bottom-10 z-20">
					<div className="section-card max-w-2xl rounded-2xl p-6">
						<p className="text-xs tracking-wide text-inkblot-cyan-soft">{activeChapter.label}</p>
						<h2 className="mt-2 text-2xl font-semibold md:text-4xl">{activeChapter.title}</h2>
						<p className="muted mt-3 text-base md:text-lg">{activeChapter.copy}</p>
						<div className="mt-5 flex flex-wrap gap-3">
							<button
								type="button"
								className="rounded-full bg-inkblot-cyan px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-inkblot-cyan-soft"
								onClick={() => {
									const target = document.getElementById('strategy-call');
									if (!target) return;
									target.scrollIntoView({ behavior: 'smooth', block: 'start' });
								}}
							>
								Open Strategy Call
							</button>
							<span className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/80">
								FX {'->'} geometry {'->'} motion adaptive degradation
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
