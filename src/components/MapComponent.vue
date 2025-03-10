<template>
  <div class="map-container">
    <!-- 导航栏 -->
    <div class="navbar">
      <div class="nav-brand">GeoDual Vision</div>
      <div 
    v-for="(layer, name) in baseLayers" 
    :key="name"
    class="nav-item" 
    :class="{ active: selectedBaseLayer === name }"
    @click="switchBaseLayer(name)"
  >
    {{ name }}
  </div>
      <!-- 路径规划 -->
      <div class="route-planning">
    <input v-model="startPoint" class="route-input" placeholder="起点" @input="handleAddressInput('start')">
    <input v-model="endPoint" class="route-input" placeholder="终点" @input="handleAddressInput('end')">
    <button class="route-button" @click="calculateRoute">规划路线</button>
    <select v-model="routeType" class="route-type">
      <option 
        v-for="option in routeTypeOptions" 
        :value="option.value"
        :key="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
      
  

      <div class="search-container">
        <input class="search-input" type="text" placeholder="搜索..." />
        <span class="search-icon">🔍</span>
      </div>
    </div>

    <div ref="mapElement" class="ol-map">
      <!-- 修改路径规划步骤面板的模板部分 -->
      <div v-if="routeSteps.length" 
           class="route-steps-panel" 
           :class="{ 'minimized': isPanelMinimized }">
        <div class="panel-header">
          <h3>路径规划</h3>
          <!-- 添加总距离显示 -->
          <div class="route-total-distance">
            <span class="distance-icon">📍</span>
            <span class="distance-value">总距离: {{ formatDistance(totalDistance) }}</span>
          </div>
          <!-- 原有的图例和控制按钮 -->
          <div class="route-legend">
            <div class="legend-item">
              <span class="color-block" style="background: #FF4D4F"></span>
              <span>最快路线</span>
            </div>
            <div class="legend-item">
              <span class="color-block" style="background: #52C41A"></span>
              <span>最短路线</span>
            </div>
            <div class="legend-item">
              <span class="color-block" style="background: #1890FF"></span>
              <span>避开高速</span>
            </div>
            <span class="color-block" style="background: #E6002D"></span>
              <span>地铁线路</span>
            </div>

                <!-- 公交线路图例项 -->
              <div class="legend-item">
            <span class="color-block" style="background: #00A89C"></span>
              <span>公交线路</span>
            </div>

<!-- 步行线路图例项 -->
<div class="legend-item">
  <span class="color-block" style="background: #FF6B00"></span>
  <span>步行线路</span>
</div>

<!-- 换乘点图例项 -->
<div class="legend-item">
  <span class="color-block" style="background: #8C1BAB"></span>
  <span>换乘点</span>
</div>
          <div class="panel-controls">
            <button class="minimize-btn" @click="togglePanel">
              {{ isPanelMinimized ? '展开' : '最小化' }}
            </button>
            <button class="clear-route-btn" @click="clearRoute">
              <span>清除路线</span>
            </button>
          </div>
        </div>
        <div class="steps-container" v-show="!isPanelMinimized">
  <div v-for="(step, index) in routeSteps" 
       :key="index" 
       class="step-item"
       :class="{ 'active': selectedStep === index }"
       @click="highlightStep(index)">
    <div class="step-number">{{ index + 1 }}</div>
    <div class="step-content">
  <div class="step-guide">{{ step.guide }}</div>
</div>
  </div>
</div>
      </div>
    </div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <!-- 底图选择 -->
      <div class="base-layer-selector">
        <h3>底图选择</h3>
        <select v-model="selectedBaseLayer" @change="switchBaseLayer">
          <option v-for="(_, name) in baseLayers" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
      </div>

      <!-- 图层控制 -->
      <div class="layer-control">
        <h3>图层控制</h3>
        <div v-for="(layer, index) in overlayLayers" 
             :key="index" 
             class="layer-item"
             :class="{ 'layer-error': layerStates[layer.name].error }">
          <input type="checkbox" 
                 v-model="layerStates[layer.name].visible" 
                 @change="toggleLayerVisibility(layer)">
          <label>{{ layer.name }}</label>
          <span v-if="layerStates[layer.name].loading" class="loading-dot"></span>
          <span v-if="layerStates[layer.name].error" class="error-icon" 
                title="图层加载失败">⚠️</span>
        </div>
      </div>

      <!-- 要素信息 -->
      <div class="feature-info" v-if="selectedFeature">
        <h3>要素属性</h3>
        <div class="property-grid">
          <div v-for="(value, key) in featureProperties" 
               :key="key" 
               class="property-item">
            <div class="property-key">{{ key }}</div>
            <div class="property-value">
              <template v-if="key === '_geometry'">
                <details>
                  <summary>几何数据 ({{ value.type }})</summary>
                  <pre>{{ formatGeometry(value) }}</pre>
                </details>
              </template>
              <template v-else>
                {{ value }}
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 分析工具 -->
      <div class="analysis-tools">
        <h3>分析工具</h3>

        <!-- 绘图工具 -->
        <div class="tool-group">
          <h4>图形绘制</h4>
          <button class="btn-draw" @click="startDrawing('Point')">点</button>
          <button class="btn-draw" @click="startDrawing('LineString')">线</button>
          <button class="btn-draw" @click="startDrawing('Polygon')">面</button>
          <button class="btn-draw" @click="clearDrawings">清除</button>
        </div>

        <!-- 测量工具 -->
        <div class="tool-group">
          <h4>测量工具</h4>
          <button class="btn-measure" @click="startMeasure('distance')">测距</button>
          <button class="btn-measure" @click="startMeasure('area')">测面</button>
          <div v-if="measureResult" class="measure-result">
            {{ measureResult }}
          </div>
        </div>

        <!-- 缓冲区分析 -->
        <div class="tool-group">
          <h4>缓冲区分析</h4>
          <button class="btn-buffer" @click="selectFeatureForBuffer">选择要素</button>
          <input 
            v-model.number="bufferRadius" 
            type="number" 
            placeholder="半径"
            min="0"
          >
          <select v-model="bufferUnit">
            <option value="meters">米</option>
            <option value="kilometers">千米</option>
          </select>
          <button class="btn-buffer" @click="createBuffer">生成</button>
        </div>

        
        
      </div>

      <!-- 工具按钮 -->
      

    </div>

    <!-- 加载指示器 -->
    <div v-if="globalLoading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <div>地图加载中...</div>
    </div>

    <!-- 全局通知 -->
<div v-if="notification.show" class="notification-container">
  <div class="notification" :class="`notification-${notification.type}`">
    <div class="notification-icon">
      <span v-if="notification.type === 'success'">✓</span>
      <span v-if="notification.type === 'error'">!</span>
      <span v-if="notification.type === 'warning'">⚠️</span>
      <span v-if="notification.type === 'info'">ℹ️</span>
    </div>
    <div class="notification-title">{{ notification.type === 'success' ? '成功' : notification.type === 'error' ? '错误' : notification.type === 'warning' ? '警告' : '信息' }}</div>
    <div class="notification-content">{{ notification.message }}</div>
    <button class="notification-close" @click="notification.show = false"></button>
    <div class="notification-progress"></div>
  </div>
</div>
  
  
  </div>
 </template>
 
<script setup>
// 修改导入语句部分
import { ref, reactive, onMounted, } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
import { XYZ, TileWMS, Vector as VectorSource } from 'ol/source'
import { transform, transformExtent } from 'ol/proj'
import { defaults as defaultInteractions, Draw, Modify, Snap } from 'ol/interaction'
import { ScaleLine, FullScreen, ZoomSlider } from 'ol/control'
import { debounce } from 'lodash-es'
import { createXYZ } from 'ol/tilegrid'
import Style from 'ol/style/Style'
import CircleStyle from 'ol/style/Circle'
import Fill from 'ol/style/Fill'
import Stroke from 'ol/style/Stroke'
import { getArea, getLength } from 'ol/sphere'
import Feature from 'ol/Feature'
import Select from 'ol/interaction/Select'
import { click } from 'ol/events/condition'
import * as turf from '@turf/turf'
import { LineString, Polygon, Point } from 'ol/geom'  // 只保留这一个导入



const mapElement = ref(null)
const selectedBaseLayer = ref('天地图矢量')
const overlayLayers = ref([])
const selectedFeature = ref(null)
const featureProperties = ref(null)
const globalLoading = ref(true)
const abortController = ref(new AbortController())
const measureResult = ref(null)
const bufferRadius = ref(1000)
const bufferUnit = ref('meters')
const drawType = ref(null)
const measureType = ref(null)
const startPoint = ref('')
const endPoint = ref('')
const selectedStartCoord = ref(null)
const selectedEndCoord = ref(null)
const routeSteps = ref([]) // 新增的 ref
const selectedStep = ref(null) // 新增的 ref
// 添加最小化状态控制
// 添加在 script setup 的开头
const TIANDITU_KEY = process.env.VUE_APP_TIANDITU_KEY
if (!TIANDITU_KEY) {
  console.error('天地图密钥未配置')
  throw new Error('请在 .env.local 中配置 VUE_APP_TIANDITU_KEY')
}

const isPanelMinimized = ref(false)

// 在 script setup 中添加
const totalDistance = ref(0)

// 添加格式化距离的函数
const formatDistance = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} 公里`
  }
  return `${Math.round(meters)} 米`
}

// 添加切换面板状态的方法
const togglePanel = () => {
  isPanelMinimized.value = !isPanelMinimized.value
}

// 在 script setup 部分添加 calculateTotalDistance 函数
const calculateTotalDistance = (coordinates) => {
  if (!coordinates || coordinates.length < 2) {
    totalDistance.value = 0
    return
  }

  // 创建 LineString 用于计算总距离
  const routeGeometry = new LineString(coordinates)
  
  // 计算距离（米）
  const distance = getLength(routeGeometry)
  
  // 更新总距离
  totalDistance.value = distance
}

const handleAddressInput = debounce(async (type) => {
  const address = type === 'start' ? startPoint.value : endPoint.value
  if (!address.trim()) {
    return
  }

  const location = await geocodeAddress(address)
  if (location) {
    const coord = [parseFloat(location.lon), parseFloat(location.lat)]
    if (type === 'start') {
      selectedStartCoord.value = coord
    } else {
      selectedEndCoord.value = coord
    }
    console.log(`${type === 'start' ? '起点' : '终点'}坐标:`, coord)
  }
}, 500)

// 添加公交规划类型选项
const routeTypeOptions = [
  { value: 0, label: '驾车-最快路线' },
  { value: 1, label: '驾车-最短路线' },
  { value: 2, label: '驾车-避开高速' },
  { value: 3, label: '公交-公交优先' },  // 公交类型细分
  { value: 4, label: '公交-地铁优先' }
]
const routeType = ref(0) // 默认选择第一个选项

// 新增图层引用
const vectorSource = new VectorSource()
const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: 'red' }),
      stroke: new Stroke({ color: 'white', width: 2 })
    }),
    stroke: new Stroke({
      color: 'blue',
      width: 3
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 255, 0.1)'
    })
  })
})

// 通知系统
const notification = reactive({
  show: false,
  type: 'info',
  message: '',
  timeout: null
})

// 显示通知
const showNotification = (message, type = 'info', duration = 3000) => {
  clearTimeout(notification.timeout)
  Object.assign(notification, {
    show: true,
    type,
    message,
    timeout: setTimeout(() => notification.show = false, duration)
  })
}

// 坐标转换工具
const coordinateUtils = {
  to3857: (coord) => transform(coord, 'EPSG:4326', 'EPSG:3857'),
  to4326: (coord) => transform(coord, 'EPSG:3857', 'EPSG:4326'),
  extentTo4326: (extent) => transformExtent(extent, 'EPSG:3857', 'EPSG:4326')
}

// 底图配置
// 修改底图配置部分
const baseLayers = {
  '天地图矢量': new TileLayer({
    source: new XYZ({
      url: `https://t{0-7}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_KEY}`,
      projection: 'EPSG:3857',
      crossOrigin: 'anonymous'
    }),
    visible: true,
    zIndex: 0
  }),
  '天地图影像': new TileLayer({
    source: new XYZ({
      url: `https://t{0-7}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_KEY}`,
      projection: 'EPSG:3857',
      crossOrigin: 'anonymous'
    }),
    visible: false,
    zIndex: 0
  }),
  '天地图地形': new TileLayer({
    source: new XYZ({
      url: `http://t{0-7}.tianditu.gov.cn/ter_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ter&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_KEY}`,
      projection: 'EPSG:3857',
      crossOrigin: 'anonymous'
    }),
    visible: false,
    zIndex: 0
  })
}


// 图层状态管理
const layerStates = reactive({})
let olMap = null
let modify = null
let snap = null
let draw = null

onMounted(() => {
  if (mapElement.value) {
    initializeMap()
    initOverlayLayers()
    setupMapInteractions()
  }
})

function initializeMap() {
  try {
    olMap = new Map({
      target: mapElement.value,
      layers: [
        baseLayers['天地图矢量'],
        baseLayers['天地图影像'],
        baseLayers['天地图地形'], 
        annotationLayer,
        vectorLayer
      ],
      view: new View({
        // 将中心点设置为中国地理中心点附近（大约在甘肃省兰州市附近）
        center: transform([103.5, 35.0], 'EPSG:4326', 'EPSG:3857'),
        // 缩放级别调整为全国尺度
        zoom: 5,
        // 设置可视范围为中国全境
        extent: transformExtent([73.0, 18.0, 135.0, 53.0], 'EPSG:4326', 'EPSG:3857'),
        minZoom: 1, // 限制最小缩放级别
        maxZoom: 25, // 限制最大缩放级别
        constrainResolution: true
      }),
      interactions: defaultInteractions({
        altShiftDragRotate: false,
        pinchRotate: false
      })
    })

    // 添加控件
    olMap.addControl(new ScaleLine({ units: 'metric' }))
    olMap.addControl(new FullScreen())
    olMap.addControl(new ZoomSlider())

    // 添加 Modify 和 Snap 交互
    modify = new Modify({ source: vectorSource })
    olMap.addInteraction(modify)

    snap = new Snap({ source: vectorSource })
    olMap.addInteraction(snap)

    // 监听全局状态
    olMap.on('loadstart', () => globalLoading.value = true)
    olMap.on('loadend', () => globalLoading.value = false)
    olMap.on('error', (e) => {
      showNotification('地图加载失败，请刷新页面', 'error', 5000)
      console.error('Map error:', e)
    })

  } catch (error) {
    showNotification('地图初始化失败', 'error', 5000)
    console.error('Map initialization failed:', error)
  }
}

function initOverlayLayers() {
  const layersConfig = [
    {
      name: '道路网络',
      type: 'WMS',
      url: 'http://localhost:8080/geoserver/chengdu/wms',
      params: {
        LAYERS: 'chengdu:成都道路',
        TRANSPARENT: true,
        CRS: 'EPSG:3857',
        TILED: true
      },
      extent: transformExtent(
        [103.0004001217658, 30.09254541263338, 104.8756477, 31.4356394644484],
        'EPSG:4326',
        'EPSG:3857'
      ),
      tileSize: 256,
      visible: false
    },
    {
      name: '行政区划',
      type: 'WMS',
      url: 'http://localhost:8080/geoserver/chengdu/wms',
      params: {
        LAYERS: 'chengdu:cdxz3',
        VERSION: '1.3.0',
        FORMAT: 'image/png',
        TRANSPARENT: true,
        CRS: 'EPSG:3857',
        TILED: true
      },
      extent: transformExtent(
        [103.0004001217658, 30.09254541263338, 104.8756477, 31.4356394644484],
        'EPSG:4326',
        'EPSG:3857'
      ),
      tileSize: 256,
      visible: false
    }
  ]

  overlayLayers.value = layersConfig.map(config => {
    const layer = new TileLayer({
      source: new TileWMS({
        url: config.url,
        params: config.params,
        format: 'image/png',
        tileGrid: createXYZ({
          extent: config.extent,
          tileSize: config.tileSize || 256
        }),
        crossOrigin: 'anonymous',
        transition: 300
      }),
      visible: config.visible,
      zIndex: 10
    })

    // 初始化图层状态
    layerStates[config.name] = reactive({
      visible: config.visible,
      loading: false,
      error: false
    })

    // 监听加载状态
    layer.getSource().on('tileloadstart', () => {
      layerStates[config.name].loading = true
      layerStates[config.name].error = false
    })

    layer.getSource().on('tileloadend', () => {
      layerStates[config.name].loading = false
    })

    layer.getSource().on('tileloaderror', () => {
      layerStates[config.name].loading = false
      layerStates[config.name].error = true
      showNotification(`${config.name} 图层加载失败`, 'warning')
    })

    olMap.addLayer(layer)
    return { ...config, layer }
  })
}

// 修改 switchBaseLayer 函数
function switchBaseLayer(layerName) {
  selectedBaseLayer.value = layerName
  
  // 处理所有图层的显示状态
  Object.entries(baseLayers).forEach(([name, layer]) => {
    layer.setVisible(name === layerName)
  })
  
  // 处理对应的注记图层
  let annotationUrl = ''
  switch(layerName) {
    case '天地图矢量':
      annotationUrl = `http://t{0-7}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_KEY}`
      break
    case '天地图影像':
      annotationUrl = `http://t{0-7}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_KEY}`
      break
    case '天地图地形':
      annotationUrl = `http://t{0-7}.tianditu.gov.cn/cta_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cta&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_KEY}`
      break
  }
  
  if (annotationUrl) {
    annotationLayer.setVisible(true)
    annotationLayer.getSource().setUrl(annotationUrl)
  }

  // 切换成功后显示提示
  showNotification(`已切换至${layerName}`, 'success')
}

// 添加注记图层（但不在界面上显示按钮）
const annotationLayer = new TileLayer({
  source: new XYZ({
    url: `https://t{0-7}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_KEY}`,
    projection: 'EPSG:3857',
    crossOrigin: 'anonymous'
  }),
  visible: true,
  zIndex: 1
})


function toggleLayerVisibility(layerConfig) {
  layerConfig.layer.setVisible(layerStates[layerConfig.name].visible)
}

function setupMapInteractions() {
  // 添加选择交互
  const selectInteraction = new Select({
    condition: click,
    layers: [vectorLayer] // 只选择矢量图层上的要素
  })

  olMap.addInteraction(selectInteraction)

  selectInteraction.on('select', (event) => {
    const selectedFeatures = event.target.getFeatures().getArray()
    if (selectedFeatures.length > 0) {
      selectFeature(selectedFeatures[0])
    } else {
      selectedFeature.value = null
      featureProperties.value = null
    }
  })

  // 其他交互逻辑...
  olMap.on('singleclick', debounce(async (evt) => {
    try {
      abortController.value.abort()
      abortController.value = new AbortController()

      const view = olMap.getView()
      const viewResolution = view.getResolution()
      const visibleLayers = overlayLayers.value
        .filter(l => layerStates[l.name].visible)

      const topLayer = visibleLayers[visibleLayers.length - 1]
      if (!topLayer) {
        selectedFeature.value = null
        return
      }

      const url = topLayer.layer.getSource().getFeatureInfoUrl(
        evt.coordinate,
        viewResolution,
        view.getProjection(),
        { 'INFO_FORMAT': 'application/json' }
      )

      const response = await fetch(url, {
        signal: abortController.value.signal
      })
      
      if (!response.ok) throw new Error('查询失败')
      const data = await response.json()

      if (data.features?.length > 0) {
        selectFeature(data.features[0])
      } else {
        selectedFeature.value = null
        featureProperties.value = null
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        showNotification('要素查询失败', 'warning')
      }
    }
  }, 300))
}

function selectFeature(feature) {
  if (feature instanceof Feature) {
    selectedFeature.value = feature
    const props = feature.getProperties()
    
    if (feature.getGeometry()) {
      const geom = feature.getGeometry()
      props._geometry = {
        type: geom.getType(),
        coordinates: coordinateUtils.to4326(geom.getCoordinates()),
        formatted: `类型：${geom.getType()}\n坐标数：${geom.getCoordinates().length}`
      }
    }
    
    featureProperties.value = props
  } else {
    selectedFeature.value = null
    featureProperties.value = null
  }
}

function formatGeometry(geometry) {
  try {
    return JSON.stringify(geometry.coordinates, null, 2)
  } catch {
    return '几何数据解析失败'
  }
}





function startDrawing(type) {
  // 清理现有绘图交互
  olMap.getInteractions().forEach(interaction => {
    if (interaction instanceof Draw) {
      olMap.removeInteraction(interaction)
    }
  })

  drawType.value = type
  const draw = new Draw({
    source: vectorSource,
    type: type
  })
  olMap.addInteraction(draw)

  // 在绘图结束后重新启用 Modify 和 Snap 交互
  draw.on('drawend', () => {
    olMap.removeInteraction(draw)
    olMap.addInteraction(modify)
    olMap.addInteraction(snap)
  })
}

function startMeasure(type) {
  measureType.value = type
  if (draw) {
    olMap.removeInteraction(draw)
  }

  draw = new Draw({
    source: vectorSource,
    type: type === 'distance' ? 'LineString' : 'Polygon'
  })
  olMap.addInteraction(draw)

  draw.on('drawend', (event) => {
    const geom = event.feature.getGeometry()
    let output
    if (type === 'distance') {
      const length = getLength(geom)
      output = length > 1000 ? `${(length / 1000).toFixed(2)} km` : `${length.toFixed(2)} m`
    } else if (type === 'area') {
      const area = getArea(geom)
      output = area > 1000000 ? `${(area / 1000000).toFixed(2)} km²` : `${area.toFixed(2)} m²`
    }
    measureResult.value = output
    olMap.removeInteraction(draw)
  })
}

function clearDrawings() {
  vectorSource.clear()
}

// 修改 clearRoute 函数，清除总距离
const clearRoute = () => {
  vectorSource.clear()
  routeSteps.value = []
  selectedStep.value = null
  totalDistance.value = 0
  showNotification('已清除路线', 'info')
}

// 修改 selectFeatureForBuffer 函数
function selectFeatureForBuffer() {
  // 移除已有的选择交互
  olMap.getInteractions().forEach(interaction => {
    if (interaction instanceof Select) {
      olMap.removeInteraction(interaction)
    }
  })

  const selectInteraction = new Select({
    condition: click,
    layers: [vectorLayer],
    style: new Style({
      stroke: new Stroke({
        color: '#ff8533',
        width: 3,
        lineDash: [5, 5]
      }),
      fill: new Fill({
        color: 'rgba(255, 133, 51, 0.2)'
      }),
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({
          color: '#ff8533'
        }),
        stroke: new Stroke({
          color: '#ffffff',
          width: 2
        })
      })
    })
  })

  olMap.addInteraction(selectInteraction)
  showNotification('请双击要分析的要素（可以是绘制的图形或规划的路线）', 'info', 5000)

  selectInteraction.on('select', (event) => {
    const selectedFeatures = event.target.getFeatures().getArray()
    if (selectedFeatures.length > 0) {
      // 直接设置 selectedFeature.value
      selectedFeature.value = selectedFeatures[0]
      showNotification('已选择要素，请设置缓冲区半径并点击生成按钮', 'success')
      olMap.removeInteraction(selectInteraction)
    } else {
      selectedFeature.value = null
      featureProperties.value = null
      showNotification('未选择到要素', 'warning')
    }
  })
}

// 修改 createBuffer 函数
function createBuffer() {
  if (!selectedFeature.value) {
    showNotification('请先选择一个要素', 'warning')
    return
  }

  const geom = selectedFeature.value.getGeometry()
  if (!geom) {
    showNotification('所选要素没有几何数据', 'error')
    return
  }

  try {
    // 计算缓冲距离（转换为千米）
    const distance = bufferUnit.value === 'kilometers' 
      ? bufferRadius.value 
      : bufferRadius.value / 1000

    // 处理不同类型的几何对象
    let coordinates
    let turfFeature
    const geomType = geom.getType()

    // 将 OpenLayers 几何对象转换为 WGS84 坐标
    switch(geomType) {
      case 'Point':
        coordinates = transform(geom.getCoordinates(), 'EPSG:3857', 'EPSG:4326')
        turfFeature = turf.point(coordinates)
        break
      case 'LineString':
        coordinates = geom.getCoordinates().map(coord => 
          transform(coord, 'EPSG:3857', 'EPSG:4326')
        )
        turfFeature = turf.lineString(coordinates)
        break
      case 'Polygon':
        coordinates = geom.getCoordinates()[0].map(coord => 
          transform(coord, 'EPSG:3857', 'EPSG:4326')
        )
        turfFeature = turf.polygon([coordinates])
        break
      default:
        throw new Error(`不支持的几何类型: ${geomType}`)
    }

    // 使用 Turf.js 创建缓冲区
    const buffered = turf.buffer(turfFeature, distance, { units: 'kilometers' })

    // 将缓冲区结果转回 OpenLayers 坐标系
    const bufferedCoords = buffered.geometry.coordinates[0].map(coord =>
      transform(coord, 'EPSG:4326', 'EPSG:3857')
    )

    // 创建缓冲区要素
    const bufferFeature = new Feature({
      geometry: new Polygon([bufferedCoords]),
      name: '缓冲区',
      originalFeatureType: geomType,
      bufferDistance: `${bufferRadius.value}${bufferUnit.value === 'kilometers' ? 'km' : 'm'}`
    })

    // 设置缓冲区样式
    bufferFeature.setStyle(new Style({
      stroke: new Stroke({
        color: '#1890ff',
        width: 2
      }),
      fill: new Fill({
        color: 'rgba(24, 144, 255, 0.2)'
      })
    }))

    // 添加到图层并调整视图
    vectorSource.addFeature(bufferFeature)
    
    // 自动缩放到缓冲区范围
    const extent = bufferFeature.getGeometry().getExtent()
    olMap.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      duration: 1000
    })

    showNotification(
      `已生成${bufferRadius.value}${bufferUnit.value === 'kilometers' ? '千米' : '米'}的缓冲区`, 
      'success'
    )

  } catch (error) {
    console.error('缓冲区生成错误:', error)
    showNotification(`缓冲区生成失败: ${error.message}`, 'error')
  }
}



const parseRouteResponse = (xmlText) => {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlText, "text/xml")
  
  // 检查错误节点
  const errorNode = xmlDoc.querySelector('error')
  if (errorNode) {
    return { status: 'error', message: errorNode.textContent }
  }

  // 获取路由信息
  const routesNode = xmlDoc.querySelector('routes')
  if (!routesNode) return { status: 'error', message: '无效的响应结构' }

  // 获取所有步骤
  const steps = Array.from(xmlDoc.querySelectorAll('item')).map((item, index) => {
    const guide = item.querySelector('strguide')?.textContent || ''
    const turnLatLon = item.querySelector('turnlatlon')?.textContent || ''
    
    // 检查是否到达目的地
    if (guide.includes('到达目的地')) {
      return {
        id: index,
        guide,
        turnLatLon,
        isDestination: true
      }
    }
    
    return {
      id: index,
      guide,
      turnLatLon,
      isDestination: false
    }
  })

  // 找到到达目的地的步骤索引
  const destinationIndex = steps.findIndex(step => step.isDestination)
  
  // 如果找到目的地步骤，只返回到目的地的部分
  const validSteps = destinationIndex !== -1 
    ? steps.slice(0, destinationIndex + 1)
    : steps

  return {
    status: validSteps.length > 0 ? '0' : '4',
    steps: validSteps
  }
}
const calculateRoute = async () => {
  try {
    if (!selectedStartCoord.value || !selectedEndCoord.value) {
      showNotification('请再次点击', 'warning')
      return
    }

    // 根据选择的类型决定使用驾车还是公交服务
    const isTransit = routeType.value >= 3  // 修改判断条件
    
    let apiUrl
    let params
    
    if (isTransit) {
      // 公交路线规划
      params = {
        startposition: `${selectedStartCoord.value[0]},${selectedStartCoord.value[1]}`,
        endposition: `${selectedEndCoord.value[0]},${selectedEndCoord.value[1]}`,
        linetype: routeType.value === 3 ? '2' :  // 地铁优先
                 routeType.value === 4 ? '1' :  // 公交优先
                 routeType.value === 5 ? '3' :  // 少换乘
                 '4'  // 少步行
      }
      apiUrl = `https://api.tianditu.gov.cn/transit`
        + `?type=busline`
        + `&postStr=${encodeURIComponent(JSON.stringify(params))}`
        + `&tk=${process.env.VUE_APP_TIANDITU_KEY}`
    } else {
      // 驾车路线规划
      params = {
        orig: `${selectedStartCoord.value[0]},${selectedStartCoord.value[1]}`,
        dest: `${selectedEndCoord.value[0]},${selectedEndCoord.value[1]}`,
        style: Number(routeType.value)
      }
      apiUrl = `https://api.tianditu.gov.cn/drive`
        + `?type=search`
        + `&postStr=${encodeURIComponent(JSON.stringify(params))}`
        + `&tk=${process.env.VUE_APP_TIANDITU_KEY}`
    }

    console.log('请求URL:', apiUrl) // 调试用

    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`HTTP错误! 状态码: ${response.status}`)
    }

    const data = await response.text()
    console.log('API响应:', data) // 调试用
    
    // 解析响应
    const parsedResponse = isTransit 
      ? parseTransitResponse(data) 
      : parseRouteResponse(data)

    if (parsedResponse.status !== '0') {
      handleRouteError(parsedResponse.status)
      return
    }

    // 处理路线显示
    displayRoute(parsedResponse, isTransit)

  } catch (error) {
    console.error('路径规划错误:', error)
    showNotification(`请求失败: ${error.message}`, 'error')
  }
}

// 添加公交路线解析函数
const parseTransitResponse = (responseText) => {
  try {
    const data = JSON.parse(responseText);
    if (data.resultCode !== 0) {  // 注意这里是数字0而不是字符串'0'
      return { status: 'error', message: '路线规划失败' };
    }

    const steps = [];
    let totalDistance = 0;
    let totalDuration = 0;

    // 获取第一条推荐路线
    if (data.results && data.results.length > 0) {
      const firstResult = data.results[0];
      
      // 遍历路段
      firstResult.lines[0].segments.forEach((segment, segIndex) => {
        switch (segment.segmentType) {
          case 1: // 步行段
            if (segment.segmentLine && segment.segmentLine[0]) {
              const walkSegment = segment.segmentLine[0];
              steps.push({
                id: `walk-${segIndex}`,
                guide: `步行至${segment.stationEnd.name}`,
                turnLatLon: walkSegment.linePoint,
                distance: walkSegment.segmentDistance,
                type: 'walking'
              });
              totalDistance += walkSegment.segmentDistance;
              totalDuration += walkSegment.segmentTime;
            }
            break;
          
          case 2: // 公交段
          case 3: // 地铁段
            if (segment.segmentLine && segment.segmentLine[0]) {
              const transitSegment = segment.segmentLine[0];
              steps.push({
                id: `transit-${segIndex}`,
                guide: `乘坐${transitSegment.lineName}，从${segment.stationStart.name}到${segment.stationEnd.name}`,
                turnLatLon: transitSegment.linePoint,
                busLine: transitSegment.lineName,
                distance: transitSegment.segmentDistance,
                duration: transitSegment.segmentTime,
                type: segment.segmentType === 3 ? 'subway' : 'bus'
              });
              totalDistance += transitSegment.segmentDistance;
              totalDuration += transitSegment.segmentTime;
            }
            break;

          case 4: // 换乘段
            steps.push({
              id: `transfer-${segIndex}`,
              guide: `在${segment.stationStart.name}换乘${segment.segmentLine[0]?.lineName || ''}`,
              turnLatLon: `${segment.stationStart.lonlat}`,
              type: 'transfer'
            });
            totalDuration += 3; // 假设换乘需要3分钟
            break;
        }
      });
    }

    return {
      status: '0',
      steps,
      type: 'transit',
      totalDistance,
      totalDuration,
      message: `总距离: ${(totalDistance/1000).toFixed(1)}公里, 预计耗时: ${Math.ceil(totalDuration)}分钟`
    };
  } catch (error) {
    console.error('公交路线解析失败:', error);
    return { status: 'error', message: '解析公交响应失败' };
  }
};


// 添加路线显示函数
const displayRoute = (parsedResponse, isTransit) => {
  try {
    vectorSource.clear()
    routeSteps.value = parsedResponse.steps

    // 处理坐标转换
    const coordinates = parsedResponse.steps
      .map(step => {
        const coords = parseCoordinates(step.turnLatLon)
        if (!coords) {
          console.warn('Invalid coordinates for step:', step)
          return null
        }
        return coords
      })
      .filter(coord => coord !== null)

    if (coordinates.length < 2) {
      throw new Error('有效坐标点不足，无法生成路径')
    }

    // 创建路径要素
    const routeGeometry = new LineString(coordinates)
    const routeFeature = new Feature({
      geometry: routeGeometry,
      name: isTransit ? '公交路线' : '规划路径',
      routeType: routeType.value,
      isTransit: isTransit
    })

    // 设置路线样式
    const style = isTransit ? createTransitStyle() : createRouteStyle(routeType.value)
    routeFeature.setStyle(style)
    vectorSource.addFeature(routeFeature)

    // 添加起终点标记
    addRouteMarkers(coordinates[0], coordinates[coordinates.length - 1])

    // 自动缩放地图
    const extent = routeGeometry.getExtent()
    olMap.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      duration: 1000
    })

    // 计算总距离
    calculateTotalDistance(coordinates)

    showNotification('路线规划完成', 'success')
  } catch (error) {
    console.error('显示路线错误:', error)
    showNotification('路线显示失败: ' + error.message, 'error')
  }
}

// 添加起终点标记函数
const addRouteMarkers = (startCoord, endCoord) => {
  // 创建起点标记
  const startFeature = new Feature({
    geometry: new Point(startCoord),
    name: '起点'
  })

  // 创建终点标记
  const endFeature = new Feature({
    geometry: new Point(endCoord),
    name: '终点'
  })

  // 设置标记样式
  const startStyle = new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: '#52C41A' }),
      stroke: new Stroke({ color: '#fff', width: 2 })
    })
  })

  const endStyle = new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: '#FF4D4F' }),
      stroke: new Stroke({ color: '#fff', width: 2 })
    })
  })

  startFeature.setStyle(startStyle)
  endFeature.setStyle(endStyle)

  vectorSource.addFeature(startFeature)
  vectorSource.addFeature(endFeature)
}

const geocodeAddress = async (address) => {
  try {
    console.log('地址:', address)
    const apiUrl = `https://api.tianditu.gov.cn/geocoder?ds=${encodeURIComponent(JSON.stringify({ keyWord: address }))}&tk=${process.env.VUE_APP_TIANDITU_KEY}`
    const response = await fetch(apiUrl)
    const data = await response.json()
    console.log('地址编码:', data)
    if (data.status === '0' && data.location) {
      return {
        lon: data.location.lon,
        lat: data.location.lat
      }
    } else {
      showNotification('地理编码失败：' + data.msg, 'error')
      return null
    }
  } catch (error) {
    showNotification('地理编码服务请求失败', 'error')
    return null
  }
}

const highlightStep = (index) => {
  selectedStep.value = index
  const step = routeSteps.value[index]
  if (step && step.turnLatLon) {
    const coord = parseCoordinates(step.turnLatLon)
    if (coord) {
      olMap.getView().animate({
        center: coord,
        zoom: 15,
        duration: 500
      })
    }
  }
}

// 在 script setup 部分添加以下函数定义

// 处理路由错误
const handleRouteError = (status) => {
  const errorMessages = {
    '1': '服务器内部错误',
    '2': '请求参数非法',
    '3': '权限校验失败',
    '4': '查询无结果',
    'error': '未知错误'
  }
  showNotification(errorMessages[status] || '路径规划失败', 'error')
}

// 解析坐标
const parseCoordinates = (turnLatLon) => {
  if (!turnLatLon) return null
  
  const [lonStr, latStr] = turnLatLon.split(',')
  const lon = parseFloat(lonStr)
  const lat = parseFloat(latStr)
  
  if (isNaN(lon) || isNaN(lat)) {
    console.error('无效坐标:', turnLatLon)
    return null
  }
  
  return transform([lon, lat], 'EPSG:4326', 'EPSG:3857')
}

// 创建路线样式
const createRouteStyle = (routeType) => {
  let mainColor, glowColor

  switch (Number(routeType)) {
    case 0: // 最快路线
      mainColor = '#FF4D4F'  // 红色
      glowColor = 'rgba(255, 77, 79, 0.3)'
      break
    case 1: // 最短路线
      mainColor = '#52C41A'  // 绿色
      glowColor = 'rgba(82, 196, 26, 0.3)'
      break
    case 2: // 避开高速
      mainColor = '#1890FF'  // 蓝色
      glowColor = 'rgba(24, 144, 255, 0.3)'
      break
    default:
      mainColor = '#FF4D4F'
      glowColor = 'rgba(255, 77, 79, 0.3)'
  }

  return [
    // 发光效果
    new Style({
      stroke: new Stroke({
        color: glowColor,
        width: 12,
        lineCap: 'round',
        lineJoin: 'round'
      }),
      zIndex: 998
    }),
    // 主路线
    new Style({
      stroke: new Stroke({
        color: mainColor,
        width: 6,
        lineCap: 'round',
        lineJoin: 'round'
      }),
      zIndex: 999
    })
  ]
}

// 修改路线样式
// 修改创建公交路线样式的函数
const createTransitStyle = (type = 'bus') => {
  const styles = {
    bus: {
      color: '#00A89C',  // 公交线路颜色
      width: 6,
      lineDash: [10, 10],
      glowColor: 'rgba(0, 168, 156, 0.4)',
      zIndex: 999
    },
    subway: {
      color: '#E6002D',  // 地铁线路颜色
      width: 6,
      lineDash: null,
      glowColor: 'rgba(230, 0, 45, 0.4)',
      zIndex: 1000  // 地铁线路显示在最上层
    },
    walking: {
      color: '#FF6B00',  // 步行线路颜色
      width: 4,
      lineDash: [5, 5],
      glowColor: 'rgba(255, 107, 0, 0.4)',
      zIndex: 998
    },
    transfer: {
      color: '#8C1BAB',  // 换乘点颜色
      width: 4,
      lineDash: [2, 2], 
      glowColor: 'rgba(140, 27, 171, 0.4)',
      zIndex: 1001  // 换乘点显示在最顶层
    }
  };

  const style = styles[type] || styles.bus;

  return [
    // 发光效果
    new Style({
      stroke: new Stroke({
        color: style.glowColor,
        width: style.width + 8,
        lineCap: 'round',
        lineJoin: 'round',
        lineDash: style.lineDash
      }),
      zIndex: style.zIndex - 1
    }),
    // 主线路
    new Style({
      stroke: new Stroke({
        color: style.color,
        width: style.width,
        lineCap: 'round',
        lineJoin: 'round',
        lineDash: style.lineDash
      }),
      zIndex: style.zIndex
    })
  ];
};
</script>

<style scoped src="@/components/MapComponent.css"></style>
