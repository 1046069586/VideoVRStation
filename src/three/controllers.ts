import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import type { InitControllersOptions, TickableObject, ControllerEvent, ControllerEventTarget } from './types'

export function initControllers(options: InitControllersOptions) {
  const { renderer, scene, camera, interactableObjects, videos, obstacles, listener } = options;
  const player = new THREE.Group();
  player.position.set(0, 0.2, 8);
  player.add(camera);
  scene.add(player);

  const controllerLeft: ControllerEventTarget = renderer.xr.getController(0);
  const controllerRight: ControllerEventTarget = renderer.xr.getController(1);

  const controllerModelFactory: XRControllerModelFactory = new XRControllerModelFactory();

  // controllerGripLeft&controllerGripRight 仅用于生成模型
  const controllerGripLeft: THREE.XRGripSpace = renderer.xr.getControllerGrip(0);
  controllerGripLeft.add(controllerModelFactory.createControllerModel(controllerGripLeft));
  player.add(controllerGripLeft);
  const controllerGripRight: THREE.XRGripSpace = renderer.xr.getControllerGrip(1);
  controllerGripRight.add(controllerModelFactory.createControllerModel(controllerGripRight));
  player.add(controllerGripRight);

  // state
  const loopObjects: TickableObject[] = [];

  // create lasers and circles
  const rLaser = createLaser();
  const lLaser = createLaser();
  const rCircle = createCircle();
  const lCircle = createCircle();
  rCircle.visible = false;
  lCircle.visible = false;
  scene.add(rCircle, lCircle);
  loopObjects.push(rCircle, lCircle);

  // attach events
  async function onSelectStart(event: ControllerEvent) {
    const controller = event.target;
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);

    const raycaster = new THREE.Raycaster();
    const controllerPos = new THREE.Vector3();
    controller.getWorldPosition(controllerPos);
    const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix).normalize();
    raycaster.set(controllerPos, direction);

    const intersects = raycaster.intersectObjects(interactableObjects, true);
    for (const inter of intersects) {
      const video = videos[inter.object.userData.index];
      if (video) {
        if (inter.object.userData.action === 'play') {
          try {
            // 在 controller 触发时尝试 resume AudioContext（如果传入了 listener）
            if (listener && listener.context && listener.context.state === 'suspended') {
              try {
                await listener.context.resume();
                console.log('[audio] AudioContext resumed via controller interaction');
              } catch (e) {
                console.warn('[audio] resume() via controller failed:', e);
              }
            }

            const p = video.play?.();
            if (p && typeof p.then === 'function') {
              await p;
            }
            // 在播放成功后解除静音（用户显式交互触发）
            try {
              video.muted = false;
            } catch (e) {
              // ignore
            }
          } catch (err) {
            // 捕获并打印 play() 的拒绝信息，便于调试 autoplay/权限问题
            console.warn('video.play() rejected:', err);
          }
          break
        }
        if (inter.object.userData.action === 'stop') {
          try {
            video.pause?.();
          } catch (e) {
            // ignore
          }
          break
        }
      }
    }
  }

  function onSelectEnd() {
  
  }

  controllerLeft.addEventListener('selectstart', onSelectStart);
  controllerLeft.addEventListener('selectend', onSelectEnd);
  controllerLeft.addEventListener('connected', (event: ControllerEvent) => {
    controllerLeft.gamepad = event.data.gamepad;
    controllerLeft.handedness = event.data.handedness;
  });
  player.add(controllerLeft);

  controllerRight.addEventListener('selectstart', onSelectStart);
  controllerRight.addEventListener('selectend', onSelectEnd);
  controllerRight.addEventListener('connected', (event: ControllerEvent) => {
    controllerRight.gamepad = event.data.gamepad;
    controllerRight.handedness = event.data.handedness;
  });
  player.add(controllerRight);

  // attach lasers to controllers
  controllerRight.add(rLaser);
  controllerLeft.add(lLaser);

  // movement params
  const moveSpeed = 1.5;
  const rotateSpeed = 1.2;
  const deadZone = 0.2;

  function updatePlayerPosition(newPosition: THREE.Vector3) {
    const oldPosition = player.position.clone();
    const playerRadius = 0.25;
    player.position.copy(newPosition);
    const playerSphere = new THREE.Sphere(player.position.clone(), playerRadius);
    for (const obs of obstacles) {
      const bs = obs.userData.boundingBox;
      if (bs && playerSphere.intersectsBox(bs)) {
        player.position.copy(oldPosition);
        break;
      }
    }
  }

  function handleJoystickMovement(delta: number) {
    if (controllerLeft && controllerLeft.gamepad) {
      const gp = controllerLeft.gamepad;
      const axes = gp.axes || [];
      const x = axes[2] || 0;
      const y = axes[3] || 0;
      if (Math.abs(y) > deadZone) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const newPosition = player.position.clone().addScaledVector(forward, -y * moveSpeed * delta);
        updatePlayerPosition(newPosition);
      }
      if (Math.abs(x) > deadZone) {
        const cameraForward = new THREE.Vector3();
        camera.getWorldDirection(cameraForward);
        cameraForward.y = 0;
        cameraForward.normalize();
        const rightVec = new THREE.Vector3();
        rightVec.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0)).normalize();
        const newPosition = player.position.clone().addScaledVector(rightVec, x * moveSpeed * delta);
        updatePlayerPosition(newPosition);
      }
    }
    if (controllerRight && controllerRight.gamepad) {
      const gpR = controllerRight.gamepad;
      const rx = (gpR.axes && gpR.axes[2]) || 0;
      if (Math.abs(rx) > deadZone) {
        player.rotation.y -= rx * rotateSpeed * delta;
      }
    }
  }

  function createLaser(): THREE.Line {
    const laserGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const laserMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const laser = new THREE.Line(laserGeometry, laserMaterial);
    return laser;
  }

  function createCircle(): TickableObject {
    const geom = new THREE.RingGeometry(0.01, 0.013, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
    const circle = new THREE.Mesh(geom, material) as TickableObject;
    let time = 0;
    circle.tick = (delta: number) => {
      time += delta;
      const scale = 0.8 + Math.sin(time * 3) * 0.3;
      circle.scale.set(scale, scale, scale);
    };
    return circle;
  }

  function laserFollow(controller: ControllerEventTarget, laser: THREE.Line, circle: TickableObject) {
    const matrix = new THREE.Matrix4();
    matrix.identity().extractRotation(controller.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(matrix).normalize();
    const controllerPosition = new THREE.Vector3();
    controller.getWorldPosition(controllerPosition);
    const raycaster = new THREE.Raycaster();
    raycaster.set(controllerPosition, direction);
    const intersects = raycaster.intersectObjects(interactableObjects, true) || [];
    if (intersects.length > 0 && intersects[0]) {
      const firstIntersect = intersects[0];
      laser.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -firstIntersect.distance)]);
      (laser.material as THREE.LineBasicMaterial).color.set(0x00ff00);
      const director = firstIntersect.point.clone().sub(controllerPosition).normalize();
      circle.position.copy(firstIntersect.point.clone().sub(director.multiplyScalar(0.01)));
      circle.visible = true;
      const cameraPosition = new THREE.Vector3();
      camera.getWorldPosition(cameraPosition);
      circle.lookAt(cameraPosition);
    } else {
      laser.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -10)]);
      (laser.material as THREE.LineBasicMaterial).color.set(0xff0000);
      circle.visible = false;
    }
  }

  return {
    player,
    controllerLeft,
    controllerRight,
    controllerGripLeft,
    controllerGripRight,
    rLaser,
    lLaser,
    rCircle,
    lCircle,
    loopObjects,
    handleJoystickMovement,
    laserFollow,
    updatePlayerPosition,
  };
}
