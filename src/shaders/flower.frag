uniform vec3 uPrimaryColor;    // #2563EB
uniform vec3 uHoverColor;      // #60A5FA
uniform vec3 uAccentColor;     // #10B981
uniform vec3 uFogColor;        // #020617
uniform float uTime;
uniform vec3 cameraPosition;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying float vRandom;
varying float vDepth;

void main() {
    // Basic View Direction
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    
    // Normal
    vec3 normal = normalize(vNormal);
    
    // Fresnel Effect (Edge Glow)
    float fresnelTerm = dot(viewDir, normal);
    fresnelTerm = clamp(1.0 - fresnelTerm, 0.0, 1.0);
    fresnelTerm = pow(fresnelTerm, 2.5); // Sharpness of the edge
    
    // Base Color Gradient along UV (assuming vUv.y is from base to tip)
    // Darker at base, brighter at tip
    vec3 baseColor = mix(uPrimaryColor * 0.5, uHoverColor, vUv.y);
    
    // Accent color near tips based on randomness to vary per instance
    float tipMask = smoothstep(0.7, 1.0, vUv.y);
    float accentMix = tipMask * (sin(vRandom * 100.0) * 0.5 + 0.5); 
    vec3 finalColor = mix(baseColor, uAccentColor, accentMix * 0.6);
    
    // Emissive Edge Glow (Fresnel)
    // Make edges glow brightly with hover or accent color
    vec3 edgeGlow = mix(uHoverColor, uAccentColor, accentMix) * fresnelTerm * 2.0;
    
    finalColor += edgeGlow;
    
    // Soft lighting
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.2));
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuseLight = uHoverColor * diff * 0.5;
    
    // Ambient light (deep blue)
    vec3 ambient = uPrimaryColor * 0.2;
    
    finalColor *= (diffuseLight + ambient + vec3(0.3)); // 0.3 base ambient

    // Add bloom emissive component
    // We can output higher than 1.0 if using HDR / tone mapping
    finalColor += edgeGlow * 1.5;

    // Fog blending
    // Linear fog based on depth
    float fogNear = 10.0;
    float fogFar = 60.0;
    float fogFactor = smoothstep(fogNear, fogFar, vDepth);
    
    // Deep environment integration
    finalColor = mix(finalColor, uFogColor, fogFactor);

    gl_FragColor = vec4(finalColor, 1.0);
    
    // Optional: tone mapping would be handled by post-processing
}
