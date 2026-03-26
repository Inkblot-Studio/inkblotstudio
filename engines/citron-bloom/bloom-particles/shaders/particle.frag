uniform vec3 uColorCore;
uniform vec3 uColorEdge;

varying float vDepth;
varying vec2 vRef;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  if (r > 1.0) discard;
  float soft = smoothstep(1.0, 0.2, r);
  float tw = sin(vRef.x * 40.0 + vRef.y * 40.0) * 0.5 + 0.5;
  vec3 col = mix(uColorCore, uColorEdge, r * 0.85 + 0.15 * tw);
  gl_FragColor = vec4(col, 0.35 * soft);
}
