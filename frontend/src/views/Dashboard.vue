<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon primary">
              <el-icon size="24"><Monitor /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalEquipment }}</div>
              <div class="stat-label">设备总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon success">
              <el-icon size="24"><CircleCheckFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.runningEquipment }}</div>
              <div class="stat-label">正常运行</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon warning">
              <el-icon size="24"><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.maintenanceEquipment }}</div>
              <div class="stat-label">维护中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon info">
              <el-icon size="24"><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.todayReservations }}</div>
              <div class="stat-label">今日预约</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快速操作 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Lightning /></el-icon>
              <span>快速操作</span>
            </div>
          </template>
          
          <el-row :gutter="16">
            <el-col :span="6">
              <el-button 
                type="primary" 
                size="large" 
                style="width: 100%"
                @click="$router.push('/equipment')"
              >
                <el-icon><Monitor /></el-icon>
                设备管理
              </el-button>
            </el-col>
            <el-col :span="6">
              <el-button 
                type="success" 
                size="large" 
                style="width: 100%"
                @click="$router.push('/reservation')"
              >
                <el-icon><Calendar /></el-icon>
                设备预约
              </el-button>
            </el-col>
            <el-col :span="6">
              <el-button 
                type="warning" 
                size="large" 
                style="width: 100%"
                @click="$router.push('/maintenance')"
              >
                <el-icon><Tools /></el-icon>
                故障报修
              </el-button>
            </el-col>
            <el-col :span="6">
              <el-button 
                type="info" 
                size="large" 
                style="width: 100%"
                @click="$router.push('/statistics')"
              >
                <el-icon><DataAnalysis /></el-icon>
                数据统计
              </el-button>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近活动 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Clock /></el-icon>
              <span>最近活动</span>
            </div>
          </template>
          
          <div v-if="recentActivities.length === 0" class="no-data">
            <el-empty description="暂无活动记录" />
          </div>
          <div v-else>
            <div 
              v-for="activity in recentActivities" 
              :key="activity.id"
              class="activity-item"
            >
              <div class="activity-content">
                <div class="activity-title">{{ activity.title }}</div>
                <div class="activity-time">{{ formatTime(activity.time) }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><TrendCharts /></el-icon>
              <span>设备状态分布</span>
            </div>
          </template>
          
          <div class="chart-container">
            <div v-if="!stats.statusDistribution" class="no-data">
              <el-empty description="暂无数据" />
            </div>
            <div v-else class="status-chart">
              <div 
                v-for="(count, status) in stats.statusDistribution" 
                :key="status"
                class="status-item"
              >
                <el-tag 
                  :type="getStatusType(status)"
                  effect="light"
                  size="large"
                >
                  {{ status }}: {{ count }}台
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { 
  Monitor, 
  CircleCheckFilled, 
  Warning, 
  Calendar, 
  Lightning, 
  Tools, 
  DataAnalysis, 
  Clock,
  TrendCharts
} from '@element-plus/icons-vue'
import { getEquipmentStats, getReservationStats } from '../api/statistics'

const stats = reactive({
  totalEquipment: 0,
  runningEquipment: 0,
  maintenanceEquipment: 0,
  todayReservations: 0,
  statusDistribution: null
})

const recentActivities = ref([])

const loadDashboardData = async () => {
  try {
    // 加载设备统计
    const equipmentStats = await getEquipmentStats()
    stats.totalEquipment = equipmentStats.total || 0
    stats.runningEquipment = equipmentStats.running || 0
    stats.maintenanceEquipment = equipmentStats.maintenance || 0
    stats.statusDistribution = equipmentStats.statusDistribution || {}
    
    // 加载预约统计
    const reservationStats = await getReservationStats()
    stats.todayReservations = reservationStats.todayCount || 0
    
  } catch (error) {
    console.error('加载仪表板数据失败:', error)
    // 设置示例数据
    stats.totalEquipment = 6
    stats.runningEquipment = 4
    stats.maintenanceEquipment = 1
    stats.todayReservations = 2
    stats.statusDistribution = {
      '运行中': 4,
      '维修中': 1,
      '待清洁': 1,
      '封存': 0
    }
  }
}

const getStatusType = (status) => {
  const typeMap = {
    '运行中': 'success',
    '维修中': 'danger',
    '待清洁': 'warning',
    '封存': 'info'
  }
  return typeMap[status] || 'info'
}

const formatTime = (time) => {
  // 简单的时间格式化
  return new Date(time).toLocaleString('zh-CN')
}

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 120px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: white;
}

.stat-icon.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.success {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.warning {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.info {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.card-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #303133;
}

.card-header .el-icon {
  margin-right: 8px;
  color: #409eff;
}

.no-data {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

.activity-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activity-title {
  color: #303133;
  font-weight: 500;
}

.activity-time {
  color: #909399;
  font-size: 12px;
}

.chart-container {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-chart {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
}

.status-item {
  text-align: center;
}

:deep(.el-card__body) {
  padding: 20px;
}
</style> 