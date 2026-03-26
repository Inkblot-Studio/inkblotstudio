uniform vec3 uRimColor;
uniform vec3 uCoreColor;
uniform float uRimPower;
uniform float uFadeNear;
uniform float uFadeFar;
uniform float uAlpha;
uniform float uCamNearFadeStart;
uniform float uCamNearFadeEnd;

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vColor;
varying float vAlong;
varying float vDepth;
varying float vCamDist;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  float ndv = max(dot(N, V), 0.0);
  float rim = pow(1.0 - ndv, uRimPower);
  vec3 base = mix(uCoreColor, vColor.rgb, 0.62);
  vec3 lit = base + uRimColor * rim * 1.35;
  float vign = smoothstep(0.12, 1.0, vAlong);
  lit *= 0.82 + 0.18 * vign;

  float depthFade = smoothstep(uFadeFar, uFadeNear, vDepth);
  float camShield = smoothstep(uCamNearFadeStart, uCamNearFadeEnd, vCamDist);
  float a = uAlpha * depthFade * camShield * (0.88 + 0.12 * rim);
  gl_FragColor = vec4(lit, a);
}
