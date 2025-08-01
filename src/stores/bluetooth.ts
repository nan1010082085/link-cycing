import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { CyclingDeviceType, type CyclingDeviceData } from '../types/cycling'
import { useCyclingStore, type DeviceInfo } from './cycling'

/**
 * 蓝牙设备发现结果
 */
export interface DiscoveredDevice {
  /** 设备ID */
  id: string
  /** 设备名称 */
  name: string
  /** 设备类型 */
  type: CyclingDeviceType
  /** 原生蓝牙设备对象 */
  device: BluetoothDevice
  /** 信号强度 */
  rssi?: number
  /** 是否已配对 */
  paired: boolean
}

/**
 * 设备连接状态
 */
export interface DeviceConnection {
  /** 设备ID */
  deviceId: string
  /** 设备类型 */
  deviceType: CyclingDeviceType
  /** 蓝牙设备对象 */
  device: BluetoothDevice
  /** GATT服务器 */
  server?: BluetoothRemoteGATTServer
  /** 服务对象 */
  service?: BluetoothRemoteGATTService
  /** 特征值对象 */
  characteristics: Map<string, BluetoothRemoteGATTCharacteristic>
  /** 连接状态 */
  connected: boolean
  /** 是否正在读取数据 */
  reading: boolean
}

/**
 * 设备信息服务配置
 */
const DEVICE_INFORMATION_SERVICE = {
  service: '0000180a-0000-1000-8000-00805f9b34fb', // Device Information Service
  characteristics: {
    manufacturerName: '00002a29-0000-1000-8000-00805f9b34fb', // Manufacturer Name String
    modelNumber: '00002a24-0000-1000-8000-00805f9b34fb', // Model Number String
    serialNumber: '00002a25-0000-1000-8000-00805f9b34fb', // Serial Number String
    hardwareRevision: '00002a27-0000-1000-8000-00805f9b34fb', // Hardware Revision String
    firmwareRevision: '00002a26-0000-1000-8000-00805f9b34fb', // Firmware Revision String
    softwareRevision: '00002a28-0000-1000-8000-00805f9b34fb', // Software Revision String
    pnpId: '00002a50-0000-1000-8000-00805f9b34fb', // PnP ID (用于识别禧玛诺等品牌)
  },
} as const

/**
 * 蓝牙服务配置 - 基于标准BLE GATT规范
 */
const BLUETOOTH_SERVICES = {
  [CyclingDeviceType.TRAINER]: {
    // 骑行台支持多种服务：Fitness Machine Service (主要) 和 Cycling Power Service
    service: '00001826-0000-1000-8000-00805f9b34fb', // Fitness Machine Service
    characteristics: {
      indoorBikeData: '00002ad2-0000-1000-8000-00805f9b34fb', // Indoor Bike Data (功率、踏频、阻力)
      fitnessMachineFeature: '00002acc-0000-1000-8000-00805f9b34fb', // Fitness Machine Feature
      fitnessMachineControlPoint: '00002ad9-0000-1000-8000-00805f9b34fb', // Fitness Machine Control Point
      fitnessMachineStatus: '00002ada-0000-1000-8000-00805f9b34fb', // Fitness Machine Status
      supportedResistanceLevelRange: '00002ad6-0000-1000-8000-00805f9b34fb', // Supported Resistance Level Range
      // 可选的功率服务特征
      powerMeasurement: '00002a63-0000-1000-8000-00805f9b34fb', // Cycling Power Measurement
      powerFeature: '00002a65-0000-1000-8000-00805f9b34fb', // Cycling Power Feature
      // 可选的踏频服务特征
      cscMeasurement: '00002a5b-0000-1000-8000-00805f9b34fb', // CSC Measurement
      cscFeature: '00002a5c-0000-1000-8000-00805f9b34fb', // CSC Feature
    },
    filters: [
      { services: ['00001826-0000-1000-8000-00805f9b34fb'] }, // Fitness Machine Service
      { services: ['00001818-0000-1000-8000-00805f9b34fb'] }, // Cycling Power Service
      { services: ['00001816-0000-1000-8000-00805f9b34fb'] }, // Cycling Speed and Cadence Service
    ],
  },
  [CyclingDeviceType.POWER_METER]: {
    service: '00001818-0000-1000-8000-00805f9b34fb', // Cycling Power Service
    characteristics: {
      measurement: '00002a63-0000-1000-8000-00805f9b34fb', // Cycling Power Measurement
      feature: '00002a65-0000-1000-8000-00805f9b34fb', // Cycling Power Feature
      sensorLocation: '00002a5d-0000-1000-8000-00805f9b34fb', // Sensor Location
      controlPoint: '00002a66-0000-1000-8000-00805f9b34fb', // Cycling Power Control Point
      vector: '00002a64-0000-1000-8000-00805f9b34fb', // Cycling Power Vector
      // 可选的踏频服务特征
      cscMeasurement: '00002a5b-0000-1000-8000-00805f9b34fb', // CSC Measurement
      cscFeature: '00002a5c-0000-1000-8000-00805f9b34fb', // CSC Feature
    },
    filters: [
      { services: ['00001818-0000-1000-8000-00805f9b34fb'] }, // Cycling Power Service
      { services: ['00001816-0000-1000-8000-00805f9b34fb'] }, // Cycling Speed and Cadence Service
    ],
  },
  [CyclingDeviceType.HEART_RATE]: {
    service: '0000180d-0000-1000-8000-00805f9b34fb', // Heart Rate Service
    characteristics: {
      measurement: '00002a37-0000-1000-8000-00805f9b34fb', // Heart Rate Measurement
      sensorLocation: '00002a38-0000-1000-8000-00805f9b34fb', // Body Sensor Location
      controlPoint: '00002a39-0000-1000-8000-00805f9b34fb', // Heart Rate Control Point
    },
    filters: [{ services: ['0000180d-0000-1000-8000-00805f9b34fb'] }],
  },
  [CyclingDeviceType.ELECTRONIC_SHIFTING]: {
    // 禧玛诺Di2使用自定义UUID，这里提供示例UUID
    // 实际使用时需要根据具体设备的UUID进行调整
    service: '00001530-1212-efde-1523-785feabcd123', // Shimano Di2 Custom Service (示例)
    characteristics: {
      gearPosition: '00001531-1212-efde-1523-785feabcd123', // 档位信息
      shifterControl: '00001532-1212-efde-1523-785feabcd123', // 变速控制
      shifterStatus: '00001534-1212-efde-1523-785feabcd123', // 变速器状态
    },
    // 由于使用自定义UUID，扫描时可能需要通过设备名称或制造商信息识别
    filters: [
      { namePrefix: 'SHIMANO' },
      { namePrefix: 'Di2' },
      { services: ['00001530-1212-efde-1523-785feabcd123'] },
    ],
  },
} as const

/**
 * 蓝牙设备管理Store
 */
export const useBluetoothStore = defineStore('bluetooth', () => {
  const cyclingStore = useCyclingStore()

  // 状态
  const isSupported = ref(false)
  const isScanning = ref(false)
  const discoveredDevices = ref<DiscoveredDevice[]>([])
  const deviceConnections = ref<Map<string, DeviceConnection>>(new Map())
  const error = ref<string | null>(null)

  // 计算属性
  const connectedDevices = computed(() => {
    return Array.from(deviceConnections.value.values()).filter((conn) => conn.connected)
  })

  const isConnected = computed(() => connectedDevices.value.length > 0)

  /**
   * 初始化蓝牙功能
   */
  function initialize(): void {
    isSupported.value = 'bluetooth' in navigator && 'requestDevice' in navigator.bluetooth
    if (!isSupported.value) {
      error.value = '当前浏览器不支持Web Bluetooth API'
    }
  }

  /**
   * 读取设备信息服务
   * @param device 蓝牙设备
   * @returns 设备信息对象
   */
  async function readDeviceInformation(device: BluetoothDevice): Promise<{
    manufacturer?: string
    model?: string
    serialNumber?: string
    hardwareRevision?: string
    firmwareRevision?: string
    softwareRevision?: string
    pnpId?: string
  }> {
    const deviceInfo: any = {}

    try {
      if (!device.gatt?.connected) {
        await device.gatt?.connect()
      }

      // 尝试获取设备信息服务
      const service = await device.gatt?.getPrimaryService(DEVICE_INFORMATION_SERVICE.service)
      if (!service) return deviceInfo

      // 读取各种设备信息特征值
      const characteristics = DEVICE_INFORMATION_SERVICE.characteristics

      try {
        const manufacturerChar = await service.getCharacteristic(characteristics.manufacturerName)
        const manufacturerValue = await manufacturerChar.readValue()
        deviceInfo.manufacturer = new TextDecoder().decode(manufacturerValue)
      } catch (e) {
        console.debug('无法读取制造商信息:', e)
      }

      try {
        const modelChar = await service.getCharacteristic(characteristics.modelNumber)
        const modelValue = await modelChar.readValue()
        deviceInfo.model = new TextDecoder().decode(modelValue)
      } catch (e) {
        console.debug('无法读取型号信息:', e)
      }

      try {
        const serialChar = await service.getCharacteristic(characteristics.serialNumber)
        const serialValue = await serialChar.readValue()
        deviceInfo.serialNumber = new TextDecoder().decode(serialValue)
      } catch (e) {
        console.debug('无法读取序列号:', e)
      }

      try {
        const hardwareChar = await service.getCharacteristic(characteristics.hardwareRevision)
        const hardwareValue = await hardwareChar.readValue()
        deviceInfo.hardwareRevision = new TextDecoder().decode(hardwareValue)
      } catch (e) {
        console.debug('无法读取硬件版本:', e)
      }

      try {
        const firmwareChar = await service.getCharacteristic(characteristics.firmwareRevision)
        const firmwareValue = await firmwareChar.readValue()
        deviceInfo.firmwareRevision = new TextDecoder().decode(firmwareValue)
      } catch (e) {
        console.debug('无法读取固件版本:', e)
      }

      try {
        const softwareChar = await service.getCharacteristic(characteristics.softwareRevision)
        const softwareValue = await softwareChar.readValue()
        deviceInfo.softwareRevision = new TextDecoder().decode(softwareValue)
      } catch (e) {
        console.debug('无法读取软件版本:', e)
      }

      try {
        const pnpChar = await service.getCharacteristic(characteristics.pnpId)
        const pnpValue = await pnpChar.readValue()
        // PnP ID是二进制数据，需要特殊处理
        const vendorId = pnpValue.getUint16(1, true) // 小端序
        deviceInfo.pnpId = `0x${vendorId.toString(16).padStart(4, '0').toUpperCase()}`
      } catch (e) {
        console.debug('无法读取PnP ID:', e)
      }
    } catch (error) {
      console.debug('读取设备信息失败:', error)
    }

    return deviceInfo
  }

  /**
   * 智能识别设备类型
   * @param device 蓝牙设备
   * @returns 设备类型
   */
  async function identifyDeviceType(device: BluetoothDevice): Promise<CyclingDeviceType | null> {
    try {
      // 首先尝试通过服务UUID识别
      if (device.gatt?.connected) {
        const services = await device.gatt.getPrimaryServices()

        for (const service of services) {
          const serviceUuid = service.uuid.toLowerCase()

          // 检查标准服务UUID
          for (const [deviceType, config] of Object.entries(BLUETOOTH_SERVICES)) {
            if (config.service.toLowerCase() === serviceUuid) {
              return deviceType as CyclingDeviceType
            }
          }
        }
      }

      // 通过设备名称识别
      const deviceName = device.name?.toLowerCase() || ''

      // 禧玛诺Di2识别
      if (
        deviceName.includes('shimano') ||
        deviceName.includes('di2') ||
        deviceName.includes('ultegra') ||
        deviceName.includes('dura-ace')
      ) {
        return CyclingDeviceType.ELECTRONIC_SHIFTING
      }

      // 心率设备识别
      if (
        deviceName.includes('hr') ||
        deviceName.includes('heart') ||
        deviceName.includes('polar') ||
        deviceName.includes('garmin hrm')
      ) {
        return CyclingDeviceType.HEART_RATE
      }

      // 功率计识别
      if (
        deviceName.includes('power') ||
        deviceName.includes('stages') ||
        deviceName.includes('quarq') ||
        deviceName.includes('srm')
      ) {
        return CyclingDeviceType.POWER_METER
      }

      // 骑行台设备识别
      if (
        deviceName.includes('tacx') ||
        deviceName.includes('wahoo') ||
        deviceName.includes('elite') ||
        deviceName.includes('resistance') ||
        deviceName.includes('cadence') ||
        deviceName.includes('csc') ||
        deviceName.includes('trainer')
      ) {
        return CyclingDeviceType.TRAINER
      }

      // 通过设备信息服务进一步识别
      const deviceInfo = await readDeviceInformation(device)
      if (deviceInfo.manufacturer) {
        const manufacturer = deviceInfo.manufacturer.toLowerCase()

        // 禧玛诺品牌识别 (PnP ID: 0x009A)
        if (manufacturer.includes('shimano') || deviceInfo.pnpId === '0x009A') {
          return CyclingDeviceType.ELECTRONIC_SHIFTING
        }

        // 其他品牌识别
        if (manufacturer.includes('polar') || manufacturer.includes('garmin')) {
          return CyclingDeviceType.HEART_RATE
        }

        if (
          manufacturer.includes('stages') ||
          manufacturer.includes('quarq') ||
          manufacturer.includes('srm')
        ) {
          return CyclingDeviceType.POWER_METER
        }

        if (
          manufacturer.includes('tacx') ||
          manufacturer.includes('wahoo') ||
          manufacturer.includes('elite')
        ) {
          return CyclingDeviceType.TRAINER
        }
      }
    } catch (error) {
      console.debug('设备类型识别失败:', error)
    }

    return null
  }

  /**
   * 解析功率数据 (Cycling Power Measurement)
   * @param data 原始数据
   * @returns 解析后的功率数据
   */
  function parsePowerData(data: DataView): {
    power: number
    cadence?: number
    torque?: number
    balance?: number
  } {
    const flags = data.getUint16(0, true) // 小端序
    let offset = 2

    // 瞬时功率 (必须字段)
    const power = data.getInt16(offset, true)
    offset += 2

    const result: any = { power }

    // 踏板功率平衡 (bit 0)
    if (flags & 0x01) {
      result.balance = data.getUint8(offset)
      offset += 1
    }

    // 踏频 (bit 2)
    if (flags & 0x04) {
      result.cadence = data.getUint16(offset, true)
      offset += 2
    }

    // 扭矩 (bit 4)
    if (flags & 0x10) {
      result.torque = data.getUint16(offset, true) / 32 // 1/32 Nm resolution
      offset += 2
    }

    return result
  }

  /**
   * 解析心率数据 (Heart Rate Measurement)
   * @param data 原始数据
   * @returns 解析后的心率数据
   */
  function parseHeartRateData(data: DataView): {
    heartRate: number
    rrIntervals?: number[]
    energyExpended?: number
    sensorContact?: boolean
  } {
    const flags = data.getUint8(0)
    let offset = 1

    // 心率值
    const is16Bit = flags & 0x01
    const heartRate = is16Bit ? data.getUint16(offset, true) : data.getUint8(offset)
    offset += is16Bit ? 2 : 1

    const result: any = { heartRate }

    // 传感器接触状态 (bit 1-2)
    const contactBits = (flags >> 1) & 0x03
    if (contactBits === 0x03) {
      result.sensorContact = true
    } else if (contactBits === 0x02) {
      result.sensorContact = false
    }

    // 能量消耗 (bit 3)
    if (flags & 0x08) {
      result.energyExpended = data.getUint16(offset, true)
      offset += 2
    }

    // RR间期 (bit 4)
    if (flags & 0x10) {
      const rrIntervals: number[] = []
      while (offset < data.byteLength) {
        const rrInterval = (data.getUint16(offset, true) / 1024) * 1000 // 转换为毫秒
        rrIntervals.push(rrInterval)
        offset += 2
      }
      result.rrIntervals = rrIntervals
    }

    return result
  }

  /**
   * 解析踏频数据 (CSC Measurement)
   * @param data 原始数据
   * @returns 解析后的踏频数据
   */
  function parseCadenceData(data: DataView): {
    crankRevolutions?: number
    crankEventTime?: number
    cadence?: number
  } {
    const flags = data.getUint8(0)
    let offset = 1

    const result: any = {}

    // 跳过车轮转数数据 (bit 0)
    if (flags & 0x01) {
      offset += 6 // 跳过车轮数据
    }

    // 曲柄转数数据 (bit 1)
    if (flags & 0x02) {
      result.crankRevolutions = data.getUint16(offset, true)
      offset += 2
      result.crankEventTime = data.getUint16(offset, true) / 1024 // 转换为秒
      offset += 2
    }

    return result
  }

  /**
   * 解析阻力设备数据 (Indoor Bike Data)
   * @param data 原始数据
   * @returns 解析后的阻力设备数据
   */
  function parseResistanceData(data: DataView): {
    cadence?: number
    power?: number
    resistance?: number
    heartRate?: number
  } {
    const flags = data.getUint16(0, true)
    let offset = 2

    const result: any = {}

    // 跳过速度数据 (bit 0-1)
    if (flags & 0x01) {
      offset += 2
    }
    if (flags & 0x02) {
      offset += 2
    }

    // 瞬时踏频 (bit 2)
    if (flags & 0x04) {
      result.cadence = data.getUint16(offset, true) / 2 // rpm
      offset += 2
    }

    // 平均踏频 (bit 3) - 跳过
    if (flags & 0x08) {
      offset += 2
    }

    // 跳过距离数据 (bit 4)
    if (flags & 0x10) {
      offset += 3 // 24位数据
    }

    // 阻力等级 (bit 5)
    if (flags & 0x20) {
      result.resistance = data.getInt16(offset, true)
      offset += 2
    }

    // 瞬时功率 (bit 6)
    if (flags & 0x40) {
      result.power = data.getInt16(offset, true)
      offset += 2
    }

    // 平均功率 (bit 7) - 跳过
    if (flags & 0x80) {
      offset += 2
    }

    // 心率 (bit 9)
    if (flags & 0x200) {
      result.heartRate = data.getUint8(offset)
      offset += 1
    }

    return result
  }

  /**
   * 开始监听设备数据
   * @param connection 设备连接对象
   */
  async function startDataMonitoring(connection: DeviceConnection): Promise<void> {
    const { deviceType, characteristics } = connection

    try {
      // 根据设备类型订阅相应的特征值
      switch (deviceType) {
        case CyclingDeviceType.TRAINER:
          // 骑行台设备：订阅功率、踏频、阻力
          // 订阅室内自行车数据（主要数据源）
          await subscribeToCharacteristic(connection, 'indoorBikeData', (data) => {
            const trainerData = parseResistanceData(data)
            console.log('trainerData:', trainerData)
            cyclingStore.updateDeviceData(connection.deviceId, {
              trainer: {
                power: trainerData.power,
                cadence: trainerData.cadence,
                resistance: trainerData.resistance,
                crankRevolutions: trainerData.crankRevolutions,
                crankEventTime: trainerData.crankEventTime,
              },
              power: trainerData.power,
              cadence: trainerData.cadence,
              resistance: trainerData.resistance,
              timestamp: Date.now(),
            })
          })

          // 订阅功率测量数据（如果可用）
          await subscribeToCharacteristic(connection, 'powerMeasurement', (data) => {
            const powerData = parsePowerData(data)
            console.log('trainer powerData:', powerData)
            cyclingStore.updateDeviceData(connection.deviceId, {
              power: powerData.power,
              cadence: powerData.cadence,
              timestamp: Date.now(),
            })
          })

          // 订阅踏频数据（如果可用）
          await subscribeToCharacteristic(connection, 'cscMeasurement', (data) => {
            const cadenceData = parseCadenceData(data)
            console.log('trainer cadenceData:', cadenceData)
            cyclingStore.updateDeviceData(connection.deviceId, {
              cadence: cadenceData.cadence,
              timestamp: Date.now(),
            })
          })
          break

        case CyclingDeviceType.POWER_METER:
          // 功率计设备：订阅功率和踏频
          await subscribeToCharacteristic(connection, 'measurement', (data) => {
            const powerData = parsePowerData(data)
            console.log('powerData:', powerData)
            cyclingStore.updateDeviceData(connection.deviceId, {
              powerMeter: {
                power: powerData.power,
                cadence: powerData.cadence,
                crankRevolutions: powerData.crankRevolutions,
                crankEventTime: powerData.crankEventTime,
              },
              power: powerData.power,
              cadence: powerData.cadence,
              timestamp: Date.now(),
            })
          })

          // 订阅踏频数据（如果可用）
          await subscribeToCharacteristic(connection, 'cscMeasurement', (data) => {
            const cadenceData = parseCadenceData(data)
            console.log('power meter cadenceData:', cadenceData)
            cyclingStore.updateDeviceData(connection.deviceId, {
              cadence: cadenceData.cadence,
              timestamp: Date.now(),
            })
          })
          break

        case CyclingDeviceType.HEART_RATE:
          // 订阅心率测量数据
          await subscribeToCharacteristic(connection, 'measurement', (data) => {
            const heartRateData = parseHeartRateData(data)
            cyclingStore.updateDeviceData(connection.deviceId, {
              heartRate: heartRateData.heartRate,
              timestamp: Date.now(),
            })
          })
          break

        case CyclingDeviceType.ELECTRONIC_SHIFTING:
          // 订阅档位信息
          await subscribeToCharacteristic(connection, 'gearPosition', (data) => {
            const gearData = parseShifterData(data)
            cyclingStore.updateDeviceData(connection.deviceId, {
              electronicShifting: {
                frontGear: gearData.frontGear,
                rearGear: gearData.rearGear,
              },
              timestamp: Date.now(),
            })
          })

          // 订阅变速器状态（如果可用）
          await subscribeToCharacteristic(connection, 'shifterStatus', (data) => {
            console.log('变速器状态数据:', data)
          })
          break
      }

      connection.reading = true
      console.log(
        `开始监听设备数据: ${connection.device.name} (${deviceType})，已订阅 ${characteristics.size} 个特征值`,
      )
    } catch (error) {
      console.error('启动数据监听失败:', error)
      throw error
    }
  }

  /**
   * 订阅特征值通知
   * @param connection 设备连接
   * @param characteristicName 特征值名称
   * @param callback 数据回调函数
   */
  async function subscribeToCharacteristic(
    connection: DeviceConnection,
    characteristicName: string,
    callback: (data: DataView) => void,
  ): Promise<void> {
    const characteristic = connection.characteristics.get(characteristicName)

    if (!characteristic) {
      console.warn(`特征值 ${characteristicName} 不存在，跳过订阅`)
      return
    }

    try {
      // 检查特征值是否支持通知
      if (!characteristic.properties.notify) {
        console.warn(`特征值 ${characteristicName} 不支持通知功能`)
        return
      }

      // 添加事件监听器
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic
        if (target.value) {
          callback(target.value)
        }
      })

      // 开始通知
      await characteristic.startNotifications()
      console.log(`成功订阅特征值通知: ${characteristicName}`)
    } catch (error) {
      console.error(`订阅特征值 ${characteristicName} 失败:`, error)
      throw error
    }
  }

  /**
   * 解析电子变速数据 (Shimano Di2)
   * @param data 原始数据
   * @returns 解析后的变速数据
   */
  function parseShifterData(data: DataView): {
    frontGear?: number
    rearGear?: number
    batteryLevel?: number
  } {
    // 这里需要根据具体的Shimano Di2协议实现
    // 由于是自定义协议，需要参考官方文档或逆向工程
    const result: any = {}

    try {
      // 示例解析（需要根据实际协议调整）
      if (data.byteLength >= 2) {
        result.frontGear = data.getUint8(0)
        result.rearGear = data.getUint8(1)
      }

      if (data.byteLength >= 3) {
        result.batteryLevel = data.getUint8(2)
      }
    } catch (error) {
      console.error('解析电子变速数据失败:', error)
    }

    return result
  }

  /**
   * 扫描指定类型的蓝牙设备
   * @param deviceType 设备类型
   */
  async function scanDevices(deviceType: CyclingDeviceType): Promise<void> {
    if (!isSupported.value) {
      throw new Error('浏览器不支持Web Bluetooth API')
    }

    if (isScanning.value) {
      throw new Error('正在扫描中，请稍候')
    }

    try {
      isScanning.value = true
      error.value = null

      const serviceConfig = BLUETOOTH_SERVICES[deviceType]
      if (!serviceConfig) {
        throw new Error(`不支持的设备类型: ${deviceType}`)
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: serviceConfig.filters,
        optionalServices: [serviceConfig.service],
      })

      if (device) {
        const discoveredDevice: DiscoveredDevice = {
          id: device.id,
          name: device.name || '未知设备',
          type: deviceType,
          device,
          paired: false,
        }

        // 检查是否已经发现过该设备
        const existingIndex = discoveredDevices.value.findIndex((d) => d.id === device.id)
        if (existingIndex >= 0) {
          discoveredDevices.value[existingIndex] = discoveredDevice
        } else {
          discoveredDevices.value.push(discoveredDevice)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '扫描设备失败'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isScanning.value = false
    }
  }

  /**
   * 扫描多种类型的蓝牙设备
   * @param deviceTypes 设备类型数组
   */
  async function scanMultipleDevices(deviceTypes: CyclingDeviceType[]): Promise<void> {
    if (!isSupported.value) {
      throw new Error('浏览器不支持Web Bluetooth API')
    }

    if (isScanning.value) {
      throw new Error('正在扫描中，请稍候')
    }

    if (deviceTypes.length === 0) {
      throw new Error('请至少选择一种设备类型')
    }

    try {
      isScanning.value = true
      error.value = null

      // 收集所有设备类型的服务和过滤器
      const allServices: string[] = []
      const allFilters: BluetoothLEScanFilter[] = []
      const serviceToTypeMap = new Map<string, CyclingDeviceType>()

      for (const deviceType of deviceTypes) {
        const serviceConfig = BLUETOOTH_SERVICES[deviceType]
        if (serviceConfig) {
          allServices.push(serviceConfig.service)
          allFilters.push(...serviceConfig.filters)
          serviceToTypeMap.set(serviceConfig.service, deviceType)
        }
      }

      // 使用合并的过滤器扫描设备
      const device = await navigator.bluetooth.requestDevice({
        filters: allFilters,
        optionalServices: allServices,
      })

      if (device && device.gatt) {
        // 连接到设备以检查支持的服务
        const server = await device.gatt.connect()
        let detectedType: CyclingDeviceType | null = null

        // 检查设备支持哪些服务来确定设备类型
        for (const [serviceUuid, deviceType] of serviceToTypeMap) {
          try {
            await server.getPrimaryService(serviceUuid)
            detectedType = deviceType
            break
          } catch {
            // 设备不支持此服务，继续检查下一个
            continue
          }
        }

        // 断开临时连接
        server.disconnect()

        if (detectedType) {
          const discoveredDevice: DiscoveredDevice = {
            id: device.id,
            name: device.name || '未知设备',
            type: detectedType,
            device,
            paired: false,
          }

          // 检查是否已经发现过该设备
          const existingIndex = discoveredDevices.value.findIndex((d) => d.id === device.id)
          if (existingIndex >= 0) {
            discoveredDevices.value[existingIndex] = discoveredDevice
          } else {
            discoveredDevices.value.push(discoveredDevice)
          }
        } else {
          throw new Error('设备不支持任何选定的服务类型')
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '扫描设备失败'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isScanning.value = false
    }
  }

  /**
   * 智能设备发现 - 自动检测设备类型
   * @param deviceTypes 要扫描的设备类型数组
   */
  async function smartDeviceDiscovery(
    deviceTypes: CyclingDeviceType[],
  ): Promise<DiscoveredDevice[]> {
    if (!isSupported.value) {
      throw new Error('浏览器不支持Web Bluetooth API')
    }

    if (deviceTypes.length === 0) {
      throw new Error('请至少选择一种设备类型')
    }

    const discoveredDevicesList: DiscoveredDevice[] = []

    try {
      isScanning.value = true
      error.value = null

      // 收集所有设备类型的服务
      const allServices: string[] = []
      const serviceToTypeMap = new Map<string, CyclingDeviceType>()

      for (const deviceType of deviceTypes) {
        const serviceConfig = BLUETOOTH_SERVICES[deviceType]
        if (serviceConfig) {
          allServices.push(serviceConfig.service)
          serviceToTypeMap.set(serviceConfig.service, deviceType)
        }
      }

      // 创建通用过滤器，允许发现任何支持这些服务的设备
      const filters: BluetoothLEScanFilter[] = [{ services: allServices }]

      // 扫描设备
      const device = await navigator.bluetooth.requestDevice({
        filters,
        optionalServices: allServices,
      })

      if (device && device.gatt) {
        // 连接到设备以检查支持的服务
        const server = await device.gatt.connect()
        const supportedTypes: CyclingDeviceType[] = []

        // 检查设备支持哪些服务
        for (const [serviceUuid, deviceType] of serviceToTypeMap) {
          try {
            await server.getPrimaryService(serviceUuid)
            supportedTypes.push(deviceType)
          } catch {
            // 设备不支持此服务
            continue
          }
        }

        // 断开临时连接
        server.disconnect()

        // 为每个支持的服务类型创建设备条目
        for (const deviceType of supportedTypes) {
          const discoveredDevice: DiscoveredDevice = {
            id: `${device.id}_${deviceType}`,
            name: device.name || '未知设备',
            type: deviceType,
            device,
            paired: false,
          }

          discoveredDevicesList.push(discoveredDevice)

          // 添加到全局发现设备列表
          const existingIndex = discoveredDevices.value.findIndex(
            (d) => d.id === discoveredDevice.id,
          )
          if (existingIndex >= 0) {
            discoveredDevices.value[existingIndex] = discoveredDevice
          } else {
            discoveredDevices.value.push(discoveredDevice)
          }
        }
      }

      return discoveredDevicesList
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '智能设备发现失败'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isScanning.value = false
    }
  }

  /**
   * 连接设备
   * @param deviceId 设备ID
   * @param retryCount 重试次数
   */
  async function connectDevice(deviceId: string, retryCount: number = 3): Promise<void> {
    const discoveredDevice = discoveredDevices.value.find((d) => d.id === deviceId)
    if (!discoveredDevice) {
      throw new Error('Connection Error: 设备未找到，请重新扫描设备')
    }

    if (deviceConnections.value.has(deviceId)) {
      throw new Error('Connection Error: 设备已连接')
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        error.value = null
        const { device, type: deviceType } = discoveredDevice
        const serviceConfig = BLUETOOTH_SERVICES[deviceType]

        console.log(`尝试连接设备 ${device.name} (第${attempt}次尝试)`)

        // 检查设备是否仍然可用
        if (!device.gatt) {
          throw new Error('Connection Error: 设备GATT接口不可用')
        }

        // 设置连接超时
        const connectPromise = device.gatt.connect()
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Connection Error: 连接超时，请确保设备处于可连接状态')),
            10000,
          )
        })

        // 连接GATT服务器（带超时）
        const server = await Promise.race([connectPromise, timeoutPromise])
        if (!server) {
          throw new Error('Connection Error: 无法连接到设备GATT服务器')
        }

        console.log(`成功连接到GATT服务器: ${device.name}`)

        // 获取主服务
        let service: BluetoothRemoteGATTService
        try {
          service = await server.getPrimaryService(serviceConfig.service)
        } catch (err) {
          throw new Error(
            `Connection Error: 无法获取设备服务 ${serviceConfig.service}，设备可能不支持此服务类型`,
          )
        }

        // 获取特征值
        const characteristics = new Map<string, BluetoothRemoteGATTCharacteristic>()
        const characteristicErrors: string[] = []

        // 获取主服务的特征值
        for (const [name, uuid] of Object.entries(serviceConfig.characteristics)) {
          try {
            const characteristic = await service.getCharacteristic(uuid)
            characteristics.set(name, characteristic)
            console.log(`成功获取特征值 ${name}: ${uuid}`)
          } catch (err) {
            const errorMsg = `无法获取特征值 ${name} (${uuid}): ${err instanceof Error ? err.message : '未知错误'}`
            characteristicErrors.push(errorMsg)
            console.warn(errorMsg)
          }
        }

        // 尝试获取电池服务和特征值
        try {
          const batteryService = await server.getPrimaryService(
            '0000180f-0000-1000-8000-00805f9b34fb',
          )
          try {
            const batteryCharacteristic = await batteryService.getCharacteristic(
              '00002a19-0000-1000-8000-00805f9b34fb',
            )
            characteristics.set('batteryLevel', batteryCharacteristic)
            console.log('成功获取电池电量特征值')
          } catch (err) {
            console.warn('无法获取电池电量特征值:', err)
          }
        } catch (err) {
          console.debug('设备不支持电池服务:', err)
        }

        // 检查是否获取到了必要的特征值
        if (characteristics.size === 0) {
          throw new Error(
            `Connection Error: 无法获取任何特征值，设备可能不兼容。错误详情: ${characteristicErrors.join('; ')}`,
          )
        }

        // 创建连接对象
        const connection: DeviceConnection = {
          deviceId,
          deviceType,
          device,
          server,
          service,
          characteristics,
          connected: true,
          reading: false,
        }

        deviceConnections.value.set(deviceId, connection)

        // 更新cycling store中的设备信息
        const deviceInfo: DeviceInfo = {
          id: deviceId,
          name: discoveredDevice.name,
          type: deviceType,
          connected: true,
          lastConnected: new Date(),
        }
        cyclingStore.connectDevice(deviceInfo)

        // 标记设备为已配对
        discoveredDevice.paired = true

        // 监听设备断开事件
        device.addEventListener('gattserverdisconnected', () => {
          handleDeviceDisconnected(deviceId)
        })

        // 开始监听设备数据
        await startDataMonitoring(connection)

        console.log(`设备连接成功: ${device.name} (${deviceType})`)
        return // 连接成功，退出重试循环
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('未知连接错误')
        console.warn(`连接尝试 ${attempt} 失败:`, lastError.message)

        // 如果不是最后一次尝试，等待一段时间后重试
        if (attempt < retryCount) {
          console.log(`等待 ${attempt * 1000}ms 后重试...`)
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
        }
      }
    }

    // 所有重试都失败了
    const finalError = lastError || new Error('Connection Error: 连接失败')
    const errorMessage = finalError.message.startsWith('Connection Error:')
      ? finalError.message
      : `Connection Error: ${finalError.message}`

    error.value = errorMessage
    console.error(`设备连接最终失败 (${retryCount}次尝试):`, errorMessage)
    throw new Error(errorMessage)
  }

  /**
   * 断开设备连接
   * @param deviceId 设备ID
   */
  async function disconnectDevice(deviceId: string): Promise<void> {
    const connection = deviceConnections.value.get(deviceId)
    if (!connection) {
      return
    }

    try {
      // 停止数据读取
      if (connection.reading) {
        await stopReading(deviceId)
      }

      // 断开GATT连接
      if (connection.server?.connected) {
        connection.server.disconnect()
      }

      // 移除连接
      deviceConnections.value.delete(deviceId)

      // 更新cycling store
      cyclingStore.disconnectDevice(deviceId)
    } catch (err) {
      console.error('断开设备连接失败:', err)
    }
  }

  /**
   * 处理设备意外断开
   * @param deviceId 设备ID
   */
  function handleDeviceDisconnected(deviceId: string): void {
    const connection = deviceConnections.value.get(deviceId)
    if (connection) {
      connection.connected = false
      connection.reading = false
      deviceConnections.value.delete(deviceId)
      cyclingStore.disconnectDevice(deviceId)
    }
  }

  /**
   * 开始读取设备数据
   * @param deviceId 设备ID
   */
  async function startReading(deviceId: string): Promise<void> {
    const connection = deviceConnections.value.get(deviceId)
    if (!connection || !connection.connected) {
      throw new Error('设备未连接')
    }

    if (connection.reading) {
      return
    }

    try {
      // 使用新的数据监听方法
      await startDataMonitoring(connection)
    } catch (err) {
      connection.reading = false
      const errorMessage = err instanceof Error ? err.message : '开始读取数据失败'
      error.value = errorMessage
      throw new Error(errorMessage)
    }
  }

  /**
   * 停止读取设备数据
   * @param deviceId 设备ID
   */
  async function stopReading(deviceId: string): Promise<void> {
    const connection = deviceConnections.value.get(deviceId)
    if (!connection || !connection.reading) {
      return
    }

    try {
      // 停止所有特征值的通知
      for (const characteristic of connection.characteristics.values()) {
        try {
          await characteristic.stopNotifications()
        } catch (err) {
          console.warn('停止特征值通知失败:', err)
        }
      }

      connection.reading = false
    } catch (err) {
      console.error('停止读取数据失败:', err)
    }
  }

  /**
   * 清除已发现的设备列表
   */
  function clearDiscoveredDevices(): void {
    discoveredDevices.value = []
  }

  /**
   * 断开所有设备
   */
  async function disconnectAllDevices(): Promise<void> {
    const deviceIds = Array.from(deviceConnections.value.keys())
    await Promise.all(deviceIds.map((id) => disconnectDevice(id)))
  }

  /**
   * 检查设备是否已连接
   */
  function isDeviceConnected(deviceId: string): boolean {
    const connection = deviceConnections.value[deviceId]
    if (!connection || !connection.device.gatt) {
      return false
    }
    return connection.device.gatt.connected
  }

  // 初始化
  initialize()

  /**
   * 控制阻力设备功率目标
   * @param deviceId 设备ID
   * @param power 功率目标 (瓦特)
   */
  async function setResistancePower(deviceId: string, power: number): Promise<void> {
    const connection = deviceConnections.value.get(deviceId)
    if (!connection || connection.deviceType !== CyclingDeviceType.TRAINER) {
      throw new Error('设备未连接或不是骑行台设备')
    }

    const controlPoint = connection.characteristics.get('fitnessMachineControlPoint')
    if (!controlPoint) {
      throw new Error('设备不支持功率控制')
    }

    try {
      // 构建功率控制指令
      const command = new Uint8Array(3)
      command[0] = 0x05 // Set Target Power
      command[1] = power & 0xff
      command[2] = (power >> 8) & 0xff

      await controlPoint.writeValue(command)
      console.log(`设置骑行台功率目标: ${power}W`)
    } catch (error) {
      console.error('设置功率目标失败:', error)
      throw error
    }
  }

  /**
   * 控制电子变速 (Shimano Di2)
   * @param deviceId 设备ID
   * @param direction 变速方向 ('up' | 'down')
   * @param derailleur 变速器 ('front' | 'rear')
   */
  async function shiftGear(
    deviceId: string,
    direction: 'up' | 'down',
    derailleur: 'front' | 'rear',
  ): Promise<void> {
    const connection = deviceConnections.value.get(deviceId)
    if (!connection || connection.deviceType !== CyclingDeviceType.ELECTRONIC_SHIFTING) {
      throw new Error('设备未连接或不是电子变速设备')
    }

    const shifterControl = connection.characteristics.get('shifterControl')
    if (!shifterControl) {
      throw new Error('设备不支持变速控制')
    }

    try {
      // 构建变速控制指令 (需要根据具体协议实现)
      const command = new Uint8Array(2)
      command[0] = derailleur === 'front' ? 0x01 : 0x02
      command[1] = direction === 'up' ? 0x01 : 0x02

      await shifterControl.writeValue(command)
      console.log(`电子变速: ${derailleur} ${direction}`)
    } catch (error) {
      console.error('变速控制失败:', error)
      throw error
    }
  }

  /**
   * 校准功率计
   * @param deviceId 设备ID
   */
  async function calibratePowerMeter(deviceId: string): Promise<void> {
    const connection = deviceConnections.value.get(deviceId)
    if (!connection || connection.deviceType !== CyclingDeviceType.POWER_METER) {
      throw new Error('设备未连接或不是功率计设备')
    }

    const controlPoint = connection.characteristics.get('controlPoint')
    if (!controlPoint) {
      throw new Error('设备不支持校准功能')
    }

    try {
      // 发送校准指令
      const command = new Uint8Array([0x01]) // Request Calibration
      await controlPoint.writeValue(command)
      console.log('开始功率计校准')
    } catch (error) {
      console.error('功率计校准失败:', error)
      throw error
    }
  }

  /**
   * 重置设备数据
   * @param deviceId 设备ID
   */
  async function resetDeviceData(deviceId: string): Promise<void> {
    const connection = deviceConnections.value.get(deviceId)
    if (!connection) {
      throw new Error('设备未连接')
    }

    // 根据设备类型执行相应的重置操作
    switch (connection.deviceType) {
      case CyclingDeviceType.TRAINER:
        // 尝试重置健身机器控制点
        const fitnessMachineControlPoint = connection.characteristics.get('fitnessMachineControlPoint')
        if (fitnessMachineControlPoint) {
          const command = new Uint8Array([0x01]) // Reset
          await fitnessMachineControlPoint.writeValue(command)
        }
        
        // 尝试重置踏频控制点
        const cscControlPoint = connection.characteristics.get('controlPoint')
        if (cscControlPoint) {
          const command = new Uint8Array([0x01]) // Set Cumulative Value
          await cscControlPoint.writeValue(command)
        }
        break
    }

    console.log(`重置设备数据: ${connection.device.name}`)
  }

  return {
    // 状态
    isSupported,
    isScanning,
    discoveredDevices,
    deviceConnections,
    error,

    // 计算属性
    connectedDevices,
    isConnected,

    // 方法
    initialize,
    scanDevices,
    scanMultipleDevices,
    smartDeviceDiscovery,
    connectDevice,
    disconnectDevice,
    startReading,
    stopReading,
    clearDiscoveredDevices,
    disconnectAllDevices,
    isDeviceConnected,
    readDeviceInformation,
    identifyDeviceType,

    // 设备控制方法
    setResistancePower,
    shiftGear,
    calibratePowerMeter,
    resetDeviceData,
  }
})
