import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function createScene(containerId = 'container') {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container element with id "${containerId}" not found`);
  }
  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x875A81);
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 1.6, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 1);
  ambient.position.set(0, 1, 0);
  scene.add(ambient);
  const spotLight = new THREE.SpotLight(0xff0000, 10);
  spotLight.position.set(0, 4, 0);
  spotLight.angle = Math.PI / 6;
  scene.add(spotLight);

  const listener = new THREE.AudioListener();
  camera.add(listener);

  // containers for shared objects
  const obstacles: THREE.Object3D[] = [];
  const interactableObjects: THREE.Object3D[] = [];
  const videos: { [key: string]: HTMLVideoElement } = {};

  // load gltf scene (non-blocking)
  const loader = new GLTFLoader();
  loader.load(
    './scene.gltf',
    (loadedScene) => {
      scene.add(loadedScene.scene);
      // try to set spotLight target if available
      if (loadedScene.scene.children && loadedScene.scene.children[6]) {
        spotLight.target = loadedScene.scene.children[6];
      }
      loadedScene.scene.children.forEach(obj => {
        if ((obj as any).isMesh && obj.name !== 'Ground') {
          obstacles.push(obj);
          try {
            (obj as any).geometry.computeBoundingBox();
            (obj as any).userData.boundingBox = (obj as any).geometry.boundingBox.clone()
              .applyMatrix4(obj.matrixWorld);
          } catch (e) {
            // ignore
          }
        }
      });
    },
    undefined,
    (err) => console.error('Error loading scene.gltf', err)
  );

  // add VR button
  container.appendChild(VRButton.createButton(renderer));

  return {
    container,
    scene,
    camera,
    renderer,
    listener,
    obstacles,
    interactableObjects,
    videos,
  };
}
