<template>
  <div class="reservation-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>
        <el-icon><Calendar /></el-icon>
        设备预约管理
      </h2>
      <div class="header-actions">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          新建预约
        </el-button>
        <el-button type="info" @click="exportReservations">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-card class="stats-card pending">
          <div class="stats-content">
            <div class="stats-number">{{ stats.pending }}</div>
            <div class="stats-label">待审批</div>
            <div class="stats-icon">
              <el-icon><Clock /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card approved">
          <div class="stats-content">
            <div class="stats-number">{{ stats.approved }}</div>
            <div class="stats-label">已批准</div>
            <div class="stats-icon">
              <el-icon><Check /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card today">
          <div class="stats-content">
            <div class="stats-number">{{ stats.today }}</div>
            <div class="stats-label">今日预约</div>
            <div class="stats-icon">
              <el-icon><Calendar /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card total">
          <div class="stats-content">
            <div class="stats-number">{{ stats.total }}</div>
            <div class="stats-label">总预约数</div>
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
        <el-form-item label="设备名称">
          <el-input 
            v-model="searchForm.equipmentName" 
            placeholder="请输入设备名称"
            clearable
            style="width: 150px;"
          />
        </el-form-item>
        <el-form-item label="预约状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 120px;">
            <el-option label="待审批" value="待审批">
              <el-tag type="warning" size="small">待审批</el-tag>
            </el-option>
            <el-option label="已批准" value="已批准">
              <el-tag type="success" size="small">已批准</el-tag>
            </el-option>
            <el-option label="已拒绝" value="已拒绝">
              <el-tag type="danger" size="small">已拒绝</el-tag>
            </el-option>
            <el-option label="已完成" value="已完成">
              <el-tag type="info" size="small">已完成</el-tag>
            </el-option>
            <el-option label="已取消" value="已取消">
              <el-tag type="info" size="small">已取消</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="预约日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 200px;"
          />
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

    <!-- 预约列表 -->
    <el-card>
      <el-table
        v-loading="loading"
        :data="reservationList"
        style="width: 100%"
        @sort-change="handleSortChange"
        row-key="id"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="预约编号" width="100" sortable="custom" />
        <el-table-column label="设备信息" min-width="200">
          <template #default="{ row }">
            <div class="equipment-info">
              <div class="equipment-name">{{ row.equipment?.name }}</div>
              <div class="equipment-detail">
                {{ row.equipment?.equipmentNo }} | {{ row.equipment?.location }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="申请人" width="120">
          <template #default="{ row }">
            <div>{{ row.user?.name }}</div>
            <el-tag :type="getUserRoleType(row.user?.role)" size="small">
              {{ getRoleText(row.user?.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预约时间" width="160">
          <template #default="{ row }">
            <div class="time-info">
              <div>{{ formatDate(row.startTime) }}</div>
              <div class="time-range">
                {{ formatTime(row.startTime) }} - {{ formatTime(row.endTime) }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="purpose" label="使用目的" min-width="150" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审批人" width="100">
          <template #default="{ row }">
            <span v-if="row.approver">{{ row.approver.name }}</span>
            <span v-else class="no-approver">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="150" sortable="custom">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewReservation(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            
            <!-- 申请人操作 -->
            <template v-if="row.userId === userStore.user?.id">
              <el-button 
                v-if="row.status === '待审批'" 
                size="small" 
                type="warning" 
                @click="cancelReservation(row)"
              >
                <el-icon><Close /></el-icon>
                取消
              </el-button>
            </template>
            
            <!-- 管理员和教师操作 -->
            <template v-if="userStore.user?.role === 'admin' || userStore.user?.role === 'teacher'">
              <el-dropdown 
                v-if="row.status === '待审批'" 
                @command="(command) => handleApproval(command, row)" 
                trigger="click"
              >
                <el-button size="small" type="info">
                  <el-icon><More /></el-icon>
                  审批
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="approve">
                      <el-icon><Check /></el-icon>
                      批准
                    </el-dropdown-item>
                    <el-dropdown-item command="reject">
                      <el-icon><Close /></el-icon>
                      拒绝
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              
              <el-button 
                v-if="row.status === '已批准' && new Date(row.endTime) <= new Date()" 
                size="small" 
                type="success" 
                @click="completeReservation(row)"
              >
                <el-icon><Check /></el-icon>
                完成
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
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

    <!-- 新建预约对话框 -->
    <el-dialog
      v-model="showAddDialog"
      title="新建设备预约"
      width="600px"
      @close="resetReservationForm"
    >
      <el-form
        ref="reservationFormRef"
        :model="reservationForm"
        :rules="reservationRules"
        label-width="120px"
      >
        <el-form-item label="选择设备" prop="equipmentId">
          <el-select 
            v-model="reservationForm.equipmentId" 
            placeholder="请选择设备" 
            style="width: 100%"
            filterable
            @change="onEquipmentChange"
          >
            <el-option
              v-for="equipment in availableEquipment"
              :key="equipment.id"
              :label="`${equipment.name} (${equipment.equipmentNo})`"
              :value="equipment.id"
            >
              <div>
                <span>{{ equipment.name }}</span>
                <span style="float: right; color: #8492a6; font-size: 12px;">
                  {{ equipment.location }}
                </span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="预约开始时间" prop="startTime">
          <el-date-picker
            v-model="reservationForm.startTime"
            type="datetime"
            placeholder="选择预约开始时间"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            :disabled-date="disabledDate"
            :disabled-hours="disabledHours"
            :disabled-minutes="disabledMinutes"
          />
        </el-form-item>
        
        <el-form-item label="预约结束时间" prop="endTime">
          <el-date-picker
            v-model="reservationForm.endTime"
            type="datetime"
            placeholder="选择预约结束时间"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            :disabled-date="disabledDate"
            :disabled-hours="disabledHours"
            :disabled-minutes="disabledMinutes"
          />
        </el-form-item>
        
        <el-form-item label="使用目的" prop="purpose">
          <el-input
            v-model="reservationForm.purpose"
            type="textarea"
            rows="4"
            placeholder="请详细描述设备使用目的"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="submitReservation">
            提交预约
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 预约详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="预约详情" width="700px">
      <div v-if="currentReservation" class="reservation-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="预约编号">
            <el-tag type="info">{{ currentReservation.id }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="预约状态">
            <el-tag :type="getStatusType(currentReservation.status)">
              {{ currentReservation.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="设备名称">
            {{ currentReservation.equipment?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="设备编号">
            {{ currentReservation.equipment?.equipmentNo }}
          </el-descriptions-item>
          <el-descriptions-item label="设备位置">
            {{ currentReservation.equipment?.location }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">
            {{ currentReservation.user?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="预约开始时间">
            {{ formatDateTime(currentReservation.startTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="预约结束时间">
            {{ formatDateTime(currentReservation.endTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatDateTime(currentReservation.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="审批人">
            <span v-if="currentReservation.approver">{{ currentReservation.approver.name }}</span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="审批时间">
            <span v-if="currentReservation.approvedAt">{{ formatDateTime(currentReservation.approvedAt) }}</span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentReservation.rejectReason" label="拒绝原因" span="2">
            {{ currentReservation.rejectReason }}
          </el-descriptions-item>
          <el-descriptions-item label="使用目的" span="2">
            {{ currentReservation.purpose }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 审批对话框 -->
    <el-dialog
      v-model="showApprovalDialog"
      :title="approvalAction === 'approve' ? '批准预约' : '拒绝预约'"
      width="500px"
    >
      <el-form
        ref="approvalFormRef"
        :model="approvalForm"
        :rules="approvalRules"
        label-width="80px"
      >
        <div v-if="approvalAction === 'approve'" class="approval-info">
          <el-alert type="success" show-icon :closable="false">
            <template #title>
              确定要批准该预约申请吗？
            </template>
          </el-alert>
        </div>
        
        <div v-else class="approval-info">
          <el-alert type="warning" show-icon :closable="false">
            <template #title>
              确定要拒绝该预约申请吗？
            </template>
          </el-alert>
          
          <el-form-item label="拒绝原因" prop="rejectReason" style="margin-top: 20px;">
            <el-input
              v-model="approvalForm.rejectReason"
              type="textarea"
              rows="3"
              placeholder="请输入拒绝原因"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </div>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showApprovalDialog = false">取消</el-button>
          <el-button 
            :type="approvalAction === 'approve' ? 'success' : 'danger'" 
            :loading="approvalLoading" 
            @click="submitApproval"
          >
            {{ approvalAction === 'approve' ? '批准' : '拒绝' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Calendar, 
  Plus, 
  Download, 
  Search, 
  Refresh, 
  View, 
  Edit, 
  Delete, 
  More,
  Check,
  Close,
  Clock,
  DataLine
} from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const approvalLoading = ref(false)
const reservationList = ref([])
const availableEquipment = ref([])
const showAddDialog = ref(false)
const showDetailDialog = ref(false)
const showApprovalDialog = ref(false)
const currentReservation = ref(null)
const approvalAction = ref('')
const reservationFormRef = ref()
const approvalFormRef = ref()

// 统计数据
const stats = reactive({
  pending: 0,
  approved: 0,
  today: 0,
  total: 0
})

// 搜索表单
const searchForm = reactive({
  equipmentName: '',
  status: '',
  dateRange: null
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 预约表单
const reservationForm = reactive({
  equipmentId: null,
  startTime: '',
  endTime: '',
  purpose: ''
})

// 审批表单
const approvalForm = reactive({
  rejectReason: ''
})

// 表单验证规则
const reservationRules = reactive({
  equipmentId: [
    { required: true, message: '请选择设备', trigger: 'change' }
  ],
  startTime: [
    { required: true, message: '请选择预约开始时间', trigger: 'change' }
  ],
  endTime: [
    { required: true, message: '请选择预约结束时间', trigger: 'change' }
  ],
  purpose: [
    { required: true, message: '请输入使用目的', trigger: 'blur' },
    { min: 5, max: 500, message: '使用目的长度在5-500个字符', trigger: 'blur' }
  ]
})

const approvalRules = reactive({
  rejectReason: [
    { required: true, message: '请输入拒绝原因', trigger: 'blur' },
    { max: 500, message: '拒绝原因不能超过500个字符', trigger: 'blur' }
  ]
})

// 获取预约列表
const loadData = async () => {
  try {
    loading.value = true
    
    const { getReservationList, getReservationStats } = await import('../api/reservation')
    
    // 构建查询参数
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    
    // 同时获取预约列表和统计数据
    const [reservationResponse, statsResponse] = await Promise.all([
      getReservationList(params),
      getReservationStats()
    ])
    
    reservationList.value = reservationResponse.reservations
    pagination.total = reservationResponse.pagination.total
    
    // 更新统计数据
    const statusDistribution = statsResponse.statusDistribution || {}
    Object.assign(stats, {
      pending: statusDistribution['待审批'] || 0,
      approved: statusDistribution['已批准'] || 0,
      today: statsResponse.todayCount || 0,
      total: Object.values(statusDistribution).reduce((sum, count) => sum + count, 0)
    })
    
  } catch (error) {
    console.error('加载预约列表失败:', error)
    ElMessage.error('加载预约列表失败')
  } finally {
    loading.value = false
  }
}

// 获取可预约设备列表
const loadAvailableEquipment = async () => {
  try {
    const { getEquipmentList } = await import('../api/equipment')
    const response = await getEquipmentList({ status: '运行中' })
    availableEquipment.value = response.equipment || []
  } catch (error) {
    console.error('获取设备列表失败:', error)
    ElMessage.error('获取设备列表失败')
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
    equipmentName: '',
    status: '',
    dateRange: null
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

// 设备变更处理
const onEquipmentChange = (equipmentId) => {
  // 可以在这里加载设备的可预约时间段
  console.log('选择设备:', equipmentId)
}

// 日期时间限制
const disabledDate = (date) => {
  return date < new Date(new Date().toDateString())
}

const disabledHours = () => {
  const now = new Date()
  const currentHour = now.getHours()
  const hours = []
  
  // 如果是今天，禁用过去的小时
  if (reservationForm.startTime && 
      new Date(reservationForm.startTime).toDateString() === now.toDateString()) {
    for (let i = 0; i < currentHour; i++) {
      hours.push(i)
    }
  }
  
  return hours
}

const disabledMinutes = (hour) => {
  const now = new Date()
  const currentMinute = now.getMinutes()
  const minutes = []
  
  // 如果是今天的当前小时，禁用过去的分钟
  if (reservationForm.startTime && 
      new Date(reservationForm.startTime).toDateString() === now.toDateString() &&
      hour === now.getHours()) {
    for (let i = 0; i < currentMinute; i++) {
      minutes.push(i)
    }
  }
  
  return minutes
}

// 查看预约详情
const viewReservation = (reservation) => {
  currentReservation.value = reservation
  showDetailDialog.value = true
}

// 提交预约
const submitReservation = async () => {
  if (!reservationFormRef.value) return
  
  try {
    await reservationFormRef.value.validate()
    
    // 验证时间
    const startTime = new Date(reservationForm.startTime)
    const endTime = new Date(reservationForm.endTime)
    
    if (startTime >= endTime) {
      ElMessage.error('结束时间必须晚于开始时间')
      return
    }
    
    submitLoading.value = true
    
    const { createReservation } = await import('../api/reservation')
    await createReservation(reservationForm)
    
    ElMessage.success('预约申请提交成功')
    showAddDialog.value = false
    resetReservationForm()
    loadData()
  } catch (error) {
    console.error('提交预约失败:', error)
    ElMessage.error('提交预约失败')
  } finally {
    submitLoading.value = false
  }
}

// 取消预约
const cancelReservation = async (reservation) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消预约"${reservation.equipment?.name}"吗？`,
      '取消预约',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const { cancelReservation: cancelAPI } = await import('../api/reservation')
    await cancelAPI(reservation.id)
    
    ElMessage.success('预约已取消')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消预约失败:', error)
      ElMessage.error('取消预约失败')
    }
  }
}

// 审批预约
const handleApproval = (action, reservation) => {
  currentReservation.value = reservation
  approvalAction.value = action
  approvalForm.rejectReason = ''
  showApprovalDialog.value = true
}

const submitApproval = async () => {
  try {
    if (approvalAction.value === 'reject') {
      await approvalFormRef.value.validate()
    }
    
    approvalLoading.value = true
    
    const { approveReservation } = await import('../api/reservation')
    const data = {
      action: approvalAction.value,
      rejectReason: approvalAction.value === 'reject' ? approvalForm.rejectReason : undefined
    }
    
    await approveReservation(currentReservation.value.id, data)
    
    ElMessage.success(approvalAction.value === 'approve' ? '预约已批准' : '预约已拒绝')
    showApprovalDialog.value = false
    loadData()
  } catch (error) {
    console.error('审批失败:', error)
    ElMessage.error('审批失败')
  } finally {
    approvalLoading.value = false
  }
}

// 完成预约
const completeReservation = async (reservation) => {
  try {
    await ElMessageBox.confirm(
      `确定要标记预约"${reservation.equipment?.name}"为已完成吗？`,
      '完成预约',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    const { completeReservation: completeAPI } = await import('../api/reservation')
    await completeAPI(reservation.id)
    
    ElMessage.success('预约已完成')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('完成预约失败:', error)
      ElMessage.error('完成预约失败')
    }
  }
}

// 重置预约表单
const resetReservationForm = () => {
  Object.assign(reservationForm, {
    equipmentId: null,
    startTime: '',
    endTime: '',
    purpose: ''
  })
  if (reservationFormRef.value) {
    reservationFormRef.value.clearValidate()
  }
}

// 导出数据
const exportReservations = () => {
  ElMessage.info('导出功能开发中...')
}

// 工具方法
const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatTime = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const getStatusType = (status) => {
  const typeMap = {
    '待审批': 'warning',
    '已批准': 'success',
    '已拒绝': 'danger',
    '已完成': 'info',
    '已取消': 'info'
  }
  return typeMap[status] || 'info'
}

const getUserRoleType = (role) => {
  const typeMap = {
    'admin': 'danger',
    'teacher': 'warning',
    'student': 'primary'
  }
  return typeMap[role] || 'info'
}

const getRoleText = (role) => {
  const textMap = {
    'admin': '管理员',
    'teacher': '教师',
    'student': '学生'
  }
  return textMap[role] || role
}

onMounted(() => {
  loadData()
  loadAvailableEquipment()
})
</script>

<style scoped>
.reservation-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
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
  cursor: pointer;
  transition: all 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stats-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.stats-number {
  font-size: 32px;
  font-weight: 600;
  line-height: 1;
}

.stats-label {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.stats-icon {
  font-size: 32px;
  opacity: 0.8;
}

.stats-card.pending .stats-number { color: #faad14; }
.stats-card.approved .stats-number { color: #52c41a; }
.stats-card.today .stats-number { color: #1890ff; }
.stats-card.total .stats-number { color: #722ed1; }

.equipment-info {
  line-height: 1.4;
}

.equipment-name {
  font-weight: 600;
  color: #303133;
}

.equipment-detail {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.time-info {
  line-height: 1.4;
}

.time-range {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.no-approver {
  color: #909399;
  font-style: italic;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.reservation-detail {
  padding: 16px 0;
}

.approval-info {
  margin-bottom: 16px;
}

.dialog-footer {
  display: flex;
  gap: 12px;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-table .cell) {
  word-break: break-word;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
  color: #606266;
}

:deep(.el-tag) {
  border-radius: 6px;
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
  }
  
  .stats-content {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
}
</style> 