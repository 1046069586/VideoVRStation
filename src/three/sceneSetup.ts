import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

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
  // enable shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 1);
  ambient.position.set(0, 1, 0);
  scene.add(ambient);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  const d = 50;
  directionalLight.shadow.camera.left = -d;
  directionalLight.shadow.camera.right = d;
  directionalLight.shadow.camera.top = d;
  directionalLight.shadow.camera.bottom = -d;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.bias = -0.0005;
  directionalLight.position.set(0, 10, 13);
  scene.add(directionalLight);
  const directionalLight2 = directionalLight.clone();
  directionalLight2.position.set(0, 10, -13);
  scene.add(directionalLight2);
  const directionalLight3 = directionalLight.clone();
  directionalLight3.position.set(13, 10, 0);
  scene.add(directionalLight3);
  const directionalLight4 = directionalLight.clone();
  directionalLight4.position.set(-13, 10, 0);
  scene.add(directionalLight4);
  const spotLight = new THREE.SpotLight(0xff0000, 10);
  spotLight.position.set(0, 4, 0);
  spotLight.angle = Math.PI / 6;
  spotLight.castShadow = true;
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
    './scene.glb',
    (loadedScene) => {
      scene.add(loadedScene.scene);
      // try to set spotLight target if available
      if (loadedScene.scene.children && loadedScene.scene.children[6]) {
        spotLight.target = loadedScene.scene.children[6];
      }
      loadedScene.scene.children?.forEach(obj => {
        obj.receiveShadow = true;
        obj.castShadow = true;
        if ((obj as THREE.Mesh).isMesh && obj.name !== 'Ground') {
          obstacles.push(obj);
          try {
            (obj as THREE.Mesh).geometry.computeBoundingBox();
            obj.userData.boundingBox = (obj as THREE.Mesh).geometry.boundingBox?.clone()
              .applyMatrix4(obj.matrixWorld);
          } catch (e) {
            console.warn('[sceneSetup] computeBoundingBox or applyMatrix4 failed:', e);
          }
        }
      });
    },
    undefined,
    (err) => console.error('Error loading scene.gltf', err)
  );

  // add VR button
  const vrButton = VRButton.createButton(renderer);
  container.appendChild(vrButton);

  // 在用户点击进入 VR 时，将 WebAudio 的 AudioContext resume（视为一次用户授权）。
  // 注意：不要在这里对所有视频自动 play/unmute，播放应由用户使用 controller 点击单独触发。
  vrButton.addEventListener('click', async () => {
    try {
      if (listener && listener.context && listener.context.state === 'suspended') {
        try {
          await listener.context.resume();
          console.log('[audio] AudioContext resumed via VR button click');
        } catch (e) {
          console.warn('[audio] resume() failed:', e);
        }
      }
    } catch (err) {
      console.warn('[audio] VR entry audio handler error', err);
    }
  }, { once: true });

  // 1. 创建加载器
  const hdrLoader = new HDRLoader();

  // 2. 加载 HDR 贴图
  hdrLoader.load('./hdri.hdr', (texture) => {
      // 设置映射模式为经纬环绕法（等距柱状投影）
      texture.mapping = THREE.EquirectangularReflectionMapping;

      // 3. 将其设置为场景的背景（可选）
      scene.background = texture; 

      // 4. 关键：将其设置为环境贴图，这会直接作用于所有 PBR 材质
      // scene.environment = texture; 
      
      // 5. 调整渲染器以适应高质量光照
      renderer.toneMapping = THREE.ACESFilmicToneMapping; // 电影级色调映射
      renderer.toneMappingExposure = 1.0; // 曝光度调整
  });

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
