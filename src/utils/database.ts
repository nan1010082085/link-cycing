import Dexie, { type Table } from 'dexie'
import type { RidingSession, RidingDataPoint } from '../stores/cycling'
import dayjs from 'dayjs'

/**
 * 骑行数据库表结构
 */
export interface RidingSessionRecord extends RidingSession {
  /** 数据库主键 */
  dbId?: number
  /** 创建时间 */
  createdAt: Date
  /** 过期时间 */
  expiresAt: Date
}

/**
 * 骑行数据点记录
 */
export interface RidingDataRecord extends RidingDataPoint {
  /** 数据库主键 */
  dbId?: number
  /** 所属会话ID */
  sessionId: string
  /** 创建时间 */
  createdAt: Date
}

/**
 * 骑行数据库类
 */
class CyclingDatabase extends Dexie {
  // 骑行会话表
  sessions!: Table<RidingSessionRecord>
  
  // 骑行数据点表（用于大量数据的独立存储）
  dataPoints!: Table<RidingDataRecord>

  constructor() {
    super('CyclingDatabase')
    
    this.version(1).stores({
      sessions: '++dbId, id, startTime, endTime, createdAt, expiresAt',
      dataPoints: '++dbId, sessionId, timestamp, createdAt'
    })
  }
}

// 创建数据库实例
const db = new CyclingDatabase()

/**
 * 数据库管理工具类
 */
export class CyclingDataManager {
  private static instance: CyclingDataManager
  private db: CyclingDatabase
  
  private constructor() {
    this.db = db
  }
  
  /**
   * 获取单例实例
   */
  static getInstance(): CyclingDataManager {
    if (!CyclingDataManager.instance) {
      CyclingDataManager.instance = new CyclingDataManager()
    }
    return CyclingDataManager.instance
  }
  
  /**
   * 保存骑行会话
   * @param session 骑行会话数据
   * @param expirationDays 过期天数，默认30天
   */
  async saveSession(session: RidingSession, expirationDays: number = 30): Promise<number> {
    try {
      const now = new Date()
      const expiresAt = dayjs(now).add(expirationDays, 'day').toDate()
      
      const sessionRecord: RidingSessionRecord = {
        ...session,
        createdAt: now,
        expiresAt
      }
      
      // 保存会话基本信息（不包含大量数据点）
      const sessionToSave: Partial<RidingSessionRecord> = { ...sessionRecord }
      sessionToSave.dataPoints = undefined // 数据点单独存储
      
      const sessionId = await this.db.sessions.add(sessionToSave as RidingSessionRecord)
      
      // 批量保存数据点
      if (session.dataPoints && session.dataPoints.length > 0) {
        const dataPointRecords: RidingDataRecord[] = session.dataPoints.map(point => ({
          ...point,
          sessionId: session.id,
          createdAt: now
        }))
        
        await this.db.dataPoints.bulkAdd(dataPointRecords)
      }
      
      console.log(`Saved riding session: ${session.id} with ${session.dataPoints?.length || 0} data points`)
      return sessionId
    } catch (error) {
      console.error('Failed to save riding session:', error)
      throw error
    }
  }
  
  /**
   * 获取骑行会话列表
   * @param limit 限制数量
   * @param offset 偏移量
   */
  async getSessions(limit: number = 50, offset: number = 0): Promise<RidingSessionRecord[]> {
    try {
      return await this.db.sessions
        .orderBy('startTime')
        .reverse()
        .offset(offset)
        .limit(limit)
        .toArray()
    } catch (error) {
      console.error('Failed to get riding sessions:', error)
      throw error
    }
  }
  
  /**
   * 获取指定会话的详细数据（包含数据点）
   * @param sessionId 会话ID
   */
  async getSessionWithData(sessionId: string): Promise<RidingSession | null> {
    try {
      const session = await this.db.sessions.where('id').equals(sessionId).first()
      if (!session) return null
      
      const dataPoints = await this.db.dataPoints
        .where('sessionId')
        .equals(sessionId)
        .toArray()
      
      return {
        ...session,
        dataPoints: dataPoints.map((item: any) => {
          const { dbId, sessionId: _, createdAt, ...point } = item
          return point
        })
      }
    } catch (error) {
      console.error('Failed to get session with data:', error)
      throw error
    }
  }
  
  /**
   * 删除指定会话
   * @param sessionId 会话ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.db.transaction('rw', [this.db.sessions, this.db.dataPoints], async () => {
        // 删除会话记录
        await this.db.sessions.where('id').equals(sessionId).delete()
        
        // 删除相关数据点
        await this.db.dataPoints.where('sessionId').equals(sessionId).delete()
      })
      
      console.log(`Deleted riding session: ${sessionId}`)
    } catch (error) {
      console.error('Failed to delete riding session:', error)
      throw error
    }
  }
  
  /**
   * 清理过期数据
   */
  async cleanupExpiredData(): Promise<number> {
    try {
      const now = new Date()
      let deletedCount = 0
      
      // 获取过期的会话
      const expiredSessions = await this.db.sessions
        .where('expiresAt')
        .below(now)
        .toArray()
      
      // 删除过期会话及其数据点
      for (const session of expiredSessions) {
        await this.deleteSession(session.id)
        deletedCount++
      }
      
      console.log(`Cleaned up ${deletedCount} expired sessions`)
      return deletedCount
    } catch (error) {
      console.error('Failed to cleanup expired data:', error)
      throw error
    }
  }
  
  /**
   * 获取数据库统计信息
   */
  async getStats(): Promise<{
    totalSessions: number
    totalDataPoints: number
    oldestSession?: Date
    newestSession?: Date
    databaseSize?: number
  }> {
    try {
      const [totalSessions, totalDataPoints] = await Promise.all([
        this.db.sessions.count(),
        this.db.dataPoints.count()
      ])
      
      let oldestSession: Date | undefined
      let newestSession: Date | undefined
      
      if (totalSessions > 0) {
        const oldest = await this.db.sessions.orderBy('startTime').first()
        const newest = await this.db.sessions.orderBy('startTime').reverse().first()
        
        oldestSession = oldest?.startTime
        newestSession = newest?.startTime
      }
      
      return {
        totalSessions,
        totalDataPoints,
        oldestSession,
        newestSession
      }
    } catch (error) {
      console.error('Failed to get database stats:', error)
      throw error
    }
  }
  
  /**
   * 导出会话数据为JSON
   * @param sessionId 会话ID
   */
  async exportSessionToJson(sessionId: string): Promise<string> {
    try {
      const session = await this.getSessionWithData(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }
      
      return JSON.stringify(session, null, 2)
    } catch (error) {
      console.error('Failed to export session to JSON:', error)
      throw error
    }
  }
  
  /**
   * 批量导出多个会话
   * @param sessionIds 会话ID列表
   */
  async exportMultipleSessionsToJson(sessionIds: string[]): Promise<string> {
    try {
      const sessions = await Promise.all(
        sessionIds.map(id => this.getSessionWithData(id))
      )
      
      const validSessions = sessions.filter(Boolean)
      return JSON.stringify(validSessions, null, 2)
    } catch (error) {
      console.error('Failed to export multiple sessions:', error)
      throw error
    }
  }
  
  /**
   * 清空所有数据
   */
  async clearAllData(): Promise<void> {
    try {
      await this.db.transaction('rw', [this.db.sessions, this.db.dataPoints], async () => {
        await this.db.sessions.clear()
        await this.db.dataPoints.clear()
      })
      
      console.log('Cleared all cycling data')
    } catch (error) {
      console.error('Failed to clear all data:', error)
      throw error
    }
  }
}

// 导出单例实例
export const cyclingDataManager = CyclingDataManager.getInstance()

// 自动清理过期数据（应用启动时执行一次）
setTimeout(() => {
  cyclingDataManager.cleanupExpiredData().catch(console.error)
}, 5000)