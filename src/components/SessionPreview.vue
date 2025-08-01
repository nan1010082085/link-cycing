<template>
  <div class="session-preview">
    <!-- 会话基本信息 -->
    <div class="session-header">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-card size="small" title="基本信息">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">会话名称:</span>
                <span class="info-value">{{ (session as any).name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">开始时间:</span>
                <span class="info-value">{{ formatDateTime(session.startTime as any) }}</span>
              </div>
              <div class="info-item" v-if="session.endTime">
                <span class="info-label">结束时间:</span>
                <span class="info-value">{{ formatDateTime((session as any).endTime) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">持续时间:</span>
                <span class="info-value">{{ formatDuration((session as any).duration) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">数据点数:</span>
                <span class="info-value">{{ (session as any).dataPointsCount || 0 }} 个</span>
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card size="small" title="统计数据">
            <div class="stats-grid">
              <a-statistic
                title="总距离"
                :value="(session as any).totalDistance || 0"
                suffix="km"
                :precision="2"
                :value-style="{ color: '#1890ff' }"
              />
              <a-statistic
                title="平均阻力"
                :value="(session as any).avgResistance || 0"
                suffix="%"
                :precision="1"
                :value-style="{ color: '#52c41a' }"
              />
              <a-statistic
                title="最大阻力"
                :value="(session as any).maxResistance || 0"
                suffix="%"
                :precision="1"
                :value-style="{ color: '#faad14' }"
              />
              <a-statistic
                title="平均功率"
                :value="(session as any).avgPower || 0"
                suffix="W"
                :precision="0"
                :value-style="{ color: '#722ed1' }"
              />
              <a-statistic
                title="最大功率"
                :value="(session as any).maxPower || 0"
                suffix="W"
                :precision="0"
                :value-style="{ color: '#f5222d' }"
              />
              <a-statistic
                title="平均心率"
                :value="(session as any).avgHeartRate || 0"
                suffix="bpm"
                :precision="0"
                :value-style="{ color: '#eb2f96' }"
              />
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 数据图表 -->
    <div class="charts-section" v-if="dataPoints.length > 0">
      <a-card title="数据趋势图" size="small">
        <div class="chart-tabs">
          <a-tabs v-model:activeKey="activeChartTab" size="small">
            <a-tab-pane key="resistance" tab="阻力">
              <div class="chart-container">
                <LineChart
                  :data="resistanceChartData"
                  :options="chartOptions"
                  title="阻力 (%)"
                  color="#1890ff"
                />
              </div>
            </a-tab-pane>
            <a-tab-pane key="power" tab="功率">
              <div class="chart-container">
                <LineChart
                  :data="powerChartData"
                  :options="chartOptions"
                  title="功率 (W)"
                  color="#722ed1"
                />
              </div>
            </a-tab-pane>
            <a-tab-pane key="heartRate" tab="心率">
              <div class="chart-container">
                <LineChart
                  :data="heartRateChartData"
                  :options="chartOptions"
                  title="心率 (bpm)"
                  color="#eb2f96"
                />
              </div>
            </a-tab-pane>
            <a-tab-pane key="cadence" tab="踏频">
              <div class="chart-container">
                <LineChart
                  :data="cadenceChartData"
                  :options="chartOptions"
                  title="踏频 (rpm)"
                  color="#52c41a"
                />
              </div>
            </a-tab-pane>
          </a-tabs>
        </div>
      </a-card>
    </div>

    <!-- 数据表格 -->
    <div class="data-table-section">
      <a-card title="详细数据" size="small">
        <template #extra>
          <a-space>
            <a-button size="small" @click="exportFit"> <DownloadOutlined /> 导出FIT </a-button>
            <a-button size="small" @click="exportJson"> <FileTextOutlined /> 导出JSON </a-button>
          </a-space>
        </template>

        <a-table
          :columns="dataColumns"
          :data-source="paginatedDataPoints"
          :pagination="{
            current: currentPage,
            pageSize: pageSize,
            total: dataPoints.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number, range: number[]) => `${range[0]}-${range[1]} / ${total} 条`,
            onChange: handlePageChange,
            onShowSizeChange: handlePageSizeChange,
          }"
          size="small"
          :scroll="{ x: 800 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'timestamp'">
              {{ formatTime(record.timestamp) }}
            </template>
            <template v-else-if="column.key === 'resistance'">
              <span :class="getValueClass((record as any).resistance, 'resistance')">
                {{ formatValue((record as any).resistance, 1) }}
              </span>
            </template>
            <template v-else-if="column.key === 'power'">
              <span :class="getValueClass(record.power, 'power')">
                {{ formatValue(record.power, 0) }}
              </span>
            </template>
            <template v-else-if="column.key === 'heartRate'">
              <span :class="getValueClass(record.heartRate, 'heartRate')">
                {{ formatValue(record.heartRate, 0) }}
              </span>
            </template>
            <template v-else-if="column.key === 'cadence'">
              <span :class="getValueClass(record.cadence, 'cadence')">
                {{ formatValue(record.cadence, 0) }}
              </span>
            </template>
            <template v-else-if="column.key === 'gear'">
              <span v-if="record.electronicShifting">
                {{ record.electronicShifting.frontGear || '-' }}×{{
                  record.electronicShifting.rearGear || '-'
                }}
              </span>
              <span v-else>-</span>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons-vue'
import type { RidingSessionRecord, RidingDataRecord } from '../utils/database'
import { CyclingDataManager } from '../utils/database'
import LineChart from './LineChart.vue'
import dayjs from 'dayjs'

// Props
interface Props {
  session: RidingSessionRecord
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  exportFit: [session: RidingSessionRecord]
  exportJson: [session: RidingSessionRecord]
}>()

// 响应式数据
const dataPoints = ref<RidingDataRecord[]>([])
const loading = ref(false)
const activeChartTab = ref('resistance')
const currentPage = ref(1)
const pageSize = ref(20)

// 数据管理器
const dataManager = CyclingDataManager.getInstance()

// 计算属性
const paginatedDataPoints = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return dataPoints.value.slice(start, end)
})

const resistanceChartData = computed(() => {
  return dataPoints.value.map((point) => ({
    x: point.timestamp,
    y: (point as any).resistance || 0,
  }))
})

const powerChartData = computed(() => {
  return dataPoints.value.map((point) => ({
    x: point.timestamp,
    y: point.power || 0,
  }))
})

const heartRateChartData = computed(() => {
  return dataPoints.value.map((point) => ({
    x: point.timestamp,
    y: point.heartRate || 0,
  }))
})

const cadenceChartData = computed(() => {
  return dataPoints.value.map((point) => ({
    x: point.timestamp,
    y: point.cadence || 0,
  }))
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      type: 'time',
      time: {
        displayFormats: {
          minute: 'HH:mm',
          hour: 'HH:mm',
        },
      },
    },
    y: {
      beginAtZero: true,
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
}))

// 表格列定义
const dataColumns = [
  {
    title: '时间',
    key: 'timestamp',
    width: 100,
    fixed: 'left',
  },
  {
    title: '阻力 (%)',
    key: 'resistance',
    width: 100,
  },
  {
    title: '功率 (W)',
    key: 'power',
    width: 100,
  },
  {
    title: '心率 (bpm)',
    key: 'heartRate',
    width: 100,
  },
  {
    title: '踏频 (rpm)',
    key: 'cadence',
    width: 100,
  },
  {
    title: '档位',
    key: 'gear',
    width: 80,
  },
]

// 组件挂载时加载数据
onMounted(async () => {
  await loadSessionData()
})

/**
 * 加载会话数据
 */
async function loadSessionData() {
  loading.value = true
  try {
    // dataPoints.value = await dataManager.getSessionDataPoints(props.session.id)
    dataPoints.value = [] // 临时解决方案
  } catch (error) {
    console.error('加载会话数据失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 处理分页变化
 */
function handlePageChange(page: number) {
  currentPage.value = page
}

/**
 * 处理页面大小变化
 */
function handlePageSizeChange(current: number, size: number) {
  currentPage.value = current
  pageSize.value = size
}

/**
 * 导出FIT文件
 */
function exportFit() {
  emit('exportFit', props.session)
}

/**
 * 导出JSON文件
 */
function exportJson() {
  emit('exportJson', props.session)
}

/**
 * 格式化日期时间
 */
function formatDateTime(timestamp: number): string {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 格式化时间
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
 * 格式化数值
 */
function formatValue(value: number | undefined, precision: number): string {
  if (value === undefined || value === null) return '--'
  return value.toFixed(precision)
}

/**
 * 获取数值样式类
 */
function getValueClass(value: number | undefined, type: string): string {
  if (!value) return ''

  switch (type) {
    case 'resistance':
      if (value > 80) return 'high-value'
      if (value > 50) return 'medium-value'
      return 'low-value'
    case 'power':
      if (value > 300) return 'high-value'
      if (value > 200) return 'medium-value'
      return 'low-value'
    case 'heartRate':
      if (value > 160) return 'high-value'
      if (value > 140) return 'medium-value'
      return 'low-value'
    case 'cadence':
      if (value > 100) return 'high-value'
      if (value > 80) return 'medium-value'
      return 'low-value'
    default:
      return ''
  }
}
</script>

<style scoped>
.session-preview {
  width: 100%;
}

.session-header {
  margin-bottom: 16px;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #f5f5f5;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: #666;
  font-size: 13px;
}

.info-value {
  font-weight: 600;
  color: #262626;
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.charts-section {
  margin-bottom: 16px;
}

.chart-container {
  height: 300px;
  padding: 16px 0;
}

.data-table-section {
  margin-bottom: 16px;
}

.high-value {
  color: #f5222d;
  font-weight: 600;
}

.medium-value {
  color: #faad14;
  font-weight: 500;
}

.low-value {
  color: #52c41a;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .chart-container {
    height: 250px;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .chart-container {
    height: 200px;
  }
}
</style>
