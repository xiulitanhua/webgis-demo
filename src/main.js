import { createApp } from 'vue'
import App from './App.vue'
import 'ol/ol.css'  // 使用相对路径导入 ol.css
import 'cesium/Build/Cesium/Widgets/widgets.css'

// 在main.js中添加浏览器检测
const isIE = () => {
  return !!window.MSInputMethodContext && !!document.documentMode
}

if (isIE()) {
  import(/* webpackChunkName: "ie-polyfill" */ './utils/ie-polyfill')
    .catch(error => {
      console.error('IE polyfill 加载失败:', error)
    })
}

createApp(App).mount('#app')
