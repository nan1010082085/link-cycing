<template>
  <div class="device-control-panel">
    <!-- 骑行台控制 -->
    <a-card v-if="device.type === CyclingDeviceType.TRAINER" title="骑行台控制" size="small">
      <div class="control-section">
        <div class="control-item">
          <label>阻力控制 (%)</label>
          <a-slider
            v-model:value="resistanceValue"
            :min="0"
            :max="100"
            :step="1"
            @change="onResistanceChange"
            :tooltip-formatter="(value: number) => `${value}%`"
          />
          <div class="control-buttons">
            <a-button size="small" @click="setQuickResistance(25)">25%</a-button>
            <a-button size="small" @click="setQuickResistance(50)">50%</a-button>
            <a-button size="small" @click="setQuickResistance(75)">75%</a-button>
          </div>
        </div>
        
        <a-divider />
        
        <div class="control-item">
          <label>功率目标 (瓦特)</label>
          <a-input-number
            v-model:value="powerTarget"
            :min="0"
            :max="2000"
            :step="10"
            style="width: 100%"
            @change="onPowerTargetChange"
          />
          <div class="control-buttons">
            <a-button size="small" @click="setQuickPower(100)">100W</a-button>
            <a-button size="small" @click="setQuickPower(200)">200W</a-button>
            <a-button size="small" @click="setQuickPower(300)">300W</a-button>
          </div>
        </div>
        
        <a-divider />
        
        <div class="control-item">
          <a-space>
            <a-button type="primary" @click="resetResistanceData" :loading="loading">
              <ReloadOutlined /> 重置数据
            </a-button>
            <a-button @click="calibrateResistance" :loading="loading">
              <SettingOutlined /> 校准
            </a-button>
          </a-space>
        </div>
      </div>
    </a-card>
    
    <!-- 功率计控制 -->
    <a-card v-if="device.type === CyclingDeviceType.POWER_METER" title="功率计控制" size="small">
      <div class="control-section">
        <div class="control-item">
          <a-space direction="vertical" style="width: 100%">
            <a-button type="primary" block @click="calibratePowerMeter" :loading="loading">
              <SettingOutlined /> 校准功率计
            </a-button>
            <a-button block @click="zeroPowerMeter" :loading="loading">
              <ReloadOutlined /> 零点校准
            </a-button>
            <a-button block @click="resetPowerMeterData" :loading="loading">
              <DeleteOutlined /> 重置数据
            </a-button>
          </a-space>
        </div>
      </div>
    </a-card>
    
    <!-- 电子变速控制 -->
    <a-card v-if="device.type === CyclingDeviceType.ELECTRONIC_SHIFTING" title="电子变速控制" size="small">
      <div class="control-section">
        <div class="shifting-controls">
          <div class="shifter-group">
            <h4>前变速器</h4>
            <a-space direction="vertical">
              <a-button type="primary" @click="shiftGear('up', 'front')" :loading="loading">
                <ArrowUpOutlined /> 升档
              </a-button>
              <a-button @click="shiftGear('down', 'front')" :loading="loading">
                <ArrowDownOutlined /> 降档
              </a-button>
            </a-space>
          </div>
          
          <a-divider type="vertical" style="height: 80px" />
          
          <div class="shifter-group">
            <h4>后变速器</h4>
            <a-space direction="vertical">
              <a-button type="primary" @click="shiftGear('up', 'rear')" :loading="loading">
                <ArrowUpOutlined /> 升档
              </a-button>
              <a-button @click="shiftGear('down', 'rear')" :loading="loading">
                <ArrowDownOutlined /> 降档
              </a-button>
            </a-space>
          </div>
        </div>
        
        <a-divider />
        
        <div class="battery-info" v-if="device.deviceInfo?.batteryLevel">
          <a-progress
            :percent="device.deviceInfo.batteryLevel"
            :status="device.deviceInfo.batteryLevel < 20 ? 'exception' : 'normal'"
            :format="(percent: number) => `电量 ${percent}%`"
          />
        </div>
      </div>
    </a-card>
    
    <!-- 心率设备控制 -->
    <a-card v-if="device.type === CyclingDeviceType.HEART_RATE" title="心率设备" size="small">
      <div class="control-section">
        <div class="control-item">
          <a-space direction="vertical" style="width: 100%">
            <a-statistic
              title="当前心率"
              :value="currentHeartRate"
              suffix="bpm"
              :value-style="{ color: getHeartRateColor(currentHeartRate) }"
            />
            <a-button block @click="resetHeartRateData" :loading="loading">
              <ReloadOutlined /> 重置数据
            </a-button>
          </a-space>
        </div>
      </div>
    </a-card>
    

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  ReloadOutlined,
  SettingOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useBluetoothStore } from '../stores/bluetooth'
import { useCyclingStore, type DeviceInfo } from '../stores/cycling'
import { CyclingDeviceType } from '../types/cycling'

// Props
interface Props {
  device: DeviceInfo
}

const props = defineProps<Props>()

// Stores
const bluetoothStore = useBluetoothStore()
const cyclingStore = useCyclingStore()

// 响应式数据
const loading = ref(false)
const resistanceValue = ref(50)
const powerTarget = ref(200)

// 计算属性
const currentHeartRate = computed(() => {
  return cyclingStore.currentRidingData.heartRate || 0
})

const currentCadence = computed(() => {
  return cyclingStore.currentRidingData.cadence || 0
})

// 方法

/**
 * 阻力变化处理
 */
async function onResistanceChange(value: number): Promise<void> {
  try {
    loading.value = true
    await bluetoothStore.setResistancePower(props.device.id, value)
    message.success(`阻力已设置为 ${value}%`)
  } catch (error: any) {
    message.error(`设置阻力失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 快速设置阻力
 */
function setQuickResistance(value: number): void {
  resistanceValue.value = value
  onResistanceChange(value)
}

/**
 * 功率目标变化处理
 */
async function onPowerTargetChange(value: number): Promise<void> {
  try {
    loading.value = true
    await bluetoothStore.setResistancePower(props.device.id, value)
    message.success(`功率目标已设置为 ${value}瓦特`)
  } catch (error: any) {
    message.error(`设置功率目标失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 快速设置功率
 */
function setQuickPower(value: number): void {
  powerTarget.value = value
  onPowerTargetChange(value)
}

/**
 * 重置骑行台数据
 */
async function resetResistanceData(): Promise<void> {
  try {
    loading.value = true
    await bluetoothStore.resetDeviceData(props.device.id)
    message.success('骑行台数据已重置')
  } catch (error: any) {
    message.error(`重置失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 校准骑行台
 */
async function calibrateResistance(): Promise<void> {
  try {
    loading.value = true
    await bluetoothStore.calibratePowerMeter(props.device.id)
    message.success('骑行台校准已开始')
  } catch (error: any) {
    message.error(`校准失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 校准功率计
 */
async function calibratePowerMeter(): Promise<void> {
  try {
    loading.value = true
    await bluetoothStore.calibratePowerMeter(props.device.id)
    message.success('功率计校准已开始')
  } catch (error: any) {
    message.error(`校准失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 功率计零点校准
 */
async function zeroPowerMeter(): Promise<void> {
  try {
    loading.value = true
    // 这里应该调用专门的零点校准方法
    await bluetoothStore.calibratePowerMeter(props.device.id)
    message.success('功率计零点校准已开始')
  } catch (error: any) {
    message.error(`零点校准失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 重置功率计数据
 */
async function resetPowerMeterData(): Promise<void> {
  try {
    loading.value = true
    await bluetoothStore.resetDeviceData(props.device.id)
    message.success('功率计数据已重置')
  } catch (error: any) {
    message.error(`重置失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 电子变速控制
 */
async function shiftGear(direction: 'up' | 'down', position: 'front' | 'rear'): Promise<void> {
  try {
    loading.value = true
    await bluetoothStore.shiftGear(props.device.id, direction, position)
    const actionText = direction === 'up' ? '升档' : '降档'
    const positionText = position === 'front' ? '前变速器' : '后变速器'
    message.success(`${positionText}${actionText}成功`)
  } catch (error: any) {
    message.error(`变速失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 重置心率数据
 */
async function resetHeartRateData(): Promise<void> {
  try {
    loading.value = true
    await bluetoothStore.resetDeviceData(props.device.id)
    message.success('心率数据已重置')
  } catch (error: any) {
    message.error(`重置失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}



/**
 * 获取心率颜色
 */
function getHeartRateColor(heartRate: number): string {
  if (heartRate < 60) return '#52c41a' // 绿色
  if (heartRate < 100) return '#1890ff' // 蓝色
  if (heartRate < 150) return '#faad14' // 橙色
  return '#f5222d' // 红色
}
</script>

<style scoped>
.device-control-panel {
  padding: 16px;
}

.control-section {
  padding: 8px 0;
}

.control-item {
  margin-bottom: 16px;
}

.control-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #262626;
}

.control-buttons {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.shifting-controls {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 16px 0;
}

.shifter-group {
  text-align: center;
}

.shifter-group h4 {
  margin-bottom: 12px;
  color: #262626;
}

.battery-info {
  margin-top: 16px;
}

:deep(.ant-slider) {
  margin: 8px 0 16px 0;
}

:deep(.ant-statistic-title) {
  font-size: 12px;
}

:deep(.ant-statistic-content) {
  font-size: 18px;
}
</style>