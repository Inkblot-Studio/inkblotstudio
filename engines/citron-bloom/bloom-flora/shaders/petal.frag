uniform vec3 uRimColor;
uniform vec3 uDeepColor;
uniform float uRimPower;

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vColor;
varying float vTip;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  float ndv = max(dot(N, V), 0.0);
  float rim = pow(1.0 - ndv, uRimPower);
  vec3 inner = mix(uDeepColor, vColor.rgb, 0.35 + 0.55 * vTip);
  vec3 col = inner + uRimColor * rim * 1.5;
  gl_FragColor = vec4(col, 0.96);
}
