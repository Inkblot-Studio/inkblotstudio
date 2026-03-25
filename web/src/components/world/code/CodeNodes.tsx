import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const NODE_COUNT = 10;
const FLOAT_AMPLITUDE = 0.15;
const FLOAT_SPEED = 0.4;

const NODE_POSITIONS: [number, number, number][] = [
	[-1.2, 0.5, 0.3],
	[0.8, -0.3, 0.6],
	[1.0, 0.8, -0.4],
	[-0.6, -0.8, 0.2],
	[0.2, 0.2, 1.2],
	[-1.0, 0.1, -0.8],
	[0.5, -0.6, -0.5],
	[-0.3, 0.9, 0.1],
	[1.1, -0.2, 0.4],
	[-0.8, -0.4, -0.6],
];

export function CodeNodes() {
	const groupRef = useRef<THREE.Group>(null);
	const phases = useMemo(
		() => Array.from({ length: NODE_COUNT }, () => Math.random() * Math.PI * 2),
		[],
	);

	useFrame((state) => {
		if (!groupRef.current) return;
		const t = state.clock.elapsedTime;
		groupRef.current.children.forEach((child, i) => {
			const phase = phases[i];
			const y = NODE_POSITIONS[i][1] + Math.sin(t * FLOAT_SPEED + phase) * FLOAT_AMPLITUDE;
			child.position.y = y;
		});
	});

	return (
		<group ref={groupRef}>
			{NODE_POSITIONS.map((pos, i) => (
				<mesh key={i} position={pos}>
					<sphereGeometry args={[0.15, 24, 24]} />
					<meshStandardMaterial
						color="#3bd9ff"
						emissive="#3bd9ff"
						emissiveIntensity={0.8}
						roughness={0.3}
						metalness={0.2}
					/>
				</mesh>
			))}
		</group>
	);
}
