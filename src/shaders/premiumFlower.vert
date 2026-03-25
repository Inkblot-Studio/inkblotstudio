#include "./chunks/common.glsl"

uniform float uTime;
uniform float uScrollProgress; 
uniform float uAudioLow;

attribute float aInstanceAngle; // 0 to 2PI
attribute float aInstanceRadius; // distance from center
attribute float aInstancePitch; // inclination angle
attribute float aInstanceRandom; // random seed per petal
attribute float aLayerIndex; // 0 for core, 1 for inner, 2 for outer

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vRandom;
varying float vLayerIndex;
varying float vThickness; // Passed to fragment for SSS approximation

mat4 rotationMatrixLocal(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

void main() {
    vUv = uv;
    vRandom = aInstanceRandom;
    vLayerIndex = aLayerIndex;
    
    // UVs are [0,1]. We want y=0 at base, y=1 at tip.
    float ny = uv.y;
    float nx = (uv.x - 0.5) * 2.0; // -1 to 1

    vec3 pos = position;

    // --- 1. SHAPE THE VOLUMETRIC PETAL ---
    float widthShape = sin(ny * 3.14159);
    pos.x *= mix(0.1, 1.0, widthShape);
    
    // Create the deep cup/boat curl
    pos.z += nx * nx * 1.5 * ny; 
    
    // Bending the petal outward along its length based on blooming state
    // Scroll progress 0 = closed bud (bent inward). 1 = fully bloomed (bent outward).
    float bloomTarget = uScrollProgress;
    
    // Add staggered delay so outer petals open first
    float layerDelay = aLayerIndex * 0.2; 
    float localBloom = smoothstep(layerDelay, layerDelay + 0.6, bloomTarget);
    
    // Closed bend vs Open bend
    float closedBend = 1.0 + (aLayerIndex * 0.5); // Tighter curl over the center 
    float openBend = -0.5 - (aLayerIndex * 0.5); // Outer petals bend further down
    
    float currentBend = mix(closedBend, openBend, localBloom);
    // Taper the bend effect towards the base so the root stays attached to the center
    float bendFactor = smoothstep(0.0, 0.4, ny);
    pos.z += ny * ny * currentBend * bendFactor;

    // Calculate thickness for Subsurface Scattering (thinner at edges and tips)
    vThickness = (1.0 - abs(nx)) * (1.0 - ny);

    // --- 2. APPLY INSTANCE TRANSFORM (Polar) ---
    // Pitch outwards. Closed = standing straight up, leaning inward. Open = laying flat.
    float closedPitch = aLayerIndex * 0.1; // Point inward slightly
    float openPitch = aInstancePitch;
    float currentPitch = mix(closedPitch, openPitch, localBloom);
    
    // Taper pitch towards base
    currentPitch *= bendFactor;
    
    mat4 pitchRot = rotationMatrixLocal(vec3(1.0, 0.0, 0.0), currentPitch);
    pos = (pitchRot * vec4(pos, 1.0)).xyz;
    
    // Move out from center by radius
    // When blooming, it expands out further
    float currentRadius = aInstanceRadius * mix(0.2, 1.0, localBloom);
    pos.z += currentRadius;
    
    // Rotate around the central Y axis
    mat4 yawRot = rotationMatrixLocal(vec3(0.0, 1.0, 0.0), aInstanceAngle);
    pos = (yawRot * vec4(pos, 1.0)).xyz;

    // --- 3. ORGANIC MACRO MOVEMENT ---
    // The flower breathes and trembles slightly
    float time = uTime * 0.2;
    vec3 sway = vec3(
        snoise(pos * 0.2 + vec3(time, 0.0, 0.0)),
        snoise(pos * 0.2 + vec3(0.0, time, 0.0)),
        snoise(pos * 0.2 + vec3(0.0, 0.0, time))
    ) * 0.3 * ny;
    
    // Audio reaction (pulse from the core)
    float pulse = sin(uTime * 3.0 - aInstanceRadius * 2.0) * uAudioLow * 0.4;
    pos += normalize(pos + vec3(0.001, 1.0, 0.001)) * pulse * ny;
    
    pos += sway;

    // --- 4. FINAL POSITION & NORMALS ---
    #ifdef USE_INSTANCING
      pos = (instanceMatrix * vec4(pos, 1.0)).xyz;
    #endif

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vec4 mvPosition = viewMatrix * worldPosition;
    
    gl_Position = projectionMatrix * mvPosition;
    vWorldPosition = worldPosition.xyz;
    
    // Normal calculation (rotating the base normal)
    vec3 localNormal = normal; // Assuming geometry has proper normals
    localNormal = (pitchRot * vec4(localNormal, 0.0)).xyz;
    localNormal = (yawRot * vec4(localNormal, 0.0)).xyz;
    
    #ifdef USE_INSTANCING
      localNormal = (instanceMatrix * vec4(localNormal, 0.0)).xyz;
    #endif
    
    vNormal = normalize((modelMatrix * vec4(localNormal, 0.0)).xyz);
}