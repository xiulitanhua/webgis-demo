<template>
  <div id="app">
    <div class="map-container">
      <MapComponent v-show="!is3DMode" />
      <CesiumMap v-show="is3DMode" />
    </div>
    <div class="map-switch">
      <button @click="toggleMapMode">
        切换到{{ is3DMode ? '二维' : '三维' }}地图
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MapComponent from '@/components/MapComponent.vue'
import CesiumMap from '@/components/CesiumMap.vue'

const is3DMode = ref(false)

const toggleMapMode = () => {
  is3DMode.value = !is3DMode.value
}
</script>

<style scoped>
.map-container {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.map-switch {
  position: fixed;
  bottom: 20px; 
  right: 20px;
  z-index: 1000;
}

.map-switch button {
  padding: 8px 16px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.map-switch button:hover {
  background-color: #f0f0f0;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

#app {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>

