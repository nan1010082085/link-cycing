<template>
  <div class="cycling-dashboard">
    <!-- 页面头部 -->
    <div class="dashboard-header">
      <a-page-header
        title="智能骑行数据中心"
        sub-title="连接设备，记录数据，分析表现"
        :ghost="false"
      >
        <template #extra>
          <a-space>
            <a-button @click="showSessionManager"> <HistoryOutlined /> 历史记录 </a-button>
            <a-dropdown>
              <template #overlay>
                <a-menu @click="handleMenuClick">
                  <a-menu-item key="settings"> <SettingOutlined /> 设置 </a-menu-item>
                  <a-menu-item key="about"> <InfoCircleOutlined /> 关于 </a-menu-item>
                </a-menu>
              </template>
              <a-button>
                <MoreOutlined />
              </a-button>
            </a-dropdown>
          </a-space>
        </template>
      </a-page-header>
    </div>

    <!-- 主要内容区域 -->
    <div class="dashboard-content">
      <!-- 顶部：骑行控制和数据显示 -->
      <div class="riding-control-section">
        <a-card size="small" class="control-card">
          <div class="control-header">
            <div class="control-buttons">
              <a-button
                type="primary"
                size="large"
                :loading="isStartingSession"
                @click="startSession"
                v-if="!isSessionActive"
              >
                <PlayCircleOutlined /> 开始骑行
              </a-button>

              <a-space v-else>
                <a-button type="default" @click="pauseSession" :disabled="isSessionPaused">
                  <PauseCircleOutlined /> 暂停
                </a-button>
                <a-button type="primary" @click="resumeSession" v-if="isSessionPaused">
                  <PlayCircleOutlined /> 继续
                </a-button>
                <a-button type="danger" @click="stopSession"> <StopOutlined /> 结束 </a-button>
              </a-space>
            </div>

            <!-- 会话信息 -->
            <!-- <div v-if="isSessionActive" class="session-status">
              <a-statistic
                title="骑行时长"
                :value="sessionDuration"
                suffix="秒"
                :value-style="{ fontSize: '16px', color: '#1890ff' }"
              />
              <div class="session-stats">
                <span class="stat-item">
                  <span class="stat-label">数据点:</span>
                  <span class="stat-value">{{ sessionDataPoints }}</span>
                </span>
                <span class="stat-item">
                  <span class="stat-label">设备:</span>
                  <span class="stat-value">{{ connectedDevicesCount }}</span>
                </span>
              </div>
            </div>-->
          </div>
        </a-card>
      </div>

      <!-- 骑行数据显示 -->
      <div class="riding-data-section">
        <RidingDataDisplay />
      </div>

      <!-- 主体内容：左右分栏 -->
      <a-row :gutter="[16, 16]">
        <!-- 左侧：已连接设备 -->
        <a-col :xs="24" :lg="12">
          <div class="connected-devices-section">
            <a-card title="已连接设备" size="small" class="devices-card">
              <template #extra>
                <a-button size="small" type="text" @click="showDeviceManager">
                  <PlusOutlined /> 添加设备
                </a-button>
              </template>

              <div v-if="connectedDevices.length === 0" class="no-devices">
                <a-empty description="暂无连接设备">
                  <a-button type="primary" @click="showDeviceManager">
                    <BluetoothOutlined /> 连接设备
                  </a-button>
                </a-empty>
              </div>

              <div v-else class="devices-list">
                <div v-for="device in connectedDevices" :key="device.id" class="device-item">
                  <div class="device-info">
                    <div class="device-name">
                      <a-badge status="processing" />
                      {{ device.name || '未知设备' }}
                    </div>
                    <div class="device-details">
                      <a-tag size="small" color="blue">{{ device.type }}</a-tag>
                      <span class="device-id">{{ device.id.slice(0, 8) }}...</span>
                    </div>
                  </div>
                  <div class="device-actions">
                    <a-button size="small" type="text" @click="disconnectDevice(device.id)">
                      <DisconnectOutlined />
                    </a-button>
                  </div>
                </div>
              </div>
            </a-card>
          </div>
        </a-col>

        <!-- 右侧：实时数据显示 -->
        <a-col :xs="24" :lg="12">
          <div class="real-time-data-section">
            <RealTimeDataList :devices="connectedDevices" />
          </div>
        </a-col>
      </a-row>
    </div>

    <!-- 会话管理弹框 -->
    <SessionManager v-model="sessionManagerVisible" @session-selected="handleSessionSelected" />

    <!-- 设备管理弹窗 -->
    <DeviceManager
      v-model="deviceManagerVisible"
      @device-connected="handleDeviceConnected"
      @device-disconnected="handleDeviceDisconnected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  HistoryOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  PlusOutlined,
  DisconnectOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
} from '@ant-design/icons-vue'
// import BluetoothOutlined from '@ant-design/icons-vue/es/icons/BluetoothOutlined'
const BluetoothOutlined = { name: 'bluetooth' } // 临时解决方案
import { useCyclingStore } from '../stores/cycling'
import DeviceManager from '../components/DeviceManager.vue'
import SessionManager from '../components/SessionManager.vue'
import RealTimeDataList from '../components/RealTimeDataList.vue'
import RidingDataDisplay from '../components/RidingDataDisplay.vue'

/**
 * 智能骑行数据中心主页面
 * 提供设备管理、数据显示、会话控制等功能
 */

const cyclingStore = useCyclingStore()

// 弹窗状态
const deviceManagerVisible = ref(false)
const sessionManagerVisible = ref(false)

// 会话状态
const isStartingSession = ref(false)

// 计算属性
const connectedDevices = computed(() => cyclingStore.connectedDevicesList)
const connectedDevicesCount = computed(() => connectedDevices.value.length)
const isSessionActive = computed(() => cyclingStore.isSessionActive)
const isSessionPaused = computed(() => cyclingStore.isSessionPaused)
// const sessionDuration = computed(() => cyclingStore.sessionDuration)
// const sessionDataPoints = computed(() => cyclingStore.sessionDataPoints)

/**
 * 显示设备管理器（保持兼容）
 */
const showDeviceManager = (): void => {
  deviceManagerVisible.value = true
}

/**
 * 显示会话管理器
 */
const showSessionManager = (): void => {
  sessionManagerVisible.value = true
}

/**
 * 处理菜单点击
 */
const handleMenuClick = ({ key }: { key: string }): void => {
  switch (key) {
    case 'settings':
      message.info('设置功能开发中...')
      break
    case 'about':
      message.info('智能骑行数据中心 v1.0.0')
      break
  }
}

/**
 * 断开设备连接
 */
const disconnectDevice = async (deviceId: string): Promise<void> => {
  try {
    await cyclingStore.disconnectDevice(deviceId)
    message.success('设备已断开连接')
  } catch (error) {
    console.error('断开设备失败:', error)
    message.error('断开设备失败')
  }
}

/**
 * 开始训练会话
 */
const startSession = async (): Promise<void> => {
  if (connectedDevicesCount.value === 0) {
    message.warning('请先连接设备')
    return
  }

  isStartingSession.value = true
  try {
    await cyclingStore.startSession()
    message.success('训练会话已开始')
  } catch (error) {
    console.error('开始会话失败:', error)
    message.error('开始会话失败')
  } finally {
    isStartingSession.value = false
  }
}

/**
 * 暂停训练会话
 */
const pauseSession = (): void => {
  cyclingStore.pauseSession()
  message.info('训练已暂停')
}

/**
 * 恢复训练会话
 */
const resumeSession = (): void => {
  cyclingStore.resumeSession()
  message.info('训练已恢复')
}

/**
 * 停止训练会话
 */
const stopSession = async (): Promise<void> => {
  try {
    await cyclingStore.stopSession()
    message.success('训练会话已结束')
  } catch (error) {
    console.error('结束会话失败:', error)
    message.error('结束会话失败')
  }
}

/**
 * 处理设备连接
 */
const handleDeviceConnected = (device: any): void => {
  message.success(`设备 ${device.name || '未知设备'} 已连接`)
}

/**
 * 处理设备断开
 */
const handleDeviceDisconnected = (device: any): void => {
  message.info(`设备 ${device.name || '未知设备'} 已断开`)
}

/**
 * 处理会话选择
 */
const handleSessionSelected = (session: any): void => {
  message.info(`已选择会话: ${session.name}`)
  // 关闭弹框
  sessionManagerVisible.value = false
}

// 生命周期
onMounted(() => {
  // 初始化数据
  cyclingStore.initialize()
})

onUnmounted(() => {
  // 清理资源
  if (isSessionActive.value) {
    cyclingStore.stopSession()
  }
})
</script>

<style scoped>
.cycling-dashboard {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.dashboard-header {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
  z-index: 100;
}

.dashboard-content {
  flex: 1;
  padding: 0 16px 16px;
  margin: 0;
}

.connected-devices-section,
.real-time-data-section,
.riding-data-section {
  margin-bottom: 16px;
}

.devices-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.no-devices {
  text-align: center;
  padding: 20px;
}

.devices-list {
  max-height: 200px;
  overflow-y: auto;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.device-item:last-child {
  border-bottom: none;
}

.device-info {
  flex: 1;
}

.device-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.device-details {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.device-id {
  font-family: monospace;
}

/* 骑行控制区域样式 */
.riding-control-section {
  margin-bottom: 16px;
}

.control-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.control-buttons {
  display: flex;
  gap: 8px;
}

.session-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.session-stats {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-value {
  font-weight: 500;
  color: #1890ff;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .cycling-dashboard {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .dashboard-content {
    padding: 0 8px 8px;
  }

  .device-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .control-header {
    flex-direction: column;
    align-items: stretch;
  }

  .session-status {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .session-stats {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
