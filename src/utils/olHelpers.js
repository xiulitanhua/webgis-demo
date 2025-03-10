// src/utils/olHelpers.js
import { transform, transformExtent } from 'ol/proj'
import { getArea, getLength } from 'ol/sphere'
import { buffer } from 'ol/extent'

export const coordinateUtils = {
  to3857: (coord) => transform(coord, 'EPSG:4326', 'EPSG:3857'),
  to4326: (coord) => transform(coord, 'EPSG:3857', 'EPSG:4326'),
  extentTo4326: (extent) => transformExtent(extent, 'EPSG:3857', 'EPSG:4326')
}

export const measureUtils = {
  formatLength: (line) => `${Math.round(getLength(line) * 100) / 100} 米`,
  formatArea: (polygon) => `${Math.round(getArea(polygon) * 100) / 100} 平方米`
}

export const bufferUtil = (geometry, radius, units) => 
  buffer(geometry.getExtent(), radius, units)
