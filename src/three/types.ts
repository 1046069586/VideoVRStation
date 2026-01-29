import * as THREE from 'three';

export type TickableObject = THREE.Object3D & { tick?: (delta: number) => void };

export type InitControllersOptions = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  interactableObjects: THREE.Object3D[];
  videos: { [key: string]: HTMLVideoElement };
  listener?: THREE.AudioListener;
  obstacles: THREE.Object3D[];
  playerStart?: THREE.Vector3;
};

export type ControllerEventTarget = THREE.XRTargetRaySpace & { gamepad?: Gamepad; handedness?: string }

export interface ControllerEvent {
  type: string;
  target: ControllerEventTarget;
  // three.js 有时把 XRInputSource 放到 event.data；保留兼容性
  data: XRInputSource | { gamepad?: Gamepad; handedness?: string };
}

export type VideoData = {
  id: number;
  url: string;
  title: string;  
  position: [number, number, number];
  normal: [number, number, number];
};