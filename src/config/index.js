export const TIANDITU_KEY = process.env.VUE_APP_TIANDITU_KEY

export const CESIUM_CONFIG = {
  ion: {
    defaultAccessToken: process.env.VUE_APP_CESIUM_TOKEN
  },
  terrain: {
    urls: ['https://t{s}.tianditu.gov.cn/mapservice/swdx'],
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7']
  }
}