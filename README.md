# Link Cycling - 智能骑行蓝牙连接平台

基于 Vue 3 + TypeScript + Vite 构建的智能骑行蓝牙设备连接平台，支持连接各种骑行相关的蓝牙设备，如功率计、心率带、速度踏频传感器等。

## ✨ 主要功能

- 🔗 **蓝牙设备连接**：支持 Web Bluetooth API，可连接各种蓝牙设备
- 🚴 **骑行设备专用**：针对骑行设备优化，支持功率计、心率带、速度踏频传感器等
- 📊 **实时数据监控**：实时显示速度、踏频、功率、心率等关键数据
- ⚙️ **电子变速器支持**：支持电子变速器档位监控、齿比计算、电池状态
- 🌡️ **环境数据监测**：支持温度、海拔、坡度等环境数据的实时监控
- 🔋 **设备状态管理**：监控设备连接状态和电池电量
- 💻 **TypeScript 支持**：完整的类型定义，提供优秀的开发体验
- 📱 **响应式设计**：适配桌面和移动设备

## 🎯 支持的设备类型

- **心率监测器** (Heart Rate Monitor)
- **功率计** (Power Meter)
- **踏频传感器** (Cadence Sensor)
- **阻力设备/智能训练器** (Resistance Device/Smart Trainer)
- **电子变速系统** (Electronic Shifting)

## 🚀 快速开始

### 浏览器要求

由于使用了 Web Bluetooth API，请确保使用支持的浏览器：
- ✅ Chrome 56+ (Windows, macOS, Android)
- ✅ Edge 79+ (Windows)
- ✅ Opera 43+ (Windows, macOS, Android)
- ❌ Firefox (实验性支持)
- ❌ Safari (不支持)

### 使用蓝牙功能

```vue
<template>
  <div>
    <!-- 基础蓝牙连接 -->
    <button @click="bluetooth.requestDevice" :disabled="!bluetooth.isSupported">
      选择蓝牙设备
    </button>
    <button @click="bluetooth.connect" :disabled="!bluetooth.device">
      连接设备
    </button>
    
    <!-- 骑行设备数据显示 -->
    <div v-if="cyclingData.power">
      功率: {{ cyclingData.power }}W
    </div>
    <div v-if="cyclingData.heartRate">
      心率: {{ cyclingData.heartRate }}bpm
    </div>
  </div>
</template>

<script setup lang="ts">
import useBluetooth from '@/hooks/useBluetooth'
import useCyclingBluetooth, { CyclingDeviceType } from '@/hooks/useCyclingBluetooth'

// 基础蓝牙功能
const bluetooth = useBluetooth({ acceptAllDevices: true })

// 骑行设备功能
const cycling = useCyclingBluetooth({
  deviceType: CyclingDeviceType.POWER_METER,
  autoConnect: true
})

const cyclingData = computed(() => cycling.deviceData)
</script>
```

## 📁 项目结构

```
src/
├── hooks/
│   ├── useBluetooth.ts          # 基础蓝牙 hooks
│   ├── useCyclingBluetooth.ts   # 骑行设备专用 hooks
│   └── README.md                # hooks 详细使用文档
├── components/
│   └── BluetoothDemo.vue        # 蓝牙功能演示组件
├── types/
│   └── bluetooth.d.ts           # Web Bluetooth API 类型定义
└── ...
```

## 🔧 开发环境设置

### 推荐的 IDE 配置

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (请禁用 Vetur)

### TypeScript 支持

TypeScript 默认无法处理 `.vue` 文件的类型信息，因此我们使用 `vue-tsc` 进行类型检查。在编辑器中，需要 [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) 来让 TypeScript 语言服务识别 `.vue` 类型。

### 自定义配置

查看 [Vite 配置参考](https://vite.dev/config/)。

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
pnpm test:unit
```

## 📖 详细文档

- [蓝牙 Hooks 使用指南](src/hooks/README.md) - 完整的 API 文档和使用示例
- [BluetoothDemo 组件](src/components/BluetoothDemo.vue) - 完整的功能演示

## ⚠️ 重要注意事项

### 安全要求
- **HTTPS 必需**：Web Bluetooth API 只能在 HTTPS 环境下工作
- **用户交互**：必须通过用户交互（如点击按钮）来触发蓝牙设备请求
- **权限管理**：浏览器会记住用户的设备授权

### 开发建议
- 在本地开发时使用 `https://localhost` 或通过 `chrome://flags` 启用不安全源的实验性功能
- 测试时确保蓝牙设备处于配对模式
- 查看浏览器控制台获取详细的错误信息

## 🔍 故障排除

### 常见问题

1. **"Web Bluetooth API is not supported"**
   - 检查浏览器版本和兼容性
   - 确保在 HTTPS 环境下运行

2. **设备无法连接**
   - 确保设备处于配对模式
   - 检查设备是否被其他应用占用
   - 尝试重启蓝牙服务

3. **数据读取失败**
   - 确认设备支持所需的蓝牙服务
   - 检查设备连接状态
   - 查看错误日志

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) - Mozilla 开发者文档
- [VueUse](https://vueuse.org/) - Vue 组合式工具集
- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
