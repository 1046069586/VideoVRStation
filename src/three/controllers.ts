import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export type InitControllersOptions = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  interactableObjects: THREE.Object3D[];
  videos: { [key: string]: HTMLVideoElement };
  obstacles: THREE.Object3D[];
  playerStart?: THREE.Vector3;
};

export function initControllers(options: InitControllersOptions) {
  const { renderer, scene, camera, interactableObjects, videos, obstacles } = options;
  const player = new THREE.Group();
  player.position.set(0, 0.2, 8);
  player.add(camera);
  scene.add(player);

  const controllerLeft: any = renderer.xr.getController(0);
  const controllerRight: any = renderer.xr.getController(1);

  const controllerModelFactory = new XRControllerModelFactory();

  const controllerGripLeft = renderer.xr.getControllerGrip(0);
  controllerGripLeft.add(controllerModelFactory.createControllerModel(controllerGripLeft));
  player.add(controllerGripLeft);

  const controllerGripRight = renderer.xr.getControllerGrip(1);
  controllerGripRight.add(controllerModelFactory.createControllerModel(controllerGripRight));
  player.add(controllerGripRight);

  // state
  const loopObjects: any[] = [];

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
  function onSelectStart(event: any) {
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
          video.play?.();
          break
        }
        if (inter.object.userData.action === 'stop') {
          video.pause?.();
          break
        }
      }
    }
  }

  function onSelectEnd() {
  
  }

  controllerLeft.addEventListener('selectstart', onSelectStart);
  controllerLeft.addEventListener('selectend', onSelectEnd);
  controllerLeft.addEventListener('connected', (event: any) => {
    controllerLeft.gamepad = event.data.gamepad;
    controllerLeft.handedness = event.data.handedness;
  });
  player.add(controllerLeft);

  controllerRight.addEventListener('selectstart', onSelectStart);
  controllerRight.addEventListener('selectend', onSelectEnd);
  controllerRight.addEventListener('connected', (event: any) => {
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
      const bs = (obs as any).userData.boundingBox;
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
        (camera as any).getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const newPosition = player.position.clone().addScaledVector(forward, -y * moveSpeed * delta);
        updatePlayerPosition(newPosition);
      }
      if (Math.abs(x) > deadZone) {
        const cameraForward = new THREE.Vector3();
        (camera as any).getWorldDirection(cameraForward);
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

  function createLaser() {
    const laserGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const laserMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const laser = new THREE.Line(laserGeometry, laserMaterial);
    return laser;
  }

  function createCircle() {
    const geom = new THREE.RingGeometry(0.01, 0.013, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
    const circle = new THREE.Mesh(geom, material);
    let time = 0;
    (circle as any).tick = (delta: number) => {
      time += delta;
      const scale = 0.8 + Math.sin(time * 3) * 0.3;
      circle.scale.set(scale, scale, scale);
    };
    return circle;
  }

  function laserFollow(controller: any, laser: any, circle: any) {
    const matrix = new THREE.Matrix4();
    matrix.identity().extractRotation(controller.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(matrix).normalize();
    const controllerPosition = new THREE.Vector3();
    controller.getWorldPosition(controllerPosition);
    const raycaster = new THREE.Raycaster();
    raycaster.set(controllerPosition, direction);
    const intersects = raycaster.intersectObjects(interactableObjects, true);
    if (intersects.length > 0) {
      laser.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -intersects[0].distance)]);
      laser.material.color.set(0x00ff00);
      const director = intersects[0].point.clone().sub(controllerPosition).normalize();
      circle.position.copy(intersects[0].point.clone().sub(director.multiplyScalar(0.01)));
      circle.visible = true;
      const cameraPosition = new THREE.Vector3();
      (camera as any).getWorldPosition(cameraPosition);
      circle.lookAt(cameraPosition);
    } else {
      laser.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -10)]);
      laser.material.color.set(0xff0000);
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
