import { FitWriter } from '@markw65/fit-file-writer'
import type { RidingSession, RidingDataPoint } from '../stores/cycling'
import dayjs from 'dayjs'

/**
 * FIT文件导出器
 */
export class FitExporter {
  private fitWriter: FitWriter
  
  constructor() {
    this.fitWriter = new FitWriter()
  }
  
  /**
   * 将骑行会话导出为FIT文件
   * @param session 骑行会话数据
   * @param options 导出选项
   */
  async exportSession(
    session: RidingSession,
    options: {
      manufacturer?: string
      product?: string
      serialNumber?: number
      includeGPS?: boolean
      defaultLat?: number
      defaultLng?: number
    } = {}
  ): Promise<Uint8Array> {
    try {
      // 重置FIT写入器
      this.fitWriter = new FitWriter()
      
      const {
        manufacturer = 'development',
        product = 'Link Cycling',
        serialNumber = 0x12345678,
        includeGPS = false,
        defaultLat = 39.9042, // 北京坐标
        defaultLng = 116.4074
      } = options
      
      const startTime = session.startTime
      const endTime = session.endTime || new Date()
      const start = this.fitWriter.time(startTime)
      const totalTimerTime = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
      
      // 写入文件ID消息
      this.fitWriter.writeMessage(
        'file_id',
        {
          type: 'activity',
          manufacturer: 'development' as any,
          product: 0,
          serial_number: serialNumber,
          time_created: start,
          product_name: product
        },
        null,
        true
      )
      
      // 写入活动消息
      this.fitWriter.writeMessage(
        'activity',
        {
          total_timer_time: totalTimerTime,
          num_sessions: 1,
          type: 'manual',
          timestamp: start,
          local_timestamp: start - startTime.getTimezoneOffset() * 60
        },
        null,
        true
      )
      
      // 写入会话消息
      const sessionMessage: any = {
        timestamp: start,
        start_time: start,
        total_elapsed_time: totalTimerTime,
        total_timer_time: totalTimerTime,
        sport: 'cycling',
        sub_sport: 'indoor_cycling',
        first_lap_index: 0,
        num_laps: 1
      }
      
      // 添加统计数据
      if (session.stats.totalDistance && session.stats.totalDistance > 0) {
        sessionMessage.total_distance = session.stats.totalDistance * 1000 // 转换为米
      }
      
      if (session.stats.avgResistance && session.stats.avgResistance > 0) {
        sessionMessage.avg_resistance = session.stats.avgResistance
      }
      
      if (session.stats.maxResistance && session.stats.maxResistance > 0) {
        sessionMessage.max_resistance = session.stats.maxResistance
      }
      
      if (session.stats.avgPower) {
        sessionMessage.avg_power = Math.round(session.stats.avgPower)
      }
      
      if (session.stats.maxPower) {
        sessionMessage.max_power = Math.round(session.stats.maxPower)
      }
      
      if (session.stats.avgHeartRate) {
        sessionMessage.avg_heart_rate = Math.round(session.stats.avgHeartRate)
      }
      
      if (session.stats.maxHeartRate) {
        sessionMessage.max_heart_rate = Math.round(session.stats.maxHeartRate)
      }
      
      if (session.stats.avgCadence) {
        sessionMessage.avg_cadence = Math.round(session.stats.avgCadence)
      }
      
      this.fitWriter.writeMessage('session', sessionMessage, null, true)
      
      // 写入圈数消息
      const lapMessage: any = {
        timestamp: start,
        start_time: start,
        total_elapsed_time: totalTimerTime,
        total_timer_time: totalTimerTime,
        lap_trigger: 'manual'
      }
      
      // 复制会话统计到圈数
      Object.assign(lapMessage, {
        total_distance: sessionMessage.total_distance,
        avg_resistance: sessionMessage.avg_resistance,
        max_resistance: sessionMessage.max_resistance,
        avg_power: sessionMessage.avg_power,
        max_power: sessionMessage.max_power,
        avg_heart_rate: sessionMessage.avg_heart_rate,
        max_heart_rate: sessionMessage.max_heart_rate,
        avg_cadence: sessionMessage.avg_cadence
      })
      
      this.fitWriter.writeMessage('lap', lapMessage, null, true)
      
      // 写入记录消息（数据点）
      let cumulativeDistance = 0
      
      for (let i = 0; i < session.dataPoints.length; i++) {
        const point = session.dataPoints[i]
        const timestamp = this.fitWriter.time(new Date(point.timestamp))
        
        const recordMessage: any = {
          timestamp
        }
        
        // 添加阻力
        if (point.resistance !== undefined) {
          recordMessage.resistance = point.resistance
        }
        
        // 添加距离
        if (point.distance !== undefined) {
          cumulativeDistance = point.distance * 1000 // 转换为米
          recordMessage.distance = cumulativeDistance
        }
        
        // 添加功率
        if (point.power !== undefined) {
          recordMessage.power = Math.round(point.power)
        }
        
        // 添加踏频
        if (point.cadence !== undefined) {
          recordMessage.cadence = Math.round(point.cadence)
        }
        
        // 添加心率
        if (point.heartRate !== undefined) {
          recordMessage.heart_rate = Math.round(point.heartRate)
        }
        
        // 添加GPS坐标（如果启用）
        if (includeGPS) {
          recordMessage.position_lat = this.fitWriter.latlng(defaultLat * Math.PI / 180)
          recordMessage.position_long = this.fitWriter.latlng(defaultLng * Math.PI / 180)
        }
        
        // 添加温度（可选）
        recordMessage.temperature = 25 // 默认25°C
        
        // 判断是否为最后一条记录
        const isLastRecord = i === session.dataPoints.length - 1
        
        this.fitWriter.writeMessage('record', recordMessage, null, isLastRecord)
      }
      
      // 完成FIT文件写入
      const fitData = this.fitWriter.finish()
      
      console.log(`Generated FIT file with ${session.dataPoints.length} records`)
      return new Uint8Array(fitData.buffer, fitData.byteOffset, fitData.byteLength)
    } catch (error) {
      console.error('Failed to export FIT file:', error)
      throw error
    }
  }
  
  /**
   * 下载FIT文件
   * @param session 骑行会话
   * @param filename 文件名（可选）
   * @param options 导出选项
   */
  async downloadFitFile(
    session: RidingSession,
    filename?: string,
    options?: Parameters<typeof this.exportSession>[1]
  ): Promise<void> {
    try {
      const fitData = await this.exportSession(session, options)
      
      // 生成文件名
      const defaultFilename = `cycling_${dayjs(session.startTime).format('YYYY-MM-DD_HH-mm-ss')}.fit`
      const finalFilename = filename || defaultFilename
      
      // 创建下载链接
      const blob = new Blob([fitData], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      
      // 创建临时下载链接
      const link = document.createElement('a')
      link.href = url
      link.download = finalFilename
      link.style.display = 'none'
      
      // 触发下载
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 清理URL对象
      URL.revokeObjectURL(url)
      
      console.log(`Downloaded FIT file: ${finalFilename}`)
    } catch (error) {
      console.error('Failed to download FIT file:', error)
      throw error
    }
  }
  
  /**
   * 批量导出多个会话为FIT文件
   * @param sessions 会话列表
   * @param options 导出选项
   */
  async exportMultipleSessions(
    sessions: RidingSession[],
    options?: Parameters<typeof this.exportSession>[1]
  ): Promise<{ filename: string; data: Uint8Array }[]> {
    try {
      const results = []
      
      for (const session of sessions) {
        const fitData = await this.exportSession(session, options)
        const filename = `cycling_${dayjs(session.startTime).format('YYYY-MM-DD_HH-mm-ss')}.fit`
        
        results.push({
          filename,
          data: fitData
        })
      }
      
      return results
    } catch (error) {
      console.error('Failed to export multiple sessions:', error)
      throw error
    }
  }
  
  /**
   * 验证会话数据是否适合导出
   * @param session 骑行会话
   */
  validateSession(session: RidingSession): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    // 检查必需字段
    if (!session.startTime) {
      errors.push('Missing start time')
    }
    
    if (!session.dataPoints || session.dataPoints.length === 0) {
      errors.push('No data points found')
    }
    
    // 检查数据质量
    if (session.dataPoints && session.dataPoints.length > 0) {
      const hasResistance = session.dataPoints.some(p => p.resistance !== undefined)
      const hasPower = session.dataPoints.some(p => p.power !== undefined)
      const hasHeartRate = session.dataPoints.some(p => p.heartRate !== undefined)
      const hasCadence = session.dataPoints.some(p => p.cadence !== undefined)
      
      if (!hasResistance && !hasPower && !hasHeartRate && !hasCadence) {
        warnings.push('No meaningful sensor data found')
      }
      
      if (session.dataPoints.length < 10) {
        warnings.push('Very few data points (less than 10)')
      }
      
      // 检查时间间隔
      const timeSpan = session.endTime 
        ? session.endTime.getTime() - session.startTime.getTime()
        : Date.now() - session.startTime.getTime()
      
      if (timeSpan < 60000) { // 少于1分钟
        warnings.push('Very short session (less than 1 minute)')
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}

// 导出单例实例
export const fitExporter = new FitExporter()