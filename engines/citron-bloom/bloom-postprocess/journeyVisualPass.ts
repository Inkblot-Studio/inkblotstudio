import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export interface JourneyVisualUniforms {
  readonly uStyle: { value: number };
  readonly uLocalT: { value: number };
  readonly uPulse: { value: number };
  readonly uTime: { value: number };
  readonly uBlackout: { value: number };
}

/**
 * Fullscreen pass: journey section boundaries get a short chromatic + shock pulse;
 * non-journey bloom experiences get a continuous, distinct screen treatment.
 */
export function createJourneyVisualPass(): ShaderPass & { journeyUniforms: JourneyVisualUniforms } {
  const journeyUniforms: JourneyVisualUniforms = {
    uStyle: { value: 0 },
    uLocalT: { value: 0 },
    uPulse: { value: 0 },
    uTime: { value: 0 },
    uBlackout: { value: 0 },
  };

  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uStyle: journeyUniforms.uStyle,
      uLocalT: journeyUniforms.uLocalT,
      uPulse: journeyUniforms.uPulse,
      uTime: journeyUniforms.uTime,
      uBlackout: journeyUniforms.uBlackout,
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uStyle;
      uniform float uLocalT;
      uniform float uPulse;
      uniform float uTime;
      uniform float uBlackout;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        vec2 p = uv - 0.5;
        float r = length(p);
        float st = uStyle;

        vec3 col = texture2D(tDiffuse, uv).rgb;

        if (st > 19.0) {
          if (abs(st - 20.0) < 0.6) {
            float w = sin(uv.y * 55.0 + uTime * 0.55) * sin(uv.x * 48.0 - uTime * 0.4);
            uv.x += w * 0.0016 * sin(uTime * 0.35);
            col = texture2D(tDiffuse, uv).rgb;
            float v = 1.0 - smoothstep(0.2, 0.72, r);
            col += vec3(0.12, 0.2, 0.45) * v * 0.06;
          } else if (abs(st - 21.0) < 0.6) {
            float band = sin(uv.x * 28.0 + uTime * 0.25) * 0.5 + 0.5;
            col *= 0.9 + 0.1 * band;
            float mist = exp(-r * r * 2.4) * 0.05;
            col += vec3(0.05, 0.18, 0.12) * mist;
          } else if (abs(st - 22.0) < 0.6) {
            vec2 g = abs(fract(uv * vec2(24.0, 14.0)) - 0.5);
            float grid = smoothstep(0.48, 0.5, max(g.x, g.y));
            col *= 0.94 + 0.06 * grid;
            col += vec3(0.06, 0.22, 0.18) * (1.0 - grid) * 0.04 * sin(uTime * 0.8);
          }
        }

        if (uPulse > 0.001) {
          float ang = st * 1.17 + sin(uLocalT * 6.28318) * 0.35;
          vec2 dir = vec2(cos(ang), sin(ang));
          float split = uPulse * 0.012;
          vec3 rgb;
          rgb.r = texture2D(tDiffuse, uv + dir * split).r;
          rgb.g = texture2D(tDiffuse, uv).g;
          rgb.b = texture2D(tDiffuse, uv - dir * split * 0.85).b;
          col = mix(col, rgb, min(1.0, uPulse * 1.15));

          float shock = exp(-pow(r * 7.2 - 1.15, 2.0)) * uPulse * 0.28;
          vec3 shockCol = vec3(0.12, 0.38, 0.62);
          if (st < 0.5) shockCol = vec3(0.18, 0.08, 0.28);
          else if (st > 0.5 && st < 1.5) shockCol = vec3(0.45, 0.25, 0.55);
          else if (st > 1.5 && st < 2.5) shockCol = vec3(0.55, 0.32, 0.18);
          else if (st > 2.5 && st < 3.5) shockCol = vec3(0.08, 0.35, 0.55);
          else if (st > 3.5 && st < 4.5) shockCol = vec3(0.1, 0.42, 0.28);
          else if (st > 4.5) shockCol = vec3(0.28, 0.12, 0.42);
          col += shockCol * shock;

          float vig = 1.0 - uPulse * (1.0 - smoothstep(0.32, 0.82, r)) * 0.38;
          col *= vig;
        }

        col = mix(col, vec3(0.0), clamp(uBlackout, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }) as ShaderPass & { journeyUniforms: JourneyVisualUniforms };

  pass.journeyUniforms = journeyUniforms;
  return pass;
}
