import {
  type Camera,
  type Object3D,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import { FLOWER_GROUND_PLANE_WORLD_Y } from './flowerStageConstants';

const _raycaster = new Raycaster();
const _plane = new Plane(new Vector3(0, 1, 0), -FLOWER_GROUND_PLANE_WORLD_Y);
const _hit = new Vector3();

/**
 * Projects NDC pointer onto the world ground plane, then into experience-root local XZ
 * (mist ripples, stable under orbiting camera).
 */
export function flowerGroundPointerLocal(
  camera: Camera,
  ndc: Vector2,
  experienceRoot: Object3D,
  outLocalXz: Vector2,
): boolean {
  _raycaster.setFromCamera(ndc, camera);
  if (!_raycaster.ray.intersectPlane(_plane, _hit)) {
    return false;
  }
  experienceRoot.worldToLocal(_hit);
  outLocalXz.set(_hit.x, _hit.z);
  return true;
}
