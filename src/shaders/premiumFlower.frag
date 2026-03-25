uniform vec3 uPrimaryColor;    // #2563EB
uniform vec3 uHoverColor;      // #60A5FA
uniform vec3 uAccentColor;     // #10B981
uniform float uTime;
// uniform vec3 cameraPosition; // Provided automatically by Three.js

// Core Light Position (Simulated from scene.ts)
const vec3 CORE_LIGHT_POS = vec3(0.0, 0.0, 0.0);

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vRandom;
varying float vLayerIndex;
varying float vThickness;

#include "./chunks/common.glsl"

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    
    // --- 1. CORE LIGHT & SUBSURFACE SCATTERING ---
    // Calculate light vector from the internal core
    vec3 lightDir = normalize(CORE_LIGHT_POS - vWorldPosition);
    float distToCore = length(CORE_LIGHT_POS - vWorldPosition);
    
    // SSS Approximation: How much light bleeds through the back of the petal
    // We use a wrapped lighting model
    float wrap = 0.5;
    float scatter = max(0.0, dot(-normal, lightDir) + wrap) / (1.0 + wrap);
    float invThick = 1.0 - vThickness;
    scatter *= invThick * invThick; // Thinner parts scatter more light
    
    // Attenuate by distance
    float coreIntensity = 3.0 / (1.0 + distToCore * distToCore * 0.1);
    vec3 sssLight = uAccentColor * scatter * coreIntensity * 0.2;

    // --- 2. SURFACE COLOR & VELVET SHADING ---
    // The outer layers are darker, inner layers are brighter and more vibrant
    vec3 baseColor = mix(uPrimaryColor * 0.2, uPrimaryColor, 1.0 - (vLayerIndex * 0.3));
    vec3 tipColor = mix(uHoverColor * 0.5, uHoverColor * 1.5, 1.0 - (vLayerIndex * 0.3));
    
    // Gradient from base to tip
    vec3 color = mix(baseColor, tipColor, vUv.y);
    
    // Velvet / Micro-facet Rim Lighting (Fresnel)
    // Darkens facing angles and violently brightens grazing angles
    float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
    fresnel = fresnel * fresnel; // Softened fresnel so it's not strictly on the very edge
    
    // Iridescence on the rim: shifts between Hover Blue and Accent Green
    vec3 rimColor = mix(uHoverColor, uAccentColor, sin(vUv.y * 10.0 + uTime) * 0.5 + 0.5);
    vec3 rimLight = rimColor * fresnel * 2.0;

    // --- 3. ORGANIC DETAILS ---
    // Micro-veins using high frequency noise
    float veinNoise = snoise(vec3(vUv * 15.0, uTime * 0.05));
    float veinMask = smoothstep(0.4, 0.6, sin(vUv.x * 40.0 + veinNoise * 5.0)) * vUv.y;
    color += uAccentColor * veinMask * 0.3 * (1.0 - vLayerIndex * 0.4); // Stronger on inner petals

    // --- 4. FINAL COMPOSITE ---
    // Main Key Light from the front-top-right to illuminate the flower
    // Place the light source much closer and directly in front of the flower
    vec3 keyLightPos = vec3(0.0, 5.0, 10.0);
    vec3 keyLightDir = normalize(keyLightPos - vWorldPosition);
    
    // Soft diffuse wrapping (Lambertian)
    float diffuse = max(0.0, dot(normal, keyLightDir));
    // Wrap the lighting aggressively so it wraps around the curved petals
    diffuse = diffuse * 0.7 + 0.3; 
    
    // Bright surface illumination
    vec3 surfaceIllumination = color * diffuse * 1.5;
    
    // Ambient fill
    vec3 fillLight = color * vec3(0.5, 0.6, 0.8);
    
    vec3 finalColor = surfaceIllumination + fillLight + sssLight + rimLight;
    
    // Increase emissive output near the very tip of the innermost layer
    if (vLayerIndex < 0.5) {
        finalColor += uAccentColor * smoothstep(0.7, 1.0, vUv.y) * 2.0;
    }

    // Output final color
    gl_FragColor = vec4(finalColor, 1.0);
}
