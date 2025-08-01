/**
 * 骑行设备类型枚举
 */
export enum CyclingDeviceType {
  /** 骑行台 - 支持功率、踏频、阻力数据 */
  TRAINER = 'trainer',
  /** 功率计 - 支持功率、踏频数据 */
  POWER_METER = 'power_meter',
  /** 心率设备 */
  HEART_RATE = 'heart_rate',
  /** 电子变速设备 */
  ELECTRONIC_SHIFTING = 'electronic_shifting',
}

/**
 * 电子变速数据接口
 */
export interface ElectronicShiftingData {
  /** 前齿盘档位 */
  frontGear?: number
  /** 后飞轮档位 */
  rearGear?: number
  /** 齿比 */
  gearRatio?: number
  /** 前齿盘齿数 */
  frontChainring?: number
  /** 后飞轮齿数 */
  rearCassette?: number
  /** 电池电量 (%) */
  batteryLevel?: number
  /** 变速器电池电量 */
  shifterBatteryLevel?: number
  /** 变速器状态 */
  shifterStatus?: 'normal' | 'shifting' | 'error' | 'calibrating'
}

/**
 * 骑行台数据接口
 */
export interface TrainerData {
  /** 功率 (瓦特) */
  power?: number
  /** 踏频 (转/分钟) */
  cadence?: number
  /** 阻力等级 */
  resistance?: number
  /** 目标阻力 */
  targetResistance?: number
  /** 最大阻力 */
  maxResistance?: number
  /** 最小阻力 */
  minResistance?: number
  /** 曲柄转数 */
  crankRevolutions?: number
  /** 曲柄事件时间 */
  crankEventTime?: number
  /** 电池电量 (%) */
  batteryLevel?: number
  /** 设备状态 */
  deviceStatus?: 'ready' | 'calibrating' | 'training' | 'paused' | 'error'
}

/**
 * 功率计数据接口
 */
export interface PowerMeterData {
  /** 功率 (瓦特) */
  power?: number
  /** 踏频 (转/分钟) */
  cadence?: number
  /** 电池电量 (%) */
  batteryLevel?: number
  /** 左腿功率 */
  leftPower?: number
  /** 右腿功率 */
  rightPower?: number
  /** 功率平衡 */
  powerBalance?: number
  /** 扭矩 */
  torque?: number
  /** 曲柄转数 */
  crankRevolutions?: number
  /** 曲柄事件时间 */
  crankEventTime?: number
}

/**
 * 心率设备数据接口
 */
export interface HeartRateData {
  /** 心率 (次/分钟) */
  heartRate?: number
  /** 心率变异性 */
  heartRateVariability?: number
  /** 电池电量 (%) */
  batteryLevel?: number
  /** 心率区间 */
  heartRateZone?: number
  /** 设备状态 */
  deviceStatus?: 'connected' | 'disconnected' | 'low_battery' | 'error'
}

/**
 * 骑行数据接口
 */
export interface CyclingDeviceData {
  /** 踏频 (转/分钟) */
  cadence?: number
  /** 功率 (瓦特) */
  power?: number
  /** 心率 (次/分钟) */
  heartRate?: number
  /** 阻力等级 */
  resistance?: number
  /** 电池电量 (%) */
  batteryLevel?: number
  /** 时间戳 */
  timestamp?: number
  /** 电子变速数据 */
  electronicShifting?: ElectronicShiftingData
  /** 骑行台数据 */
  trainer?: TrainerData
  /** 功率计数据 */
  powerMeter?: PowerMeterData
  /** 心率设备数据 */
  heartRateDevice?: HeartRateData
}