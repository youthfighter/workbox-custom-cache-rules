# 

# 1. 简介

`PWA`（渐进式Web应用程序，渐进式Web应用程序）采用现代的Web API以及传统的渐进式增强策略来创建跨平台Web应用程序。这些应用无处不在，功能丰富，能够与原生应用相同的用户体验优势。
[workbox](https://developers.google.cn/web/tools/workbox/) 是 GoogleChrome 团队推出的一套 Web App 静态资源本地存储的解决方案，该解决方案包含一些 Js 库和构建工具。在 workbox 背后则是 [Service Worker](https://link.juejin.im/?target=https%3A%2F%2Flavas.baidu.com%2Fpwa%2Foffline-and-cache-loading%2Fservice-worker%2Fservice-worker-introduction) 和 [Cache API](https://link.juejin.im/?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fzh-CN%2Fdocs%2FWeb%2FAPI%2FCache) 等技术和标准在驱动。

# 2. 需求

公司业务系统采用 `vue` 作为前端框架，想使用 `PWA` 技术来提高网站的访问速度和断网体验。根据公司的实际业务场景，有两点核心的需求：① 支持纯内网，② 支持动态资源的自定义缓存KEY。
对于需求 ① 相对来说，需要将所需的资源都打到前端包内，而不能引用公网的资源。
对于需求 ② 来说，系统目前对资源访问添加了权限控制，核心逻辑是在资源的 `url` 拼接权限令牌`token`）。前端访问资源时，按固定格式拼接资源 `id` 和资源 `token` ，例如 `resource/download?resId=a&token=b` 。资源的他 `token` 具有一定的有效期，过期后资源不可访问。但站在资源缓存的角度来说，资源只和 `resId` 有关而跟 `token` 无关。如果 `resource/download?resId=a&token=b` 的缓存在 `cacheStorage` 中存在，那么当访问 `resource/download?resId=a&token=c` 时，应该可以直接从缓存中获取资源并返回。


# 3. 解决办法

## 3.1 PWA插件

vue提供了 `@vue/cli-plugin-pwa` 插件，借助该插件可以完成 `PWA` 功能的初始化操作。具体操作步骤如：

1. 执行命令 `vue add pwa` 在依赖安装成功后，会发现项目的 `src` 目录下增加了 `registerServiceWorker.js` 文件，并在 `main.js` 中引入。
1. 执行 `npm run build` 指令，生成 `dist` 包，安装 `http-server` 并执行 `hs ./dist`。再次刷新页面后，可以看到资源来源为 `ServiceWorker`。

![image.png](https://cdn.nlark.com/yuque/0/2021/png/580982/1622014845886-d8b4ffa3-654f-4c81-bf6f-61379e94e2f6.png#clientId=udf9fa437-151c-4&from=paste&height=231&id=u64f1ebef&margin=%5Bobject%20Object%5D&name=image.png&originHeight=461&originWidth=1505&originalType=binary&size=95971&status=done&style=none&taskId=uccdf4d7c-fc5a-4d35-b2a8-7bbd861a24c&width=752.5)


## 3.2 解决内网问题

通过3.1的操作，基本上已经集成了 `PWA` 的基础功能。但当我们关闭电脑网络，并执行 `hs ./dist -p 9999` 命令时。会提示网络错误，问题出现的原因是因为，在 `dist` 目录下的 `service-worker` 文件中，使用的 `workbox-sw.js` 请求的是公网的地址，断网情况下公网无法访问，直接导致 `workbox` 无法注册成功。这是由于 `workbox` 默认使用 `Google Cloud Storage` 上的 `workbox-sw.js`。要实现内网访问，就需要支持访问本地的 `workbox-sw.js` 文件。
![image.png](https://cdn.nlark.com/yuque/0/2021/png/580982/1622015275440-7b63e20b-cf56-472c-a3a6-bb1809e58d26.png#clientId=udf9fa437-151c-4&from=paste&height=66&id=u538a34a0&margin=%5Bobject%20Object%5D&name=image.png&originHeight=131&originWidth=1824&originalType=binary&size=28925&status=done&style=none&taskId=u40277f62-e20f-47dc-9046-cf5b1df0e75&width=912)


1. 在 `vue.config.js` 中添加如下 `PWA` 的相关配置。

```javascript
module.exports = {
  pwa: {
    workboxOptions: {
      importWorkboxFrom: 'local'
    }
  },
}
```

2. `npm run build` 打包后，断网并更换 `http-server` 端口重新访问，自建加载异常消失。



## 3.3 解决自定义缓存KEY问题

`PWA` 插件完成了所有的资源预缓存工作，但动态资源请求，需要开发者自己定义缓存规则。默认的动态缓存，会使用请求的 `url` 作为资源的唯一标识。按照默认的规则，资源 `token` 变更时，之前缓存的资源也会失效，这样动态缓存的命中会大大的降级。借助 `workbox` [自定义插件](https://developers.google.cn/web/tools/workbox/guides/using-plugins)的功能，自定义缓存存取的资源名称。

1. 在 `src` 下新建 `service-worker.js`，代码如下所示：





```javascript
/* eslint-disable */
importScripts("/workbox-v4.3.1/workbox-sw.js");
workbox.setConfig({modulePathPrefix: "/workbox-v4.3.1"})

// 设置缓存前缀和后缀，请根据实际项目名修改
workbox.core.setCacheNameDetails({
  prefix: 'yf-app',
  suffix: 'v1.0.0'
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

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
  return request.url.pathname.includes('/resource/download')
}, workbox.strategies.cacheFirst({
  cacheName: 'yf-dynamic-resource',
  plugins: [cacheResourcePlugin]
}))

```

2. 修改 `vue.config.js`文件，带么如下所示：

```javascript
module.exports = {
  pwa: {
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: 'src/service-worker.js',
      importWorkboxFrom: 'local',
    }
  },
}
```


# 4 示例测试

## 4.1 核心代码

项目业务系统的资源请求需要服务端的配合（重定向）。为了方便验证以上的解决方案，使用 `vue-cli` 创建了一个[示例项目](https://github.com/youthfighter/workbox-custom-cache-rules)。核心配置和代码如下：

```javascript
// vue.config.js
module.exports = {
  pwa: {
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: 'src/service-worker.js',
      importWorkboxFrom: 'local',
    }
  }
}

// service-worker.js
// 省略预缓存和插件代码
// 动态ajax请求的缓存
workbox.routing.registerRoute(function (request) {
  // 返回是否缓存结果
  return request.url.pathname.includes('/images/')
}, workbox.strategies.cacheFirst({
  cacheName: 'yf-dynamic-resource',
  plugins: [cacheResourcePlugin]
}))
```

```vue
// app.vue
<template>
  <div id="app">
    <div id="nav">
      <img :src="src1">
      <button @click="btnClick">更换token</button>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      src1: './images/1.jpg'
    }
  },
  methods: {
    btnClick() {
      this.src1 = `./images/1.jpg?token=${Date.now()}`
    }
  }
}
</script>
```

## 4.2 验证内网访问

`npm run build` 后，断网状态下执行 `hs ./dist -p 10010` (避免缓存)，可以看到 `workbox` 被正常注册，`service worker` 启用。
![image.png](https://cdn.nlark.com/yuque/0/2021/png/580982/1622095828067-c04b983e-6b39-4bcc-b7a6-49196e0deb3e.png#clientId=uedfef4c0-e210-4&from=paste&height=262&id=uaf59c75d&margin=%5Bobject%20Object%5D&name=image.png&originHeight=524&originWidth=1186&originalType=binary&size=398167&status=done&style=none&taskId=u15b3d36f-aff8-4ccb-b0a4-5c82e3de72b&width=593)
​

## 4.3 验证自定义缓存KEY

先将 `service-worker.js` 中的插件引用注释，打包运行。多次点击更换 `token` 按钮，查看 `cacheStorage` 会发现该图片被缓存了多次。断网后再次点击更换 `token` 按钮，会显示裂图。
![image.png](https://cdn.nlark.com/yuque/0/2021/png/580982/1622096522512-58f2580e-c550-4908-9445-4952ba7a1812.png#clientId=u28305331-9914-4&from=paste&height=269&id=ud15a742b&margin=%5Bobject%20Object%5D&name=image.png&originHeight=538&originWidth=1324&originalType=binary&size=437529&status=done&style=none&taskId=uc2d876af-1001-4aee-bf3f-83f86180385&width=662)
![image.png](https://cdn.nlark.com/yuque/0/2021/png/580982/1622096550487-e75f548d-00ab-49f6-84eb-b91249048b20.png#clientId=u28305331-9914-4&from=paste&height=352&id=uf36378ee&margin=%5Bobject%20Object%5D&name=image.png&originHeight=703&originWidth=1471&originalType=binary&size=135205&status=done&style=none&taskId=u23c19207-6c15-4971-b7af-c5e10276f47&width=735.5)
将 `service-worker.js` 中的插件引用注释放开，打包运行。当多次点击更换 `token` 按钮，`cacheStorage` 中该图片资源只被缓存的一份。在 `network` 下选择断网后，点击更换 `token`，图片依然正常显示。
![image.png](https://cdn.nlark.com/yuque/0/2021/png/580982/1622096102321-bfc901d1-eb2e-4594-882a-cf91016b80ff.png#clientId=u28305331-9914-4&from=paste&height=250&id=u78e7f7af&margin=%5Bobject%20Object%5D&name=image.png&originHeight=499&originWidth=1118&originalType=binary&size=410475&status=done&style=none&taskId=u04ee1c73-9e29-4a00-a179-2d2c580231a&width=559)