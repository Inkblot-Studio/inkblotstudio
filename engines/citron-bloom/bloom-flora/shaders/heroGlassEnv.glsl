/* Requires: uniform sampler2D uEnvMap; uniform float uEnvMapIntensity; */

vec2 equirectUv(vec3 dir) {
  float phi = atan(dir.z, dir.x);
  float theta = asin(clamp(dir.y, -1.0, 1.0));
  return vec2(phi * 0.15915494 + 0.5, theta * 0.31830988 + 0.5);
}

vec3 sampleEnv(vec3 R) {
  vec3 ibl = texture2D(uEnvMap, equirectUv(R)).rgb * uEnvMapIntensity;
  float up = R.y * 0.5 + 0.5;
  vec3 fallback = mix(vec3(0.008, 0.015, 0.035), vec3(0.12, 0.38, 0.72), up);
  fallback += vec3(0.06, 0.18, 0.32) * exp(-pow(R.y * 2.2 - 0.12, 2.0) * 3.8) * 0.4;
  fallback += vec3(0.4, 0.68, 1.0) * pow(max(R.x, 0.0), 3.4) * 0.18;
  return mix(fallback, ibl, step(0.01, uEnvMapIntensity));
}
