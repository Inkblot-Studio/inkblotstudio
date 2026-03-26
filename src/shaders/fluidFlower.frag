// ─────────────────────────────────────────────────────────────
// fluidFlower.frag
// ─────────────────────────────────────────────────────────────

uniform float uTime;
uniform float uScrollProgress;
uniform float uAudioLow;
// uniform vec3 cameraPosition; // Provided by Three.js automatically

uniform vec3 uPrimaryColor;    // #2563EB
uniform vec3 uHoverColor;      // #60A5FA
uniform vec3 uAccentColor;     // #10B981

varying vec3 vLocalPosition;
varying vec3 vWorldPosition;

#include "./chunks/common.glsl"

// --- Raymarching Constants ---
const int MAX_STEPS = 100;
const float MAX_DIST = 20.0;
const float SURF_DIST = 0.01;

// --- SDF Primitives & Operations ---

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// 3D rotation matrix
mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// Distance to a sphere
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

// Distance to a capsule/cylinder
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 ab = b - a;
    vec3 ap = p - a;
    float t = dot(ap, ab) / dot(ab, ab);
    t = clamp(t, 0.0, 1.0);
    vec3 c = a + t * ab;
    return length(p - c) - r;
}

// The core Scene Distance Field
float getDistance(vec3 p) {
    float bloom = uScrollProgress;
    
    // We create a central core
    float coreRadius = mix(0.5, 0.8, bloom) + uAudioLow * 0.2;
    float dCore = sdSphere(p, coreRadius);
    
    // Twist space globally for organic feel
    vec3 pTwist = p;
    pTwist.xz = rot(p.y * mix(1.5, 0.5, bloom) + uTime * 0.2) * pTwist.xz;

    // Polar repetition for 8 petals
    float numPetals = 8.0;
    float sector = 3.14159 * 2.0 / numPetals;
    float angle = atan(pTwist.z, pTwist.x);
    float radius = length(pTwist.xz);
    
    // Wrap angle to create symmetry
    float a = mod(angle + sector/2.0, sector) - sector/2.0;
    
    vec3 pRep = pTwist;
    pRep.x = cos(a) * radius;
    pRep.z = sin(a) * radius;
    
    // Now evaluate one petal in this wrapped space
    float bendOut = mix(0.2, 1.5, bloom);
    float bendDown = mix(1.0, -0.5, bloom);
    
    vec3 pBase = vec3(0.0, -0.5, 0.0);
    vec3 pTip = vec3(bendOut, bendDown, 0.0); // Tip points along +X in wrapped space
    
    float petalRadius = mix(0.1, 0.3, bloom);
    float petalDist = sdCapsule(pRep, pBase, pTip, petalRadius);
    
    // Combine core and petals
    float dFinal = smin(dCore, petalDist, 0.5);
    
    // Add high-frequency curl noise to displace the surface (organic detail)
    vec3 nPos = p * 2.0 + vec3(0.0, -uTime * 0.5, 0.0);
    float displacement = snoise(nPos) * 0.05; // Keep it subtle so it doesn't break raymarch
    
    return dFinal + displacement;
}

// Get normal by sampling surrounding points
vec3 getNormal(vec3 p) {
    float d = getDistance(p);
    vec2 e = vec2(0.01, 0);
    
    vec3 n = d - vec3(
        getDistance(p - e.xyy),
        getDistance(p - e.yxy),
        getDistance(p - e.yyx)
    );
    
    return normalize(n);
}

// Raymarching loop
float rayMarch(vec3 ro, vec3 rd) {
    float dO = 0.0;
    
    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * dO;
        float dS = getDistance(p);
        dO += dS;
        if(dO > MAX_DIST || dS < SURF_DIST) break;
    }
    
    return dO;
}

void main() {
    // Setup ray
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorldPosition - ro);
    
    // March
    float d = rayMarch(ro, rd);
    
    if(d >= MAX_DIST) {
        // Discard background pixels, let the studio backdrop from scene.ts show through
        discard;
    }
    
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    return;
    
    vec3 p = ro + rd * d;
    vec3 normal = getNormal(p);
    vec3 viewDir = normalize(cameraPosition - p);
    
    // --- SHADING ---
    // Core lighting and subsurface scattering
    vec3 lightPos = vec3(0.0, 1.0, 0.0);
    vec3 lightDir = normalize(lightPos - p);
    
    float diffuse = max(dot(normal, lightDir), 0.0);
    
    // Wrapped lighting for organic flesh feel
    float wrap = 0.5;
    float wDiffuse = max(0.0, dot(normal, lightDir) + wrap) / (1.0 + wrap);
    
    // Fresnel for the bioluminescent edge glow
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    
    // Gradient coloring based on height and depth
    float depthFactor = length(p.xz);
    vec3 baseColor = mix(uPrimaryColor * 0.3, uHoverColor, clamp(p.y * 0.5 + 0.5, 0.0, 1.0));
    
    // The core glows vibrantly
    float coreGlow = smoothstep(1.5, 0.0, length(p)) * uAudioLow * 0.5;
    
    vec3 finalColor = baseColor * wDiffuse;
    finalColor += uAccentColor * fresnel * 2.0; // Edges
    finalColor += mix(uPrimaryColor, vec3(1.0), coreGlow); // Core pulsing
    
    // Add ambient
    finalColor += baseColor * 0.2;
    
    // Pre-multiplied alpha/depth write handling
    gl_FragColor = vec4(finalColor, 1.0);
}
