#include "./chunks/common.glsl"

// Uniforms
uniform float uTime;
uniform float uScrollProgress;
uniform vec2 uPointer;

// Instanced Attributes
attribute vec3 aInstancePosition;
attribute vec3 aInstanceRotation; // Euler angles
attribute float aInstanceScale;
attribute float aInstanceRandom;  // For varied animation phases

// Varyings
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vRandom;
varying float vDepth;

// Rotation helper for 3D euler
mat4 rotationMatrix(vec3 euler) {
    float cx = cos(euler.x);
    float sx = sin(euler.x);
    float cy = cos(euler.y);
    float sy = sin(euler.y);
    float cz = cos(euler.z);
    float sz = sin(euler.z);

    mat4 rx = mat4(
        1.0, 0.0, 0.0, 0.0,
        0.0, cx, -sx, 0.0,
        0.0, sx, cx, 0.0,
        0.0, 0.0, 0.0, 1.0
    );

    mat4 ry = mat4(
        cy, 0.0, sy, 0.0,
        0.0, 1.0, 0.0, 0.0,
        -sy, 0.0, cy, 0.0,
        0.0, 0.0, 0.0, 1.0
    );

    mat4 rz = mat4(
        cz, -sz, 0.0, 0.0,
        sz, cz, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    );

    return rz * ry * rx;
}

void main() {
    vUv = uv;
    vRandom = aInstanceRandom;

    // 1. Base Transform Matrix
    mat4 instanceTransform = rotationMatrix(aInstanceRotation);
    
    // Breathing scale oscillation
    float breathing = sin(uTime * 0.5 + aInstanceRandom * 10.0) * 0.1 + 0.9;
    float scale = aInstanceScale * breathing;
    
    // Apply scale to instance matrix diagonal
    instanceTransform[0][0] *= scale;
    instanceTransform[1][1] *= scale;
    instanceTransform[2][2] *= scale;
    
    // Apply instance position
    vec3 basePosition = (instanceTransform * vec4(position, 1.0)).xyz + aInstancePosition;
    
    // 2. Wind Sway & Hover effects
    // Noise-based sway
    float noiseTime = uTime * 0.2;
    vec3 noisePos = basePosition * 0.1;
    float swayX = snoise(noisePos + vec3(noiseTime, 0.0, 0.0)) * 0.5;
    float swayZ = snoise(noisePos + vec3(0.0, 0.0, noiseTime)) * 0.5;
    float swayY = snoise(noisePos + vec3(0.0, noiseTime, 0.0)) * 0.2;
    
    // Wind intensifies higher up on the instance (local Y)
    vec3 sway = vec3(swayX, swayY, swayZ) * position.y * 2.0;
    
    // Mouse proximity repulsion (simple spherical field in screen space / world space hybrid)
    // Here we just do a gentle world-space push based on uPointer (assuming pointer mapped to world somehow, but uPointer is NDC)
    // To keep it cinematic, we'll map NDC roughly to a plane at z=0 for repulsion
    vec3 pointerWorld = vec3(uPointer.x * 10.0, uPointer.y * 10.0, 0.0);
    float distToPointer = distance(basePosition.xy, pointerWorld.xy);
    float repulsion = smoothstep(3.0, 0.0, distToPointer);
    vec3 pushDir = normalize(vec3(basePosition.xy - pointerWorld.xy, 1.0));
    vec3 interactionPush = pushDir * repulsion * 1.5;
    
    // Final position
    vec3 finalPosition = basePosition + sway + interactionPush;
    
    // Scroll offset (parallax)
    finalPosition.y += uScrollProgress * 5.0 * aInstanceRandom;
    
    vec4 worldPosition = modelMatrix * vec4(finalPosition, 1.0);
    vec4 mvPosition = viewMatrix * worldPosition;
    
    gl_Position = projectionMatrix * mvPosition;
    
    // Pass to fragment
    vWorldPosition = worldPosition.xyz;
    
    // Normal transform (ignoring non-uniform scale for simplicity)
    vec3 transformedNormal = (instanceTransform * vec4(normal, 0.0)).xyz;
    vNormal = normalize((modelMatrix * vec4(transformedNormal, 0.0)).xyz);
    
    // Depth for fog or other effects
    vDepth = -mvPosition.z;
}
