import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { CyclingDeviceType, type CyclingDeviceData } from '../types/cycling'
import dayjs from 'dayjs'

/**
 * 设备连接信息接口
 */
export interface DeviceInfo {
  /** 设备ID */
  id: string
  /** 设备名称 */
  name: string
  /** 设备类型 */
  type: CyclingDeviceType
  /** 连接状态 */
  connected: boolean
  /** 自动重连设置 */
  autoReconnect?: boolean
  /** 最后连接时间 */
  lastConnected?: Date
  /** 设备信息 */
  deviceInfo?: {
    manufacturer?: string
    model?: string
    serialNumber?: string
    firmwareVersion?: string
    batteryLevel?: number
  }
}

/**
 * 骑行记录数据点
 */
export interface RidingDataPoint {
  /** 时间戳 */
  timestamp: number
  /** 踏频 (rpm) */
  cadence?: number
  /** 功率 (watts) */
  power?: number
  /** 心率 (bpm) */
  heartRate?: number
  /** 阻力 */
  resistance?: number
  /** 距离 (km) */
  distance?: number
  /** 变速档位 */
  gear?: {
    front: number
    rear: number
  }
}

/**
 * 骑行会话
 */
export interface RidingSession {
  /** 会话ID */
  id: string
  /** 开始时间 */
  startTime: Date
  /** 结束时间 */
  endTime?: Date
  /** 骑行数据点 */
  dataPoints: RidingDataPoint[]
  /** 会话统计 */
  stats: {
    /** 总时间 (秒) */
    totalTime: number
    /** 总距离 (km) */
    totalDistance?: number
    /** 平均功率 (watts) */
    avgPower?: number
    /** 最大功率 (watts) */
    maxPower?: number
    /** 平均心率 (bpm) */
    avgHeartRate?: number
    /** 最大心率 (bpm) */
    maxHeartRate?: number
    /** 平均踏频 (rpm) */
    avgCadence?: number
    /** 平均阻力 */
    avgResistance?: number
    /** 最大阻力 */
    maxResistance?: number
  }
}

/**
 * 骑行设备管理Store
 */
export const useCyclingStore = defineStore('cycling', () => {
  // 已连接的设备列表
  const connectedDevices = ref<Map<CyclingDeviceType, DeviceInfo>>(new Map())
  
  // 已保存的设备列表（持久化）
  const savedDevices = ref<DeviceInfo[]>([])
  
  // 当前骑行数据
  const currentRidingData = ref<CyclingDeviceData>({})
  
  // 当前骑行会话
  const currentSession = ref<RidingSession | null>(null)
  
  // 实时数据记录（用于显示）
  const realtimeDataPoints = ref<RidingDataPoint[]>([])
  
  // 是否正在骑行
  const isRiding = ref(false)
  
  // 骑行开始时间
  const ridingStartTime = ref<Date | null>(null)
  
  // 计算属性
  const connectedDevicesList = computed(() => Array.from(connectedDevices.value.values()))
  
  const hasTrainer = computed(() => connectedDevices.value.has(CyclingDeviceType.TRAINER))
  const hasPowerMeter = computed(() => connectedDevices.value.has(CyclingDeviceType.POWER_METER))
  const hasHeartRate = computed(() => connectedDevices.value.has(CyclingDeviceType.HEART_RATE))
  const hasElectronicShifting = computed(() => connectedDevices.value.has(CyclingDeviceType.ELECTRONIC_SHIFTING))
  
  // 当前骑行统计
  const currentStats = computed(() => {
    if (!isRiding.value || realtimeDataPoints.value.length === 0) {
      return null
    }
    
    const points = realtimeDataPoints.value
    const totalTime = ridingStartTime.value ? (Date.now() - ridingStartTime.value.getTime()) / 1000 : 0
    
    const powers = points.map(p => p.power).filter(Boolean) as number[]
    const heartRates = points.map(p => p.heartRate).filter(Boolean) as number[]
    const cadences = points.map(p => p.cadence).filter(Boolean) as number[]
    
    return {
      totalTime,
      totalDistance: points[points.length - 1]?.distance || 0,
      avgPower: powers.length > 0 ? powers.reduce((a, b) => a + b, 0) / powers.length : undefined,
      maxPower: powers.length > 0 ? Math.max(...powers) : undefined,
      avgHeartRate: heartRates.length > 0 ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length : undefined,
      maxHeartRate: heartRates.length > 0 ? Math.max(...heartRates) : undefined,
      avgCadence: cadences.length > 0 ? cadences.reduce((a, b) => a + b, 0) / cadences.length : undefined
    }
  })
  
  // 会话持续时间
  const sessionDuration = computed(() => {
    if (!ridingStartTime.value) return 0
    return Math.floor((Date.now() - ridingStartTime.value.getTime()) / 1000)
  })
  
  // 会话数据点
  const sessionDataPoints = computed(() => realtimeDataPoints.value)
  
  // 会话是否活跃
  const isSessionActive = computed(() => currentSession.value !== null)
  
  // 会话是否暂停
  const isSessionPaused = computed(() => currentSession.value !== null && !isRiding.value)
  
  /**
   * 连接设备
   */
  function connectDevice(deviceInfo: DeviceInfo) {
    deviceInfo.connected = true
    deviceInfo.lastConnected = new Date()
    connectedDevices.value.set(deviceInfo.type, deviceInfo)
    
    // 保存到已保存设备列表
    const existingIndex = savedDevices.value.findIndex(d => d.id === deviceInfo.id)
    if (existingIndex >= 0) {
      savedDevices.value[existingIndex] = deviceInfo
    } else {
      savedDevices.value.push(deviceInfo)
    }
    
    // 持久化保存
    persistSavedDevices()
  }
  
  /**
   * 断开设备连接
   */
  function disconnectDevice(deviceId: string | CyclingDeviceType) {
    // 如果传入的是字符串ID，需要找到对应的设备类型
    if (typeof deviceId === 'string') {
      for (const [deviceType, device] of connectedDevices.value.entries()) {
        if (device.id === deviceId) {
          device.connected = false
          connectedDevices.value.delete(deviceType)
          
          // 更新已保存设备的最后连接时间
          const savedDevice = savedDevices.value.find(d => d.id === device.id)
          if (savedDevice) {
            savedDevice.lastConnected = new Date()
            savedDevice.connected = false
            persistSavedDevices()
          }
          return
        }
      }
    } else {
      // 如果传入的是设备类型
      const device = connectedDevices.value.get(deviceId)
      if (device) {
        device.connected = false
        connectedDevices.value.delete(deviceId)
        
        // 更新已保存设备的最后连接时间
        const savedDevice = savedDevices.value.find(d => d.id === device.id)
        if (savedDevice) {
          savedDevice.lastConnected = new Date()
          savedDevice.connected = false
          persistSavedDevices()
        }
      }
    }
  }
  
  /**
   * 删除已保存的设备
   */
  function removeSavedDevice(deviceId: string) {
    const index = savedDevices.value.findIndex(d => d.id === deviceId)
    if (index >= 0) {
      const device = savedDevices.value[index]
      
      // 如果设备正在连接，先断开
      if (device.connected) {
        disconnectDevice(device.type)
      }
      
      savedDevices.value.splice(index, 1)
      persistSavedDevices()
    }
  }
  
  /**
   * 更新设备数据
   * @param deviceId 设备ID
   * @param data 设备数据
   */
  function updateDeviceData(deviceId: string, data: Partial<CyclingDeviceData>) {
    // 更新当前骑行数据
    currentRidingData.value = { ...currentRidingData.value, ...data }
    
    // 更新设备电池电量信息
    if (data.batteryLevel !== undefined) {
      // 查找对应的连接设备并更新电池电量
      for (const [deviceType, device] of connectedDevices.value.entries()) {
        if (device.id === deviceId) {
          if (!device.deviceInfo) {
            device.deviceInfo = {}
          }
          device.deviceInfo.batteryLevel = data.batteryLevel
          
          // 同时更新已保存设备的电池电量
          const savedDevice = savedDevices.value.find(d => d.id === deviceId)
          if (savedDevice) {
            if (!savedDevice.deviceInfo) {
              savedDevice.deviceInfo = {}
            }
            savedDevice.deviceInfo.batteryLevel = data.batteryLevel
            persistSavedDevices()
          }
          break
        }
      }
    }
    
    // 如果正在骑行，记录数据点
    if (isRiding.value) {
      const dataPoint: RidingDataPoint = {
        timestamp: data.timestamp || Date.now(),
        cadence: data.cadence || data.trainer?.cadence || data.powerMeter?.cadence,
        power: data.power || data.trainer?.power || data.powerMeter?.power,
        heartRate: data.heartRate || data.heartRateDevice?.heartRate,
        gear: data.electronicShifting ? {
          front: data.electronicShifting.frontGear || 0,
          rear: data.electronicShifting.rearGear || 0
        } : undefined
      }
      
      realtimeDataPoints.value.push(dataPoint)
      
      // 限制实时数据点数量（保留最近1000个点）
      if (realtimeDataPoints.value.length > 1000) {
        realtimeDataPoints.value = realtimeDataPoints.value.slice(-1000)
      }
    }
  }

  /**
   * 更新当前骑行数据
   */
  function updateRidingData(data: CyclingDeviceData) {
    currentRidingData.value = { ...currentRidingData.value, ...data }
    
    // 如果正在骑行，记录数据点
    if (isRiding.value) {
      const dataPoint: RidingDataPoint = {
        timestamp: Date.now(),
        cadence: data.cadence || data.trainer?.cadence || data.powerMeter?.cadence,
        power: data.power || data.trainer?.power || data.powerMeter?.power,
        heartRate: data.heartRate || data.heartRateDevice?.heartRate,
        gear: data.electronicShifting ? {
          front: data.electronicShifting.frontGear || 0,
          rear: data.electronicShifting.rearGear || 0
        } : undefined
      }
      
      realtimeDataPoints.value.push(dataPoint)
      
      // 限制实时数据点数量（保留最近1000个点）
      if (realtimeDataPoints.value.length > 1000) {
        realtimeDataPoints.value = realtimeDataPoints.value.slice(-1000)
      }
    }
  }
  
  /**
   * 开始骑行
   */
  function startRiding() {
    isRiding.value = true
    ridingStartTime.value = new Date()
    realtimeDataPoints.value = []
    
    // 创建新的骑行会话
    currentSession.value = {
      id: `session_${Date.now()}`,
      startTime: ridingStartTime.value,
      dataPoints: [],
      stats: {
        totalTime: 0
      }
    }
  }
  
  /**
   * 停止骑行
   */
  function stopRiding() {
    if (!isRiding.value || !currentSession.value) return
    
    isRiding.value = false
    currentSession.value.endTime = new Date()
    currentSession.value.dataPoints = [...realtimeDataPoints.value]
    
    // 计算最终统计
    const points = realtimeDataPoints.value
    const powers = points.map(p => p.power).filter(Boolean) as number[]
    const heartRates = points.map(p => p.heartRate).filter(Boolean) as number[]
    const cadences = points.map(p => p.cadence).filter(Boolean) as number[]
    
    currentSession.value.stats = {
      totalTime: Math.floor((currentSession.value.endTime!.getTime() - currentSession.value.startTime.getTime()) / 1000),
      avgPower: powers.length > 0 ? powers.reduce((a, b) => a + b, 0) / powers.length : undefined,
      maxPower: powers.length > 0 ? Math.max(...powers) : undefined,
      avgHeartRate: heartRates.length > 0 ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length : undefined,
      maxHeartRate: heartRates.length > 0 ? Math.max(...heartRates) : undefined,
      avgCadence: cadences.length > 0 ? cadences.reduce((a, b) => a + b, 0) / cadences.length : undefined
    }
    
    // 保存会话到IndexedDB
    // TODO: 实现IndexedDB保存逻辑
    
    return currentSession.value
  }
  
  /**
   * 停止当前会话
   */
  function stopSession() {
    return stopRiding()
  }
  
  /**
   * 开始新会话
   */
  function startSession() {
    return startRiding()
  }
  
  /**
   * 暂停会话
   */
  function pauseSession() {
    if (isRiding.value) {
      isRiding.value = false
    }
  }
  
  /**
   * 恢复会话
   */
  function resumeSession() {
    if (currentSession.value && !isRiding.value) {
      isRiding.value = true
      ridingStartTime.value = new Date()
    }
  }
  
  /**
   * 初始化store
   */
  function initialize() {
    loadSavedDevices()
  }
  

  
  /**
   * 持久化保存设备列表
   */
  function persistSavedDevices() {
    try {
      localStorage.setItem('cycling_saved_devices', JSON.stringify(savedDevices.value))
    } catch (error) {
      console.error('Failed to persist saved devices:', error)
    }
  }
  
  /**
   * 加载已保存的设备列表
   */
  function loadSavedDevices() {
    try {
      const saved = localStorage.getItem('cycling_saved_devices')
      if (saved) {
        savedDevices.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load saved devices:', error)
    }
  }
  
  // 初始化时加载已保存的设备
  loadSavedDevices()
  
  return {
    // 状态
    connectedDevices,
    savedDevices,
    currentRidingData,
    currentSession,
    realtimeDataPoints,
    isRiding,
    ridingStartTime,
    
    // 计算属性
    connectedDevicesList,
    hasTrainer,
    hasPowerMeter,
    hasHeartRate,
    hasElectronicShifting,
    currentStats,
    sessionDuration,
    sessionDataPoints,
    isSessionActive,
    isSessionPaused,
    
    // 方法
    connectDevice,
    disconnectDevice,
    removeSavedDevice,
    updateDeviceData,
    updateRidingData,
    startRiding,
    stopRiding,
    startSession,
    pauseSession,
    stopSession,
    resumeSession,
    initialize
  }
})