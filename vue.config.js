const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack')
const path = require('path') // 添加这行引入

module.exports = defineConfig({
  // 基础配置
  transpileDependencies: true,
  
  // Webpack配置
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'ol': 'ol'
      },
      fallback: {
        process: require.resolve('process/browser')
      }
    },
    plugins: [
      // 移除原有的 DefinePlugin 配置
    ],
    performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        minSize: 10000,
        maxSize: 250000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1]
              return `npm.${packageName.replace('@', '')}`
            }
          }
        }
      }
    },
    devServer: {
      hot: true,
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
        logging: 'verbose'
      },
    },
  },

  // 开发服务器配置
  devServer: {
    hot: true,
    client: {
      overlay: {
        warnings: true,
        errors: true
      }
    },
    proxy: {
      '/tianditu': {
        target: 'https://t0.tianditu.gov.cn',
        changeOrigin: true,
        pathRewrite: { '^/tianditu': '' },
        headers: {
          Origin: 'https://www.tianditu.gov.cn'
        }
      },
      '/drive': {
        target: 'https://api.tianditu.gov.cn',
        changeOrigin: true,
        pathRewrite: { '^/drive': '' }
      },
      '/api': {
        target: 'https://api.tianditu.gov.cn',
        changeOrigin: true,
        pathRewrite: { '^/api': '' }
      },
      '/geocoder-proxy': {
        target: 'https://api.tianditu.gov.cn',
        changeOrigin: true,
        pathRewrite: { '^/geocoder-proxy': '' },
        secure: false
      },
      '/geoserver': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: {
          '^/geoserver': '/geoserver'
        },
        onProxyReq: function(proxyReq) {
          // 添加调试日志
          console.log('代理请求:', proxyReq.path)
        },
        onError: function(err) {
          console.error('代理错误:', err)
        },
        secure: false,
        ws: true,
        onProxyReq(proxyReq) {
          console.log('正在代理请求:', proxyReq.path);
        },
        onError(err) {
          console.error('代理错误:', err);
        }
      }
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': `
        default-src 'self';
        img-src 'self' data: https://*.tianditu.gov.cn;
        script-src 'self' 'unsafe-eval' 'unsafe-inline';
        style-src 'self' 'unsafe-inline';
        connect-src 'self' https://*.tianditu.gov.cn;
      `
    }
  },

  // CSS相关配置
  css: {
    extract: process.env.NODE_ENV === 'production',
    sourceMap: true,
    loaderOptions: {
      css: {
        modules: {
          auto: (resourcePath) => resourcePath.endsWith('.module.css'),
          localIdentName: '[name]_[local]_[hash:base64:5]'
        }
      }
    }
  }
})
