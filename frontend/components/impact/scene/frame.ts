/**
 * Shared tangent-frame helper for impact-scene effects.
 *
 * Builds an orthonormal basis at the impact point on the Earth's
 * surface so children (Crater, EjectaChunks, ThermalGlowHalo, …) can
 * place + rotate geometry consistently. `azimuthDeg` rotates the
 * tangent so X axis points downrange (North-clockwise).
 */

import * as THREE from 'three';

export interface ImpactFrame {
  origin: THREE.Vector3;
  /** Surface outward normal at the impact point. */
  normal: THREE.Vector3;
  /** Downrange direction (along the impact velocity ground projection). */
  downrange: THREE.Vector3;
  /** Cross-track tangent (right-hand rule from normal × downrange). */
  crosstrack: THREE.Vector3;
}

export function makeImpactFrame(
  impactPoint: [number, number, number],
  azimuthDeg: number,
): ImpactFrame {
  const origin = new THREE.Vector3(...impactPoint);
  const normal = origin.clone().normalize();

  // Build a "north" reference in the tangent plane: project world +Y
  // onto the plane (perpendicular to `normal`).
  const worldUp = new THREE.Vector3(0, 1, 0);
  let north = worldUp.clone().sub(normal.clone().multiplyScalar(worldUp.dot(normal)));
  if (north.lengthSq() < 1e-6) {
    // Impact at pole — pick world +X projected.
    const worldX = new THREE.Vector3(1, 0, 0);
    north = worldX.clone().sub(normal.clone().multiplyScalar(worldX.dot(normal)));
  }
  north.normalize();

  // East = normal × north (right-hand)
  const east = new THREE.Vector3().crossVectors(normal, north).normalize();

  // Rotate (north, east) by azimuthDeg around the normal so X axis (downrange)
  // points along the requested azimuth (0 = N, 90 = E).
  const az = (azimuthDeg * Math.PI) / 180;
  const cos = Math.cos(az);
  const sin = Math.sin(az);
  const downrange = north.clone().multiplyScalar(cos).addScaledVector(east, sin).normalize();
  const crosstrack = new THREE.Vector3().crossVectors(normal, downrange).normalize();

  return { origin, normal, downrange, crosstrack };
}

/** Quaternion that aligns world +Z with `normal` and world +X with `downrange`. */
export function frameQuaternion(frame: ImpactFrame): THREE.Quaternion {
  const m = new THREE.Matrix4().makeBasis(frame.downrange, frame.crosstrack, frame.normal);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}
