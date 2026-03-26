uniform sampler2D uPositions;
uniform float uSize;

attribute vec2 aRef;

varying float vDepth;
varying vec2 vRef;

void main() {
  vRef = aRef;
  vec3 p = texture2D(uPositions, aRef).xyz;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mv.z;
  gl_PointSize = uSize * (300.0 / max(-mv.z, 0.5));
  gl_Position = projectionMatrix * mv;
}
