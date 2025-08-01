<template>
  <div class="riding-data-display">
    <!-- 主要数据卡片 -->
    <div class="main-data-cards">
      <!-- 阻力卡片 -->
      <a-card class="data-card resistance-card" :class="{ active: currentData.resistance }">
        <div class="data-content">
          <div class="data-icon">
            <DashboardOutlined />
          </div>
          <div class="data-info">
            <div class="data-value">
              {{ formatResistance(currentData.resistance) }}
              <span class="data-unit">%</span>
            </div>
            <div class="data-label">阻力</div>
          </div>
        </div>
      </a-card>

      <!-- 踏频卡片 -->
      <a-card class="data-card cadence-card" :class="{ active: currentData.cadence }">
        <div class="data-content">
          <div class="data-icon">
            <SyncOutlined />
          </div>
          <div class="data-info">
            <div class="data-value">
              {{ formatCadence(currentData.cadence) }}
              <span class="data-unit">rpm</span>
            </div>
            <div class="data-label">踏频</div>
          </div>
        </div>
      </a-card>

      <!-- 功率卡片 -->
      <a-card class="data-card power-card" :class="{ active: currentData.power }">
        <div class="data-content">
          <div class="data-icon">
            <ThunderboltOutlined />
          </div>
          <div class="data-info">
            <div class="data-value">
              {{ formatPower(currentData.power) }}
              <span class="data-unit">W</span>
            </div>
            <div class="data-label">功率</div>
          </div>
        </div>
      </a-card>

      <!-- 心率卡片 -->
      <a-card class="data-card heart-rate-card" :class="{ active: currentData.heartRate }">
        <div class="data-content">
          <div class="data-icon">
            <HeartOutlined />
          </div>
          <div class="data-info">
            <div class="data-value">
              {{ formatHeartRate(currentData.heartRate) }}
              <span class="data-unit">bpm</span>
            </div>
            <div class="data-label">心率</div>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 次要数据行 -->
    <div class="secondary-data-row">
      <!-- 变速档位 -->
      <a-card class="data-card gear-card" size="small" v-if="currentData.electronicShifting">
        <div class="gear-display">
          <div class="gear-info">
            <span class="gear-label">档位</span>
            <div class="gear-values">
              <span class="front-gear">{{ currentData.electronicShifting.frontGear || '-' }}</span>
              <span class="gear-separator">×</span>
              <span class="rear-gear">{{ currentData.electronicShifting.rearGear || '-' }}</span>
            </div>
          </div>
          <div class="gear-ratio" v-if="currentData.electronicShifting.gearRatio">
            比率: {{ currentData.electronicShifting.gearRatio.toFixed(2) }}
          </div>
        </div>
      </a-card>

      <!-- 距离 -->
      <a-card class="data-card distance-card" size="small">
        <div class="small-data-content">
          <span class="small-data-label">距离</span>
          <span class="small-data-value">
            {{ formatDistance(currentStats?.totalDistance) }}
            <span class="small-data-unit">km</span>
          </span>
        </div>
      </a-card>

      <!-- 骑行时间 -->
      <a-card class="data-card time-card" size="small">
        <div class="small-data-content">
          <span class="small-data-label">时间</span>
          <span class="small-data-value">
            {{ formatDuration(currentStats?.totalTime) }}
          </span>
        </div>
      </a-card>

      <!-- 平均功率 -->
      <a-card class="data-card avg-power-card" size="small">
        <div class="small-data-content">
          <span class="small-data-label">平均功率</span>
          <span class="small-data-value">
            {{ formatPower(currentStats?.avgPower) }}
            <span class="small-data-unit">W</span>
          </span>
        </div>
      </a-card>
    </div>

    <!-- 设备状态指示器 -->
    <div class="device-status-row">
      <div class="device-indicators">
        <div class="device-indicator" :class="{ connected: cyclingStore.hasTrainer }">
          <div class="indicator-icon">
            <DesktopOutlined />
          </div>
          <div class="indicator-content">
            <span class="indicator-label">骑行台</span>
            <span class="battery-level" v-if="getDeviceBatteryLevel('trainer')">
              {{ getDeviceBatteryLevel('trainer') }}%
            </span>
          </div>
        </div>

        <div class="device-indicator" :class="{ connected: cyclingStore.hasPowerMeter }">
          <div class="indicator-icon">
            <ThunderboltOutlined />
          </div>
          <div class="indicator-content">
            <span class="indicator-label">功率计</span>
            <span class="battery-level" v-if="getDeviceBatteryLevel('power_meter')">
              {{ getDeviceBatteryLevel('power_meter') }}%
            </span>
          </div>
        </div>

        <div class="device-indicator" :class="{ connected: cyclingStore.hasHeartRate }">
          <div class="indicator-icon">
            <HeartOutlined />
          </div>
          <div class="indicator-content">
            <span class="indicator-label">心率</span>
            <span class="battery-level" v-if="getDeviceBatteryLevel('heart_rate')">
              {{ getDeviceBatteryLevel('heart_rate') }}%
            </span>
          </div>
        </div>

        <div class="device-indicator" :class="{ connected: cyclingStore.hasElectronicShifting }">
          <div class="indicator-icon">
            <SettingOutlined />
          </div>
          <div class="indicator-content">
            <span class="indicator-label">变速</span>
            <span class="battery-level" v-if="getDeviceBatteryLevel('electronic_shifting')">
              {{ getDeviceBatteryLevel('electronic_shifting') }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 实时数据图表（可选） -->
    <div class="data-charts" v-if="showCharts">
      <a-card title="实时数据趋势" size="small">
        <div class="chart-container">
          <!-- 这里可以集成图表库，如 Chart.js 或 ECharts -->
          <div class="chart-placeholder">
            <LineChartOutlined style="font-size: 48px; color: #ccc" />
            <p>数据图表（待实现）</p>
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  DashboardOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  HeartOutlined,
  DesktopOutlined,
  SettingOutlined,
  LineChartOutlined,
} from '@ant-design/icons-vue'
import { useCyclingStore } from '../stores/cycling'
import { CyclingDeviceType } from '../types/cycling'

// Props
interface Props {
  showCharts?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showCharts: false,
})

// Store
const cyclingStore = useCyclingStore()

// 计算属性
const currentData = computed(() => cyclingStore.currentRidingData)
const currentStats = computed(() => cyclingStore.currentStats)

/**
 * 格式化阻力显示
 */
function formatResistance(resistance?: number): string {
  if (resistance === undefined || resistance === null) return '--'
  return Math.round(resistance).toString()
}

/**
 * 格式化踏频显示
 */
function formatCadence(cadence?: number): string {
  if (cadence === undefined || cadence === null) return '--'
  return Math.round(cadence).toString()
}

/**
 * 格式化功率显示
 */
function formatPower(power?: number): string {
  if (power === undefined || power === null) return '--'
  return Math.round(power).toString()
}

/**
 * 格式化心率显示
 */
function formatHeartRate(heartRate?: number): string {
  if (heartRate === undefined || heartRate === null) return '--'
  return Math.round(heartRate).toString()
}

/**
 * 格式化距离显示
 */
function formatDistance(distance?: number): string {
  if (distance === undefined || distance === null) return '0.0'
  return distance.toFixed(2)
}

/**
 * 格式化持续时间显示
 */
function formatDuration(seconds?: number): string {
  if (!seconds) return '00:00:00'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 获取设备电池电量
 */
function getDeviceBatteryLevel(deviceTypeString: string): number | null {
  const deviceTypeMap: Record<string, CyclingDeviceType> = {
    trainer: CyclingDeviceType.TRAINER,
    power_meter: CyclingDeviceType.POWER_METER,
    heart_rate: CyclingDeviceType.HEART_RATE,
    electronic_shifting: CyclingDeviceType.ELECTRONIC_SHIFTING,
  }

  const deviceType = deviceTypeMap[deviceTypeString]
  if (!deviceType) return null

  const device = cyclingStore.connectedDevices.get(deviceType)
  if (!device || !device.connected) return null

  // 优先从设备信息中获取电池电量
  if (device.deviceInfo?.batteryLevel !== undefined) {
    return device.deviceInfo.batteryLevel
  }

  // 从当前骑行数据中获取电池电量
  if (currentData.value.batteryLevel !== undefined) {
    return currentData.value.batteryLevel
  }

  // 对于电子变速设备，从变速数据中获取电池电量
  if (
    deviceType === CyclingDeviceType.ELECTRONIC_SHIFTING &&
    currentData.value.electronicShifting?.batteryLevel !== undefined
  ) {
    return currentData.value.electronicShifting.batteryLevel
  }

  return null
}
</script>

<style scoped>
.riding-data-display {
  width: 100%;
  padding: 16px;
}

.main-data-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.data-card {
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
}

.data-card.active {
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
}

.data-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
}

.data-icon {
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f0f0f0;
}

.resistance-card .data-icon {
  color: #1890ff;
  background: #e6f7ff;
}

.cadence-card .data-icon {
  color: #52c41a;
  background: #f6ffed;
}

.power-card .data-icon {
  color: #faad14;
  background: #fffbe6;
}

.heart-rate-card .data-icon {
  color: #f5222d;
  background: #fff2f0;
}

.data-info {
  flex: 1;
}

.data-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
  color: #262626;
}

.data-unit {
  font-size: 14px;
  font-weight: 400;
  color: #8c8c8c;
  margin-left: 4px;
}

.data-label {
  font-size: 14px;
  color: #8c8c8c;
  font-weight: 500;
}

.secondary-data-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.small-data-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
}

.small-data-label {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.small-data-value {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.small-data-unit {
  font-size: 12px;
  font-weight: 400;
  color: #8c8c8c;
  margin-left: 2px;
}

.gear-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
}

.gear-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gear-label {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.gear-values {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  font-weight: 600;
}

.front-gear,
.rear-gear {
  min-width: 20px;
  text-align: center;
}

.gear-separator {
  color: #8c8c8c;
}

.gear-ratio {
  font-size: 11px;
  color: #8c8c8c;
}

.device-status-row {
  margin-bottom: 16px;
}

.device-indicators {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.device-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.4;
  transition: all 0.3s ease;
}

.device-indicator.connected {
  opacity: 1;
}

.indicator-icon {
  font-size: 20px;
  color: #8c8c8c;
}

.device-indicator.connected .indicator-icon {
  color: #52c41a;
}

.indicator-label {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.device-indicator.connected .indicator-label {
  color: #262626;
}

.indicator-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.battery-level {
  font-size: 10px;
  color: #52c41a;
  font-weight: 600;
  background: rgba(82, 196, 26, 0.1);
  padding: 1px 4px;
  border-radius: 4px;
  min-width: 30px;
  text-align: center;
}

.device-indicator:not(.connected) .battery-level {
  color: #8c8c8c;
  background: rgba(140, 140, 140, 0.1);
}

.data-charts {
  margin-top: 16px;
}

.chart-container {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #8c8c8c;
}

.chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-data-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .secondary-data-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .device-indicators {
    gap: 16px;
  }

  .data-value {
    font-size: 24px;
  }

  .data-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 480px) {
  .main-data-cards {
    grid-template-columns: 1fr;
  }

  .secondary-data-row {
    grid-template-columns: 1fr;
  }

  .device-indicators {
    flex-wrap: wrap;
    gap: 12px;
  }
}

/* 动画效果 */
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.data-card.active .data-icon {
  animation: pulse 2s infinite;
}
</style>
