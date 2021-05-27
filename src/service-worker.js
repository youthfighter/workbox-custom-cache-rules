/* eslint-disable */
importScripts("/workbox-v4.3.1/workbox-sw.js")
workbox.setConfig({modulePathPrefix: "/workbox-v4.3.1"})

// 设置缓存前缀和后缀，请根据实际项目名修改
workbox.core.setCacheNameDetails({
  prefix: 'yf-app',
  suffix: 'v1.0.0'
})

// sw尽快的接管页面
workbox.core.skipWaiting()
workbox.core.clientsClaim()

workbox.precaching.precacheAndRoute(self.__precacheManifest || [])

// 重新定义缓存读取和存储的key
const cacheResourcePlugin = {
  cacheKeyWillBeUsed: async ({ request }) => {
    let url = request.url
    let params = url.split('?')
    if (params[1]) {
      return params[0] + '?' + params[1].split('&').map(ele => ele.startsWith('token=') ? '' : ele).join('&')
    } else {
      return request
    }
  }
}

// 动态ajax请求的缓存
workbox.routing.registerRoute(function (request) {
  // 返回是否缓存结果
  return request.url.pathname.includes('/images/')
}, workbox.strategies.cacheFirst({
  cacheName: 'yf-dynamic-resource',
  plugins: [cacheResourcePlugin]
}))