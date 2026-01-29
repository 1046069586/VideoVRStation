<template>
  <div class="App">
    <header class="App-header">
      <div class="brand-wrap">
        <div class="logo" aria-hidden="true">🎥</div>
        <div>
          <div class="brand">VR 视频漫游馆</div>
          <div class="brand-sub">浏览器内的沉浸式视频展厅</div>
        </div>
      </div>
      <nav class="header-actions">
        <button class="overlay-toggle" @click="showOverlay = !showOverlay">{{ showOverlay ? '隐藏' : '欢迎' }}</button>
      </nav>
    </header>

    <main class="App-main">
      <VRScene />

      <aside v-if="showOverlay" class="welcome-overlay" role="dialog" aria-label="欢迎信息">
        <button class="close" @click="showOverlay = false" aria-label="关闭">✕</button>
        <div class="content">
          <h3>欢迎来到 VR 视频漫游馆</h3>
          <p>您可以使用下方的ENTER VR 按钮进入沉浸模式，或通过WASD/鼠标在场景中移动浏览视频。</p>
          <p class="small">提示：推荐使用 VR 设备打开本网页，进入VR沉浸模式，获得最佳体验。</p>
        </div>
      </aside>
    </main>

  </div>
</template>

<script>
import VRScene from './three/VRScene.vue';

export default {
  name: 'App',
  components: { VRScene },
  data() {
    return { showOverlay: true };
  }
};
</script>

<style>
html, body { height:100%; margin:0; }
#app { height:100%; }
.App { height:100vh; display:flex; flex-direction:column; color:#e6eef8; background: #071026; }

/* Header/footer are overlays so the scene can fill the full viewport */
.App-header { display:flex; align-items:center; justify-content:space-between; padding:10px 18px; background:linear-gradient(180deg, rgba(255,255,255,0.02), transparent); position:fixed; top:0; left:0; right:0; z-index:30; }
.brand-wrap { display:flex; align-items:center; gap:12px; }
.logo { width:44px; height:44px; display:flex; align-items:center; justify-content:center; font-size:1.25rem; background:linear-gradient(90deg,#111827,#0b1220); border-radius:8px; }
.brand { font-weight:600; }
.brand-sub { font-size:0.85rem; color:#9fb0d8; }
.header-actions .overlay-toggle { background:transparent; border:1px solid rgba(255,255,255,0.06); color:#cbd8f0; padding:6px 10px; border-radius:8px; cursor:pointer }

.App-main { position:relative; flex:1; min-height:0; }

/* 让 Three.js 的 container 撑满整个窗口 */
.vr-scene-container { position:fixed; inset:0; width:100%; height:100%; z-index:0; display:block; }

.welcome-overlay {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(1100px, 92%);
  max-width: 1100px;
  min-width: 820px;
  box-sizing: border-box;
  background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02));
  padding:20px 26px;
  border-radius:14px;
  box-shadow: 0 18px 50px rgba(2,6,23,0.65);
  color:#dbe9ff;
  backdrop-filter: blur(8px);
  z-index:35; /* 显示在 header/footer 之上 */
  display:flex;
  flex-direction:row;
  gap:16px;
  align-items:center;
  min-height:140px;
}
.welcome-overlay h3 { margin:0; font-size:2.05rem }
.welcome-overlay p { margin:0; font-size:1.5rem; color:#c5d7f5 }
.welcome-overlay .small { font-size:0.98rem; color:#99a7c7 }
.welcome-overlay .close { position:absolute; right:12px; top:12px; background:transparent; border:none; color:#a9c3ef; cursor:pointer }

/* 内部内容布局：仅文字，纵向排列（上下堆叠） */
.welcome-overlay .content { display:flex; flex-direction:column; gap:8px; align-items:flex-start; width:100%; }
.welcome-overlay .content h3, .welcome-overlay .content p { margin:0; }

.App-footer { text-align:center; padding:8px 12px; color:#9fb0d8; font-size:0.9rem; position:fixed; left:0; right:0; bottom:0; z-index:30; }

@media (max-width:720px) {
  .welcome-overlay { left:50%; top:60%; transform:translate(-50%,-50%); width:calc(100% - 32px); padding:14px; gap:10px; }
}

@media (max-width:420px) {
  .welcome-overlay { top:auto; bottom:18px; transform:none; left:12px; right:12px; width:auto; }
}
</style>
