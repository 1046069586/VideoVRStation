import * as THREE from 'three'
import type { InitMnkOptions } from './types'

export function initMnkControls(options: InitMnkOptions) {
  const { scene, camera, domElement, interactableObjects, videos, obstacles, listener, player: existingPlayer } = options

  const moveSpeed = 2.0
  const rotateSpeed = 0.0025

  const player = existingPlayer ?? new THREE.Group()
  if (!existingPlayer) {
    player.position.set(0, 0.2, 8)
    player.add(camera)
    scene.add(player)
  }

  // movement state
  const keys: Record<string, boolean> = {}
  let enabled = true

  function onKeyDown(e: KeyboardEvent) {
    keys[e.code] = true
  }
  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false
  }

  // mouse look / pointer lock
  let pitch = 0
  let yaw = 0
  function onMouseMove(e: MouseEvent) {
    if (document.pointerLockElement === domElement) {
      yaw -= e.movementX * rotateSpeed
      pitch -= e.movementY * rotateSpeed
      const maxPitch = Math.PI / 2 - 0.01
      pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch))
      // apply rotation: yaw -> player, pitch -> camera
      player.rotation.y = yaw
      camera.rotation.x = pitch
    }
  }

  // selection on click
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  // center dot (shown when pointer lock is active)
  const centerDot = document.createElement('div')
  centerDot.style.position = 'fixed'
  centerDot.style.width = '10px'
  centerDot.style.height = '10px'
  centerDot.style.borderRadius = '50%'
  centerDot.style.background = 'rgba(255,255,255,0.9)'
  centerDot.style.border = '2px solid rgba(0,0,0,0.6)'
  centerDot.style.transform = 'translate(-50%, -50%)'
  centerDot.style.zIndex = '9999'
  centerDot.style.pointerEvents = 'none'
  centerDot.style.display = 'none'
  document.body.appendChild(centerDot)

  function updateCenterDotPosition() {
    try {
      const rect = domElement.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      centerDot.style.left = cx + 'px'
      centerDot.style.top = cy + 'px'
    } catch (e) {
      console.warn('[mnkControls] updateCenterDotPosition failed:', e);
    }
  }

  // update on resize/scroll to keep center aligned
  const _onWindowResizeOrScroll = () => updateCenterDotPosition()
  window.addEventListener('resize', _onWindowResizeOrScroll)
  window.addEventListener('scroll', _onWindowResizeOrScroll, true)

  async function handleSelection(clientX?: number, clientY?: number) {
    if (!camera) return
    if (document.pointerLockElement === domElement) {
      // center ray
      const tempPos = new THREE.Vector3()
      camera.getWorldPosition(tempPos)
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      dir.normalize()
      raycaster.set(tempPos, dir)
    } else if (typeof clientX === 'number' && typeof clientY === 'number') {
      const rect = domElement.getBoundingClientRect()
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera as THREE.Camera)
    } else {
      return
    }

    const intersects = raycaster.intersectObjects(interactableObjects, true)
    for (const inter of intersects) {
      const video = videos[inter.object.userData.index]
      if (video) {
        if (inter.object.userData.action === 'play') {
          try {
            if (listener && listener.context && listener.context.state === 'suspended') {
              try {
                await listener.context.resume()
              } catch (e) {
                console.warn('[audio] resume() via desktop interaction failed:', e)
              }
            }
            const p = video.play?.()
            if (p && typeof p.then === 'function') await p
            try { video.muted = false } catch (e) { console.warn('[audio] unmute() via desktop interaction failed:', e); }
          } catch (err) {
            console.warn('video.play() rejected:', err)
          }
          break
        }
        if (inter.object.userData.action === 'stop') {
          try { video.pause?.() } catch (e) { console.warn('[audio] pause() via desktop interaction failed:', e); }
          break
        }
      }
    }
  }

  function onClick(e: MouseEvent) {
    // request pointer lock on first click if available
    try {
      if (document.pointerLockElement !== domElement) {
        domElement.requestPointerLock?.()
      }
    } catch (err) {
      console.warn('[mnkControls] requestPointerLock failed:', err);
    }
    handleSelection(e.clientX, e.clientY)
  }

  function onPointerLockChange() {
    // when pointer lock acquired, sync yaw/pitch with current orientation
    if (document.pointerLockElement === domElement) {
      // compute yaw/pitch from current rotations
      yaw = player.rotation.y
      pitch = camera.rotation.x
      // show and position center dot
      updateCenterDotPosition()
      centerDot.style.display = 'block'
    }
    else {
      // hide center dot when pointer lock released
      centerDot.style.display = 'none'
    }
  }

  // collision-aware position setter
  function updatePlayerPosition(newPosition: THREE.Vector3) {
    const oldPosition = player.position.clone()
    const playerRadius = 0.25
    player.position.copy(newPosition)
    const playerSphere = new THREE.Sphere(player.position.clone(), playerRadius)
    for (const obs of obstacles) {
      const bs = obs.userData.boundingBox
      if (bs && playerSphere.intersectsBox(bs)) {
        player.position.copy(oldPosition)
        break
      }
    }
  }

  function update(delta: number) {
    if (!enabled) return
    // movement vector in world space based on camera forward/right
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    let moved = false
    const newPosition = player.position.clone()
    if (keys['KeyW']) {
      newPosition.addScaledVector(forward, moveSpeed * delta)
      moved = true
    }
    if (keys['KeyS']) {
      newPosition.addScaledVector(forward, -moveSpeed * delta)
      moved = true
    }
    if (keys['KeyA']) {
      newPosition.addScaledVector(right, -moveSpeed * delta)
      moved = true
    }
    if (keys['KeyD']) {
      newPosition.addScaledVector(right, moveSpeed * delta)
      moved = true
    }
    if (moved) updatePlayerPosition(newPosition)
  }

  function enable() { enabled = true }
  function disable() { enabled = false }

  function dispose() {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('mousemove', onMouseMove)
    domElement.removeEventListener('click', onClick)
    document.removeEventListener('pointerlockchange', onPointerLockChange)
    window.removeEventListener('resize', _onWindowResizeOrScroll)
    window.removeEventListener('scroll', _onWindowResizeOrScroll, true)
    try { centerDot.remove() } catch (e) {
      console.warn('[mnkControls] remove centerDot failed:', e);
    }
    // if we created the player, remove it
    if (!existingPlayer) {
      try {
        player.remove(camera)
        scene.remove(player)
      } catch (e) {
        console.warn('[mnkControls] remove player failed:', e);
      }
    }
  }

  // attach listeners
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('mousemove', onMouseMove)
  domElement.addEventListener('click', onClick)
  document.addEventListener('pointerlockchange', onPointerLockChange)

  return {
    player,
    update,
    dispose,
    enable,
    disable,
  }
}
