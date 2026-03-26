// ─────────────────────────────────────────────────────────────
// audioButton.frag
// ─────────────────────────────────────────────────────────────

uniform float uTime;
uniform float uIsPlaying;
uniform float uAudioHigh;
uniform vec3 uPrimaryColor;
uniform vec3 uHoverColor;
uniform vec3 uAccentColor;

varying vec2 vUv;

#include "./chunks/common.glsl"

void main() {
    // Center at 0,0
    vec2 p = vUv * 2.0 - 1.0;
    float dist = length(p);

    // Audio visualizer ring
    float angle = atan(p.y, p.x);
    float wave = 0.0;
    
    if (uIsPlaying > 0.5) {
        wave = sin(angle * 10.0 + uTime * 5.0) * uAudioHigh * 0.1;
        wave += snoise(vec3(p * 5.0, uTime)) * 0.05;
    }

    float ringRadius = 0.6 + wave;
    
    // Draw smooth ring
    float ringThickness = 0.05;
    float ring = smoothstep(ringRadius + ringThickness, ringRadius, dist) - 
                 smoothstep(ringRadius, ringRadius - ringThickness, dist);

    // Inner glow
    float glow = exp(-dist * 3.0) * mix(0.1, 0.5, uIsPlaying);

    vec3 color = mix(uPrimaryColor, uHoverColor, dist);
    
    // Color changes when playing based on audio
    if (uIsPlaying > 0.5) {
        color = mix(color, uAccentColor, uAudioHigh);
    }

    float alpha = ring + glow;
    
    // Smooth outer edge for antialiasing
    alpha *= smoothstep(1.0, 0.9, dist);

    // Subtle idle animation when off
    if (uIsPlaying < 0.5) {
        float idleWave = sin(dist * 10.0 - uTime) * 0.5; // Increased wave
        alpha += idleWave * smoothstep(0.8, 0.5, dist);
        alpha += 0.2; // Base visibility
        color = vec3(0.8); // Brighter grey when off
    }

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
