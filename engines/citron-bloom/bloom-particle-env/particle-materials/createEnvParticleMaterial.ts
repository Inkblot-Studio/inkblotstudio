import { Color, ShaderMaterial, Vector2, Vector3 } from 'three';
import envParticleVert from './shaders/envParticle.vert';
import envParticleFrag from './shaders/envParticle.frag';
import { BloomTokens } from '../../bloom-core/tokens';

export interface EnvParticleMaterialOptions {
  wind?: number;
  cohesion?: number;
  rimPower?: number;
  fadeNear?: number;
  fadeFar?: number;
  alpha?: number;
  coreColor?: Color;
  rimColor?: Color;
  /** World units: particles closer than this to the camera fade out (see uCamNearFadeEnd). */
  camNearFadeStart?: number;
  camNearFadeEnd?: number;
}

export function createEnvParticleMaterial(options: EnvParticleMaterialOptions = {}): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: envParticleVert,
    fragmentShader: envParticleFrag,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: options.wind ?? 1 },
      uCohesion: { value: options.cohesion ?? 0.65 },
      uRimColor: { value: (options.rimColor ?? BloomTokens.citron300).clone() },
      uCoreColor: { value: (options.coreColor ?? BloomTokens.citron700).clone() },
      uRimPower: { value: options.rimPower ?? 2.2 },
      uFadeNear: { value: options.fadeNear ?? 28 },
      uFadeFar: { value: options.fadeFar ?? 72 },
      uAlpha: { value: options.alpha ?? 0.88 },
      uPointer: { value: new Vector2(0, 0) },
      uPointerBoost: { value: 0 },
      uCameraWorld: { value: new Vector3(0, 0, 8) },
      uCamNearFadeStart: { value: options.camNearFadeStart ?? 0.26 },
      uCamNearFadeEnd: { value: options.camNearFadeEnd ?? 0.92 },
    },
    transparent: true,
    depthWrite: false,
  });
}
