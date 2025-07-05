<template>
  <div class="maintenance-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>
        <el-icon><Tools /></el-icon>
        故障报修
      </h2>
      <div class="header-actions">
        <!-- 学生/教师：提交报修申请 -->
        <el-button v-if="!isAdmin" type="primary" @click="showReportDialog = true">
          <el-icon><Plus /></el-icon>
          提交报修申请
        </el-button>
        <!-- 管理员：导出报告 -->
        <el-button v-if="isAdmin" type="success" @click="exportMaintenanceReport">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 - 所有用户可见 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-card class="stats-card pending">
          <div class="stats-content">
            <div class="stats-number">{{ stats.pending }}</div>
            <div class="stats-label">{{ isAdmin ? '待处理' : '我的待处理' }}</div>
            <div class="stats-icon">
              <el-icon><Clock /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card processing">
          <div class="stats-content">
            <div class="stats-number">{{ stats.processing }}</div>
            <div class="stats-label">{{ isAdmin ? '维修中' : '我的维修中' }}</div>
            <div class="stats-icon">
              <el-icon><Tools /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card completed">
          <div class="stats-content">
            <div class="stats-number">{{ stats.completed }}</div>
            <div class="stats-label">{{ isAdmin ? '已完成' : '我的已完成' }}</div>
            <div class="stats-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card total">
          <div class="stats-content">
            <div class="stats-number">{{ stats.total }}</div>
            <div class="stats-label">{{ isAdmin ? '总计' : '我的总计' }}</div>
            <div class="stats-icon">
              <el-icon><DataLine /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索和筛选 -->
    <el-card style="margin-bottom: 20px;">
      <el-form :model="searchForm" :inline="true">
        <el-form-item label="工单编号">
          <el-input 
            v-model="searchForm.ticketNo" 
            placeholder="请输入工单编号"
            clearable
            style="width: 150px;"
          />
        </el-form-item>
        <el-form-item label="设备名称">
          <el-input
            v-model="searchForm.equipmentName"
            placeholder="请输入设备名称"
            clearable
            style="width: 180px;"
          />
        </el-form-item>
        <el-form-item label="故障类型">
          <el-select v-model="searchForm.faultType" placeholder="请选择故障类型" clearable style="width: 120px;">
            <el-option label="硬件故障" value="硬件故障" />
            <el-option label="软件故障" value="软件故障" />
            <el-option label="操作异常" value="操作异常" />
            <el-option label="性能下降" value="性能下降" />
            <el-option label="其他问题" value="其他问题" />
          </el-select>
        </el-form-item>
        <el-form-item label="维修状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 120px;">
            <el-option label="待分配" value="待分配">
              <el-tag type="info" size="small">待分配</el-tag>
            </el-option>
            <el-option label="维修中" value="维修中">
              <el-tag type="warning" size="small">维修中</el-tag>
            </el-option>
            <el-option label="待验收" value="待验收">
              <el-tag type="primary" size="small">待验收</el-tag>
            </el-option>
            <el-option label="已完成" value="已完成">
              <el-tag type="success" size="small">已完成</el-tag>
            </el-option>
            <el-option label="已关闭" value="已关闭">
              <el-tag type="danger" size="small">已关闭</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-select v-model="searchForm.urgency" placeholder="请选择紧急程度" clearable style="width: 100px;">
            <el-option label="低" value="低" />
            <el-option label="中" value="中" />
            <el-option label="高" value="高" />
            <el-option label="紧急" value="紧急" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 报修工单表格 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ isAdmin ? '所有报修工单' : '我的报修工单' }}</span>
          <span class="table-total">共 {{ pagination.total }} 条记录</span>
        </div>
      </template>
      
      <el-table
        v-loading="loading"
        :data="maintenanceList"
        style="width: 100%"
        @sort-change="handleSortChange"
        row-key="id"
      >
        <el-table-column prop="ticketNo" label="工单编号" width="120" sortable="custom" />
        <el-table-column prop="equipmentName" label="设备名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="faultType" label="故障类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getFaultTypeColor(row.faultType)" size="small">
              {{ row.faultType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="urgency" label="紧急程度" width="100">
          <template #default="{ row }">
            <el-tag :type="getUrgencyColor(row.urgency)" effect="dark" size="small">
              {{ row.urgency }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="维修状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusColor(row.status)" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- 管理员可以看到报修人，学生/教师看到维修员 -->
        <el-table-column :label="isAdmin ? '报修人' : '维修员'" width="100">
          <template #default="{ row }">
            <span v-if="isAdmin">{{ row.reporter }}</span>
            <span v-else-if="row.maintainer">{{ row.maintainer }}</span>
            <el-tag v-else type="info" size="small">未分配</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reportTime" label="报修时间" width="150" sortable="custom">
          <template #default="{ row }">
            {{ formatDateTime(row.reportTime) }}
          </template>
        </el-table-column>
        <el-table-column label="维修进度" width="150">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress
                :percentage="row.progress"
                :color="getProgressColor(row.progress)"
                :stroke-width="8"
                :show-text="false"
              />
              <span class="progress-text">{{ row.progress }}%</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <!-- 所有用户都可以查看详情 -->
            <el-button type="primary" size="small" @click="viewMaintenance(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            
            <!-- 管理员操作 -->
            <template v-if="isAdmin">
              <el-button 
                v-if="row.status === '待分配'" 
                type="warning" 
                size="small" 
                @click="assignMaintainer(row)"
              >
                分配维修员
              </el-button>
              <el-button 
                v-if="['维修中', '待验收'].includes(row.status)" 
                type="success" 
                size="small" 
                @click="updateProgress(row)"
              >
                更新进度
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 提交报修申请对话框 -->
    <el-dialog
      v-model="showReportDialog"
      title="提交报修申请"
      width="600px"
      @close="resetReportForm"
    >
      <el-form
        ref="reportFormRef"
        :model="reportForm"
        :rules="reportRules"
        label-width="100px"
      >
        <el-form-item label="选择设备" prop="equipmentId">
          <el-select
            v-model="reportForm.equipmentId"
            placeholder="请选择需要报修的设备"
            style="width: 100%"
            @change="handleEquipmentChange"
          >
            <el-option
              v-for="equipment in equipmentOptions"
              :key="equipment.id"
              :label="`${equipment.name} (${equipment.equipmentNo})`"
              :value="equipment.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="故障类型" prop="faultType">
          <el-select v-model="reportForm.faultType" placeholder="请选择故障类型" style="width: 100%">
            <el-option label="硬件故障" value="硬件故障" />
            <el-option label="软件故障" value="软件故障" />
            <el-option label="操作异常" value="操作异常" />
            <el-option label="性能下降" value="性能下降" />
            <el-option label="其他问题" value="其他问题" />
          </el-select>
        </el-form-item>

        <el-form-item label="紧急程度" prop="urgency">
          <el-radio-group v-model="reportForm.urgency">
            <el-radio label="低">低</el-radio>
            <el-radio label="中">中</el-radio>
            <el-radio label="高">高</el-radio>
            <el-radio label="紧急">紧急</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="故障描述" prop="description">
          <el-input
            v-model="reportForm.description"
            type="textarea"
            :rows="4"
            placeholder="请详细描述故障现象、影响范围和已尝试的解决方法"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="联系电话" prop="contactPhone">
          <el-input
            v-model="reportForm.contactPhone"
            placeholder="请输入您的联系电话"
            style="width: 200px;"
          />
        </el-form-item>

        <el-form-item label="故障图片">
          <el-upload
            ref="uploadRef"
            v-model:file-list="reportForm.images"
            action="#"
            list-type="picture-card"
            :on-change="handleImageChange"
            :on-remove="handleImageRemove"
            :before-upload="beforeImageUpload"
            :limit="3"
            accept="image/*"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="upload-tip">
            最多上传3张图片，单张不超过2MB
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showReportDialog = false">取消</el-button>
          <el-button type="primary" :loading="reportLoading" @click="submitReport">
            提交申请
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="报修详情"
      width="800px"
    >
      <div v-if="currentMaintenance" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="工单编号" span="1">
            {{ currentMaintenance.ticketNo }}
          </el-descriptions-item>
          <el-descriptions-item label="设备名称" span="1">
            {{ currentMaintenance.equipmentName }}
          </el-descriptions-item>
          <el-descriptions-item label="设备编号" span="1">
            {{ currentMaintenance.equipmentNo }}
          </el-descriptions-item>
          <el-descriptions-item label="故障类型" span="1">
            <el-tag :type="getFaultTypeColor(currentMaintenance.faultType)" size="small">
              {{ currentMaintenance.faultType }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="紧急程度" span="1">
            <el-tag :type="getUrgencyColor(currentMaintenance.urgency)" effect="dark" size="small">
              {{ currentMaintenance.urgency }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="维修状态" span="1">
            <el-tag :type="getStatusColor(currentMaintenance.status)" size="small">
              {{ currentMaintenance.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="报修人" span="1">
            {{ currentMaintenance.reporter }}
          </el-descriptions-item>
          <el-descriptions-item label="维修员" span="1">
            <span v-if="currentMaintenance.maintainer">{{ currentMaintenance.maintainer }}</span>
            <el-tag v-else type="info" size="small">未分配</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="报修时间" span="1">
            {{ formatDateTime(currentMaintenance.reportTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="预计完成时间" span="1">
            <span v-if="currentMaintenance.expectedTime">
              {{ formatDateTime(currentMaintenance.expectedTime) }}
            </span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="实际完成时间" span="1" v-if="currentMaintenance.completedTime">
            {{ formatDateTime(currentMaintenance.completedTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="维修进度" span="1">
            <el-progress
              :percentage="currentMaintenance.progress"
              :color="getProgressColor(currentMaintenance.progress)"
              :stroke-width="12"
            />
          </el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 20px;">
          <h4>故障描述</h4>
          <div class="description-content">
            {{ currentMaintenance.description || '暂无描述' }}
          </div>
        </div>

        <div v-if="currentMaintenance.solution" style="margin-top: 20px;">
          <h4>维修方案</h4>
          <div class="description-content">
            {{ currentMaintenance.solution }}
          </div>
        </div>

        <!-- 故障图片 -->
        <div v-if="currentMaintenance.images && currentMaintenance.images.length > 0" style="margin-top: 20px;">
          <h4>故障图片</h4>
          <div class="image-gallery">
            <!-- 这里可以展示故障图片 -->
            <el-empty description="图片功能开发中..." />
          </div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDetailDialog = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分配维修员对话框 -->
    <AssignMaintainerDialog
      v-model="showAssignDialog"
      :maintenance="currentMaintenance"
      @success="handleAssignSuccess"
    />

    <!-- 更新进度对话框 -->
    <UpdateProgressDialog
      v-model="showProgressDialog"
      :maintenance="currentMaintenance"
      @success="handleProgressSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, 
  Download,
  Tools,
  Clock,
  CircleCheck,
  DataLine,
  Search,
  Refresh,
  View,
  Edit,
  User
} from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import AssignMaintainerDialog from '../components/AssignMaintainerDialog.vue'
import UpdateProgressDialog from '../components/UpdateProgressDialog.vue'
import { 
  getMaintenanceList, 
  createMaintenance, 
  getMaintenance,
  updateMaintenanceStatus,
  assignMaintainer as assignMaintainerAPI,
  completeMaintenance as completeMaintenanceAPI,
  getMaintenanceStats
} from '../api/maintenance'
import { getEquipmentList } from '../api/equipment'

const userStore = useUserStore()

// 计算属性：是否为管理员
const isAdmin = computed(() => userStore.user?.role === 'admin')

// 响应式数据
const loading = ref(false)
const reportLoading = ref(false)
const maintenanceList = ref([])
const showReportDialog = ref(false)
const showDetailDialog = ref(false)
const showAssignDialog = ref(false)
const showProgressDialog = ref(false)
const currentMaintenance = ref(null)
const reportFormRef = ref()
const uploadRef = ref()

// 统计数据
const stats = reactive({
  pending: 0,
  processing: 0,
  completed: 0,
  total: 0
})

// 搜索表单
const searchForm = reactive({
  ticketNo: '',
  equipmentName: '',
  faultType: '',
  status: '',
  urgency: ''
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 设备选项
const equipmentOptions = ref([])

// 报修表单
const reportForm = reactive({
  equipmentId: '',
  faultType: '',
  urgency: '中',
  description: '',
  contactPhone: '',
  images: []
})

// 表单验证规则
const reportRules = {
  equipmentId: [{ required: true, message: '请选择设备', trigger: 'change' }],
  faultType: [{ required: true, message: '请选择故障类型', trigger: 'change' }],
  urgency: [{ required: true, message: '请选择紧急程度', trigger: 'change' }],
  description: [{ required: true, message: '请描述故障现象', trigger: 'blur' }],
  contactPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

// 获取维修工单列表
const loadData = async () => {
  try {
    loading.value = true
    
    // 检查用户是否已登录
    if (!userStore.isLoggedIn) {
      console.warn('用户未登录，跳过加载工单数据')
      return
    }
    
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    
    const response = await getMaintenanceList(params)
    maintenanceList.value = response.maintenance || []
    pagination.total = response.pagination?.total || 0
  } catch (error) {
    console.error('加载维修工单失败:', error)
    // 如果是认证错误，不显示错误消息避免干扰用户
    if (error.response?.status !== 401) {
      ElMessage.error('加载维修工单失败: ' + (error.response?.data?.error || '网络错误'))
    }
  } finally {
    loading.value = false
  }
}

// 加载统计数据
const loadStats = async () => {
  try {
    // 检查用户是否已登录
    if (!userStore.isLoggedIn) {
      console.warn('用户未登录，跳过加载统计数据')
      return
    }
    
    const response = await getMaintenanceStats()
    if (response) {
      Object.assign(stats, {
        pending: response.pending || 0,
        processing: response.processing || 0,
        completed: response.completed || 0,
        total: response.total || 0
      })
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    // 如果是认证错误，不显示错误消息避免干扰用户
    if (error.response?.status !== 401) {
      ElMessage.error('加载统计数据失败')
    }
  }
}

// 加载设备选项
const loadEquipmentOptions = async () => {
  try {
    // 检查用户是否已登录
    if (!userStore.isLoggedIn) {
      console.warn('用户未登录，跳过加载设备选项')
      return
    }
    
    const response = await getEquipmentList({ status: '运行中' })
    equipmentOptions.value = response.equipment || []
  } catch (error) {
    console.error('加载设备选项失败:', error)
    // 如果是认证错误，不显示错误消息避免干扰用户
    if (error.response?.status !== 401) {
      ElMessage.error('加载设备选项失败')
    }
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.page = 1
  loadData()
}

// 重置搜索
const resetSearch = () => {
  Object.assign(searchForm, {
    ticketNo: '',
    equipmentName: '',
    faultType: '',
    status: '',
    urgency: ''
  })
  handleSearch()
}

// 分页处理
const handleSizeChange = (val) => {
  pagination.limit = val
  pagination.page = 1
  loadData()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  loadData()
}

// 排序处理
const handleSortChange = ({ column, prop, order }) => {
  console.log('排序:', prop, order)
}

// 查看维修详情
const viewMaintenance = async (maintenance) => {
  try {
    const response = await getMaintenance(maintenance.id)
    currentMaintenance.value = response || {}
    showDetailDialog.value = true
  } catch (error) {
    console.error('加载维修详情失败:', error)
    ElMessage.error('加载维修详情失败')
  }
}

// 分配维修员（仅管理员）
const assignMaintainer = (maintenance) => {
  currentMaintenance.value = maintenance
  showAssignDialog.value = true
}

// 更新进度（仅管理员）
const updateProgress = (maintenance) => {
  currentMaintenance.value = maintenance
  showProgressDialog.value = true
}

// 处理分配成功
const handleAssignSuccess = () => {
  loadData()
  loadStats()
}

// 处理进度更新成功
const handleProgressSuccess = () => {
  loadData()
  loadStats()
}

// 设备变化处理
const handleEquipmentChange = (equipmentId) => {
  const equipment = equipmentOptions.value.find(item => item.id === equipmentId)
  console.log('选择设备:', equipment)
}

// 图片上传处理
const handleImageChange = (file, fileList) => {
  if (fileList.length > 3) {
    ElMessage.warning('最多只能上传3张图片')
    fileList.splice(3)
  }
  reportForm.images = fileList
}

const handleImageRemove = (file, fileList) => {
  reportForm.images = fileList
}

const beforeImageUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片格式的文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return false // 阻止自动上传
}

// 提交报修申请
const submitReport = async () => {
  if (!reportFormRef.value) return
  
  try {
    await reportFormRef.value.validate()
    reportLoading.value = true
    
    const submitData = {
      equipmentId: reportForm.equipmentId,
      faultType: reportForm.faultType,
      priority: reportForm.urgency,
      urgency: reportForm.urgency,
      description: reportForm.description,
      contactPhone: reportForm.contactPhone
    }
    
    const response = await createMaintenance(submitData)
    ElMessage.success(`故障报修提交成功！工单编号：${response.ticketNo}`)
    showReportDialog.value = false
    resetReportForm()
    loadData()
    loadStats()
  } catch (error) {
    console.error('提交报修失败:', error)
    ElMessage.error('提交报修失败: ' + (error.response?.data?.error || '网络错误'))
  } finally {
    reportLoading.value = false
  }
}

// 重置报修表单
const resetReportForm = () => {
  Object.assign(reportForm, {
    equipmentId: '',
    faultType: '',
    urgency: '中',
    description: '',
    contactPhone: '',
    images: []
  })
  if (reportFormRef.value) {
    reportFormRef.value.clearValidate()
  }
}

// 导出维修报告（仅管理员）
const exportMaintenanceReport = () => {
  ElMessage.info('导出功能开发中...')
}

// 工具方法
const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const getFaultTypeColor = (type) => {
  const colorMap = {
    '硬件故障': 'danger',
    '软件故障': 'warning',
    '操作异常': 'primary',
    '性能下降': 'info',
    '其他问题': 'default'
  }
  return colorMap[type] || 'default'
}

const getUrgencyColor = (urgency) => {
  const colorMap = {
    '低': 'info',
    '中': 'warning',
    '高': 'danger',
    '紧急': 'danger'
  }
  return colorMap[urgency] || 'info'
}

const getStatusColor = (status) => {
  const colorMap = {
    '待分配': 'info',
    '维修中': 'warning',
    '待验收': 'primary',
    '已完成': 'success',
    '已关闭': 'danger'
  }
  return colorMap[status] || 'info'
}

const getProgressColor = (progress) => {
  if (progress === 100) return '#67C23A'
  if (progress >= 60) return '#E6A23C'
  if (progress >= 20) return '#409EFF'
  return '#F56C6C'
}

onMounted(async () => {
  // 先检查认证状态
  await userStore.checkAuthStatus()
  
  // 然后加载数据
  loadData()
  loadStats()
  loadEquipmentOptions()
})
</script>

<style scoped>
.maintenance-page {
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
  gap: 12px;
}

.stats-card {
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.stats-card.pending {
  background: linear-gradient(135deg, #409EFF, #66B1FF);
  color: white;
}

.stats-card.processing {
  background: linear-gradient(135deg, #E6A23C, #EEBE77);
  color: white;
}

.stats-card.completed {
  background: linear-gradient(135deg, #67C23A, #85CE61);
  color: white;
}

.stats-card.total {
  background: linear-gradient(135deg, #909399, #A6A9AD);
  color: white;
}

.stats-content {
  padding: 20px;
  position: relative;
}

.stats-number {
  font-size: 32px;
  font-weight: 600;
  line-height: 1;
  margin-bottom: 8px;
}

.stats-label {
  font-size: 14px;
  opacity: 0.9;
}

.stats-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 32px;
  opacity: 0.3;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-total {
  color: #909399;
  font-size: 14px;
}

.progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-text {
  font-size: 12px;
  color: #606266;
  min-width: 35px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.detail-content {
  max-height: 600px;
  overflow-y: auto;
}

.description-content {
  background-color: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  line-height: 1.6;
  color: #606266;
}

.upload-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
}

.image-gallery {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

:deep(.el-progress-bar__outer) {
  flex: 1;
}

:deep(.el-descriptions__body .el-descriptions__table) {
  table-layout: fixed;
}

:deep(.el-upload--picture-card) {
  --el-upload-picture-card-size: 80px;
}
</style> 