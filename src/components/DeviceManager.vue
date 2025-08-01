<template>
  <div class="device-manager">
    <!-- 设备管理抽屉 -->
    <a-drawer
      v-model:open="visible"
      title="设备管理"
      placement="right"
      :width="480"
      class="device-drawer"
    >
      <div class="drawer-content">
        <!-- 缓存设备区域 -->
        <div class="cached-section">
          <div class="section-header">
            <h3>缓存设备</h3>
            <div class="header-actions">
              <a-button size="small" @click="refreshCachedDevices"> 刷新 </a-button>
              <a-button size="small" danger @click="clearAllCachedDevices"> 清空全部 </a-button>
            </div>
          </div>

          <div class="device-list" v-if="cachedDevices.length > 0">
            <div v-for="device in cachedDevices" :key="device.id" class="device-item cached">
              <div class="device-info">
                <div class="device-name">{{ device.name }}</div>
                <div class="device-type">{{ getDeviceTypeLabel(device.type) }}</div>
                <div class="device-details">
                  <span v-if="device.autoReconnect" class="auto-reconnect-tag">自动重连</span>
                  <span class="last-connected"
                    >上次连接:
                    {{
                      device.lastConnected
                        ? new Date(device.lastConnected).toLocaleString()
                        : '从未连接'
                    }}</span
                  >
                </div>
              </div>
              <div class="device-actions">
                <a-button
                  type="primary"
                  size="small"
                  @click="connectCachedDevice(device)"
                  :loading="connectingDevices.has(device.id)"
                >
                  连接
                </a-button>
                <a-button size="small" @click="toggleAutoReconnect(device)">
                  {{ device.autoReconnect ? '禁用自动重连' : '启用自动重连' }}
                </a-button>
                <a-button size="small" danger @click="removeCachedDevice(device)"> 删除 </a-button>
              </div>
            </div>
          </div>

          <a-empty v-else description="暂无缓存设备" />
        </div>

        <a-divider />

        <!-- 设备发现区域 -->
        <div class="discovery-section">
          <div class="section-header">
            <h3>发现设备</h3>
            <a-button
              type="primary"
              :loading="isScanning"
              :disabled="!bluetoothStore.isSupported"
              @click="startSingleDeviceDiscovery"
            >
              <template #icon>
                <SearchOutlined />
              </template>
              {{ isScanning ? '扫描中...' : '扫描设备' }}
            </a-button>
          </div>

          <div class="device-type-filters">
            <div class="filter-header">
              <span>选择设备类型：</span>
            </div>
            <a-radio-group v-model:value="selectedDeviceType" @change="onDeviceTypeChange">
              <a-radio :value="CyclingDeviceType.TRAINER">骑行台</a-radio>
              <a-radio :value="CyclingDeviceType.POWER_METER">功率计</a-radio>
              <a-radio :value="CyclingDeviceType.HEART_RATE">心率设备</a-radio>
              <a-radio :value="CyclingDeviceType.ELECTRONIC_SHIFTING">电子变速</a-radio>
            </a-radio-group>
          </div>

          <!-- 连接状态提示 -->
          <div v-if="connectingDevices.size > 0" class="connection-status">
            <a-alert
              type="info"
              show-icon
              :message="`正在连接 ${connectingDevices.size} 个设备...`"
              description="请保持设备开启状态，连接可能需要几秒钟时间"
            >
              <template #icon>
                <LoadingOutlined />
              </template>
            </a-alert>
          </div>

          <!-- 蓝牙错误提示 -->
          <div v-if="bluetoothStore.error" class="bluetooth-error">
            <a-alert
              type="error"
              show-icon
              :message="'蓝牙连接错误'"
              :description="bluetoothStore.error"
              closable
              @close="bluetoothStore.error = null"
            />
          </div>

          <!-- 发现的设备列表 -->
          <div class="discovered-devices" v-if="discoveredDevices.length > 0">
            <h4>发现的设备</h4>
            <div class="device-list">
              <div
                v-for="device in discoveredDevices"
                :key="device.id"
                class="device-item discovered"
              >
                <div class="device-info">
                  <div class="device-name">{{ device.name || '未知设备' }}</div>
                  <div class="device-type">{{ getDeviceTypeLabel(device.type) }}</div>
                  <div class="device-id">{{ device.id }}</div>
                </div>
                <div class="device-actions">
                  <a-space>
                    <a-button
                      type="primary"
                      size="small"
                      @click="connectToDevice(device)"
                      :loading="connectingDevices.has(device.id)"
                    >
                      <template #icon v-if="connectingDevices.has(device.id)">
                        <LoadingOutlined />
                      </template>
                      连接
                    </a-button>

                    <!-- 连接失败时显示重试按钮 -->
                    <a-button
                      v-if="!connectingDevices.has(device.id)"
                      size="small"
                      type="dashed"
                      @click="retryConnection(device)"
                      title="重试连接"
                    >
                      <template #icon>
                        <ReloadOutlined />
                      </template>
                    </a-button>
                  </a-space>
                </div>
              </div>
            </div>
          </div>
        </div>

        <a-divider />

        <!-- 已连接设备区域 -->
        <div class="connected-section">
          <div class="section-header">
            <h3>已连接设备</h3>
            <a-badge :count="cyclingStore.connectedDevicesList.length" show-zero>
              <DeviceIcon />
            </a-badge>
          </div>

          <div class="device-list" v-if="cyclingStore.connectedDevicesList.length > 0">
            <div
              v-for="device in cyclingStore.connectedDevicesList"
              :key="device.id"
              class="device-item connected"
            >
              <div class="device-info">
                <div class="device-name">
                  <a-badge status="success" />
                  {{ device.name }}
                </div>
                <div class="device-type">{{ getDeviceTypeLabel(device.type) }}</div>
                <div class="device-details" v-if="device.deviceInfo">
                  <span v-if="device.deviceInfo.batteryLevel">
                    电量: {{ device.deviceInfo.batteryLevel }}%
                  </span>
                  <span v-if="device.deviceInfo.manufacturer">
                    {{ device.deviceInfo.manufacturer }}
                  </span>
                </div>
              </div>
              <div class="device-actions">
                <!-- 设备控制按钮 -->
                <a-button
                  v-if="hasDeviceControls(device.type)"
                  size="small"
                  type="primary"
                  @click="showDeviceControl(device)"
                >
                  <ControlOutlined /> 控制
                </a-button>

                <a-button size="small" danger @click="disconnectDevice(device)"> 断开 </a-button>
              </div>
            </div>
          </div>

          <a-empty v-else description="暂无已连接设备" />
        </div>

        <a-divider />

        <!-- 设备控制面板模态框 -->
        <a-modal
          v-model:open="controlPanelVisible"
          :title="`控制 ${selectedDevice?.name}`"
          :footer="null"
          width="600px"
          :destroy-on-close="true"
        >
          <DeviceControlPanel v-if="selectedDevice" :device="selectedDevice" />
        </a-modal>

        <!-- 已保存设备区域 -->
        <div class="saved-section">
          <div class="section-header">
            <h3>已保存设备</h3>
            <a-button size="small" @click="clearAllSavedDevices" danger> 清空全部 </a-button>
          </div>

          <div class="device-list" v-if="cyclingStore.savedDevices.length > 0">
            <div
              v-for="device in cyclingStore.savedDevices"
              :key="device.id"
              class="device-item saved"
              :class="{ connected: device.connected }"
            >
              <div class="device-info">
                <div class="device-name">
                  <a-badge :status="device.connected ? 'success' : 'default'" />
                  {{ device.name }}
                </div>
                <div class="device-type">{{ getDeviceTypeLabel(device.type) }}</div>
                <div class="device-last-connected" v-if="device.lastConnected">
                  最后连接: {{ formatLastConnected(device.lastConnected) }}
                </div>
              </div>
              <div class="device-actions">
                <a-button
                  v-if="!device.connected"
                  size="small"
                  type="primary"
                  @click="reconnectDevice(device)"
                  :loading="connectingDevices.has(device.id)"
                >
                  重连
                </a-button>
                <a-popconfirm title="确定要删除这个设备吗？" @confirm="removeDevice(device)">
                  <a-button size="small" danger> 删除 </a-button>
                </a-popconfirm>
              </div>
            </div>
          </div>

          <a-empty v-else description="暂无已保存设备" />
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  SearchOutlined,
  SettingOutlined,
  WifiOutlined as DeviceIcon,
  ReloadOutlined,
  DeleteOutlined,
  LoadingOutlined,
  ControlOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useCyclingStore, type DeviceInfo } from '../stores/cycling'
import { CyclingDeviceType } from '../types/cycling'
import { useBluetoothStore, type DiscoveredDevice } from '../stores/bluetooth'
import DeviceControlPanel from './DeviceControlPanel.vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

// 扩展dayjs
dayjs.extend(relativeTime)

// Store
const cyclingStore = useCyclingStore()
const bluetoothStore = useBluetoothStore()

// 响应式数据
const visible = defineModel()
const connectingDevices = ref<Set<string>>(new Set())
const selectedDeviceType = ref<CyclingDeviceType>(CyclingDeviceType.TRAINER)
const currentScanningType = ref<CyclingDeviceType | null>(null)
const controlPanelVisible = ref(false)
const selectedDevice = ref<DeviceInfo | null>(null)

// 使用蓝牙store中的状态
const isScanning = computed(() => bluetoothStore.isScanning)
const discoveredDevices = computed(() => bluetoothStore.discoveredDevices)
const cachedDevices = computed(() => cyclingStore.savedDevices)

/**
 * 格式化最后连接时间
 */
function formatLastConnected(date: Date): string {
  return dayjs(date).fromNow()
}

/**
 * 设备类型变化
 */
function onDeviceTypeChange() {
  console.log('Selected device type:', selectedDeviceType.value)
}

/**
 * 开始单设备发现
 */
async function startSingleDeviceDiscovery(): Promise<void> {
  if (!bluetoothStore.isSupported) {
    message.error('浏览器不支持Web Bluetooth API')
    return
  }

  try {
    // 清除之前发现的设备
    bluetoothStore.clearDiscoveredDevices()

    currentScanningType.value = selectedDeviceType.value
    await bluetoothStore.scanDevices(selectedDeviceType.value)
    message.success(`发现 ${getDeviceTypeLabel(selectedDeviceType.value)} 设备`)

    currentScanningType.value = null

    if (discoveredDevices.value.length === 0) {
      message.info('未发现任何设备，请确保设备已开启并处于配对模式')
    }
  } catch (error: any) {
    currentScanningType.value = null
    handleDiscoveryError(error)
  }
}

/**
 * 处理设备发现错误
 */
function handleDiscoveryError(error: any): void {
  console.error('Device discovery failed:', error)

  switch (error.name) {
    case 'NotFoundError':
      // 用户取消选择，不显示错误
      break
    case 'SecurityError':
      message.error('安全错误：请确保在HTTPS环境下使用')
      break
    case 'NotSupportedError':
      message.error('设备不支持所选的服务')
      break
    default:
      message.error(`设备发现失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 设备类型字符串到枚举的映射
 */
const deviceTypeStringToEnum: Record<string, CyclingDeviceType> = {
  trainer: CyclingDeviceType.TRAINER,
  power_meter: CyclingDeviceType.POWER_METER,
  heart_rate: CyclingDeviceType.HEART_RATE,
  electronic_shifting: CyclingDeviceType.ELECTRONIC_SHIFTING,
}

/**
 * 连接到设备
 */
async function connectToDevice(device: DiscoveredDevice): Promise<void> {
  try {
    connectingDevices.value.add(device.id)

    // 连接设备
    await bluetoothStore.connectDevice(device.id)

    // 开始读取数据
    await bluetoothStore.startReading(device.id)

    message.success(`已连接到 ${device.name}`)
  } catch (error: any) {
    console.error('Failed to connect device:', error)
    handleConnectionError(error, device.name)
  } finally {
    connectingDevices.value.delete(device.id)
  }
}

/**
 * 连接缓存的设备
 */
async function connectCachedDevice(deviceInfo: DeviceInfo): Promise<void> {
  try {
    connectingDevices.value.add(deviceInfo.id)

    // 首先需要重新扫描该类型的设备
    await bluetoothStore.scanDevices(deviceInfo.type)

    // 查找匹配的设备
    const discoveredDevice = discoveredDevices.value.find((d) => d.name === deviceInfo.name)
    if (!discoveredDevice) {
      throw new Error('设备未找到，请确保设备已开启')
    }

    // 连接设备
    await bluetoothStore.connectDevice(discoveredDevice.id)

    // 开始读取数据
    await bluetoothStore.startReading(discoveredDevice.id)

    message.success(`已重新连接到 ${deviceInfo.name}`)
  } catch (error: any) {
    console.error('Failed to reconnect cached device:', error)
    handleConnectionError(error, deviceInfo.name)
  } finally {
    connectingDevices.value.delete(deviceInfo.id)
  }
}

/**
 * 断开设备连接
 */
async function disconnectDevice(deviceInfo: DeviceInfo): Promise<void> {
  try {
    // 使用蓝牙store断开连接
    await bluetoothStore.disconnectDevice(deviceInfo.id)

    message.success(`已断开 ${deviceInfo.name}`)
  } catch (error: any) {
    console.error('Failed to disconnect device:', error)
    message.error(`断开设备失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 处理连接错误
 */
function handleConnectionError(error: any, deviceName: string): void {
  console.error('Connection error details:', error)

  const errorMessage = error.message || '未知错误'

  // 处理新的Connection Error格式
  if (errorMessage.startsWith('Connection Error:')) {
    const cleanMessage = errorMessage.replace('Connection Error: ', '')

    if (cleanMessage.includes('连接超时')) {
      message.error({
        content: `连接 ${deviceName} 超时，请确保设备处于可连接状态，并尝试重新连接`,
        duration: 5,
      })
    } else if (cleanMessage.includes('设备未找到')) {
      message.error({
        content: `未找到设备 ${deviceName}，请重新扫描设备或确保设备已开启`,
        duration: 5,
      })
    } else if (cleanMessage.includes('无法获取设备服务')) {
      message.error({
        content: `设备 ${deviceName} 服务不兼容，设备可能不支持所选的服务类型，请检查设备类型选择`,
        duration: 5,
      })
    } else if (cleanMessage.includes('无法获取任何特征值')) {
      message.error({
        content: `设备 ${deviceName} 特征值获取失败，设备可能不完全兼容，请尝试其他设备类型或联系设备厂商`,
        duration: 5,
      })
    } else if (cleanMessage.includes('设备已连接')) {
      message.warning(`设备 ${deviceName} 已经连接`)
    } else {
      message.error({
        content: `连接 ${deviceName} 失败：${cleanMessage}`,
        duration: 5,
      })
    }
    return
  }

  // 检查是否是'value'属性未定义的错误
  if (errorMessage.includes("Cannot read properties of undefined (reading 'value')")) {
    message.error({
      content: `设备 ${deviceName} 数据读取失败，请重试连接或检查设备状态`,
      duration: 5,
    })
    return
  }

  // 处理标准蓝牙错误
  switch (error.name) {
    case 'NetworkError':
      message.error({
        content: `网络错误：无法连接到 ${deviceName}，请检查设备是否在范围内并重试`,
        duration: 5,
      })
      break
    case 'SecurityError':
      message.error({
        content: '安全错误，请确保在HTTPS环境下使用蓝牙功能',
        duration: 5,
      })
      break
    case 'NotSupportedError':
      message.error({
        content: `设备 ${deviceName} 不支持所需的服务，请检查设备类型选择是否正确`,
        duration: 5,
      })
      break
    case 'InvalidStateError':
      message.error({
        content: `设备 ${deviceName} 状态无效，请重启设备后重试`,
        duration: 5,
      })
      break
    case 'NotFoundError':
      message.error({
        content: `未找到设备 ${deviceName}，请确保设备已开启并处于可连接状态`,
        duration: 5,
      })
      break
    case 'AbortError':
      message.error({
        content: `连接 ${deviceName} 被中断，请重试连接`,
        duration: 5,
      })
      break
    default:
      // 处理其他可能的value相关错误
      if (errorMessage.includes('value') || errorMessage.includes('undefined')) {
        message.error({
          content: `设备 ${deviceName} 数据格式异常，请检查设备兼容性或尝试重新连接`,
          duration: 5,
        })
      } else {
        message.error({
          content: `连接失败: ${errorMessage}，请检查设备状态并重试`,
          duration: 5,
        })
      }
  }
}

/**
 * 重新连接设备
 */
async function reconnectDevice(deviceInfo: DeviceInfo): Promise<void> {
  try {
    connectingDevices.value.add(deviceInfo.id)

    // 先断开现有连接
    if (deviceInfo.connected) {
      await disconnectDevice(deviceInfo)
      // 等待一段时间确保完全断开
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // 重新连接缓存的设备
    await connectCachedDevice(deviceInfo)
  } catch (error: any) {
    console.error('Failed to reconnect device:', error)
    handleConnectionError(error, deviceInfo.name)
  } finally {
    connectingDevices.value.delete(deviceInfo.id)
  }
}

/**
 * 重试连接设备
 */
async function retryConnection(device: DiscoveredDevice): Promise<void> {
  try {
    connectingDevices.value.add(device.id)

    // 等待一段时间后重试
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 重新尝试连接
    await connectToDevice(device)

    message.success(`重试连接 ${device.name} 成功`)
  } catch (error: any) {
    console.error('Failed to retry connection:', error)
    handleConnectionError(error, device.name)
  } finally {
    connectingDevices.value.delete(device.id)
  }
}

/**
 * 获取设备类型标签
 */
function getDeviceTypeLabel(type: CyclingDeviceType): string {
  const labels = {
    [CyclingDeviceType.TRAINER]: '骑行台',
    [CyclingDeviceType.POWER_METER]: '功率计',
    [CyclingDeviceType.HEART_RATE]: '心率设备',
    [CyclingDeviceType.ELECTRONIC_SHIFTING]: '电子变速',
  }
  return labels[type] || '未知设备'
}

/**
 * 移除设备
 */
function removeDevice(deviceInfo: DeviceInfo): void {
  try {
    // 如果设备已连接，先断开连接
    if (deviceInfo.connected) {
      bluetoothStore.disconnectDevice(deviceInfo.id).catch(console.error)
    }

    cyclingStore.removeSavedDevice(deviceInfo.id)
    message.success(`已删除设备 ${deviceInfo.name}`)
  } catch (error: any) {
    console.error('Failed to remove device:', error)
    message.error(`移除设备失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 清空所有已保存设备
 */
function clearAllSavedDevices(): void {
  try {
    // 断开所有连接的设备
    cyclingStore.connectedDevicesList.forEach((device) => {
      if (device.connected) {
        bluetoothStore.disconnectDevice(device.id).catch(console.error)
      }
      cyclingStore.disconnectDevice(device.type)
    })

    // 清空已保存设备
    cyclingStore.savedDevices.splice(0)

    message.success('已清空所有设备')
  } catch (error: any) {
    console.error('Failed to clear devices:', error)
    message.error(`清空设备失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 刷新缓存设备列表
 */
function refreshCachedDevices(): void {
  message.success('已刷新缓存设备列表')
}

/**
 * 删除缓存设备
 */
function removeCachedDevice(device: any): void {
  cyclingStore.removeSavedDevice(device.id)
  message.success(`已删除缓存设备 ${device.name}`)
}

/**
 * 切换设备自动重连
 */
function toggleAutoReconnect(device: any): void {
  // 更新设备的自动重连设置
  const savedDevice = cyclingStore.savedDevices.find((d) => d.id === device.id)
  if (savedDevice) {
    savedDevice.autoReconnect = !savedDevice.autoReconnect
    if (savedDevice.autoReconnect) {
      message.success(`已启用 ${device.name} 的自动重连`)
    } else {
      message.info(`已禁用 ${device.name} 的自动重连`)
    }
  }
}

// ==================== 设备控制相关方法 ====================

/**
 * 检查设备是否支持控制功能
 */
function hasDeviceControls(deviceType: CyclingDeviceType): boolean {
  return [
    CyclingDeviceType.TRAINER,
    CyclingDeviceType.POWER_METER,
    CyclingDeviceType.ELECTRONIC_SHIFTING,
  ].includes(deviceType)
}

/**
 * 显示设备控制面板
 */
function showDeviceControl(device: DeviceInfo): void {
  selectedDevice.value = device
  controlPanelVisible.value = true
}

/**
 * 清除所有缓存设备
 */
function clearAllCachedDevices(): void {
  cyclingStore.savedDevices.splice(0)
  message.success('已清除所有缓存设备')
}

/**
 * 设置设备监听器
 */
function setupDeviceListeners(): void {
  // 监听设备断开连接事件
  if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
    ;(navigator as any).bluetooth.addEventListener(
      'advertisementreceived',
      handleAdvertisementReceived,
    )
  }
}

/**
 * 清理设备监听器
 */
function cleanupDeviceListeners(): void {
  if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
    ;(navigator as any).bluetooth.removeEventListener(
      'advertisementreceived',
      handleAdvertisementReceived,
    )
  }
}

/**
 * 处理设备广播接收
 */
function handleAdvertisementReceived(event: any): void {
  console.log('Advertisement received:', event)
  // 可以在这里处理设备状态更新
}

/**
 * 检查设备连接状态
 */
async function checkDeviceStatus(): Promise<void> {
  try {
    const connectedDevices = cyclingStore.connectedDevicesList
    for (const device of connectedDevices) {
      if (device.connected) {
        // 检查设备是否仍然连接
        const isStillConnected = await bluetoothStore.isDeviceConnected(device.id)
        if (!isStillConnected) {
          device.connected = false
          cyclingStore.disconnectDevice(device.type)
          message.warning(`设备 ${device.name} 已断开连接`)
        }
      }
    }
  } catch (error) {
    console.error('Failed to check device status:', error)
  }
}

// 组件挂载时的初始化
onMounted(() => {
  setupDeviceListeners()
  // 定期检查设备状态
  const statusCheckInterval = setInterval(checkDeviceStatus, 10000) // 每10秒检查一次

  // 清理定时器
  onUnmounted(() => {
    clearInterval(statusCheckInterval)
  })
})

// 组件卸载时的清理
onUnmounted(() => {
  cleanupDeviceListeners()
})
</script>

<style scoped>
.device-manager {
  position: relative;
}

.device-manager-trigger {
  /* 可以根据需要调整按钮样式 */
}

.drawer-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.device-type-filters {
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
}

.filter-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.filter-header span {
  font-weight: 500;
  color: #666;
}

.device-type-filters .ant-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.connection-status {
  margin: 16px 0;
}

.bluetooth-error {
  margin: 16px 0;
}

.connection-status .ant-alert,
.bluetooth-error .ant-alert {
  border-radius: 8px;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  transition: all 0.3s;
}

.device-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.device-item.connected {
  border-color: #52c41a;
  background: #f6ffed;
}

.device-item.discovered {
  border-color: #faad14;
  background: #fffbe6;
}

.device-item.cached {
  border-color: #722ed1;
  background: #f9f0ff;
}

.cached-section {
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.auto-reconnect-tag {
  background: #52c41a;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  margin-right: 8px;
}

.last-connected {
  font-size: 11px;
  color: #999;
}

.device-info {
  flex: 1;
}

.device-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-type {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.device-id {
  font-size: 11px;
  color: #999;
  font-family: monospace;
}

.device-details {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.device-details span {
  margin-right: 12px;
}

.device-last-connected {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.device-actions {
  display: flex;
  gap: 8px;
}

.discovery-section,
.connected-section,
.saved-section {
  margin-bottom: 24px;
}

.discovered-devices h4 {
  margin: 16px 0 12px 0;
  font-size: 14px;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .device-drawer {
    width: 100% !important;
  }

  .device-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .device-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
