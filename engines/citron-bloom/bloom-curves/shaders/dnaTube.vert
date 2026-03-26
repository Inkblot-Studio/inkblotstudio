uniform float uTime;
uniform float uWind;
uniform float uTwist;

varying vec3 vNormal;
varying vec3 vView;
varying float vAlong;

void main() {
  vAlong = uv.x;
  float wave = sin(uTime * 2.2 + uv.x * 14.0 + position.y * 8.0) * 0.018 * uWind;
  float bend = sin(uTime * 0.85 + uv.x * 6.28318 * uTwist) * 0.04 * uWind;
  vec3 p = position + normal * wave + vec3(bend, 0.0, bend * 0.6);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = -mv.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
