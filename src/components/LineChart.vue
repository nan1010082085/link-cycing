<template>
  <div class="line-chart">
    <div class="chart-header" v-if="title">
      <h4 class="chart-title">{{ title }}</h4>
      <div class="chart-stats" v-if="stats">
        <span class="stat-item">最大: {{ stats.max }}</span>
        <span class="stat-item">平均: {{ stats.avg }}</span>
        <span class="stat-item">最小: {{ stats.min }}</span>
      </div>
    </div>
    
    <div class="chart-container" ref="chartContainer">
      <svg 
        :width="chartWidth" 
        :height="chartHeight" 
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        class="chart-svg"
      >
        <!-- 网格线 -->
        <g class="grid-lines">
          <!-- 水平网格线 -->
          <line 
            v-for="(line, index) in horizontalGridLines" 
            :key="`h-${index}`"
            :x1="padding.left" 
            :y1="line.y" 
            :x2="chartWidth - padding.right" 
            :y2="line.y"
            class="grid-line"
          />
          <!-- 垂直网格线 -->
          <line 
            v-for="(line, index) in verticalGridLines" 
            :key="`v-${index}`"
            :x1="line.x" 
            :y1="padding.top" 
            :x2="line.x" 
            :y2="chartHeight - padding.bottom"
            class="grid-line"
          />
        </g>
        
        <!-- 坐标轴 -->
        <g class="axes">
          <!-- X轴 -->
          <line 
            :x1="padding.left" 
            :y1="chartHeight - padding.bottom" 
            :x2="chartWidth - padding.right" 
            :y2="chartHeight - padding.bottom"
            class="axis-line"
          />
          <!-- Y轴 -->
          <line 
            :x1="padding.left" 
            :y1="padding.top" 
            :x2="padding.left" 
            :y2="chartHeight - padding.bottom"
            class="axis-line"
          />
        </g>
        
        <!-- 数据线 -->
        <g class="data-line">
          <path 
            :d="linePath" 
            :stroke="color" 
            :stroke-width="lineWidth"
            fill="none"
            class="line-path"
          />
          
          <!-- 数据点 -->
          <circle 
            v-for="(point, index) in visiblePoints" 
            :key="index"
            :cx="point.x" 
            :cy="point.y" 
            :r="pointRadius"
            :fill="color"
            class="data-point"
            @mouseover="showTooltip($event, point, index)"
            @mouseout="hideTooltip"
          />
        </g>
        
        <!-- Y轴标签 -->
        <g class="y-labels">
          <text 
            v-for="(label, index) in yLabels" 
            :key="index"
            :x="padding.left - 10" 
            :y="label.y + 4" 
            text-anchor="end"
            class="axis-label"
          >
            {{ label.text }}
          </text>
        </g>
        
        <!-- X轴标签 -->
        <g class="x-labels">
          <text 
            v-for="(label, index) in xLabels" 
            :key="index"
            :x="label.x" 
            :y="chartHeight - padding.bottom + 20" 
            text-anchor="middle"
            class="axis-label"
          >
            {{ label.text }}
          </text>
        </g>
      </svg>
      
      <!-- 工具提示 -->
      <div 
        v-if="tooltip.visible" 
        class="tooltip"
        :style="{
          left: tooltip.x + 'px',
          top: tooltip.y + 'px'
        }"
      >
        <div class="tooltip-content">
          <div class="tooltip-time">{{ tooltip.time }}</div>
          <div class="tooltip-value">{{ tooltip.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import dayjs from 'dayjs'

// Props
interface Props {
  data: Array<{ x: number; y: number }>
  title?: string
  color?: string
  lineWidth?: number
  pointRadius?: number
  showPoints?: boolean
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  color: '#1890ff',
  lineWidth: 2,
  pointRadius: 3,
  showPoints: true,
  height: 300
})

// 响应式数据
const chartContainer = ref<HTMLElement>()
const chartWidth = ref(800)
const chartHeight = ref(props.height)
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  time: '',
  value: ''
})

// 图表配置
const padding = {
  top: 20,
  right: 20,
  bottom: 40,
  left: 60
}

// 计算属性
const dataRange = computed(() => {
  if (props.data.length === 0) {
    return {
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 1
    }
  }
  
  const xValues = props.data.map(d => d.x)
  const yValues = props.data.map(d => d.y)
  
  return {
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
    minY: Math.min(...yValues),
    maxY: Math.max(...yValues)
  }
})

const stats = computed(() => {
  if (props.data.length === 0) return null
  
  const values = props.data.map(d => d.y)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length
  
  return {
    max: max.toFixed(1),
    min: min.toFixed(1),
    avg: avg.toFixed(1)
  }
})

const plotWidth = computed(() => chartWidth.value - padding.left - padding.right)
const plotHeight = computed(() => chartHeight.value - padding.top - padding.bottom)

const xScale = computed(() => {
  const range = dataRange.value.maxX - dataRange.value.minX
  return range > 0 ? plotWidth.value / range : 1
})

const yScale = computed(() => {
  const range = dataRange.value.maxY - dataRange.value.minY
  return range > 0 ? plotHeight.value / range : 1
})

const visiblePoints = computed(() => {
  return props.data.map(point => ({
    x: padding.left + (point.x - dataRange.value.minX) * xScale.value,
    y: padding.top + plotHeight.value - (point.y - dataRange.value.minY) * yScale.value,
    originalX: point.x,
    originalY: point.y
  }))
})

const linePath = computed(() => {
  if (visiblePoints.value.length === 0) return ''
  
  let path = `M ${visiblePoints.value[0].x} ${visiblePoints.value[0].y}`
  
  for (let i = 1; i < visiblePoints.value.length; i++) {
    path += ` L ${visiblePoints.value[i].x} ${visiblePoints.value[i].y}`
  }
  
  return path
})

const horizontalGridLines = computed(() => {
  const lines = []
  const stepCount = 5
  const step = plotHeight.value / stepCount
  
  for (let i = 0; i <= stepCount; i++) {
    lines.push({
      y: padding.top + i * step
    })
  }
  
  return lines
})

const verticalGridLines = computed(() => {
  const lines = []
  const stepCount = 6
  const step = plotWidth.value / stepCount
  
  for (let i = 0; i <= stepCount; i++) {
    lines.push({
      x: padding.left + i * step
    })
  }
  
  return lines
})

const yLabels = computed(() => {
  const labels = []
  const stepCount = 5
  const valueStep = (dataRange.value.maxY - dataRange.value.minY) / stepCount
  const yStep = plotHeight.value / stepCount
  
  for (let i = 0; i <= stepCount; i++) {
    const value = dataRange.value.minY + (stepCount - i) * valueStep
    labels.push({
      y: padding.top + i * yStep,
      text: value.toFixed(0)
    })
  }
  
  return labels
})

const xLabels = computed(() => {
  const labels = []
  const stepCount = 6
  const timeStep = (dataRange.value.maxX - dataRange.value.minX) / stepCount
  const xStep = plotWidth.value / stepCount
  
  for (let i = 0; i <= stepCount; i++) {
    const timestamp = dataRange.value.minX + i * timeStep
    labels.push({
      x: padding.left + i * xStep,
      text: dayjs(timestamp).format('HH:mm')
    })
  }
  
  return labels
})

// 监听容器大小变化
watch(() => chartContainer.value, () => {
  updateChartSize()
})

// 组件挂载时设置图表大小
onMounted(() => {
  updateChartSize()
  window.addEventListener('resize', updateChartSize)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('resize', updateChartSize)
})

/**
 * 更新图表大小
 */
function updateChartSize() {
  if (chartContainer.value) {
    const rect = chartContainer.value.getBoundingClientRect()
    chartWidth.value = Math.max(400, rect.width)
  }
}

/**
 * 显示工具提示
 */
function showTooltip(event: MouseEvent, point: any, index: number) {
  const rect = chartContainer.value?.getBoundingClientRect()
  if (!rect) return
  
  tooltip.value = {
    visible: true,
    x: event.clientX - rect.left + 10,
    y: event.clientY - rect.top - 10,
    time: dayjs(point.originalX).format('HH:mm:ss'),
    value: point.originalY.toFixed(1)
  }
}

/**
 * 隐藏工具提示
 */
function hideTooltip() {
  tooltip.value.visible = false
}
</script>

<style scoped>
.line-chart {
  width: 100%;
  background: #fff;
  border-radius: 6px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.chart-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.chart-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  font-size: 12px;
  color: #666;
}

.chart-container {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.chart-svg {
  width: 100%;
  height: auto;
}

.grid-line {
  stroke: #f0f0f0;
  stroke-width: 1;
}

.axis-line {
  stroke: #d9d9d9;
  stroke-width: 1;
}

.axis-label {
  font-size: 11px;
  fill: #666;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.line-path {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.data-point {
  cursor: pointer;
  transition: r 0.2s ease;
}

.data-point:hover {
  r: 5;
}

.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tooltip-time {
  font-weight: 500;
}

.tooltip-value {
  font-weight: 600;
  font-size: 13px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .chart-stats {
    gap: 12px;
  }
  
  .stat-item {
    font-size: 11px;
  }
}
</style>