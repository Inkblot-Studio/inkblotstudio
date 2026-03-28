uniform vec3 uRimColor;
uniform vec3 uDeepColor;
uniform float uRimPower;
uniform float uBloom;
uniform vec3 uAccentGlow;
uniform float uTime;
uniform float uRipplePhase;
uniform float uRippleStrength;

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vColor;
varying float vTip;

/** View-space fake HDRI: cool lift + horizon band + side strips (chrome glass read). */
vec3 fakeEnvReflect(vec3 R) {
  float up = R.y * 0.5 + 0.5;
  float horizon = exp(-pow(R.y * 2.2 - 0.15, 2.0) * 3.5);
  vec3 base = mix(vec3(0.02, 0.04, 0.09), vec3(0.2, 0.4, 0.68), up);
  base += vec3(0.14, 0.22, 0.34) * horizon * 0.55;
  base += vec3(0.55, 0.78, 1.0) * pow(max(R.x, 0.0), 3.2) * 0.28;
  base += vec3(0.82, 0.52, 0.92) * pow(max(-R.x, 0.0), 2.5) * 0.12;
  base += vec3(0.92, 0.96, 1.0) * pow(max(-R.z, 0.0), 3.5) * 0.15;
  return base;
}

void main() {
  vec3 N0 = normalize(vNormal);
  vec3 V = normalize(vView);
  // Low-frequency normal breakup — reads as organic glass, not flat plastic.
  vec3 pert = vec3(
    sin(uTime * 0.21 + vTip * 5.2 + dot(N0, vec3(3.1, 7.2, 11.3))),
    sin(uTime * 0.18 + vTip * 4.9 + dot(N0, vec3(5.4, 2.1, 8.9))),
    sin(uTime * 0.2 + vTip * 5.1 + dot(N0, vec3(9.1, 4.4, 2.6)))
  );
  vec3 N = normalize(N0 + pert * 0.042);

  float ndv = max(dot(N, V), 0.001);
  float fresnel = 0.035 + 0.965 * pow(1.0 - ndv, 4.5);
  float rim = pow(1.0 - ndv, uRimPower);

  vec3 I = normalize(-vView);
  vec3 R = reflect(I, N);
  vec3 env0 = fakeEnvReflect(R);
  float rimChromaW = pow(1.0 - ndv, 4.8) * 0.42;
  vec3 Rc = normalize(
    R + vec3(0.055, -0.024, 0.038) * pow(1.0 - ndv, 3.6)
  );
  vec3 env1 = fakeEnvReflect(Rc);
  vec3 env = mix(env0, vec3(env1.r, env0.g, env1.b), rimChromaW);

  float bb = uBloom * uBloom;

  // Body tint seen through “glass” (center more transparent)
  vec3 tint = mix(uDeepColor, vColor.rgb, 0.22 + 0.58 * vTip + 0.12 * bb);
  vec3 subsurface = mix(tint * 0.45, uAccentGlow * 0.55, 0.35 + 0.4 * vTip);
  float seeThrough = mix(0.55, 0.88, 1.0 - fresnel) * (0.65 + 0.35 * bb);

  // Second bounce fake (light trapped inside)
  vec3 R2 = reflect(R, N * 0.92 + vec3(0.08, 0.0, 0.0));
  vec3 innerBounce = fakeEnvReflect(R2) * 0.22 * (0.4 + 0.6 * vTip);

  // Caustic-ish sheen — stronger when bloom opens
  float caust = pow(max(dot(normalize(I + vec3(0.15, 0.35, 0.08)), N), 0.0), 6.0);
  vec3 caustCol = uAccentGlow * caust * (0.35 + 0.65 * bb) * (0.25 + 0.75 * vTip);

  // Thin-film / iridescent rim
  float filmPh = (1.0 - ndv) * 18.0 + uTime * 0.35;
  vec3 film =
    vec3(1.0) +
    0.35 *
      vec3(
        sin(filmPh),
        sin(filmPh + 2.1),
        sin(filmPh + 4.2)
      );
  vec3 irid = mix(vec3(1.0), film * 0.5 + vec3(0.5), rim) * pow(rim, 1.4) * 0.14;

  vec3 col = subsurface * seeThrough * (0.35 + 0.4 * (1.0 - fresnel));
  // Slightly tame env reflection so UnrealBloom doesn’t clip harshly.
  col += env * fresnel * (0.68 + 0.22 * bb);
  col += innerBounce * (0.4 + 0.6 * fresnel) * (0.5 + 0.5 * bb);
  col += uRimColor * rim * (1.15 + 0.45 * bb);
  col += caustCol;
  col += irid;
  col += uAccentGlow * bb * 0.12 * (0.3 + 0.7 * vTip) * (1.0 - ndv);

  float rip = uRippleStrength * sin(uRipplePhase + ndv * 7.0 + rim * 4.0);
  col += uAccentGlow * max(0.0, rip) * 0.052 * (0.45 + 0.55 * rim) * (0.55 + 0.45 * bb);

  float alpha = mix(0.28, 0.94, fresnel);
  alpha = mix(alpha, min(alpha + 0.06, 1.0), bb * 0.35);

  // Soft shoulder before bloom pass — keeps petals “immaculate” under heavy glow.
  col = col / (1.0 + col * 0.2);

  gl_FragColor = vec4(col, alpha);
}
