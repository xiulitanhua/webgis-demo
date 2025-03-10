export async function loadMapDependencies() {
  try {
    // 检查 Cesium 是否已加载
    if (typeof window.Cesium !== 'undefined') {
      return true
    }

    // 加载天地图依赖
    await Promise.all([
      loadScript('https://api.tianditu.gov.cn/cdn/plugins/cesium/cesiumjs/Cesium_ext_min.js'),
      loadScript('https://api.tianditu.gov.cn/cdn/plugins/cesium/long.min.js'),
      loadScript('https://api.tianditu.gov.cn/cdn/plugins/cesium/bytebuffer.min.js'),
      loadScript('https://api.tianditu.gov.cn/cdn/plugins/cesium/protobuf.min.js')
    ])

    return true
  } catch (error) {
    console.error('加载地图依赖失败:', error)
    throw error
  }
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.async = false
    script.crossOrigin = 'anonymous'
    
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`加载失败: ${url}`))
    
    document.head.appendChild(script)
  })
}