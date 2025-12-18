<template>
  <div id="container" class="vr-scene-container"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { createScene } from './sceneSetup'
import { initControllers } from './controllers'
import { createVideos } from './videoManager'

let container = null
let scene = null
let camera = null
let renderer = null
let listener = null

let obstacles: any[] = []
let interactableObjects: any[] = []
let videos: { [key: string]: HTMLVideoElement } = {}

let controllers = null
let loopObjects = []

function render() {
  // const delta = 0.016
  const delta = (renderer.xr.isPresenting && renderer.xr.getSession()) ? (renderer.clock ? renderer.clock.getDelta() : 0.016) : 0.016;
  for (const obj of loopObjects) {
    if (obj.tick) {
      obj.tick(delta)
    }
  }
  if (controllers) {
    if (controllers.handleJoystickMovement) {
      controllers.handleJoystickMovement(delta)
    }
    if (controllers.laserFollow) {
      controllers.laserFollow(controllers.controllerLeft, controllers.lLaser, controllers.lCircle)
      controllers.laserFollow(controllers.controllerRight, controllers.rLaser, controllers.rCircle)
    }
  }
  renderer.render(scene, camera)
}

function animate() {
  renderer.setAnimationLoop(render)
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

  controllers = initControllers({ renderer, scene, camera, interactableObjects, videos, obstacles })
  loopObjects = controllers.loopObjects || []

  await createVideos(scene, listener, interactableObjects, videos)

  window.addEventListener('resize', onResize)
  animate()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
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
