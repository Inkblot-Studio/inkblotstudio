attribute vec4 aInstanceColor;
attribute float aPhase;
attribute float aAlong;
attribute float aRandom;

uniform float uTime;
uniform float uWind;
uniform float uCohesion;
uniform vec2 uPointer;
uniform float uPointerBoost;
uniform vec3 uCameraWorld;

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vColor;
varying float vAlong;
varying float vDepth;
varying float vCamDist;

void main() {
  vAlong = aAlong;
  vColor = aInstanceColor;

  vec3 n = normal;
  float sway =
    sin(uTime * 1.55 + aPhase + position.y * 5.5) * 0.14 * uWind;
  float curl = sin(uTime * 0.85 + aAlong * 14.0 + aRandom * 6.28) * 0.07 * uWind;
  float breathe = sin(uTime * 2.1 + aRandom * 6.28) * 0.04 * uCohesion;
  vec3 pos = position;
  pos.x += sway + breathe;
  pos.z += curl;
  pos.y += sin(uTime * 1.1 + aPhase * 0.5) * 0.035 * uWind;

  float pb = uPointerBoost * (0.55 + 0.45 * aRandom);
  pos.x += uPointer.x * pb * 0.38 * sin(aPhase + aAlong * 3.0);
  pos.z += uPointer.y * pb * 0.38 * cos(aPhase * 0.85 + aAlong * 2.4);
  pos.y += (uPointer.x + uPointer.y) * pb * 0.08 * sin(aRandom * 6.28 + uTime * 0.6);

  mat4 im = instanceMatrix;
  vec4 worldPos = modelMatrix * im * vec4(pos, 1.0);
  vCamDist = distance(worldPos.xyz, uCameraWorld);
  vec4 mv = viewMatrix * worldPos;
  vView = -mv.xyz;
  vDepth = length(mv.xyz);

  mat3 nm = mat3(im);
  vNormal = normalize(normalMatrix * nm * n);
  gl_Position = projectionMatrix * mv;
}
