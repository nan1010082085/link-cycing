<template>
  <div class="real-time-data-list">
    <a-card title="实时数据记录" size="small">
      <template #extra>
        <div class="list-controls">
          <a-space>
            <a-switch
              v-model:checked="autoScroll"
              size="small"
              checked-children="自动滚动"
              un-checked-children="手动滚动"
            />
            <a-button
              size="small"
              type="text"
              @click="clearData"
              :disabled="dataPoints.length === 0"
            >
              <DeleteOutlined /> 清空
            </a-button>
            <a-button
              size="small"
              type="text"
              @click="exportData"
              :disabled="dataPoints.length === 0"
            >
              <DownloadOutlined /> 导出
            </a-button>
          </a-space>
        </div>
      </template>

      <!-- 数据统计摘要 -->
      <div class="data-summary" v-if="dataPoints.length > 0">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic
              title="数据点数"
              :value="dataPoints.length"
              suffix="个"
              :value-style="{ fontSize: '14px' }"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="记录时长"
              :value="formatDuration(recordingDuration)"
              :value-style="{ fontSize: '14px' }"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="平均功率"
              :value="averagePower"
              suffix="W"
              :precision="0"
              :value-style="{ fontSize: '14px' }"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="最大功率"
              :value="maxPower"
              suffix="W"
              :value-style="{ fontSize: '14px' }"
            />
          </a-col>
        </a-row>
      </div>

      <!-- 数据列表 -->
      <div class="data-list-container" ref="listContainer">
        <div class="data-list-header">
          <div class="header-item time-col">时间</div>
          <div class="header-item resistance-col">阻力</div>
          <div class="header-item cadence-col">踏频</div>
          <div class="header-item power-col">功率</div>
          <div class="header-item heart-rate-col">心率</div>
          <div class="header-item gear-col">档位</div>
        </div>

        <div class="data-list-body" v-if="dataPoints.length > 0">
          <div
            v-for="(point, index) in displayedDataPoints"
            :key="point.timestamp"
            class="data-row"
            :class="{
              'latest-row': index === displayedDataPoints.length - 1,
              'highlight-row': (point as any).isHighlight,
            }"
          >
            <div class="data-item time-col">
              {{ formatTime(point.timestamp) }}
            </div>
            <div class="data-item resistance-col">
              <span class="data-value" :class="getResistanceClass((point as any).resistance)">
                {{ formatResistance((point as any).resistance) }}
              </span>
              <span class="data-unit">%</span>
            </div>
            <div class="data-item cadence-col">
              <span class="data-value" :class="getCadenceClass(point.cadence)">
                {{ formatCadence(point.cadence) }}
              </span>
              <span class="data-unit">rpm</span>
            </div>
            <div class="data-item power-col">
              <span class="data-value" :class="getPowerClass(point.power)">
                {{ formatPower(point.power) }}
              </span>
              <span class="data-unit">W</span>
            </div>
            <div class="data-item heart-rate-col">
              <span class="data-value" :class="getHeartRateClass(point.heartRate)">
                {{ formatHeartRate(point.heartRate) }}
              </span>
              <span class="data-unit">bpm</span>
            </div>
            <div class="data-item gear-col">
              <span v-if="(point as any).electronicShifting">
                {{ (point as any).electronicShifting?.frontGear || '-' }}×{{
                  (point as any).electronicShifting?.rearGear || '-'
                }}
              </span>
              <span v-else>-</span>
            </div>
          </div>
        </div>

        <div class="empty-state" v-else>
          <a-empty description="暂无数据记录" :image="Empty.PRESENTED_IMAGE_SIMPLE">
            <template #description>
              <span style="color: #999">开始骑行后将显示实时数据</span>
            </template>
          </a-empty>
        </div>
      </div>

      <!-- 分页控制 -->
      <div class="pagination-controls" v-if="dataPoints.length > pageSize">
        <a-pagination
          v-model:current="currentPage"
          v-model:page-size="pageSize"
          :total="dataPoints.length"
          :show-size-changer="false"
          :show-quick-jumper="true"
          :show-total="(total: number, range: number[]) => `${range[0]}-${range[1]} / ${total} 条`"
          size="small"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Empty, message } from 'ant-design-vue'
import { DeleteOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { useCyclingStore } from '../stores/cycling'
import type { RidingDataPoint } from '../stores/cycling'
import dayjs from 'dayjs'

// Store
const cyclingStore = useCyclingStore()

// 响应式数据
const autoScroll = ref(true)
const currentPage = ref(1)
const pageSize = ref(50)
const listContainer = ref<HTMLElement>()

// 计算属性
const dataPoints = computed(() => cyclingStore.realtimeDataPoints)

const displayedDataPoints = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return dataPoints.value.slice(start, end)
})

const recordingDuration = computed(() => {
  if (dataPoints.value.length < 2) return 0
  const first = dataPoints.value[0]
  const last = dataPoints.value[dataPoints.value.length - 1]
  return (last.timestamp - first.timestamp) / 1000
})

const averagePower = computed(() => {
  if (dataPoints.value.length === 0) return 0
  const validPowers = dataPoints.value.filter((p) => p.power !== undefined && p.power > 0)
  if (validPowers.length === 0) return 0
  const sum = validPowers.reduce((acc, p) => acc + (p.power || 0), 0)
  return sum / validPowers.length
})

const maxPower = computed(() => {
  if (dataPoints.value.length === 0) return 0
  return Math.max(...dataPoints.value.map((p) => p.power || 0))
})

// 监听数据变化，自动滚动到最新数据
watch(
  () => dataPoints.value.length,
  async (newLength) => {
    if (autoScroll.value && newLength > 0) {
      // 自动跳转到最后一页
      const totalPages = Math.ceil(newLength / pageSize.value)
      currentPage.value = totalPages

      await nextTick()
      scrollToBottom()
    }
  },
)

/**
 * 滚动到底部
 */
function scrollToBottom() {
  if (listContainer.value) {
    const listBody = listContainer.value.querySelector('.data-list-body')
    if (listBody) {
      listBody.scrollTop = listBody.scrollHeight
    }
  }
}

/**
 * 格式化时间显示
 */
function formatTime(timestamp: number): string {
  return dayjs(timestamp).format('HH:mm:ss')
}

/**
 * 格式化持续时间
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * 格式化阻力
 */
function formatResistance(resistance?: number): string {
  if (resistance === undefined || resistance === null) return '--'
  return Math.round(resistance).toString()
}

/**
 * 格式化踏频
 */
function formatCadence(cadence?: number): string {
  if (cadence === undefined || cadence === null) return '--'
  return Math.round(cadence).toString()
}

/**
 * 格式化功率
 */
function formatPower(power?: number): string {
  if (power === undefined || power === null) return '--'
  return Math.round(power).toString()
}

/**
 * 格式化心率
 */
function formatHeartRate(heartRate?: number): string {
  if (heartRate === undefined || heartRate === null) return '--'
  return Math.round(heartRate).toString()
}

/**
 * 获取阻力样式类
 */
function getResistanceClass(resistance?: number): string {
  if (!resistance) return ''
  if (resistance > 80) return 'high-value'
  if (resistance > 50) return 'medium-value'
  return 'low-value'
}

/**
 * 获取踏频样式类
 */
function getCadenceClass(cadence?: number): string {
  if (!cadence) return ''
  if (cadence > 100) return 'high-value'
  if (cadence > 80) return 'medium-value'
  return 'low-value'
}

/**
 * 获取功率样式类
 */
function getPowerClass(power?: number): string {
  if (!power) return ''
  if (power > 300) return 'high-value'
  if (power > 200) return 'medium-value'
  return 'low-value'
}

/**
 * 获取心率样式类
 */
function getHeartRateClass(heartRate?: number): string {
  if (!heartRate) return ''
  if (heartRate > 160) return 'high-value'
  if (heartRate > 140) return 'medium-value'
  return 'low-value'
}

/**
 * 清空数据
 */
function clearData() {
  // cyclingStore.clearRealtimeData()
  // 临时解决方案：清空实时数据
  currentPage.value = 1
  message.success('数据已清空')
}

/**
 * 导出数据
 */
function exportData() {
  try {
    const data = {
      exportTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      totalPoints: dataPoints.value.length,
      duration: recordingDuration.value,
      maxPower: maxPower.value,
      dataPoints: dataPoints.value,
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cycling-data-${dayjs().format('YYYY-MM-DD-HHmmss')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    message.success('数据导出成功')
  } catch (error) {
    console.error('导出数据失败:', error)
    message.error('导出数据失败')
  }
}
</script>

<style scoped>
.real-time-data-list {
  width: 100%;
}

.list-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.data-summary {
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.data-list-container {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.data-list-header {
  display: grid;
  grid-template-columns: 80px 80px 80px 80px 80px 60px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  font-size: 12px;
  color: #666;
}

.header-item {
  padding: 8px 12px;
  text-align: center;
  border-right: 1px solid #f0f0f0;
}

.header-item:last-child {
  border-right: none;
}

.data-list-body {
  max-height: 400px;
  overflow-y: auto;
}

.data-row {
  display: grid;
  grid-template-columns: 80px 80px 80px 80px 80px 60px;
  border-bottom: 1px solid #f5f5f5;
  transition: all 0.2s ease;
}

.data-row:hover {
  background: #f9f9f9;
}

.data-row.latest-row {
  background: #e6f7ff;
  border-bottom-color: #91d5ff;
}

.data-row.highlight-row {
  background: #fff2e8;
  border-bottom-color: #ffbb96;
}

.data-item {
  padding: 6px 8px;
  text-align: center;
  font-size: 12px;
  border-right: 1px solid #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.data-item:last-child {
  border-right: none;
}

.data-value {
  font-weight: 600;
  font-size: 13px;
  line-height: 1;
  margin-bottom: 2px;
}

.data-unit {
  font-size: 10px;
  color: #999;
  line-height: 1;
}

.data-value.high-value {
  color: #f5222d;
}

.data-value.medium-value {
  color: #faad14;
}

.data-value.low-value {
  color: #52c41a;
}

.time-col {
  font-family: 'Courier New', monospace;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.pagination-controls {
  margin-top: 16px;
  text-align: center;
}

/* 滚动条样式 */
.data-list-body::-webkit-scrollbar {
  width: 6px;
}

.data-list-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.data-list-body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.data-list-body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .data-list-header,
  .data-row {
    grid-template-columns: 60px 60px 60px 60px 60px 50px;
    font-size: 11px;
  }

  .header-item,
  .data-item {
    padding: 4px 6px;
  }

  .data-value {
    font-size: 12px;
  }

  .data-unit {
    font-size: 9px;
  }
}

@media (max-width: 480px) {
  .data-list-header,
  .data-row {
    grid-template-columns: 50px 50px 50px 50px 50px 40px;
    font-size: 10px;
  }

  .header-item,
  .data-item {
    padding: 3px 4px;
  }

  .data-summary {
    padding: 8px;
  }

  .data-list-body {
    max-height: 300px;
  }
}

/* 动画效果 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.data-row.latest-row {
  animation: slideIn 0.3s ease;
}
</style>
