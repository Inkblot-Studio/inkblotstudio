uniform float uTime;
uniform vec3 uAttract;
uniform vec2 uPointer;
uniform float uPointerStrength;

vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}

float valueNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash3(i + vec3(0, 0, 0)).x;
  float n100 = hash3(i + vec3(1, 0, 0)).x;
  float n010 = hash3(i + vec3(0, 1, 0)).x;
  float n110 = hash3(i + vec3(1, 1, 0)).x;
  float n001 = hash3(i + vec3(0, 0, 1)).x;
  float n101 = hash3(i + vec3(1, 0, 1)).x;
  float n011 = hash3(i + vec3(0, 1, 1)).x;
  float n111 = hash3(i + vec3(1, 1, 1)).x;
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

vec3 curlNoise(vec3 p) {
  float e = 0.2;
  float dx = valueNoise(p + vec3(e, 0.0, 0.0)) - valueNoise(p - vec3(e, 0.0, 0.0));
  float dy = valueNoise(p + vec3(0.0, e, 0.0)) - valueNoise(p - vec3(0.0, e, 0.0));
  float dz = valueNoise(p + vec3(0.0, 0.0, e)) - valueNoise(p - vec3(0.0, 0.0, e));
  return normalize(vec3(dz - dy, dx - dz, dy - dx) + 1e-4);
}

void main() {
  vec2 vUv = gl_FragCoord.xy / resolution.xy;
  vec4 s = texture2D(texturePosition, vUv);
  vec3 p = s.xyz;

  vec3 toA = uAttract - p;
  float dA = length(toA) + 0.1;
  vec3 attract = normalize(toA) * (0.028 / (dA * dA));

  vec3 repel = vec3(0.0);
  vec2 delta = p.xz - uPointer;
  float dP = length(delta) + 0.15;
  if (dP < 1.35) {
    repel = vec3(-delta.x, 0.12, -delta.y) * (uPointerStrength / (dP * dP));
  }

  vec3 flow = curlNoise(p * 0.55 + uTime * 0.14) * 0.052;
  p += attract + repel + flow;
  p *= 0.999;

  gl_FragColor = vec4(p, 1.0);
}
