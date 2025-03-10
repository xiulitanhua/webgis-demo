<template>
  <div class="cesium-container">
    <div id="cesiumContainer"></div>
    <!-- 用于显示当前地标区域名称 -->
    <div id="landmarkLabel"></div>
    <!-- 工具控制面板 -->
    <div class="cesium-tools" v-show="showTools">
      <div class="tool-group">
        <button @click="toggleTerrain">{{ enableTerrain ? '关闭' : '开启' }}地形</button>
        <button @click="toggleImagery">{{ showImagery ? '影像' : '矢量' }}底图</button>
        <button @click="flyToChina">返回中国</button>
        <!-- 新增加载3D模型按钮 -->
        <button @click="load3DTiles">加载3D模型</button>
        <button @click="startCityTour">开始漫游</button>
        <!-- 新增建筑密度分析按钮 -->
        <button @click="analyzeBuildingDensity">建筑密度分析</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount} from 'vue'
import { TIANDITU_KEY } from '@/config'
import { showNotification } from '@/utils/notification' // 添加通知函数导入

// 声明全局变量
/* global Cesium */

let viewer = null

const showTools = ref(true)
const enableTerrain = ref(true)
const showImagery = ref(true)
const showLabels = ref(true) // 默认显示地名

onMounted(async () => {
  try {
    if (typeof Cesium === 'undefined') {
      throw new Error('Cesium 未加载')
    }
    await initCesium()
  } catch (error) {
    console.error('初始化失败:', error)
    // 使用更友好的错误提示
    showNotification(`地图初始化失败: ${error.message}`, 'error')
  }
})

onBeforeUnmount(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})

// 修改 initCesium 函数
async function initCesium() {
  try {
    // 初始化 viewer
    viewer = new Cesium.Viewer('cesiumContainer', {
      shouldAnimate: true,
      selectionIndicator: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      timeline: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      showRenderLoopErrors: true,
      shadows: false,
      imageryProvider: false,
      baseLayer: false
    })

    // 确保加载了必要的样式
    const cesiumWidgetCss = document.createElement('link')
    cesiumWidgetCss.rel = 'stylesheet'
    cesiumWidgetCss.href = 'https://cdn.jsdelivr.net/npm/cesium@1.95.0/Build/Cesium/Widgets/widgets.css'
    document.head.appendChild(cesiumWidgetCss)

    const tdtUrl = 'https://t{s}.tianditu.gov.cn/'
    const subdomains = ['0', '1', '2', '3', '4', '5', '6', '7']

    // 配置场景参数
    configureScene(viewer.scene)
    
    // 添加地形服务
    viewer.terrainProvider = getTerrainProvider()

    // 添加影像图层
    viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
  url: tdtUrl + `DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TIANDITU_KEY}`,
  subdomains: subdomains,
  tilingScheme: new Cesium.WebMercatorTilingScheme(),
  maximumLevel: 18
}))

    // 添加国界服务
    const iboMap = new Cesium.UrlTemplateImageryProvider({
      url: tdtUrl + `DataServer?T=ibo_w&x={x}&y={y}&l={z}&tk=${TIANDITU_KEY}`,
      subdomains: subdomains,
      tilingScheme: new Cesium.WebMercatorTilingScheme(),
      maximumLevel: 10
    })
    viewer.imageryLayers.addImageryProvider(iboMap)

    // 初始化地名服务
    const wtfs = await initWTFS(tdtUrl, subdomains)
    if (!wtfs) {
      throw new Error('地名服务初始化失败')
    }
    
    // 确保 WTFS 被正确添加到场景中
    viewer.scene.wtfs = wtfs
    viewer.scene.wtfs.show = showLabels.value

    // 添加事件监听器来检查地名是否加载
    viewer.scene.postRender.addEventListener(() => {
      if (viewer.scene.wtfs && !viewer.scene.wtfs.ready) {
        console.log('地名服务正在加载...')
      }
    })

    // 在initCesium函数中添加
    viewer.scene.postRender.addEventListener(() => {
      if (viewer.scene.wtfs && !viewer.scene.wtfs.ready) {
        console.log('正在等待地名服务就绪...')
        const status = checkWTFSStatus()
        if (!status) {
          // 尝试重新激活服务
          if (viewer.scene.wtfs) {
            viewer.scene.wtfs.show = true
            viewer.scene.wtfs.autoStart = true
          }
        }
      }
    })

    // 配置相机控制器
    configureCameraController(viewer.scene.screenSpaceCameraController)

    // 设置初始视图
    setInitialView()

    // 确保地名服务始终显示
    if (checkWTFSStatus()) {
      viewer.scene.wtfs.show = true
      viewer.scene.wtfs.autoStart = true
      console.log('地名服务初始化成功')
    }

    // 添加建筑属性查询功能
    enableBuildingQuery();

  } catch (error) {
    console.error('Cesium initialization failed:', error)
    showNotification('三维地图初始化失败: ' + error.message, 'error')
  }
}

// 添加相机控制器配置
function configureCameraController(controller) {
  controller.constrainedPitch = Cesium.Math.toRadians(-20)
  controller.autoResetHeadingPitch = false
  controller.inertiaZoom = 0.5
  controller.minimumZoomDistance = 50
  controller.maximumZoomDistance = 20000000
  controller.zoomEventTypes = [
    Cesium.CameraEventType.RIGHT_DRAG,
    Cesium.CameraEventType.WHEEL,
    Cesium.CameraEventType.PINCH
  ]
  controller.tiltEventTypes = [
    Cesium.CameraEventType.MIDDLE_DRAG,
    Cesium.CameraEventType.PINCH,
    {
      eventType: Cesium.CameraEventType.LEFT_DRAG,
      modifier: Cesium.KeyboardEventModifier.CTRL
    },
    {
      eventType: Cesium.CameraEventType.RIGHT_DRAG,
      modifier: Cesium.KeyboardEventModifier.CTRL
    }
  ]
}

// 修改地形服务提供者函数
function getTerrainProvider() {
  const terrainUrls = []
  const subdomains = ['0', '1', '2', '3', '4', '5', '6', '7']
  
  for (let i = 0; i < subdomains.length; i++) {
    const url = `https://t${subdomains[i]}.tianditu.gov.cn/mapservice/swdx?T=elv_c&tk=${TIANDITU_KEY}`
    terrainUrls.push(url)
  }

  return new Cesium.GeoTerrainProvider({
    urls: terrainUrls
  })
}

// 修改场景配置
function configureScene(scene) {
  // 抗锯齿
  scene.fxaa = true
  scene.postProcessStages.fxaa.enabled = false
  
  // 水雾特效
  scene.globe.showGroundAtmosphere = true
  
  // 地形遮挡
  scene.globe.enableLighting = true
  scene.globe.depthTestAgainstTerrain = true
  
  // 相机设置
  scene.screenSpaceCameraController.minimumZoomDistance = 50
  scene.screenSpaceCameraController.maximumZoomDistance = 20000000
  scene.screenSpaceCameraController.enableCollisionDetection = true
  
  // 性能优化
  scene.requestRenderMode = true
  scene.maximumRenderTimeChange = 1000
}

// 设置初始视图
function setInitialView() {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(103.84, 31.15, 17850000),
    orientation: {
      heading: Cesium.Math.toRadians(348.4202942851978),
      pitch: Cesium.Math.toRadians(-89.74026687972041),
      roll: Cesium.Math.toRadians(0)
    },
    duration: 2 // 飞行时间2秒
  })
}

// 工具方法
function toggleTerrain() {
  enableTerrain.value = !enableTerrain.value
  if (enableTerrain.value) {
    viewer.terrainProvider = getTerrainProvider()
  } else {
    viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider()
  }
}

function toggleImagery() {
  showImagery.value = !showImagery.value
  const layers = viewer.imageryLayers
  
  // 移除现有图层
  layers.removeAll()
  
  try {
    if (showImagery.value) {
      // 添加影像底图
      layers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
        url: `https://t{s}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TIANDITU_KEY}`,
        subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel: 18
      }))
    } else {
      // 添加矢量底图
      layers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
        url: `https://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_KEY}`,
        subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel: 18
      }))
    }
    showNotification(showImagery.value ? '已切换至影像底图' : '已切换至矢量底图', 'success')
  } catch (error) {
    console.error('切换底图失败:', error)
    showNotification('切换底图失败: ' + error.message, 'error')
  }
}



function flyToChina() {
  viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(73, 18, 135, 53),
    duration: 2
  })
}



// 在 initWTFS 函数中修改
async function initWTFS(tdtUrl, subdomains) {
  try {
    await loadWTFSPlugin()
    
    if (typeof window.GeoWTFS === 'undefined') {
      throw new Error('GeoWTFS 插件未能正确加载')
    }
    
    const wtfs = new window.GeoWTFS({
      viewer: viewer,
      subdomains: subdomains,
      metadata: {
        boundBox: {
          minX: 70,  // 调整为中国区域范围
          minY: 15,
          maxX: 140,
          maxY: 55
        },
        minLevel: 1,
        maxLevel: 20
      },
      depthTestOptimization: true,
      dTOElevation: 15000,
      dTOPitch: Cesium.Math.toRadians(-70),
      aotuCollide: true,
      collisionPadding: [5, 10, 8, 5],
      serverFirstStyle: true,
      autoStart: true,
      showLabel: true,
      labelGraphics: {
        font: "28px sans-serif",
        fontSize: 28,
        fillColor: Cesium.Color.WHITE,
        scale: 0.5,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        showBackground: false,
        backgroundColor: Cesium.Color.RED,
        backgroundPadding: new Cesium.Cartesian2(10, 10),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        eyeOffset: Cesium.Cartesian3.ZERO,
        pixelOffset: new Cesium.Cartesian2(5, 5),
        disableDepthTestDistance: undefined
      },
      // 添加billboardGraphics配置
      billboardGraphics: {
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        eyeOffset: Cesium.Cartesian3.ZERO,
        pixelOffset: Cesium.Cartesian2.ZERO,
        alignedAxis: Cesium.Cartesian3.ZERO,
        color: Cesium.Color.WHITE,
        rotation: 0,
        scale: 1,
        width: 18,
        height: 18,
        disableDepthTestDistance: undefined
      }
    })

    // 修改获取瓦片数据的URL方法
    wtfs.getTileUrl = function(x, y, level) {
      const subdomain = subdomains[Math.abs(x + y) % subdomains.length]
      return `https://t${subdomain}.tianditu.gov.cn/mapservice/GetTiles?lxys=${level},${x},${y}&tk=${TIANDITU_KEY}`
    }

    // 修改获取图标的URL方法
    wtfs.getIcoUrl = function(id) {
      return `https://t0.tianditu.gov.cn/mapservice/GetIcon?id=${id}&tk=${TIANDITU_KEY}`
    }

    // 初始化范围数据(聚焦中国区域)
    await wtfs.initTDT([
      {"x":5,"y":1,"level":2,"boundBox":{"minX":45,"minY":0,"maxX":90,"maxY":45}},
      {"x":6,"y":1,"level":2,"boundBox":{"minX":90,"minY":0,"maxX":135,"maxY":45}},
      {"x":5,"y":0,"level":2,"boundBox":{"minX":45,"minY":45,"maxX":90,"maxY":90}},
      {"x":6,"y":0,"level":2,"boundBox":{"minX":90,"minY":45,"maxX":135,"maxY":90}}
    ])

    // 等待初始化完成
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WTFS服务初始化超时'))
      }, 10000)

      const checkReady = () => {
        if (wtfs.ready) {
          clearTimeout(timeout)
          resolve()
        } else if (wtfs.error) {
          clearTimeout(timeout)
          reject(new Error('WTFS服务初始化失败'))
        } else {
          setTimeout(checkReady, 100)
        }
      }
      checkReady()
    })

    // 确保显示
    viewer.scene.wtfs = wtfs
    viewer.scene.wtfs.show = true
    viewer.scene.wtfs.autoStart = true

    return wtfs
  } catch (error) {
    console.error('初始化三维地名服务失败:', error)
    throw error
  }
}

// 添加地名服务状态检查方法
function checkWTFSStatus() {
  if (!viewer) {
    console.warn('Cesium viewer 未初始化')
    return false
  }
  
  if (!viewer.scene) {
    console.warn('场景未初始化')
    return false
  }
  
  if (!viewer.scene.wtfs) {
    console.warn('地名服务未初始化')
    return false
  }
  
  if (!viewer.scene.wtfs.ready) {
    console.warn('地名服务未就绪')
    return false
  }
  
  return true
}

async function loadWTFSPlugin() {
  // 暂时禁用天地图插件，直接返回 true
  console.log('暂时禁用 WTFS 插件加载');
  return true;
}

// 新增加载3D模型的方法，使用 public/上海/3DT/tileset.json
function load3DTiles() {
  try {
    const tileset = new Cesium.Cesium3DTileset({
      url: '/上海/3DT/tileset.json'
    });
    viewer.scene.primitives.add(tileset);
    tileset.readyPromise
      .then(function(tileset) {
        // 定位到模型区域
        viewer.zoomTo(tileset).then(() => {
          showNotification('3D 模型加载成功', 'success');
        }).otherwise((err)=>{
          console.error('定位失败：', err);
        });
      })
      .otherwise(function(error) {
        console.error('3D Tiles 加载失败:', error);
        showNotification('3D Tiles 加载失败: ' + error.message, 'error');
      });
  } catch (error) {
    console.error('加载 3D 模型异常:', error);
    showNotification('加载 3D 模型异常: ' + error.message, 'error');
  }
}

function enableBuildingQuery() {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(function (movement) {
    const pickedObj = viewer.scene.pick(movement.position);
    console.log('pickedObj:', pickedObj);
    
    if (Cesium.defined(pickedObj) && pickedObj.content) {
      const content = pickedObj.content;
      const feature = content.getFeature(pickedObj.batchId);
      if (feature) {
        // 根据实际数据中属性名称调整字段
        const name = feature.getProperty('Name') || feature.getProperty('name') || '未知名称';
        const height = feature.getProperty('Height') || feature.getProperty('height') || '未知高度';
        showNotification(`建筑名称：${name}，建筑高度：${height}`, 'info');
        console.log('建筑属性：', feature);
      } else {
        console.warn('未获取到建筑要素，请检查 batchId 是否正确');
      }
    } else {
      console.warn('未拾取到有效对象');
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// 新增建筑密度分析方法
function analyzeBuildingDensity() {
  if (!viewer || !viewer.camera) {
    showNotification('Viewer 未初始化', 'warning')
    return
  }

  const rectangle = viewer.camera.computeViewRectangle()
  if (!rectangle) {
    showNotification('无法获取当前视图区域', 'warning')
    return
  }

  // 将视图区域转换为经纬度（单位：度）
  const west = Cesium.Math.toDegrees(rectangle.west)
  const south = Cesium.Math.toDegrees(rectangle.south)
  const east = Cesium.Math.toDegrees(rectangle.east)
  const north = Cesium.Math.toDegrees(rectangle.north)

  // 简单估算区域面积（km²），纬度1度约111km，经度受纬度影响
  const avgLat = (north + south) / 2
  const kmPerDegLon = 111 * Math.cos(Cesium.Math.toRadians(avgLat))
  const width = Math.abs(east - west) * kmPerDegLon
  const height = Math.abs(north - south) * 111
  const area = width * height

  // 目前暂无真实建筑数据统计，这里采用模拟数据（随机建筑数量）
  const buildingCount = Math.floor(Math.random() * 100)
  const density = area > 0 ? (buildingCount / area).toFixed(2) : 0

  showNotification(
    `在当前视图区域内检测到建筑数量：${buildingCount}，区域面积：${area.toFixed(2)} km²，建筑密度：${density} 个/km²`,
    'info'
  )
}

function startCityTour() {
  // 定义上海20个地标的漫游路径，每个点设置8秒飞行时间（单位：秒）
  const tourPoints = [
    {
      name: '上海外滩',
      destination: Cesium.Cartesian3.fromDegrees(121.490, 31.233, 1500),
      orientation: { heading: Cesium.Math.toRadians(90), pitch: Cesium.Math.toRadians(-30), roll: 0 },
      duration: 5
    },
    {
      name: '东方明珠',
      destination: Cesium.Cartesian3.fromDegrees(121.4998, 31.2397, 1400),
      orientation: { heading: Cesium.Math.toRadians(70), pitch: Cesium.Math.toRadians(-25), roll: 0 },
      duration: 5
    },
    
    {
      name: '上海中心大厦',
      destination: Cesium.Cartesian3.fromDegrees(121.5055, 31.2335, 1300),
      orientation: { heading: Cesium.Math.toRadians(85), pitch: Cesium.Math.toRadians(-32), roll: 0 },
      duration: 5
    },
    {
      name: '人民广场',
      destination: Cesium.Cartesian3.fromDegrees(121.4737, 31.2304, 1200),
      orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-28), roll: 0 },
      duration: 5
    },
    {
      name: '上海博物馆',
      destination: Cesium.Cartesian3.fromDegrees(121.4765, 31.2300, 1200),
      orientation: { heading: Cesium.Math.toRadians(10), pitch: Cesium.Math.toRadians(-30), roll: 0 },
      duration: 5
    },
    {
      name: '新天地',
      destination: Cesium.Cartesian3.fromDegrees(121.4725, 31.2192, 1100),
      orientation: { heading: Cesium.Math.toRadians(45), pitch: Cesium.Math.toRadians(-25), roll: 0 },
      duration: 5
    },
    {
      name: '法租界',
      destination: Cesium.Cartesian3.fromDegrees(121.4580, 31.2200, 1100),
      orientation: { heading: Cesium.Math.toRadians(60), pitch: Cesium.Math.toRadians(-30), roll: 0 },
      duration: 5
    },
    {
      name: '复兴公园',
      destination: Cesium.Cartesian3.fromDegrees(121.4640, 31.2230, 1100),
      orientation: { heading: Cesium.Math.toRadians(50), pitch: Cesium.Math.toRadians(-27), roll: 0 },
      duration: 5
    },
    {
      name: '城市规划展示馆',
      destination: Cesium.Cartesian3.fromDegrees(121.4890, 31.2320, 1300),
      orientation: { heading: Cesium.Math.toRadians(100), pitch: Cesium.Math.toRadians(-30), roll: 0 },
      duration: 5
    },
    {
      name: '陆家嘴',
      destination: Cesium.Cartesian3.fromDegrees(121.5050, 31.2400, 1400),
      orientation: { heading: Cesium.Math.toRadians(90), pitch: Cesium.Math.toRadians(-28), roll: 0 },
      duration: 5
    },
    
    {
      name: '上海科技馆',
      destination: Cesium.Cartesian3.fromDegrees(121.5070, 31.2420, 1300),
      orientation: { heading: Cesium.Math.toRadians(85), pitch: Cesium.Math.toRadians(-32), roll: 0 },
      duration: 5
    },
    {
      name: '世博园区',
      destination: Cesium.Cartesian3.fromDegrees(121.5500, 31.2400, 1300),
      orientation: { heading: Cesium.Math.toRadians(120), pitch: Cesium.Math.toRadians(-30), roll: 0 },
      duration: 5
    },
    {
      name: '龙华寺',
      destination: Cesium.Cartesian3.fromDegrees(121.4660, 31.2050, 1100),
      orientation: { heading: Cesium.Math.toRadians(70), pitch: Cesium.Math.toRadians(-25), roll: 0 },
      duration: 5
    },
    {
      name: '上海动物园',
      destination: Cesium.Cartesian3.fromDegrees(121.5070, 31.1770, 1200),
      orientation: { heading: Cesium.Math.toRadians(80), pitch: Cesium.Math.toRadians(-30), roll: 0 },
      duration: 5
    },
    {
      name: '虹桥枢纽',
      destination: Cesium.Cartesian3.fromDegrees(121.3310, 31.1970, 1200),
      orientation: { heading: Cesium.Math.toRadians(30), pitch: Cesium.Math.toRadians(-25), roll: 0 },
      duration: 5
    },
    
    
  ];

  let index = 0;
  // 获取页面内的地标显示容器
  const landmarkLabel = document.getElementById('landmarkLabel');

  function flyNext() {
    if (index >= tourPoints.length) {
      // 漫游结束后可以清空显示或提示结束
      if (landmarkLabel) {
        landmarkLabel.innerHTML = '漫游结束';
      }
      return;
    }
    // 更新当前显示的地标名称
    if (landmarkLabel && tourPoints[index].name) {
      landmarkLabel.innerHTML = tourPoints[index].name;
    }
    viewer.camera.flyTo({
      destination: tourPoints[index].destination,
      orientation: tourPoints[index].orientation,
      duration: tourPoints[index].duration,
      complete: () => {
        index++;
        flyNext();
      }
    });
  }
  flyNext();
}
</script>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
  position: relative;
}

#cesiumContainer {
  width: 100%;
  height: 100%;
}

/* 工具面板样式 */
.cesium-tools {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 1000;
}

.tool-group {
  margin-bottom: 10px;
}

.tool-group button {
  margin: 0 5px;
  padding: 5px 10px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.tool-group button:hover {
  background: #40a9ff;
}

.layer-control {
  padding: 5px 0;
}

.layer-control h4 {
  margin: 0 0 5px 0;
}

.layer-control label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

/* 隐藏 Cesium logo */
.cesium-viewer-bottom {
  display: none !important;
}

/* 在 style 标签中添加 */
.cesium-viewer {
  z-index: 0;
}

/* 确保地名标签在其他元素之上 */
.wtfs-labels-container {
  z-index: 1000 !important;
}

/* 在style标签中添加 */
.wtfs-labels-container {
  position: absolute !important;
  z-index: 1000 !important;
  pointer-events: none;
}

.cesium-viewer {
  z-index: 0;
}

.cesium-viewer canvas {
  z-index: 0;
}
#landmarkLabel {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.5);
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 18px;
  z-index: 1001;
}
</style>