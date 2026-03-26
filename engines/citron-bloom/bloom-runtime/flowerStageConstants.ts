/**
 * Shared layout for the flower journey: root offset, ground disc height, camera floor.
 * Keep in sync with `createCitronBloomScene` ground mesh and `createFlowerBloomExperience` root position.
 */
export const FLOWER_EXPERIENCE_ROOT_Y = -0.35;

/** Horizontal ground disc Y relative to the flower experience root. */
export const FLOWER_GROUND_DISC_LOCAL_Y = -0.52;

/** World-space ground plane (top of disc) for camera clamping. */
export const FLOWER_GROUND_PLANE_WORLD_Y = FLOWER_EXPERIENCE_ROOT_Y + FLOWER_GROUND_DISC_LOCAL_Y;

/** Minimum camera Y (world) = ground plane + this offset, when the floor clamp is active. */
export const FLOWER_CAMERA_CLEARANCE_ABOVE_GROUND = 0.5;

/** Hero ground disc radius in world units (XZ). */
export const FLOWER_GROUND_DISC_RADIUS = 6.4;
