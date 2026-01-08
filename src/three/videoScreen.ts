import * as THREE from 'three';

export function createVideoScreen(video, listener, videos) {
    const videoElem = document.createElement('video');
    videoElem.src = video.url;
    videoElem.crossOrigin = 'anonymous';
    videoElem.loop = true;
    // 初始保持静音以绕过浏览器 autoplay 限制，真正的解除静音应在用户交互后进行
    videoElem.muted = true;
    // 兼容移动端/Safari: 保证内联播放
    videoElem.playsInline = true;
    videoElem.setAttribute('playsinline', '');
    // 预加载以降低首次播放延迟
    videoElem.preload = 'auto';
    videoElem.currentTime = 1;
    videos[video.id] = videoElem;

    const texture = new THREE.VideoTexture(videoElem);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;

    const screenGeo = new THREE.PlaneGeometry(2.5, 1.8);
    const screenMat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(...video.position);
    const normal = new THREE.Vector3(video.normal[0], video.normal[1], video.normal[2]).normalize();
    const zAxis = new THREE.Vector3(0, 0, 1); // plane 的本地正面
    const quat = new THREE.Quaternion().setFromUnitVectors(zAxis, normal);
    screenMesh.quaternion.copy(quat);

    const positionalAudio = new THREE.PositionalAudio(listener);

    // 将 video 作为媒体源
    positionalAudio.setMediaElementSource(videoElem);

    // 设置距离模型 /衰减 /参考距离 /最大距离 /音量衰减系数
    positionalAudio.setRefDistance(1);      // 参考距离 (单位与 three.js 世界单位一致)
    positionalAudio.setRolloffFactor(1);    // 衰减系数 (数值越高衰减越快)
    positionalAudio.setDistanceModel('inverse'); // 衰减模型，可选 'linear' | 'inverse' | 'exponential'

    // 将 audio 添加到场景中与视频墙 mesh 同一个位置
    screenMesh.add(positionalAudio);

    return screenMesh;
}
