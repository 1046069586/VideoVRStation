import * as THREE from 'three';
import * as Text2D from 'three/addons/webxr/Text2D.js';
import type { VideoData } from './types';

export function createVideoScreen(video: VideoData, 
                                  listener: THREE.AudioListener, 
                                  videos: { [key: string]: HTMLVideoElement })
                                  : THREE.Mesh {
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
    positionalAudio.setRolloffFactor(2);    // 衰减系数 (数值越高衰减越快)
    positionalAudio.panner.maxDistance = 7;
    positionalAudio.setDistanceModel('linear'); // 衰减模型，可选 'linear' | 'inverse' | 'exponential'

    // 将 audio 添加到场景中与视频墙 mesh 同一个位置
    screenMesh.add(positionalAudio);

    // 相框：使用四个 BoxGeometry 构成的边框，放在屏幕前方以模拟相框效果
    const screenW = 2.5;
    const screenH = 1.8;
    const frameThickness = 0.06;
    const frameDepth = 0.04; // 相框厚度（沿 Z）
    const frameColor = new THREE.Color(0x6d4002);

    const horizGeo = new THREE.BoxGeometry(screenW + frameThickness * 2, frameThickness, frameDepth);
    const vertGeo = new THREE.BoxGeometry(frameThickness, screenH + frameThickness * 2, frameDepth);
    const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.8, metalness: 0.2 });

    const screenHalfW = screenW / 2;
    const screenHalfH = screenH / 2;
    const zOffset = 0.02; // 放在屏幕前方，避免与屏幕贴图 Z-fighting

    const top = new THREE.Mesh(horizGeo, frameMat);
    top.position.set(0, screenHalfH + frameThickness / 2, zOffset);

    const bottom = new THREE.Mesh(horizGeo, frameMat);
    bottom.position.set(0, -screenHalfH - frameThickness / 2, zOffset);

    const left = new THREE.Mesh(vertGeo, frameMat);
    left.position.set(-screenHalfW - frameThickness / 2, 0, zOffset);

    const right = new THREE.Mesh(vertGeo, frameMat);
    right.position.set(screenHalfW + frameThickness / 2, 0, zOffset);

    // 将边框作为子对象添加到 screenMesh，这样边框会随屏幕一起定位和旋转
    screenMesh.add(top, bottom, left, right);

    // 为屏幕创建标题：优先使用 three/addons/webxr/Text2D.js 中的 Text2D#353434
    const titleText = String(video.title || '');
    if (titleText) {
        const titleObj = Text2D.createText(titleText, 0.05);
        // Text2D 通常会有一个自身的尺寸，可以通过 scale 调整
        titleObj.scale.set(2, 2, 2);
        const screenHalfHeight = 1.8 / 2;
        const margin = 0.15;
        titleObj.position.set(0, screenHalfHeight + margin, 0.01);
        titleObj.renderOrder = 999;
        (titleObj.material as THREE.MeshBasicMaterial).color.set("#ffffff");
        screenMesh.add(titleObj);
    }

    return screenMesh;
}
