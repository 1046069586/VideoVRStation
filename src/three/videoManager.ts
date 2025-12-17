import { videoData } from './videoData';
import { createTerminal } from './terminal';
import { createVideoScreen } from './videoScreen';
import * as THREE from 'three';

export async function createVideos(scene: THREE.Scene, listener: THREE.AudioListener, interactableObjects: THREE.Object3D[], videos: any[]) {
  for (const video of videoData) {
    const screenMesh = createVideoScreen(video, listener, videos);
    const terminal = await createTerminal(video);
    scene.add(screenMesh, terminal);
    interactableObjects.push(screenMesh);
  }
}
