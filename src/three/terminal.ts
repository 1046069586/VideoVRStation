import * as THREE from 'three';
import {  GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export  async function createTerminal(video){
    const loader = new GLTFLoader();
    const pannelGLTF = await loader.loadAsync('./terminal.glb')
    const pannel = pannelGLTF.scene.children[0]
    pannel.scale.set(0.008,0.008,0.008)
    const {playBtn, stopBtn} = createTerminalButton()
    const pannelGroup = new THREE.Group()
    pannelGroup.add(pannel)
    pannelGroup.add(playBtn, stopBtn)

    pannelGroup.position.set(video.position[0]+video.normal[0]*0.43, 0, video.position[2]+video.normal[2]*0.43);
    const normal = new THREE.Vector3(video.normal[0], video.normal[1], video.normal[2]).normalize();
    const zAxis = new THREE.Vector3(0, 0, -1); // plane 的本地正面
    const quat = new THREE.Quaternion().setFromUnitVectors(zAxis, normal);
    pannelGroup.quaternion.copy(quat);

    return pannelGroup;
}


function createTerminalButton(){
    const playBtn = createPlayButton();
    const stopBtn = createStopButton();
    return {playBtn, stopBtn };
}

function createPlayButton(){
        // 1. 创建材质
    const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // 绿色

    // 2. 创建几何体：顶半径, 底半径, 高度, 侧面分段数(3就是三角形)
    const playGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 3); 

    // 3. 创建网格
    const playBtn = new THREE.Mesh(playGeo, buttonMaterial);

    // 4. 调整方向：默认是尖角朝里的，需要旋转让它指向右边
    playBtn.rotation.x = -Math.PI / 3;
    playBtn.rotation.y = -Math.PI / 2; // 旋转90度
     // 让它平躺或立起来，视你的控制台角度而定
    playBtn.position.set(0.08, 0.9, 0); // 放到上面
    return playBtn;
}


function createStopButton(){
    const pauseGroup = new THREE.Group(); // 创建一个组

    const barGeo = new THREE.BoxGeometry(0.02, 0.08, 0.02); // 宽, 高, 深
    const barMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa00 }); // 橙色

    // 左竖线
    const bar1 = new THREE.Mesh(barGeo, barMaterial);
    bar1.position.x = -0.02; // 向左移

    // 右竖线
    const bar2 = new THREE.Mesh(barGeo, barMaterial);
    bar2.position.x = 0.02; // 向右移

    pauseGroup.add(bar1);
    pauseGroup.add(bar2);
    pauseGroup.rotation.x = Math.PI / 6;
    pauseGroup.position.set(-0.08, 0.9,0); 
    return pauseGroup;
}