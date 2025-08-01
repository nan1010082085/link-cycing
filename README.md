# 智能骑行数据中心

一个基于 Web Bluetooth API 的智能骑行设备连接和数据监控平台，支持多种骑行设备的实时数据采集、显示和分析。

## 功能概览

### ✅ 已实现功能

#### 🔗 设备连接与管理
- **多设备支持**: 支持骑行台(Trainer)、功率计(Power Meter)、心率监测器(Heart Rate)、电子变速器(Electronic Shifting)
- **设备自动识别**: 基于蓝牙服务UUID自动识别设备类型
- **设备状态监控**: 实时显示设备连接状态和电池电量
- **设备持久化**: 自动保存已连接设备信息，支持快速重连
- **设备管理界面**: 可视化设备管理，支持设备连接/断开/删除操作

#### 📊 实时数据监控
- **核心数据显示**: 实时显示阻力、踏频(RPM)、功率(W)、心率(BPM)
- **数据解析**: 支持多种蓝牙数据格式解析(Indoor Bike Data, Power Measurement, CSC Measurement等)
- **实时数据流**: 高频率数据采集和显示更新
- **数据验证**: 数据有效性检查和异常处理

#### 🚴‍♂️ 骑行会话管理
- **会话控制**: 开始/暂停/继续/结束骑行会话
- **实时统计**: 骑行时长、平均/最大功率、平均/最大心率、平均踏频
- **数据记录**: 自动记录骑行数据点(最近1000个点)
- **会话状态**: 会话活跃状态和暂停状态管理

#### 💾 数据存储与管理
- **IndexedDB存储**: 基于Dexie的本地数据库存储
- **数据结构设计**: 会话表和数据点表分离存储
- **数据过期管理**: 自动清理过期数据
- **批量操作**: 支持批量删除和清空数据

#### 📈 数据可视化
- **实时数据列表**: 分页显示历史数据点
- **数据图表**: 阻力、功率、心率、踏频的时间序列图表
- **会话预览**: 详细的会话数据分析和图表展示
- **响应式界面**: 适配桌面和移动设备

#### 📤 数据导出
- **FIT格式导出**: 兼容Garmin、Strava等主流平台
- **JSON格式导出**: 原始数据导出
- **批量导出**: 支持多个会话批量导出
- **数据验证**: 导出前数据完整性检查

#### 🎨 用户界面
- **现代化设计**: 基于Ant Design Vue的美观界面
- **实时状态指示**: 设备连接状态、电池电量、数据活跃状态
- **操作反馈**: 完整的消息提示和加载状态
- **快捷操作**: 一键连接、快速会话控制

### 🚧 部分实现功能

#### 📊 会话历史管理
- **基础框架**: SessionManager组件已实现
- **数据库集成**: 部分数据库操作已实现
- **状态**: 当前使用临时解决方案，完整的历史数据加载待完善

#### 🔄 设备自动重连
- **重连逻辑**: 基础重连机制已实现
- **状态**: 需要优化重连策略和错误处理

### ❌ 未实现功能

#### ⚙️ 高级设置
- **设备配置**: 设备特定参数配置
- **数据采集频率**: 可调节的数据采集间隔
- **单位设置**: 公制/英制单位切换
- **主题设置**: 深色/浅色主题切换

#### 🎯 训练功能
- **训练计划**: 结构化训练计划支持
- **目标设定**: 功率、心率区间目标
- **实时指导**: 训练强度指导和提醒
- **间歇训练**: 自动间歇训练控制

#### 📈 高级分析
- **功率分析**: FTP测试、功率分布分析
- **心率分析**: 心率区间分析、恢复监控
- **趋势分析**: 长期训练趋势和进步跟踪
- **对比分析**: 多次训练对比

#### 🌐 云端功能
- **数据同步**: 云端数据备份和同步
- **社交功能**: 训练数据分享
- **在线教练**: 远程教练指导
- **虚拟骑行**: 虚拟路线和竞赛

#### 🔧 设备控制
- **阻力控制**: 主动控制骑行台阻力
- **ERG模式**: 恒定功率模式
- **坡度模拟**: 根据虚拟路线调节阻力
- **校准功能**: 设备校准和零点设定

#### 📱 移动端优化
- **PWA支持**: 渐进式Web应用
- **离线功能**: 离线数据记录
- **推送通知**: 训练提醒和目标达成通知
- **手势操作**: 移动端手势控制

#### 🔌 扩展功能
- **插件系统**: 第三方插件支持
- **API接口**: 开放数据接口
- **自定义仪表盘**: 用户自定义数据显示
- **多语言支持**: 国际化语言包

## 🎯 支持的设备类型

- **骑行台 (Trainer)**: 支持阻力数据读取，未来支持阻力控制
- **功率计 (Power Meter)**: 功率和踏频数据采集
- **心率监测器 (Heart Rate Monitor)**: 心率数据监控
- **电子变速器 (Electronic Shifting)**: 变速档位监控

## 🚀 快速开始

### 环境要求

- Node.js 18+
- 现代浏览器（支持 Web Bluetooth API）
- HTTPS 环境（本地开发可使用 localhost）

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

## 🏗️ 项目结构

```
src/
├── components/              # Vue 组件
│   ├── DeviceManager.vue        # 设备管理组件
│   ├── DeviceControlPanel.vue   # 设备控制面板
│   ├── RidingDataDisplay.vue    # 骑行数据显示
│   ├── RealTimeDataList.vue     # 实时数据列表
│   ├── SessionManager.vue       # 会话管理组件
│   ├── SessionPreview.vue       # 会话预览组件
│   └── LineChart.vue           # 图表组件
├── stores/                  # Pinia 状态管理
│   ├── bluetooth.ts            # 蓝牙连接管理
│   └── cycling.ts              # 骑行数据管理
├── types/                   # TypeScript 类型定义
│   ├── bluetooth.d.ts          # 蓝牙相关类型
│   └── cycling.ts              # 骑行数据类型
├── utils/                   # 工具函数
│   ├── database.ts             # IndexedDB数据库管理
│   └── fitExporter.ts          # FIT文件导出
├── pages/                   # 页面组件
│   └── Dashboard.vue           # 主仪表盘页面
└── router/                  # 路由配置
    └── index.ts                # 路由定义
```

## 🔧 技术栈

- **前端框架**: Vue 3 + Composition API
- **开发语言**: TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **UI 组件库**: Ant Design Vue 4.x
- **路由**: Vue Router 4
- **数据库**: IndexedDB (Dexie.js)
- **图表**: Chart.js
- **蓝牙 API**: Web Bluetooth API
- **样式**: CSS3 + Flexbox/Grid
- **包管理**: pnpm
- **时间处理**: Day.js
- **测试**: Vitest

## 📱 浏览器兼容性

| 浏览器 | 版本要求 | Web Bluetooth 支持 | 测试状态 |
|--------|----------|--------------------|---------||
| Chrome | 56+ | ✅ | ✅ 完全支持 |
| Edge | 79+ | ✅ | ✅ 完全支持 |
| Firefox | - | ❌ (实验性支持) | ❌ 不支持 |
| Safari | - | ❌ | ❌ 不支持 |
| Opera | 43+ | ✅ | ⚠️ 部分测试 |

> **注意**: Web Bluetooth API 需要在 HTTPS 环境下运行，本地开发可使用 `localhost`。

## 🔌 蓝牙设备连接

### 支持的蓝牙服务

- **Fitness Machine Service** (`0x1826`) - 骑行台
- **Cycling Power Service** (`0x1818`) - 功率计
- **Heart Rate Service** (`0x180D`) - 心率监测器
- **Cycling Speed and Cadence Service** (`0x1816`) - 速度踏频传感器
- **Electronic Shifting Service** (厂商特定) - 电子变速器

### 连接流程

1. 点击「连接设备」按钮
2. 浏览器弹出设备选择对话框
3. 选择要连接的蓝牙设备
4. 系统自动识别设备类型并建立连接
5. 开始接收实时数据
6. 设备信息自动保存，支持快速重连

## 📊 数据格式

### 设备数据接口
```typescript
interface CyclingDeviceData {
  timestamp?: number;
  batteryLevel?: number;
  trainer?: TrainerData;
  powerMeter?: PowerMeterData;
  heartRate?: HeartRateData;
  electronicShifting?: ElectronicShiftingData;
}
```

### 骑行台数据
```typescript
interface TrainerData {
  resistance?: number;      // 阻力百分比 (%)
  power?: number;          // 功率 (W)
  cadence?: number;        // 踏频 (rpm)
  speed?: number;          // 速度 (km/h)
}
```

### 功率计数据
```typescript
interface PowerMeterData {
  power: number;                    // 瞬时功率 (W)
  cadence?: number;                 // 踏频 (rpm)
  crankRevolutions?: number;        // 曲柄转数
  crankEventTime?: number;          // 曲柄事件时间
  pedalPowerBalance?: number;       // 踏板功率平衡 (%)
}
```

### 心率数据
```typescript
interface HeartRateData {
  heartRate: number;        // 心率值 (bpm)
  rrIntervals?: number[];   // RR间期数组 (ms)
  energyExpended?: number;  // 消耗能量 (kJ)
  contactDetected?: boolean; // 接触检测
}
```

### 电子变速器数据
```typescript
interface ElectronicShiftingData {
  frontGear: number;        // 前齿盘档位
  rearGear: number;         // 后飞轮档位
  batteryLevel?: number;    // 电池电量 (%)
  shiftMode?: string;       // 变速模式
}
```

## 🎯 使用指南

### 基本使用流程

1. **设备连接**
   - 确保设备已开启并处于配对模式
   - 点击「连接设备」按钮
   - 在弹出的设备列表中选择目标设备
   - 等待连接成功提示

2. **开始骑行**
   - 连接设备后，点击「开始骑行」按钮
   - 系统开始记录实时数据
   - 可随时暂停/继续/结束会话

3. **数据查看**
   - 实时数据显示在主界面
   - 历史数据可通过「历史记录」查看
   - 支持图表和列表两种查看方式

4. **数据导出**
   - 在会话管理中选择要导出的会话
   - 支持FIT和JSON两种格式
   - FIT格式兼容主流骑行应用

### 高级功能

- **多设备同时连接**: 支持同时连接多种类型设备
- **设备状态监控**: 实时显示设备连接状态和电池电量
- **数据验证**: 自动验证数据有效性，过滤异常值
- **自动保存**: 设备信息和会话数据自动保存

## 🐛 故障排除

### 常见问题

1. **无法连接设备**
   - 确保浏览器支持Web Bluetooth API
   - 检查是否在HTTPS环境下运行
   - 确认设备处于配对模式
   - 尝试刷新页面重新连接

2. **数据显示异常**
   - 检查设备是否正常工作
   - 确认设备与电脑距离适中
   - 查看浏览器控制台是否有错误信息

3. **导出功能异常**
   - 确保会话包含有效数据
   - 检查浏览器下载设置
   - 尝试使用JSON格式导出

### 调试模式

开发模式下，可在浏览器控制台查看详细的蓝牙通信日志和数据解析信息。

## 🔮 未来规划

### 短期目标 (v1.1)
- 完善会话历史管理功能
- 优化设备重连机制
- 添加基础设置功能
- 改进移动端体验

### 中期目标 (v1.5)
- 实现阻力控制功能
- 添加训练计划支持
- 增强数据分析功能
- 支持PWA离线使用

### 长期目标 (v2.0)
- 云端数据同步
- 虚拟骑行功能
- 社交分享功能
- 插件系统支持

## 🔧 开发环境设置

### 推荐的 IDE 配置

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (请禁用 Vetur)

### TypeScript 支持

TypeScript 默认无法处理 `.vue` 文件的类型信息，因此我们使用 `vue-tsc` 进行类型检查。在编辑器中，需要 [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) 来让 TypeScript 语言服务识别 `.vue` 类型。

### 自定义配置

查看 [Vite 配置参考](https://vite.dev/config/)。

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

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 贡献方式

1. **代码贡献**
   - Fork 本仓库
   - 创建特性分支 (`git checkout -b feature/AmazingFeature`)
   - 提交更改 (`git commit -m 'Add some AmazingFeature'`)
   - 推送到分支 (`git push origin feature/AmazingFeature`)
   - 开启 Pull Request

2. **问题反馈**
   - 提交详细的 [Issue](../../issues)
   - 包含复现步骤和环境信息
   - 提供相关的错误日志

3. **功能建议**
   - 在 [Discussions](../../discussions) 中讨论新功能
   - 详细描述使用场景和预期效果

### 开发规范

- 遵循 TypeScript 严格模式
- 使用 ESLint 和 Prettier 格式化代码
- 编写单元测试覆盖新功能
- 更新相关文档

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢以下开源项目和技术：

- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) - 蓝牙连接基础
- [Vue.js](https://vuejs.org/) - 前端框架
- [Ant Design Vue](https://antdv.com/) - UI组件库
- [Vite](https://vitejs.dev/) - 构建工具
- [Dexie.js](https://dexie.org/) - IndexedDB封装
- [Chart.js](https://www.chartjs.org/) - 图表库
- [Day.js](https://dayjs.gitee.io/) - 时间处理
- [VueUse](https://vueuse.org/) - Vue 组合式工具集
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集

特别感谢骑行社区的测试和反馈！

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](../../issues) - 问题反馈和功能建议
- 发起 [Discussion](../../discussions) - 技术讨论和使用交流
- 查看 [Wiki](../../wiki) - 详细文档和教程

---

**Happy Cycling! 🚴‍♂️**

*让科技为骑行赋能，让数据驱动进步！*
