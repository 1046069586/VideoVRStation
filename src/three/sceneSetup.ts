import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import type { TickableObject } from './types';

export async function createScene(containerId = 'container') {
  // containers for shared objects
  const obstacles: THREE.Object3D[] = [];
  const interactableObjects: THREE.Object3D[] = [];
  const videos: { [key: string]: HTMLVideoElement } = {};
  const loopObjects: TickableObject[] = [];

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

  const spotLight = new THREE.SpotLight(0xff0000, 50);
  spotLight.position.set(0, 4, 0);
  spotLight.angle = Math.PI / 6;
  spotLight.castShadow = true;
  scene.add(spotLight);
  // 创建一个 tickable 对象，用于每帧改变 spotLight 的颜色和强度，达到蹦迪灯光效果
  let spotTime = 0;
  const spotTicker = new THREE.Object3D() as TickableObject;
  spotTicker.tick = (delta: number) => {
    spotTime += delta;
    // 颜色随时间在色相环上循环
    const hue = (spotTime * 0.2) % 1; // 0.2 控制色相变换速度，可调
    spotLight.color.setHSL(hue, 0.9, 0.5);
    // 可选：随时间脉冲强度，创造闪烁效果
    spotLight.intensity = 14 + Math.sin(spotTime * 8) * 6; // 基准强度 14，振幅 6，频率 8
  };
  loopObjects.push(spotTicker);

  const listener = new THREE.AudioListener();
  camera.add(listener);

  
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

  loader.load(
    './miku-dance.glb',
    (loadedModel) => {
      console.log('Loaded miku-dance.glb:', loadedModel);
      const miku_model = loadedModel.scene;
      // 对模型所有子网格开启阴影投射与接收（Group 本身不影响子 Mesh）
      miku_model.traverse((child) => {
        // @ts-ignore - use isMesh guard
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).castShadow = true;
          (child as THREE.Mesh).receiveShadow = true;
        }
      });
      miku_model.position.set(0, 1, 0);
      miku_model.rotateY(Math.PI); // 旋转180度，使其面向前方
      scene.add(miku_model);

      // 添加位置音频（PositionalAudio），读取 public/bgm.mp3 作为 BGM，挂在 miku_model 上
      try {
        const audioLoader = new THREE.AudioLoader();
        const bgm = new THREE.PositionalAudio(listener);
        // 加载 public 下的 bgm.mp3（Vite public 文件夹通过根路径提供）
        audioLoader.load('/bgm.mp3', (buffer) => {
          bgm.setBuffer(buffer);
          bgm.setLoop(true);
          bgm.setRefDistance(1);
          bgm.setRolloffFactor(2);         // 衰减速率，越大越快
          bgm.setDistanceModel('exponential');
          bgm.panner.maxDistance = 2.5;
          bgm.setVolume(0.8);
          // 尝试直接播放；若被浏览器策略阻止，会在 catch 中处理
          try {
            const playResult = bgm.play();
            // play() 在某些实现中返回 Promise
            if (playResult && typeof (playResult as any).catch === 'function') {
              (playResult as any).catch((err: any) => {
                console.warn('[audio] bgm.play() rejected:', err);
              });
            }
          } catch (err) {
            console.warn('[audio] bgm.play() failed sync:', err);
          }
        }, undefined, (err) => {
          console.error('[audio] bgm load error', err);
        });

        // 将 bgm 挂载到模型，使其随模型位置移动
        bgm.position.set(0, 0, 0); // 相对于模型中心
        scene.add(bgm);

        // 如果浏览器阻止了自动播放，使用一次性用户交互恢复音频上下文并播放
        if (listener && listener.context && listener.context.state === 'suspended') {
          const resumeHandler = async () => {
            try {
              await listener.context.resume();
              // 尝试播放所有 PositionalAudio 子对象
              miku_model.traverse((c) => {
                // @ts-ignore
                if (c?.isPositionalAudio) {
                  try { (c as THREE.PositionalAudio).play(); } catch (e) { /* ignore */ }
                }
              });
            } catch (e) {
              console.warn('[audio] resume on user gesture failed', e);
            }
          };
          document.addEventListener('click', resumeHandler, { once: true });
        }
      } catch (e) {
        console.warn('[sceneSetup] positional audio setup failed', e);
      }

      // 如果模型包含动画，创建 AnimationMixer 并播放动画
      try {
        if (loadedModel.animations && loadedModel.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(miku_model);
          loadedModel.animations.forEach((clip) => {
            try {
              const action = mixer.clipAction(clip);
              action.play();
            } catch (e) {
              console.warn('[sceneSetup] failed to create/play action for clip', e);
            }
          });

          // 将 mixer 的更新逻辑暴露为一个可打点的对象，交由主循环调用
          const mixerTicker = miku_model as TickableObject;
          mixerTicker.tick = (delta: number) => {
            mixer.update(delta);
          };
          loopObjects.push(mixerTicker);
        }
      } catch (e) {
        console.warn('[sceneSetup] animation setup failed', e);
      }
    },
    undefined,
    (err) => console.error('Error loading miku-dance.glb', err)
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
    loopObjects,
  };
}
