import 'core-js/stable'
import 'regenerator-runtime/runtime'
import 'whatwg-fetch'

// 其他 IE 需要的 polyfill

// IE 专用 polyfill
if (window.MSInputMethodContext && document.documentMode) {
  // 添加其他 IE 专用 polyfill
  if (!window.Promise) {
    window.Promise = Promise
  }
  
  // 添加 requestAnimationFrame polyfill
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
      return setTimeout(callback, 1000 / 60)
    }
  }
}
