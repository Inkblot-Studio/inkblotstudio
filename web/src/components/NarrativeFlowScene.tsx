import { Canvas, useFrame } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';

function FlowGraph() {
	const ref = useRef<Group>(null);

	useFrame((state) => {
		if (!ref.current) return;
		ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.25;
	});

	const nodes = useMemo(
		() => [
			[-1.4, 0.4, 0.1],
			[-0.5, 1.1, -0.4],
			[0.6, 0.2, 0.5],
			[1.2, -0.9, -0.2],
			[-0.8, -1.0, 0.4],
		] as Array<[number, number, number]>,
		[],
	);

	return (
		<group ref={ref}>
			{nodes.map((n, idx) => (
				<mesh key={idx} position={n}>
					<sphereGeometry args={[0.08, 20, 20]} />
					<meshStandardMaterial color="#8aeaff" emissive="#48dbff" emissiveIntensity={1.2} />
				</mesh>
			))}
			<Line points={[nodes[0], nodes[1], nodes[2], nodes[3]]} color="#3bd9ff" lineWidth={2} />
			<Line points={[nodes[4], nodes[0], nodes[2]]} color="#6ce5ff" lineWidth={1.5} />
		</group>
	);
}

export default function NarrativeFlowScene() {
	const [reducedMotion, setReducedMotion] = useState(false);

	useEffect(() => {
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		const apply = () => setReducedMotion(query.matches);
		apply();
		query.addEventListener('change', apply);
		return () => query.removeEventListener('change', apply);
	}, []);

	if (reducedMotion) {
		return (
			<div className="flex h-[320px] items-center justify-center rounded-2xl border border-inkblot-cyan/25 bg-slate-950/40 p-6 text-center">
				<div>
					<p className="text-lg font-semibold">Adaptive workflow orchestration</p>
					<p className="muted mt-2 text-sm">Fallback mode enabled to respect reduced-motion preference.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="h-[320px] w-full md:h-[420px]">
			<Canvas camera={{ position: [0, 0.2, 3.6], fov: 45 }}>
				<ambientLight intensity={0.6} />
				<pointLight position={[3, 2, 3]} intensity={1.2} color="#7bdcff" />
				<FlowGraph />
				<OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.2} />
			</Canvas>
		</div>
	);
}
