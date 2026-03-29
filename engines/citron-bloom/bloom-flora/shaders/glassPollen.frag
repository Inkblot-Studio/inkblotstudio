uniform float uBloom;
uniform sampler2D uEnvMap;
uniform float uEnvMapIntensity;
uniform float uOpacity;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec4 vSeed;
varying float vLayer;
varying vec3 vColor;

#include "./heroGlassEnv.glsl"

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(vViewDir);
  float ndv = max(dot(N, V), 0.001);
  float fresnel = pow(1.0 - ndv, 3.8);

  vec3 L = normalize(vec3(0.5, 0.85, 0.35));
  float NdotL = dot(N, L);
  float diff = max(NdotL, 0.0);

  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 80.0) * 0.55;

  vec3 BL = normalize(vec3(-0.3, -0.6, -0.25));
  float backNdL = max(dot(-N, BL), 0.0);
  float thickness = 0.72;
  float sss = pow(backNdL, 2.0) * thickness * 0.48;

  vec3 filmCol = vec3(0.28, 0.65, 1.0) + vec3(0.15, -0.08, 0.25) * sin(ndv * 3.14);
  float film = fresnel * 0.12;

  vec3 R = reflect(normalize(-vViewDir), N);
  vec3 env = sampleEnv(R);

  float hueJ = vSeed.x * 0.04 + vSeed.y * 0.03;
  vec3 baseCol = vColor * (0.92 + hueJ);

  float bb = uBloom * uBloom;
  vec3 col = vec3(0.0);
  col += baseCol * diff * vec3(0.95, 0.97, 1.0) * 0.72;
  col += baseCol * vec3(0.06, 0.1, 0.16) * 0.35;
  col += baseCol * 1.15 * sss * vec3(0.85, 1.0, 0.8);
  col += vec3(1.0) * spec;
  col += filmCol * film;
  col += env * fresnel * 0.52;
  col += vec3(0.14, 0.42, 0.72) * fresnel * 0.22;

  float layerF = vLayer * 0.5;
  float alpha = mix(0.58, 0.94, 1.0 - fresnel * 0.35);
  alpha = mix(alpha, min(alpha + 0.08, 1.0), bb * 0.3);
  alpha *= uOpacity * (0.9 + 0.1 * layerF);

  gl_FragColor = vec4(col, alpha);
}
