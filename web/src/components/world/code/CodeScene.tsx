import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { CodeNodes } from './CodeNodes';
import { CodeText } from './CodeText';
import { easeInOutCubic } from '../../../lib/3d/hero/easing';

function CodeCameraRig({ scrollProgress }: { scrollProgress: number }) {
	const { camera } = useThree();
	const reducedMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	useFrame(() => {
		const p = reducedMotion
			? scrollProgress < 0.2
				? 0
				: scrollProgress < 0.5
					? 0.25
					: scrollProgress < 0.8
						? 0.6
						: 1
			: scrollProgress;

		const heroEnd = 0.15;
		const capEnd = 0.4;
		const proofEnd = 0.7;

		let camX: number;
		let camY: number;
		let camZ: number;

		if (p <= heroEnd) {
			camX = 0;
			camY = 0;
			camZ = 8;
		} else if (p <= capEnd) {
			const t = easeInOutCubic((p - heroEnd) / (capEnd - heroEnd));
			camX = t * 1.5;
			camY = t * 0.3;
			camZ = 8 - t * 0.5;
		} else if (p <= proofEnd) {
			const t = easeInOutCubic((p - capEnd) / (proofEnd - capEnd));
			camX = 1.5 + t * 0.5;
			camY = 0.3 + t * 0.2;
			camZ = 7.5;
		} else {
			const t = easeInOutCubic((p - proofEnd) / (1 - proofEnd));
			camX = 2 - t * 2;
			camY = 0.5 - t * 0.5;
			camZ = 7.5;
		}

		camera.position.x += (camX - camera.position.x) * 0.06;
		camera.position.y += (camY - camera.position.y) * 0.06;
		camera.position.z += (camZ - camera.position.z) * 0.06;
		camera.lookAt(0, 0, 0);
		camera.updateProjectionMatrix();
	});

	return null;
}

export interface CodeSceneProps {
	scrollProgress: number;
}

export function CodeScene({ scrollProgress }: CodeSceneProps) {
	const groupRef = useRef<THREE.Group>(null);
	const reducedMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const heroEnd = 0.15;
	const capEnd = 0.4;
	const scale =
		reducedMotion && scrollProgress > capEnd
			? 0.6
			: scrollProgress <= heroEnd
				? 1
				: scrollProgress <= capEnd
					? 1 - easeInOutCubic((scrollProgress - heroEnd) / (capEnd - heroEnd)) * 0.4
					: 0.6;

	useFrame(() => {
		if (groupRef.current) {
			groupRef.current.scale.setScalar(scale);
		}
	});

	return (
		<>
			<color attach="background" args={['#070b1b']} />
			<ambientLight intensity={0.4} />
			<pointLight position={[3, 2, 5]} intensity={1.2} color="#3bd9ff" />
			<pointLight position={[-2, 1, 4]} intensity={0.8} color="#6b82ff" />

			<CodeCameraRig scrollProgress={scrollProgress} />
			<group ref={groupRef}>
				<CodeNodes />
				<CodeText />
			</group>
		</>
	);
}
