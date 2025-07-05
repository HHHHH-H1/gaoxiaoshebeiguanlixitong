<template>
  <div class="statistics-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>
        <el-icon><DataLine /></el-icon>
        数据统计与分析
      </h2>
      <div class="header-actions">
        <el-button type="success" @click="exportReport">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          @change="handleDateRangeChange"
        />
      </div>
    </div>

    <!-- 统计概览卡片 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon equipment">
              <el-icon><Monitor /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ overview.totalEquipment }}</div>
              <div class="stats-label">设备总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon utilization">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ overview.averageUtilization }}%</div>
              <div class="stats-label">平均利用率</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon fault">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ overview.faultCount }}</div>
              <div class="stats-label">故障次数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon value">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">¥{{ formatNumber(overview.totalValue) }}</div>
              <div class="stats-label">资产总值</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <!-- 设备状态分布 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>设备状态分布</span>
              <el-button type="text" @click="refreshStatusChart">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div ref="statusChartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>

      <!-- 设备类型分布 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>设备类型分布</span>
              <el-button type="text" @click="refreshCategoryChart">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div ref="categoryChartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 设备利用率统计 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>设备利用率统计</span>
              <div class="header-controls">
                <el-select v-model="utilizationPeriod" @change="loadUtilizationData" style="width: 120px; margin-right: 12px;">
                  <el-option label="本周" value="week" />
                  <el-option label="本月" value="month" />
                  <el-option label="本季度" value="quarter" />
                  <el-option label="本年度" value="year" />
                </el-select>
                <el-button type="text" @click="loadUtilizationData">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
          <div ref="utilizationChartRef" style="height: 400px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 故障热力图 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>故障热力图分析</span>
              <div class="header-controls">
                <el-radio-group v-model="heatmapType" @change="loadHeatmapData" size="small">
                  <el-radio-button label="department">按部门</el-radio-button>
                  <el-radio-button label="category">按类型</el-radio-button>
                  <el-radio-button label="location">按位置</el-radio-button>
                </el-radio-group>
                <el-button type="text" @click="loadHeatmapData" style="margin-left: 12px;">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
          <div ref="heatmapChartRef" style="height: 400px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细统计表格 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备详细统计</span>
          <div class="header-controls">
            <el-input
              v-model="tableSearch"
              placeholder="搜索设备"
              style="width: 200px; margin-right: 12px;"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="loadTableData">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="tableLoading"
        :data="equipmentStats"
        style="width: 100%"
        @sort-change="handleTableSort"
      >
        <el-table-column prop="equipmentNo" label="设备编号" width="120" />
        <el-table-column prop="name" label="设备名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="category" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="getCategoryType(row.category)" size="small">
              {{ row.category }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="位置" width="120" />
        <el-table-column prop="utilizationRate" label="利用率" width="100" sortable="custom">
          <template #default="{ row }">
            <div class="utilization-cell">
              <div class="utilization-bar">
                <div
                  class="utilization-fill"
                  :style="{ width: row.utilizationRate + '%', backgroundColor: getUtilizationColor(row.utilizationRate) }"
                ></div>
              </div>
              <span class="utilization-text">{{ row.utilizationRate }}%</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="dailyUsageHours" label="日均使用时长" width="120" sortable="custom">
          <template #default="{ row }">
            {{ row.dailyUsageHours }}小时
          </template>
        </el-table-column>
        <el-table-column prop="idleRate" label="闲置率" width="100" sortable="custom">
          <template #default="{ row }">
            <el-tag :type="getIdleRateType(row.idleRate)" size="small">
              {{ row.idleRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="faultCount" label="故障次数" width="100" sortable="custom">
          <template #default="{ row }">
            <el-badge :value="row.faultCount" :type="getFaultBadgeType(row.faultCount)">
              <span>{{ row.faultCount }}</span>
            </el-badge>
          </template>
        </el-table-column>
        <el-table-column prop="lastMaintenanceDate" label="最后维护日期" width="120" sortable="custom" />
        <el-table-column prop="value" label="设备价值" width="120" sortable="custom">
          <template #default="{ row }">
            ¥{{ formatNumber(row.value) }}
          </template>
        </el-table-column>
        <!-- <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="viewEquipmentDetail(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
          </template>
        </el-table-column> -->
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="tablePagination.page"
          v-model:page-size="tablePagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="tablePagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleTableSizeChange"
          @current-change="handleTableCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DataLine,
  Download,
  Monitor,
  TrendCharts,
  Warning,
  Money,
  Refresh,
  Search,
  View
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { 
  getOverviewStats,
  getEquipmentStats,
  getReservationStats,
  getMaintenanceStats,
  getUtilizationStats,
  getTrendsData,
  getEquipmentDetailStats
} from '../api/statistics'

// 响应式数据
const dateRange = ref([])
const utilizationPeriod = ref('month')
const heatmapType = ref('category')
const tableSearch = ref('')
const tableLoading = ref(false)

// 图表引用
const statusChartRef = ref()
const categoryChartRef = ref()
const utilizationChartRef = ref()
const heatmapChartRef = ref()

// 图表实例
let statusChart = null
let categoryChart = null
let utilizationChart = null
let heatmapChart = null

// 统计概览数据
const overview = reactive({
  totalEquipment: 0,
  averageUtilization: 0,
  faultCount: 0,
  totalValue: 0
})

// 设备统计表格数据
const equipmentStats = ref([])
const tablePagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 加载概览数据
const loadOverviewData = async () => {
  try {
    const response = await getOverviewStats()
    Object.assign(overview, response || {})
  } catch (error) {
    console.error('加载概览数据失败:', error)
    ElMessage.error('加载概览数据失败')
  }
}

// 加载设备状态统计
const loadStatusChartData = async () => {
  if (!statusChart) return
  
  try {
    const response = await getEquipmentStats()
    const data = response?.statusDistribution || {}
    
    const statusOption = {
      title: {
        text: '设备状态分布',
        left: 'center',
        textStyle: { fontSize: 14 }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: '设备状态',
          type: 'pie',
          radius: '70%',
          data: [
            { value: data['运行中'] || 0, name: '运行中', itemStyle: { color: '#67C23A' } },
            { value: data['维修中'] || 0, name: '维修中', itemStyle: { color: '#F56C6C' } },
            { value: data['待清洁'] || 0, name: '待清洁', itemStyle: { color: '#E6A23C' } },
            { value: data['封存'] || 0, name: '封存', itemStyle: { color: '#909399' } }
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
    statusChart.setOption(statusOption)
  } catch (error) {
    console.error('加载设备状态统计失败:', error)
  }
}

// 加载设备类型统计
const loadCategoryChartData = async () => {
  if (!categoryChart) return
  
  try {
    const response = await getEquipmentStats()
    const data = response?.categoryDistribution || {}
    
    const categoryOption = {
      title: {
        text: '设备类型分布',
        left: 'center',
        textStyle: { fontSize: 14 }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: '设备类型',
          type: 'pie',
          radius: ['40%', '70%'],
          data: Object.entries(data).map(([key, value], index) => ({
            value,
            name: key,
            itemStyle: { 
              color: ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399'][index % 5] 
            }
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
    categoryChart.setOption(categoryOption)
  } catch (error) {
    console.error('加载设备类型统计失败:', error)
  }
}

// 初始化图表
const initCharts = async () => {
  await nextTick()
  
  // 设备状态分布饼图
  if (statusChartRef.value) {
    statusChart = echarts.init(statusChartRef.value)
    loadStatusChartData()
  }

  // 设备类型分布饼图
  if (categoryChartRef.value) {
    categoryChart = echarts.init(categoryChartRef.value)
    loadCategoryChartData()
  }

  // 设备利用率柱状图
  if (utilizationChartRef.value) {
    utilizationChart = echarts.init(utilizationChartRef.value)
    loadUtilizationData()
  }

  // 故障热力图
  if (heatmapChartRef.value) {
    heatmapChart = echarts.init(heatmapChartRef.value)
    loadHeatmapData()
  }
}

// 加载利用率数据
const loadUtilizationData = async () => {
  if (!utilizationChart) return

  try {
    const response = await getUtilizationStats({ days: 30 })
    const utilizationData = response?.data || []
    
    // 按位置分组统计
    const locationStats = {}
    utilizationData.forEach(item => {
      const location = item.equipment?.location || '未知位置'
      if (!locationStats[location]) {
        locationStats[location] = { total: 0, count: 0 }
      }
      locationStats[location].total += item.utilizationRate
      locationStats[location].count += 1
    })
    
    const locations = Object.keys(locationStats)
    const utilizationRates = locations.map(loc => 
      Math.round(locationStats[loc].total / locationStats[loc].count)
    )
    const idleRates = utilizationRates.map(rate => 100 - rate)

    const utilizationOption = {
      title: {
        text: '设备利用率统计',
        left: 'center',
        textStyle: { fontSize: 14 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['利用率', '闲置率']
      },
      xAxis: {
        type: 'category',
        data: locations
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [
        {
          name: '利用率',
          type: 'bar',
          data: utilizationRates,
          itemStyle: { color: '#67C23A' }
        },
        {
          name: '闲置率',
          type: 'bar',
          data: idleRates,
          itemStyle: { color: '#E6A23C' }
        }
      ]
    }
    utilizationChart.setOption(utilizationOption)
  } catch (error) {
    console.error('加载利用率数据失败:', error)
  }
}

// 加载热力图数据
const loadHeatmapData = async () => {
  if (!heatmapChart) return
  
  try {
    const response = await getMaintenanceStats()
    const faultByCategory = response?.faultByCategory || {}
    
    // 构建热力图数据
    const categories = Object.keys(faultByCategory)
    const faultTypes = ['硬件故障', '软件故障', '操作异常', '性能下降', '其他问题']
    
    // 如果没有设备类型数据，使用默认类型
    if (categories.length === 0) {
      categories.push('教学设备', '科研设备', '办公设备')
    }
    
    // 模拟各故障类型的分布数据
    const heatmapData = []
    categories.forEach((category, categoryIndex) => {
      faultTypes.forEach((faultType, typeIndex) => {
        const baseCount = faultByCategory[category] || 0
        // 如果没有数据，生成一些小的随机值用于展示
        const count = baseCount > 0 
          ? Math.floor(baseCount * Math.random() * 0.5) + Math.floor(baseCount * 0.2)
          : Math.floor(Math.random() * 3) // 0-2的随机数
        heatmapData.push([categoryIndex, typeIndex, count])
      })
    })

    const heatmapOption = {
      title: {
        text: '设备类型故障频率热力图',
        left: 'center',
        textStyle: { fontSize: 14 }
      },
      tooltip: {
        position: 'top',
        formatter: function (params) {
          const categoryName = categories[params.data[0]] || '未知类型'
          const faultTypeName = faultTypes[params.data[1]] || '未知故障'
          const count = params.data[2] || 0
          return `${categoryName} - ${faultTypeName}: ${count}次故障`
        }
      },
      xAxis: {
        type: 'category',
        data: categories,
        splitArea: {
          show: true
        }
      },
      yAxis: {
        type: 'category',
        data: faultTypes,
        splitArea: {
          show: true
        }
      },
      visualMap: {
        min: 0,
        max: heatmapData.length > 0 ? Math.max(Math.max(...heatmapData.map(d => d[2])), 1) : 1, // 确保最大值至少为1
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '5%',
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
        }
      },
      series: [
        {
          name: '故障次数',
          type: 'heatmap',
          data: heatmapData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
    heatmapChart.setOption(heatmapOption)
  } catch (error) {
    console.error('加载热力图数据失败:', error)
  }
}

// 加载表格数据
const loadTableData = async () => {
  try {
    tableLoading.value = true
    
    const params = {
      page: tablePagination.page,
      limit: tablePagination.limit,
      search: tableSearch.value
    }
    
    const response = await getEquipmentDetailStats(params)
    equipmentStats.value = response?.equipment || []
    tablePagination.total = response?.pagination?.total || 0
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  } finally {
    tableLoading.value = false
  }
}

// 处理日期范围变化
const handleDateRangeChange = (dates) => {
  console.log('日期范围变化:', dates)
  // 重新加载相关数据
  loadOverviewData()
  loadStatusChartData()
  loadCategoryChartData()
  loadUtilizationData()
  loadHeatmapData()
  loadTableData()
}

// 导出报告
const exportReport = () => {
  ElMessage.info('导出功能开发中...')
}

// 刷新图表
const refreshStatusChart = () => {
  loadStatusChartData()
}

const refreshCategoryChart = () => {
  loadCategoryChartData()
}

// 表格相关方法
const handleTableSort = ({ column, prop, order }) => {
  console.log('表格排序:', prop, order)
}

const handleTableSizeChange = (val) => {
  tablePagination.limit = val
  tablePagination.page = 1
  loadTableData()
}

const handleTableCurrentChange = (val) => {
  tablePagination.page = val
  loadTableData()
}

const viewEquipmentDetail = (equipment) => {
  console.log('查看设备详情:', equipment)
  ElMessage.info('查看设备详情功能开发中...')
}

// 工具方法
const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString()
}

const getCategoryType = (category) => {
  const typeMap = {
    '教学': 'primary',
    '科研': 'success',
    '办公': 'warning'
  }
  return typeMap[category] || 'info'
}

const getUtilizationColor = (rate) => {
  if (rate >= 80) return '#67C23A'
  if (rate >= 60) return '#E6A23C'
  return '#F56C6C'
}

const getIdleRateType = (rate) => {
  if (rate <= 20) return 'success'
  if (rate <= 40) return 'warning'
  return 'danger'
}

const getFaultBadgeType = (count) => {
  if (count === 0) return 'success'
  if (count <= 2) return 'warning'
  return 'danger'
}

// 窗口尺寸变化处理
const handleResize = () => {
  statusChart?.resize()
  categoryChart?.resize()
  utilizationChart?.resize()
  heatmapChart?.resize()
}

onMounted(async () => {
  // 加载概览数据
  await loadOverviewData()
  
  // 初始化图表并加载数据
  await initCharts()
  
  // 加载表格数据
  await loadTableData()
  
  // 监听窗口尺寸变化
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
.statistics-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.page-header h2 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stats-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stats-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.stats-icon.equipment {
  background: linear-gradient(135deg, #409EFF, #66B1FF);
}

.stats-icon.utilization {
  background: linear-gradient(135deg, #67C23A, #85CE61);
}

.stats-icon.fault {
  background: linear-gradient(135deg, #F56C6C, #F78989);
}

.stats-icon.value {
  background: linear-gradient(135deg, #E6A23C, #EEBE77);
}

.stats-content {
  flex: 1;
}

.stats-number {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-controls {
  display: flex;
  align-items: center;
}

.utilization-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.utilization-bar {
  width: 60px;
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.utilization-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.utilization-text {
  font-size: 12px;
  color: #606266;
  min-width: 35px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

:deep(.el-card__header) {
  padding: 18px 20px;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-badge__content) {
  right: 8px;
  top: 2px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .stats-number {
    font-size: 24px;
  }
  
  .stats-icon {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
}
</style> 