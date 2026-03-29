attribute vec4 aSeed;
attribute float aLayer;
attribute vec3 aColor;

uniform float uTime;
uniform float uDrift;
uniform float uBurst;
uniform float uAmbient;
uniform float uRevealMotion;
uniform vec3 uCameraLocal;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec4 vSeed;
varying float vLayer;
varying vec3 vColor;

void main() {
  vSeed = aSeed;
  vLayer = aLayer;
  vColor = aColor;
  vec3 p = position;
  mat3 iRot = mat3(instanceMatrix);
  vec4 world = instanceMatrix * vec4(p, 1.0);
  vec3 wp = world.xyz;

  float layerF = aLayer * 0.5;
  float rm = clamp(uRevealMotion, 0.0, 1.0);
  vec3 emit = vec3(0.0, 0.12, 0.0);
  vec3 fromEmit = wp - emit;
  vec3 radial = normalize(fromEmit + vec3(0.00012));

  float w1 = 0.86 + 0.14 * sin(uTime * (0.38 + aSeed.x * 0.22) + aSeed.y * 6.28318);
  float w2 = 0.88 + 0.12 * sin(uTime * (0.31 + aSeed.z * 0.18) + aSeed.w * 5.27 + 1.7);

  float amb = uAmbient * (0.52 + layerF * 0.28) * rm;
  float reach =
    (0.22 + layerF * 0.14) * (0.5 + uBurst * 0.9) * uDrift * rm;

  vec3 outXZ = normalize(vec3(wp.x, 0.0, wp.z) + vec3(0.00015));
  vec3 cone = normalize(vec3(wp.x, 0.2 + abs(fromEmit.y) * 0.22, wp.z) + vec3(0.00016));

  wp += radial * reach * w1 * 1.05;
  wp += outXZ * reach * w1 * 0.42;
  wp.y += reach * w2 * 0.38;
  wp += cone * reach * w2 * 0.35;

  wp += radial * amb * 0.55;
  wp += outXZ * amb * 0.28;
  wp.y += amb * 0.32;

  vec3 puff = vec3(
    sin(uTime * 0.65 + aSeed.x * 7.0),
    cos(uTime * 0.58 + aSeed.y * 6.2),
    sin(uTime * 0.62 + aSeed.z * 7.5)
  );
  wp += puff * (0.018 + layerF * 0.028) * uDrift * (0.35 + uBurst * 0.5) * rm;

  vec3 toCam = uCameraLocal - wp;
  float cd = length(toCam);
  float camPad = 0.48 + layerF * 0.08;
  if (cd < camPad && cd > 1e-6) {
    wp -= normalize(toCam) * (camPad - cd);
  }

  vec4 worldP = modelMatrix * vec4(wp, 1.0);
  mat3 worldRot = mat3(modelMatrix) * iRot;
  vWorldNormal = normalize(worldRot * normal);
  vViewDir = normalize(cameraPosition - worldP.xyz);

  vec4 mvPosition = viewMatrix * worldP;
  gl_Position = projectionMatrix * mvPosition;
}
