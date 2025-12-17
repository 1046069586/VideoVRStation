<template>
  <div class="App">
    <header class="App-header">
      <h1>VR 视频漫游馆</h1>
    </header>
    <main class="App-main">
      <VRScene />
    </main>
    <footer class="App-footer">
      <p>© 2025 My VR Video Site</p>
    </footer>
  </div>
</template>

<script>
import VRScene from './three/VRScene.vue';

export default {
  name: 'App',
  components: {
    VRScene
  }
};
</script>

<style>
html,body {
  height: 100%; /* 确保 html/body 本身撑满视口 */
  width: 100%;
}

#app {  /* 假设 Vue 挂载点是 #app */
  display: flex;
  height: 100%; /* 视口高度 */
  width: 100%; /* 视口宽度 */
  padding: 0; /* 留白 */
}

.App {
  display: flex;
  flex-direction: column;
  flex: 1; 
  padding: 0;
}

.App-header, .App-footer {
  flex-shrink: 0; /* 固定 header/footer 高度（由内容或 padding 决定） */
  text-align: center;
}

.App-main {
  flex: 1;       /* 占据剩余空间 */
}
</style>
