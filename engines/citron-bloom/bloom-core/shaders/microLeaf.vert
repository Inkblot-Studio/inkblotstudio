attribute vec4 aInstanceColor;
attribute float aPhase;
attribute float aAlong;

uniform float uTime;
uniform float uWind;

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vColor;
varying float vAlong;

void main() {
  vAlong = aAlong;
  vColor = aInstanceColor;

  vec3 n = normal;
  float sway = sin(uTime * 1.7 + aPhase + position.y * 6.0) * 0.12 * uWind;
  float curl = sin(uTime * 0.9 + aAlong * 12.0) * 0.06 * uWind;
  vec3 pos = position;
  pos.x += sway;
  pos.z += curl;

  mat4 im = instanceMatrix;
  vec4 mv = modelViewMatrix * im * vec4(pos, 1.0);
  vView = -mv.xyz;
  mat3 nm = mat3(im);
  vNormal = normalize(normalMatrix * nm * n);
  gl_Position = projectionMatrix * mv;
}
