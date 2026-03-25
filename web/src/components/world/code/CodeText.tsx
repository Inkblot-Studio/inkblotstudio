import { Text } from '@react-three/drei';

const PHRASES: { text: string; position: [number, number, number] }[] = [
	{ text: 'embed', position: [-0.8, 0.6, 0.5] },
	{ text: 'transform', position: [0.9, -0.2, 0.4] },
	{ text: 'orchestrate', position: [-0.5, -0.5, -0.3] },
	{ text: '{ }', position: [0.6, 0.4, -0.6] },
	{ text: 'model', position: [-0.3, 0.8, 0.2] },
	{ text: 'inference', position: [0.4, -0.7, 0.1] },
];

export function CodeText() {
	return (
		<group>
			{PHRASES.map(({ text, position }, i) => (
				<Text
					key={i}
					position={position}
					fontSize={0.12}
					color="#8aeaff"
					anchorX="center"
					anchorY="middle"
					maxWidth={2}
				>
					{text}
				</Text>
			))}
		</group>
	);
}
