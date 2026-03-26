uniform vec3 uColorNear;
uniform vec3 uColorFar;
uniform vec3 uRimColor;
uniform float uRimPower;

varying vec3 vNormal;
varying vec3 vView;
varying float vAlong;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  float rim = pow(1.0 - max(dot(N, V), 0.0), uRimPower);
  vec3 base = mix(uColorNear, uColorFar, smoothstep(0.0, 1.0, vAlong));
  vec3 col = base + uRimColor * rim * 1.25;
  gl_FragColor = vec4(col, 1.0);
}
