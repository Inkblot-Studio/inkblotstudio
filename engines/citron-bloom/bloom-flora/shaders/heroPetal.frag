uniform float uTime;
uniform float uBloom;
uniform sampler2D uEnvMap;
uniform float uEnvMapIntensity;

varying vec3 vNormal;
varying vec3 vView;
varying vec2 vUv;
varying vec3 vColor;
varying float vRing;
varying vec3 vTangent;

/* ── value noise for organic edge ── */
float hash21(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
float vnoise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),
             mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);
}

/* ── procedural vein network ── */
float veins(vec2 uv){
  float cx = abs(uv.x - 0.5);
  float central = exp(-cx * 52.0) * 0.65;

  float side = 0.0;
  for(int i = 1; i <= 9; i++){
    float t = float(i) / 10.0;
    float dy = uv.y - t;
    if(dy < -0.01 || dy > 0.14) continue;
    float prog = dy / 0.14;
    float bx = prog * 0.38;
    float ld = abs(uv.x - 0.5 + bx);
    float rd = abs(uv.x - 0.5 - bx);
    float mask = smoothstep(0.0, 0.025, dy) * smoothstep(0.14, 0.10, dy);
    side += (exp(-ld * 38.0) + exp(-rd * 38.0)) * mask * 0.28;
  }
  return clamp(central + side, 0.0, 1.0);
}

vec3 perturbN(vec3 N, float v, vec3 T){
  vec3 B = normalize(cross(N, T));
  float dx = dFdx(v) * 2.5;
  float dy = dFdy(v) * 2.5;
  return normalize(N + T * dx * 0.35 + B * dy * 0.35);
}

/* ── equirectangular env map sampling ── */
vec2 equirectUv(vec3 dir){
  float phi = atan(dir.z, dir.x);
  float theta = asin(clamp(dir.y, -1.0, 1.0));
  return vec2(phi * 0.15915494 + 0.5, theta * 0.31830988 + 0.5);
}

vec3 sampleEnv(vec3 R){
  vec3 ibl = texture2D(uEnvMap, equirectUv(R)).rgb * uEnvMapIntensity;
  float up = R.y * 0.5 + 0.5;
  vec3 fallback = mix(vec3(0.008, 0.015, 0.035), vec3(0.12, 0.38, 0.72), up);
  fallback += vec3(0.06, 0.18, 0.32) * exp(-pow(R.y*2.2 - 0.12, 2.0)*3.8) * 0.4;
  fallback += vec3(0.4, 0.68, 1.0) * pow(max(R.x, 0.0), 3.4) * 0.18;
  return mix(fallback, ibl, step(0.01, uEnvMapIntensity));
}

void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  vec3 T = normalize(vTangent);

  /* ── organic edge & tip masking ── */
  float edgeDist = abs(vUv.x - 0.5) * 2.0;
  float edgeN    = vnoise(vec2(vUv.y * 20.0, vRing * 7.0 + 3.14)) * 0.055;
  float edgeMask = 1.0 - smoothstep(0.84 + edgeN, 0.95 + edgeN, edgeDist);
  float tipMask  = 1.0 - smoothstep(0.91, 1.0, vUv.y);
  float shape    = edgeMask * tipMask;
  if(shape < 0.01) discard;

  /* ── procedural vein normal ── */
  float vein = veins(vUv);
  vec3 pN = perturbN(N, vein, T);

  /* ── Fresnel ── */
  float ndv     = max(dot(pN, V), 0.001);
  float fresnel = pow(1.0 - ndv, 3.8);

  /* ── key light (strong directional) ── */
  vec3 L      = normalize(vec3(0.5, 0.85, 0.35));
  float NdotL = dot(pN, L);
  float diff  = max(NdotL, 0.0);

  /* ── specular (glass-sharp) ── */
  vec3 H    = normalize(L + V);
  float spec = pow(max(dot(pN, H), 0.0), 80.0) * 0.62;

  /* ── SSS: light transmission through thin petal ── */
  vec3 BL       = normalize(vec3(-0.3, -0.6, -0.25));
  float backNdL = max(dot(-pN, BL), 0.0);
  float thickness = 0.25 + 0.75 * (1.0 - vUv.y * 0.55);
  float sss     = pow(backNdL, 2.0) * thickness * 0.52;

  /* ── thin-film edge tint ── */
  vec3 filmCol = vec3(0.28, 0.65, 1.0) + vec3(0.15, -0.08, 0.25) * sin(ndv * 3.14);
  float film   = fresnel * 0.12;

  /* ── env reflection (real IBL when available, fallback otherwise) ── */
  vec3 R   = reflect(normalize(-vView), pN);
  vec3 env = sampleEnv(R);

  /* ── base color: gradient from inner (lighter) to outer ── */
  vec3 baseCol = vColor;
  baseCol *= 0.88 + 0.12 * (1.0 - vUv.y);
  baseCol *= 1.0 - vein * 0.1;

  /* ── compose ── */
  float bb = uBloom * uBloom;
  vec3 col = vec3(0.0);
  col += baseCol * diff * vec3(0.95, 0.97, 1.0) * 0.72;
  col += baseCol * vec3(0.06, 0.1, 0.16) * 0.35;
  col += baseCol * 1.15 * sss * vec3(0.85, 1.0, 0.8);
  col += vec3(1.0) * spec;
  col += filmCol * film;
  col += env * fresnel * 0.55;
  col += vec3(0.14, 0.42, 0.72) * fresnel * 0.22;

  /* ── alpha: semi-transparent glass, Fresnel-driven ── */
  float alpha = mix(0.58, 0.94, 1.0 - fresnel * 0.35);
  alpha *= shape;
  alpha = mix(alpha, min(alpha + 0.08, 1.0), bb * 0.3);

  gl_FragColor = vec4(col, alpha);
}
