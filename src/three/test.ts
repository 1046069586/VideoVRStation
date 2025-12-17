// 假设你有：
const player = playerGroup; // THREE.Group 包含摄像机 + 控制器
const obstacles = [];       // 存放所有障碍物 Mesh 的数组

// 在准备场景时，收集障碍物
scene.traverse(obj => {
  if (obj.isMesh && obj.userData.collidable) {
    obstacles.push(obj);
    // 计算并存储包围球
    obj.geometry.computeBoundingSphere();
    obj.userData.boundingSphere = obj.geometry.boundingSphere.clone()
      .applyMatrix4(obj.matrixWorld);
  }
});

// 每帧或每次玩家移动时
function updatePlayerPosition(newPosition) {
  // 1.假设拟定位为 newPosition
  player.position.copy(newPosition);

  // 2.创建玩家包围体
  const playerSphere = new THREE.Sphere(player.position.clone(), playerRadius);

  // 3.检测与障碍物
  for (let obs of obstacles) {
    const bs = obs.userData.boundingSphere;
    if (playerSphere.intersectsSphere(bs)) {
      // 碰撞！取消移动或回退
      player.position.copy(oldPosition);
      break;
    }
  }

  oldPosition.copy(player.position);
}
