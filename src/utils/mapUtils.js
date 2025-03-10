import { transform } from 'ol/proj'

// 坐标转换 WGS84 -> GCJ02 (需要实现转换算法)
const gcj02towgs84 = (lng, lat) => {
  // 这里需要实现具体的坐标转换算法
  return [lng, lat]
}

// 构建请求参数
export const buildDriveParams = (start, end, waypoints = [], style = 0) => {
  const params = new URLSearchParams()
  
  // 坐标转换（假设输入的坐标为WGS84）
  const startGCJ = gcj02towgs84(...transform(start, 'EPSG:3857', 'EPSG:4326'))
  const endGCJ = gcj02towgs84(...transform(end, 'EPSG:3857', 'EPSG:4326'))
  
  const postStr = {
    orig: `${startGCJ[0].toFixed(6)},${startGCJ[1].toFixed(6)}`,
    dest: `${endGCJ[0].toFixed(6)},${endGCJ[1].toFixed(6)}`,
    style: style.toString()
  }

  if (waypoints.length > 0) {
    postStr.mid = waypoints.map(point => {
      const [lng, lat] = gcj02towgs84(...transform(point, 'EPSG:3857', 'EPSG:4326'))
      return `${lng.toFixed(6)},${lat.toFixed(6)}`
    }).join(';')
  }

  params.append('postStr', JSON.stringify(postStr))
  params.append('type', 'search')
  params.append('tk', process.env.VUE_APP_TIANDITU_KEY)
  
  return params
}

// 解析XML响应
export const parseDriveResponse = (xmlText) => {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlText, "text/xml")
  
  const result = {
    distance: parseFloat(xmlDoc.querySelector('distance').textContent),
    duration: parseInt(xmlDoc.querySelector('duration').textContent),
    routePoints: [],
    steps: []
  }

  // 解析路径点
  const routeStr = xmlDoc.querySelector('routelatlon').textContent
  result.routePoints = routeStr.split(';').map(point => {
    const [lng, lat] = point.split(',').map(parseFloat)
    return transform([lng, lat], 'EPSG:4326', 'EPSG:3857')
  })

  // 解析详细步骤
  const items = xmlDoc.querySelectorAll('routes item')
  items.forEach(item => {
    const step = {
      guide: item.querySelector('strguide')?.textContent || '',
      street: item.querySelector('streetName')?.textContent || '',
      nextStreet: item.querySelector('nextStreetName')?.textContent || '',
      tollStatus: parseInt(item.querySelector('tollStatus')?.textContent || 0),
      coordinates: []
    }

    const points = item.querySelector('turnlatlon')?.textContent
    if (points) {
      step.coordinates = points.split(';').map(p => {
        const [lng, lat] = p.split(',').map(parseFloat)
        return transform([lng, lat], 'EPSG:4326', 'EPSG:3857')
      })
    }

    result.steps.push(step)
  })

  return result
}