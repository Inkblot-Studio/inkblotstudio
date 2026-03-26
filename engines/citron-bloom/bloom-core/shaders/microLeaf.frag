uniform vec3 uRimColor;
uniform vec3 uCoreColor;
uniform float uRimPower;

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vColor;
varying float vAlong;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  float ndv = max(dot(N, V), 0.0);
  float rim = pow(1.0 - ndv, uRimPower);
  vec3 base = mix(uCoreColor, vColor.rgb, 0.65);
  vec3 lit = base + uRimColor * rim * 1.4;
  float vign = smoothstep(0.15, 1.0, vAlong);
  gl_FragColor = vec4(lit * (0.85 + 0.15 * vign), 0.92);
}
