<template>
  <div id="container" class="vr-scene-container"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import * as THREE from 'three'
import { createScene } from './sceneSetup'
import { initControllers } from './controllers'
import { initMnkControls } from './mnkControls'
import { createVideos } from './videoManager'
import type { TickableObject } from './types'
// import { createXRConsole } from './XRConsole';

let container: HTMLElement | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let listener: THREE.AudioListener | null = null

let obstacles: THREE.Object3D[] = []
let interactableObjects: THREE.Object3D[] = []
let videos: { [key: string]: HTMLVideoElement } = {}

let controllers: ReturnType<typeof initControllers> | null = null
let loopObjects: TickableObject[] = []
const clock = new THREE.Clock();
let mnkControls: ReturnType<typeof initMnkControls> | null = null

function render() {
  const delta = clock.getDelta();
  for (const obj of loopObjects) {
    obj.tick?.(delta)
  }

  // controllers may be null; use optional chaining and guard their members
  controllers?.handleJoystickMovement?.(delta)
  controllers?.laserFollow?.(controllers?.controllerLeft, controllers?.lLaser, controllers?.lCircle)
  controllers?.laserFollow?.(controllers?.controllerRight, controllers?.rLaser, controllers?.rCircle)

  // mnk controls update (WASD + mouse look)
  mnkControls?.update(delta)

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function animate() {
  if (renderer) renderer.setAnimationLoop(render)
}

const onResize = () => {
  if (!container || !camera || !renderer) return
  const w = container.clientWidth
  const h = container.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

onMounted(async () => {
  const res = await createScene('container')
  container = res.container
  scene = res.scene
  camera = res.camera
  renderer = res.renderer
  listener = res.listener
  obstacles = res.obstacles
  interactableObjects = res.interactableObjects
  videos = res.videos

  // pass explicitly-typed values to controllers
  controllers = initControllers({ renderer, scene, camera, interactableObjects, videos, obstacles, listener })
  loopObjects = controllers?.loopObjects || []

  // initialize desktop controls and attach to same player used by VR controllers (if present)
  try {
    mnkControls = initMnkControls({ renderer, scene, camera, domElement: renderer.domElement, interactableObjects, videos, obstacles, listener, player: controllers.player })
  } catch (e) {
    // fail gracefully if desktop controls can't be created
    console.warn('desktop controls init failed', e)
    mnkControls = null
  }

  await createVideos(scene, listener, interactableObjects, videos)

  window.addEventListener('resize', onResize)
  animate()
  // 1. 创建控制台实例
  // const xrConsole = createXRConsole();
  // xrConsole.position.set(0, 0.15, -0.1);
  // xrConsole.rotation.x = -Math.PI / 3; // 轻微向上倾斜，便于阅读
  // controllers?.controllerGripLeft?.add(xrConsole);
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  mnkControls?.dispose()
  if (renderer) {
    renderer.dispose()
  }
  if (container && renderer && renderer.domElement) {
    container.removeChild(renderer.domElement)
  }
})
</script>

<style scoped>
.vr-scene-container {
  width: 100%;
  height: 100%;
}
</style>
