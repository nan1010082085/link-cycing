/**
 * Web Bluetooth API TypeScript 类型声明
 * 为了确保在所有环境中都能正确使用Web Bluetooth API
 */

// 扩展Navigator接口
interface Navigator {
  bluetooth: Bluetooth
}

// 蓝牙主接口
interface Bluetooth extends EventTarget {
  getAvailability(): Promise<boolean>
  getDevices(): Promise<BluetoothDevice[]>
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>
  addEventListener(
    type: 'availabilitychanged',
    listener: (this: this, ev: Event) => any,
    useCapture?: boolean
  ): void
}

// 设备请求选项
interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[]
  optionalServices?: BluetoothServiceUUID[]
  acceptAllDevices?: boolean
}

// 蓝牙扫描过滤器
interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[]
  name?: string
  namePrefix?: string
  manufacturerData?: BluetoothManufacturerDataFilter[]
  serviceData?: BluetoothServiceDataFilter[]
}

// 制造商数据过滤器
interface BluetoothManufacturerDataFilter {
  companyIdentifier: number
  dataPrefix?: BufferSource
  mask?: BufferSource
}

// 服务数据过滤器
interface BluetoothServiceDataFilter {
  service: BluetoothServiceUUID
  dataPrefix?: BufferSource
  mask?: BufferSource
}

// 蓝牙设备
interface BluetoothDevice extends EventTarget {
  readonly id: string
  readonly name?: string
  readonly gatt?: BluetoothRemoteGATTServer
  forget(): Promise<void>
  watchAdvertisements(options?: WatchAdvertisementsOptions): Promise<void>
  unwatchAdvertisements(): void
  readonly watchingAdvertisements: boolean
  addEventListener(
    type: 'gattserverdisconnected' | 'advertisementreceived',
    listener: (this: this, ev: Event) => any,
    useCapture?: boolean
  ): void
}

// 广告监听选项
interface WatchAdvertisementsOptions {
  signal?: AbortSignal
}

// GATT服务器
interface BluetoothRemoteGATTServer {
  readonly device: BluetoothDevice
  readonly connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>
  getPrimaryServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>
}

// GATT服务
interface BluetoothRemoteGATTService extends EventTarget {
  readonly device: BluetoothDevice
  readonly uuid: string
  readonly isPrimary: boolean
  getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics(characteristic?: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic[]>
  getIncludedService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>
  getIncludedServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>
  addEventListener(
    type: 'serviceadded' | 'servicechanged' | 'serviceremoved',
    listener: (this: this, ev: Event) => any,
    useCapture?: boolean
  ): void
}

// GATT特征值
interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  readonly service: BluetoothRemoteGATTService
  readonly uuid: string
  readonly properties: BluetoothCharacteristicProperties
  readonly value?: DataView
  getDescriptor(descriptor: BluetoothDescriptorUUID): Promise<BluetoothRemoteGATTDescriptor>
  getDescriptors(descriptor?: BluetoothDescriptorUUID): Promise<BluetoothRemoteGATTDescriptor[]>
  readValue(): Promise<DataView>
  writeValue(value: BufferSource): Promise<void>
  writeValueWithoutResponse(value: BufferSource): Promise<void>
  writeValueWithResponse(value: BufferSource): Promise<void>
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  addEventListener(
    type: 'characteristicvaluechanged',
    listener: (this: this, ev: Event) => any,
    useCapture?: boolean
  ): void
}

// 特征值属性
interface BluetoothCharacteristicProperties {
  readonly broadcast: boolean
  readonly read: boolean
  readonly writeWithoutResponse: boolean
  readonly write: boolean
  readonly notify: boolean
  readonly indicate: boolean
  readonly authenticatedSignedWrites: boolean
  readonly reliableWrite: boolean
  readonly writableAuxiliaries: boolean
}

// GATT描述符
interface BluetoothRemoteGATTDescriptor {
  readonly characteristic: BluetoothRemoteGATTCharacteristic
  readonly uuid: string
  readonly value?: DataView
  readValue(): Promise<DataView>
  writeValue(value: BufferSource): Promise<void>
}

// UUID类型
type BluetoothServiceUUID = number | string
type BluetoothCharacteristicUUID = number | string
type BluetoothDescriptorUUID = number | string

// 标准蓝牙服务UUID
declare const BluetoothUUID: {
  getService(name: string | number): string
  getCharacteristic(name: string | number): string
  getDescriptor(name: string | number): string
  canonicalUUID(alias: number): string
}

// 广告事件
interface BluetoothAdvertisingEvent extends Event {
  readonly device: BluetoothDevice
  readonly uuids: string[]
  readonly name?: string
  readonly appearance?: number
  readonly txPower?: number
  readonly rssi?: number
  readonly manufacturerData: Map<number, DataView>
  readonly serviceData: Map<string, DataView>
}

// 权限API扩展
interface PermissionDescriptor {
  name: 'bluetooth'
}

// 常用的蓝牙服务UUID常量
export const BLUETOOTH_SERVICES = {
  // 通用服务
  GENERIC_ACCESS: '00001800-0000-1000-8000-00805f9b34fb',
  GENERIC_ATTRIBUTE: '00001801-0000-1000-8000-00805f9b34fb',
  DEVICE_INFORMATION: '0000180a-0000-1000-8000-00805f9b34fb',
  BATTERY_SERVICE: '0000180f-0000-1000-8000-00805f9b34fb',
  
  // 健康相关服务
  HEART_RATE: '0000180d-0000-1000-8000-00805f9b34fb',
  BLOOD_PRESSURE: '00001810-0000-1000-8000-00805f9b34fb',
  HEALTH_THERMOMETER: '00001809-0000-1000-8000-00805f9b34fb',
  
  // 运动相关服务
  CYCLING_SPEED_AND_CADENCE: '00001816-0000-1000-8000-00805f9b34fb',
  CYCLING_POWER: '00001818-0000-1000-8000-00805f9b34fb',
  RUNNING_SPEED_AND_CADENCE: '00001814-0000-1000-8000-00805f9b34fb',
  
  // 其他常用服务
  HUMAN_INTERFACE_DEVICE: '00001812-0000-1000-8000-00805f9b34fb',
  LOCATION_AND_NAVIGATION: '00001819-0000-1000-8000-00805f9b34fb'
} as const

// 常用的蓝牙特征值UUID常量
export const BLUETOOTH_CHARACTERISTICS = {
  // 通用特征值
  DEVICE_NAME: '00002a00-0000-1000-8000-00805f9b34fb',
  APPEARANCE: '00002a01-0000-1000-8000-00805f9b34fb',
  BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',
  
  // 心率相关
  HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
  HEART_RATE_CONTROL_POINT: '00002a39-0000-1000-8000-00805f9b34fb',
  
  // 骑行相关
  CSC_MEASUREMENT: '00002a5b-0000-1000-8000-00805f9b34fb',
  CSC_FEATURE: '00002a5c-0000-1000-8000-00805f9b34fb',
  CYCLING_POWER_MEASUREMENT: '00002a63-0000-1000-8000-00805f9b34fb',
  CYCLING_POWER_FEATURE: '00002a65-0000-1000-8000-00805f9b34fb',
  
  // 跑步相关
  RSC_MEASUREMENT: '00002a53-0000-1000-8000-00805f9b34fb',
  RSC_FEATURE: '00002a54-0000-1000-8000-00805f9b34fb'
} as const

// 导出类型
export type {
  Bluetooth,
  BluetoothDevice,
  BluetoothRemoteGATTServer,
  BluetoothRemoteGATTService,
  BluetoothRemoteGATTCharacteristic,
  BluetoothRemoteGATTDescriptor,
  BluetoothCharacteristicProperties,
  BluetoothLEScanFilter,
  RequestDeviceOptions,
  BluetoothServiceUUID,
  BluetoothCharacteristicUUID,
  BluetoothDescriptorUUID,
  BluetoothAdvertisingEvent
}