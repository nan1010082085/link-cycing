<template>
  <div class="session-manager">
    <a-modal
      v-model:open="visible"
      width="80%"
      title="骑行会话管理"
      :footer="null"
      :destroy-on-close="true"
    >
      <a-card title="骑行会话管理">
        <template #extra>
          <a-space>
            <!-- <a-button
              type="primary"
              :loading="isRecording"
              @click="toggleRecording"
              :disabled="!hasConnectedDevices"
            >
              <PlayCircleOutlined v-if="!isRecording" />
              <PauseCircleOutlined v-else />
              {{ isRecording ? '停止记录' : '开始记录' }}
            </a-button> -->
            <a-button @click="refreshSessions"> <ReloadOutlined /> 刷新 </a-button>
          </a-space>
        </template>

        <!-- 当前会话状态 -->
        <div class="current-session" v-if="currentSession">
          <a-alert
            :message="`正在记录: ${(currentSession as any).name}`"
            :description="`开始时间: ${formatDateTime(currentSession.startTime as any)} | 已记录: ${formatDuration(currentSessionDuration)} | 数据点: ${realtimeDataPoints.length}`"
            type="info"
            show-icon
            closable
            @close="stopRecording"
          >
            <template #icon>
              <LoadingOutlined spin />
            </template>
          </a-alert>
        </div>

        <!-- 会话列表 -->
        <div class="sessions-list">
          <a-table
            :columns="columns"
            :data-source="sessions"
            :loading="loading"
            :pagination="{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total: number, range: number[]) =>
                `${range[0]}-${range[1]} / ${total} 条记录`,
            }"
            row-key="id"
            size="small"
          >
            <!-- 会话名称 -->
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div class="session-name">
                  <strong>{{ record.name }}</strong>
                  <div class="session-meta">
                    <a-tag size="small" :color="getSessionStatusColor(record)">
                      {{ getSessionStatusText(record) }}
                    </a-tag>
                    <span class="session-id">ID: {{ record.id.slice(-8) }}</span>
                  </div>
                </div>
              </template>

              <!-- 时间信息 -->
              <template v-else-if="column.key === 'time'">
                <div class="time-info">
                  <div>{{ formatDateTime(record.startTime) }}</div>
                  <div class="duration">{{ formatDuration(record.duration) }}</div>
                </div>
              </template>

              <!-- 统计信息 -->
              <template v-else-if="column.key === 'stats'">
                <div class="stats-info">
                  <div class="stat-item">
                    <span class="stat-label">距离:</span>
                    <span class="stat-value">{{ (record.totalDistance || 0).toFixed(2) }}km</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">平均功率:</span>
                    <span class="stat-value">{{ (record.avgPower || 0).toFixed(0) }}W</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">数据点:</span>
                    <span class="stat-value">{{ record.dataPointsCount || 0 }}</span>
                  </div>
                </div>
              </template>

              <!-- 操作按钮 -->
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <a-button
                    size="small"
                    type="text"
                    @click="handlePreviewSession(record)"
                    title="预览"
                  >
                    <EyeOutlined />
                  </a-button>
                  <a-button
                    size="small"
                    type="text"
                    @click="exportSession(record)"
                    :loading="exportingIds.includes(record.id)"
                    title="导出FIT文件"
                  >
                    <DownloadOutlined />
                  </a-button>
                  <a-button
                    size="small"
                    type="text"
                    @click="exportSessionJson(record)"
                    title="导出JSON"
                  >
                    <FileTextOutlined />
                  </a-button>
                  <a-popconfirm
                    title="确定要删除这个会话吗？"
                    ok-text="确定"
                    cancel-text="取消"
                    @confirm="deleteSession(record.id)"
                  >
                    <a-button size="small" type="text" danger title="删除">
                      <DeleteOutlined />
                    </a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>

        <!-- 批量操作 -->
        <div class="batch-operations" v-if="sessions.length > 0">
          <a-space>
            <a-button @click="exportAllSessions" :loading="exportingAll">
              <DownloadOutlined /> 导出全部FIT文件
            </a-button>
            <a-popconfirm
              title="确定要清空所有过期会话吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="cleanExpiredSessions"
            >
              <a-button> <ClearOutlined /> 清理过期数据 </a-button>
            </a-popconfirm>
            <a-popconfirm
              title="确定要删除所有会话吗？此操作不可恢复！"
              ok-text="确定"
              cancel-text="取消"
              @confirm="clearAllSessions"
            >
              <a-button danger> <DeleteOutlined /> 清空全部 </a-button>
            </a-popconfirm>
          </a-space>
        </div>
      </a-card>
    </a-modal>

    <!-- 会话预览模态框 -->
    <a-modal
      v-model:open="previewVisible"
      title="会话预览"
      width="80%"
      :footer="null"
      :destroy-on-close="true"
    >
      <SessionPreview
        v-if="previewSession && previewVisible"
        :session="previewSession"
        @export-fit="exportSession"
        @export-json="exportSessionJson"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  LoadingOutlined,
  EyeOutlined,
  DownloadOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ClearOutlined,
} from '@ant-design/icons-vue'
import { useCyclingStore } from '../stores/cycling'
import { CyclingDataManager } from '../utils/database'
import { FitExporter } from '../utils/fitExporter'
import SessionPreview from './SessionPreview.vue'
import type { RidingSessionRecord } from '../utils/database'
import dayjs from 'dayjs'

// Store
const cyclingStore = useCyclingStore()

const visible = defineModel()

// 响应式数据
const loading = ref(false)
const sessions = ref<RidingSessionRecord[]>([])
const exportingIds = ref<string[]>([])
const exportingAll = ref(false)
const previewVisible = ref(false)
const previewSession = ref<RidingSessionRecord | null>(null)

// 数据管理器
const dataManager = CyclingDataManager.getInstance()
const fitExporter = new FitExporter()

// 计算属性
const isRecording = computed(() => (cyclingStore as any).isRecording || false)
const currentSession = computed(() => cyclingStore.currentSession)
const realtimeDataPoints = computed(() => cyclingStore.realtimeDataPoints)
const hasConnectedDevices = computed(() => cyclingStore.connectedDevices.size > 0)

const currentSessionDuration = computed(() => {
  if (!currentSession.value) return 0
  return (Date.now() - (currentSession.value.startTime as any)) / 1000
})

// 表格列定义
const columns = [
  {
    title: '会话名称',
    key: 'name',
    width: 200,
  },
  {
    title: '时间信息',
    key: 'time',
    width: 150,
  },
  {
    title: '统计信息',
    key: 'stats',
    width: 200,
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
  },
]

// 监听当前会话状态变化
watch(isRecording, (newValue) => {
  if (!newValue) {
    // 停止记录时刷新会话列表
    refreshSessions()
  }
})

// 组件挂载时加载数据
onMounted(() => {
  refreshSessions()
})

/**
 * 切换记录状态
 */
// function toggleRecording() {
//   if (isRecording.value) {
//     stopRecording()
//   } else {
//     startRecording()
//   }
// }

/**
 * 开始记录
 */
function startRecording() {
  if (!hasConnectedDevices.value) {
    message.warning('请先连接设备后再开始记录')
    return
  }

  cyclingStore.startRiding()
  message.success('开始记录骑行数据')
}

/**
 * 停止记录
 */
function stopRecording() {
  cyclingStore.stopRiding()
  message.success('已停止记录')
}

/**
 * 刷新会话列表
 */
async function refreshSessions() {
  loading.value = true
  try {
    // sessions.value = await dataManager.getAllSessions()
    sessions.value = [] // 临时解决方案
  } catch (error) {
    console.error('加载会话列表失败:', error)
    message.error('加载会话列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 预览会话
 */
function handlePreviewSession(session: RidingSessionRecord) {
  previewSession.value = session
  previewVisible.value = true
}

/**
 * 导出会话为FIT文件
 */
async function exportSession(session: RidingSessionRecord) {
  exportingIds.value.push(session.id)
  try {
    // 获取会话的数据点
    // const dataPoints = await dataManager.getSessionDataPoints(session.id)
    const dataPoints: any[] = [] // 临时解决方案

    // 创建完整的会话数据
    const sessionData = {
      ...session,
      dataPoints,
    }

    // 导出FIT文件
    await fitExporter.downloadFitFile(sessionData)
    message.success('FIT文件导出成功')
  } catch (error) {
    console.error('导出FIT文件失败:', error)
    message.error('导出FIT文件失败')
  } finally {
    exportingIds.value = exportingIds.value.filter((id) => id !== session.id)
  }
}

/**
 * 导出会话为JSON文件
 */
async function exportSessionJson(session: RidingSessionRecord) {
  try {
    // const dataPoints = await dataManager.getSessionDataPoints(session.id)
    const dataPoints: any[] = [] // 临时解决方案
    const sessionData = {
      ...session,
      dataPoints,
    }

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(session as any).name}-${dayjs(session.startTime).format('YYYY-MM-DD-HHmmss')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    message.success('JSON文件导出成功')
  } catch (error) {
    console.error('导出JSON文件失败:', error)
    message.error('导出JSON文件失败')
  }
}

/**
 * 导出所有会话为FIT文件
 */
async function exportAllSessions() {
  if (sessions.value.length === 0) {
    message.warning('没有可导出的会话')
    return
  }

  exportingAll.value = true
  try {
    const sessionsWithData = []

    for (const session of sessions.value) {
      // const dataPoints = await dataManager.getSessionDataPoints(session.id)
      const dataPoints: any[] = [] // 临时解决方案
      sessionsWithData.push({
        ...session,
        dataPoints,
      })
    }

    await fitExporter.exportMultipleSessions(sessionsWithData)
    message.success(`成功导出 ${sessions.value.length} 个会话的FIT文件`)
  } catch (error) {
    console.error('批量导出失败:', error)
    message.error('批量导出失败')
  } finally {
    exportingAll.value = false
  }
}

/**
 * 删除会话
 */
async function deleteSession(sessionId: string) {
  try {
    await dataManager.deleteSession(sessionId)
    message.success('会话已删除')
    refreshSessions()
  } catch (error) {
    console.error('删除会话失败:', error)
    message.error('删除会话失败')
  }
}

/**
 * 清理过期会话
 */
async function cleanExpiredSessions() {
  try {
    await dataManager.cleanupExpiredData()
    message.success('过期数据已清理')
    refreshSessions()
  } catch (error) {
    console.error('清理过期数据失败:', error)
    message.error('清理过期数据失败')
  }
}

/**
 * 清空所有会话
 */
async function clearAllSessions() {
  try {
    await dataManager.clearAllData()
    message.success('所有数据已清空')
    refreshSessions()
  } catch (error) {
    console.error('清空数据失败:', error)
    message.error('清空数据失败')
  }
}

/**
 * 格式化日期时间
 */
function formatDateTime(timestamp: number): string {
  return dayjs(timestamp).format('MM-DD HH:mm')
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
 * 获取会话状态颜色
 */
function getSessionStatusColor(session: RidingSessionRecord): string {
  if (session.endTime) {
    return 'green'
  }
  return 'blue'
}

/**
 * 获取会话状态文本
 */
function getSessionStatusText(session: RidingSessionRecord): string {
  if (session.endTime) {
    return '已完成'
  }
  return '进行中'
}
</script>

<style scoped>
.session-manager {
  width: 100%;
}

.current-session {
  margin-bottom: 16px;
}

.sessions-list {
  margin-bottom: 16px;
}

.session-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-id {
  font-size: 11px;
  color: #999;
  font-family: 'Courier New', monospace;
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.duration {
  color: #666;
  font-weight: 500;
}

.stats-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: 500;
  color: #262626;
}

.batch-operations {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .session-name {
    font-size: 12px;
  }

  .time-info,
  .stats-info {
    font-size: 11px;
  }

  .batch-operations {
    text-align: left;
  }
}
</style>
