<template>
  <div class="equipment-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>
        <el-icon><Monitor /></el-icon>
        设备管理
      </h2>
      <div class="header-actions">
        <el-button type="success" @click="exportData">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加设备
        </el-button>
      </div>
    </div>

    <!-- 高级搜索栏 -->
    <el-card style="margin-bottom: 20px;">
      <el-form :model="searchForm" :inline="true">
        <el-form-item label="设备编号">
          <el-input 
            v-model="searchForm.equipmentNo" 
            placeholder="请输入设备编号"
            clearable
            style="width: 150px;"
          />
        </el-form-item>
        <el-form-item label="设备名称">
          <el-input
            v-model="searchForm.search"
            placeholder="支持拼音首字母搜索（如：xwj）"
            clearable
            style="width: 200px;"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="设备状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 120px;">
            <el-option label="运行中" value="运行中">
              <el-tag type="success" size="small">运行中</el-tag>
            </el-option>
            <el-option label="维修中" value="维修中">
              <el-tag type="danger" size="small">维修中</el-tag>
            </el-option>
            <el-option label="待清洁" value="待清洁">
              <el-tag type="warning" size="small">待清洁</el-tag>
            </el-option>
            <el-option label="封存" value="封存">
              <el-tag type="info" size="small">封存</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="searchForm.category" placeholder="请选择类型" clearable style="width: 120px;">
            <el-option label="教学" value="教学">
              <el-tag type="primary" size="small">教学</el-tag>
            </el-option>
            <el-option label="科研" value="科研">
              <el-tag type="success" size="small">科研</el-tag>
            </el-option>
            <el-option label="办公" value="办公">
              <el-tag type="warning" size="small">办公</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="存放位置">
          <el-select v-model="searchForm.location" placeholder="请选择位置" clearable style="width: 150px;">
            <el-option v-for="location in locationOptions" :key="location" :label="location" :value="location" />
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

    <!-- 设备表格 -->
    <el-card>
      <el-table
        v-loading="loading"
        :data="equipmentList"
        style="width: 100%"
        @sort-change="handleSortChange"
        row-key="id"
      >
        <el-table-column prop="equipmentNo" label="设备编号" width="120" sortable="custom" />
        <el-table-column prop="name" label="设备名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="model" label="型号" width="120" show-overflow-tooltip />
        <el-table-column prop="category" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="getCategoryType(row.category)" effect="light">
              {{ row.category }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="purchaseDate" label="购买日期" width="110" sortable="custom" />
        <el-table-column prop="location" label="存放位置" width="120" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <div class="status-cell">
              <el-tag :type="getStatusType(row.status)" effect="dark">
                <el-icon style="margin-right: 4px;">
                  <component :is="getStatusIcon(row.status)" />
                </el-icon>
                {{ row.status }}
              </el-tag>
              <!-- 显示使用人信息 -->
              <div v-if="row.status === '运行中' && row.currentUser" class="user-info">
                <el-text size="small" type="info">使用人: {{ row.currentUser.name }}</el-text>
              </div>
              <!-- 显示维修信息 -->
              <div v-if="row.status === '维修中' && row.maintenanceInfo" class="maintenance-info">
                <el-text size="small" type="danger">维修员: {{ row.maintenanceInfo.maintainer }}</el-text>
              </div>
              <!-- 显示清洁信息 -->
              <div v-if="row.status === '待清洁' && row.cleaningInfo" class="cleaning-info">
                <el-text size="small" type="warning">负责人: {{ row.cleaningInfo.responsible }}</el-text>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="value" label="设备价值" width="100" sortable="custom">
          <template #default="{ row }">
            <span v-if="row.value">¥{{ row.value.toLocaleString() }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <!-- <el-table-column label="电子档案" width="100">
          <template #default="{ row }">
            <el-button
              v-if="row.archivePath"
              size="small"
              type="primary"
              link
              @click="viewArchive(row)"
            >
              <el-icon><Document /></el-icon>
              查看
            </el-button>
            <span v-else class="no-archive">无档案</span>
          </template>
        </el-table-column> -->
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewEquipment(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            
            <!-- 管理员操作 -->
            <template v-if="userStore.user?.role === 'admin'">
              <el-button size="small" type="warning" @click="editEquipment(row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-popconfirm
                title="确定要删除这个设备吗？"
                confirm-button-text="确定"
                cancel-button-text="取消"
                @confirm="deleteEquipment(row)"
              >
                <template #reference>
                  <el-button size="small" type="danger">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </template>
            
            <!-- 状态相关操作 -->
            <el-dropdown @command="(command) => handleStatusAction(command, row)" trigger="click">
              <el-button size="small" type="info">
                <el-icon><More /></el-icon>
                更多
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="row.status === '运行中'" command="reserve">
                    <el-icon><Calendar /></el-icon>
                    预约使用
                  </el-dropdown-item>
                  <el-dropdown-item v-if="row.status === '运行中'" command="maintenance">
                    <el-icon><Tools /></el-icon>
                    报告故障
                  </el-dropdown-item>
                  <el-dropdown-item v-if="row.status === '运行中'" command="cleaning">
                    <el-icon><Brush /></el-icon>
                    申请清洁
                  </el-dropdown-item>
                  <el-dropdown-item v-if="row.status !== '封存'" command="archive" divided>
                    <el-icon><Lock /></el-icon>
                    设备封存
                  </el-dropdown-item>
                  <el-dropdown-item v-if="row.status === '封存'" command="activate">
                    <el-icon><Unlock /></el-icon>
                    解除封存
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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

    <!-- 添加/编辑设备对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="isEdit ? '编辑设备' : '添加设备'"
      width="700px"
      @close="resetForm"
    >
      <el-form
        ref="equipmentFormRef"
        :model="equipmentForm"
        :rules="equipmentRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备编号" prop="equipmentNo">
              <el-input v-model="equipmentForm.equipmentNo" placeholder="请输入设备编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备名称" prop="name">
              <el-input v-model="equipmentForm.name" placeholder="请输入设备名称" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备型号" prop="model">
              <el-input v-model="equipmentForm.model" placeholder="请输入设备型号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="购买日期" prop="purchaseDate">
              <el-date-picker
                v-model="equipmentForm.purchaseDate"
                type="date"
                placeholder="选择购买日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="存放位置" prop="location">
              <el-select 
                v-model="equipmentForm.location" 
                placeholder="请选择存放位置" 
                style="width: 100%"
                filterable
                allow-create
              >
                <el-option 
                  v-for="location in locationOptions" 
                  :key="location" 
                  :label="location" 
                  :value="location" 
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备类型" prop="category">
              <el-select v-model="equipmentForm.category" placeholder="请选择设备类型" style="width: 100%">
                <el-option label="教学" value="教学">
                  <el-tag type="primary" size="small">教学</el-tag>
                </el-option>
                <el-option label="科研" value="科研">
                  <el-tag type="success" size="small">科研</el-tag>
                </el-option>
                <el-option label="办公" value="办公">
                  <el-tag type="warning" size="small">办公</el-tag>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="设备状态" prop="status">
              <el-select v-model="equipmentForm.status" placeholder="请选择设备状态" style="width: 100%">
                <el-option label="运行中" value="运行中">
                  <el-tag type="success" size="small">运行中</el-tag>
                </el-option>
                <el-option label="维修中" value="维修中">
                  <el-tag type="danger" size="small">维修中</el-tag>
                </el-option>
                <el-option label="待清洁" value="待清洁">
                  <el-tag type="warning" size="small">待清洁</el-tag>
                </el-option>
                <el-option label="封存" value="封存">
                  <el-tag type="info" size="small">封存</el-tag>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备价值">
              <el-input-number
                v-model="equipmentForm.value"
                :min="0"
                :precision="2"
                placeholder="请输入设备价值"
                style="width: 100%"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="设备描述">
          <el-input
            v-model="equipmentForm.description"
            type="textarea"
            rows="3"
            placeholder="请输入设备描述"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        
        <!-- 电子档案上传 -->
        <!-- <el-form-item label="电子档案">
          <el-upload
            ref="uploadRef"
            :file-list="fileList"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :before-upload="beforeUpload"
            :auto-upload="false"
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
            list-type="text"
            multiple
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              选择文件
            </el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持 jpg/png/pdf/doc/docx 文件，单个文件不超过 5MB
              </div>
            </template>
          </el-upload>
        </el-form-item> -->
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="submitEquipment">
            {{ isEdit ? '更新设备' : '添加设备' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 设备详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="设备详情" width="800px">
      <div v-if="currentEquipment" class="equipment-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="设备编号" span="1">
            <el-tag type="info">{{ currentEquipment.equipmentNo }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="设备名称" span="1">
            {{ currentEquipment.name }}
          </el-descriptions-item>
          <el-descriptions-item label="设备型号" span="1">
            {{ currentEquipment.model }}
          </el-descriptions-item>
          <el-descriptions-item label="设备类型" span="1">
            <el-tag :type="getCategoryType(currentEquipment.category)">
              {{ currentEquipment.category }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="购买日期" span="1">
            {{ currentEquipment.purchaseDate }}
          </el-descriptions-item>
          <el-descriptions-item label="存放位置" span="1">
            {{ currentEquipment.location }}
          </el-descriptions-item>
          <el-descriptions-item label="设备状态" span="1">
            <el-tag :type="getStatusType(currentEquipment.status)">
              <el-icon style="margin-right: 4px;">
                <component :is="getStatusIcon(currentEquipment.status)" />
              </el-icon>
              {{ currentEquipment.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="设备价值" span="1">
            <span v-if="currentEquipment.value">¥{{ currentEquipment.value.toLocaleString() }}</span>
            <span v-else>未设置</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentEquipment.description" label="设备描述" span="2">
            {{ currentEquipment.description }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" span="1">
            {{ formatDateTime(currentEquipment.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间" span="1">
            {{ formatDateTime(currentEquipment.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>
        
        <!-- 电子档案展示 -->
        <!-- <div v-if="currentEquipment.archivePath" class="archive-section">
          <h4>电子档案</h4>
          <el-button type="primary" @click="viewArchive(currentEquipment)">
            <el-icon><Document /></el-icon>
            查看档案
          </el-button>
        </div> -->
      </div>
    </el-dialog>

    <!-- 状态操作对话框 -->
    <StatusActionDialog
      v-model="showStatusDialog"
      :action="currentAction"
      :equipment="currentEquipment"
      @success="loadData"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, 
  Search, 
  View, 
  Edit, 
  Delete, 
  Tools,
  Download,
  Refresh,
  More,
  Calendar,
  Brush,
  Lock,
  Unlock,
  Monitor,
  Document,
  Upload,
  CircleCheckFilled,
  WarningFilled,
  Clock,
  InfoFilled
} from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { getEquipmentList, createEquipment, updateEquipment, deleteEquipment as deleteEquipmentAPI } from '../api/equipment'
import StatusActionDialog from '../components/StatusActionDialog.vue'

const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const equipmentList = ref([])
const showAddDialog = ref(false)
const showDetailDialog = ref(false)
const showStatusDialog = ref(false)
const isEdit = ref(false)
const currentEquipment = ref(null)
const currentAction = ref('')
const equipmentFormRef = ref()
const uploadRef = ref()
const fileList = ref([])

// 搜索表单
const searchForm = reactive({
  equipmentNo: '',
  search: '',
  status: '',
  category: '',
  location: ''
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 存放位置选项
const locationOptions = [
  '实验楼101', '实验楼102', '实验楼103', '实验楼201', '实验楼202', '实验楼203',
  '教学楼101', '教学楼102', '教学楼201', '教学楼202', '教学楼301', '教学楼302',
  '办公楼301', '办公楼302', '办公楼303', '办公楼401', '办公楼402', '办公楼403',
  '图书馆', '体育馆', '学生活动中心', '食堂', '宿舍楼', '其他'
]

// 设备表单
const equipmentForm = reactive({
  equipmentNo: '',
  name: '',
  model: '',
  purchaseDate: '',
  location: '',
  category: '',
  status: '运行中',
  description: '',
  value: null
})

// 表单验证规则
const equipmentRules = {
  equipmentNo: [
    { required: true, message: '请输入设备编号', trigger: 'blur' },
    { min: 3, max: 50, message: '设备编号长度在3-50个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入设备名称', trigger: 'blur' },
    { min: 2, max: 100, message: '设备名称长度在2-100个字符', trigger: 'blur' }
  ],
  model: [
    { required: true, message: '请输入设备型号', trigger: 'blur' },
    { min: 1, max: 100, message: '设备型号长度在1-100个字符', trigger: 'blur' }
  ],
  purchaseDate: [
    { required: true, message: '请选择购买日期', trigger: 'change' }
  ],
  location: [
    { required: true, message: '请选择存放位置', trigger: 'change' }
  ],
  category: [
    { required: true, message: '请选择设备类型', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择设备状态', trigger: 'change' }
  ]
}

// 获取设备列表
const loadData = async () => {
  try {
    loading.value = true
    const params = {
      ...searchForm,
      page: pagination.page,
      limit: pagination.limit
    }
    
    const response = await getEquipmentList(params)
    equipmentList.value = response.equipment || []
    pagination.total = response.pagination?.total || 0
  } catch (error) {
    console.error('加载设备列表失败:', error)
    // 设置示例数据以便展示界面
    equipmentList.value = [
      {
        id: 1,
        equipmentNo: 'EQ001',
        name: '光学显微镜',
        model: 'Olympus CX23',
        category: '教学',
        location: '实验楼101',
        status: '运行中',
        purchaseDate: '2023-01-15',
        value: 15000,
        description: '用于生物实验的光学显微镜，放大倍数40-1000倍',
        archivePath: '/uploads/equipment/EQ001_manual.pdf',
        currentUser: { name: '张三', purpose: '生物实验' },
        createdAt: '2023-01-15T08:00:00Z',
        updatedAt: '2023-01-15T08:00:00Z'
      },
      {
        id: 2,
        equipmentNo: 'EQ002',
        name: '电子天平',
        model: 'Sartorius BSA224S',
        category: '科研',
        location: '实验楼102',
        status: '维修中',
        purchaseDate: '2023-02-20',
        value: 8500,
        description: '精密电子天平，精度0.1mg',
        maintenanceInfo: { maintainer: '李四', description: '校准问题', estimatedCompletion: '2023-06-15' },
        createdAt: '2023-02-20T08:00:00Z',
        updatedAt: '2023-06-10T08:00:00Z'
      },
      {
        id: 3,
        equipmentNo: 'EQ003',
        name: '投影仪',
        model: 'Epson CB-X41',
        category: '教学',
        location: '教学楼201',
        status: '待清洁',
        purchaseDate: '2023-03-10',
        value: 3200,
        description: '教学用投影仪，支持HDMI和VGA接口',
        cleaningInfo: { responsible: '王五', deadline: '2023-06-12' },
        createdAt: '2023-03-10T08:00:00Z',
        updatedAt: '2023-06-10T08:00:00Z'
      }
    ]
    pagination.total = 3
  } finally {
    loading.value = false
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
    equipmentNo: '',
    search: '',
    status: '',
    category: '',
    location: ''
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
  // TODO: 实现后端排序
}

// 查看设备详情
const viewEquipment = (equipment) => {
  currentEquipment.value = equipment
  showDetailDialog.value = true
}

// 编辑设备
const editEquipment = (equipment) => {
  Object.assign(equipmentForm, {
    ...equipment,
    value: equipment.value || null
  })
  isEdit.value = true
  showAddDialog.value = true
}

// 删除设备
const deleteEquipment = async (equipment) => {
  try {
    await deleteEquipmentAPI(equipment.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    console.error('删除设备失败:', error)
    ElMessage.error('删除设备失败')
  }
}

// 状态操作
const handleStatusAction = (action, equipment) => {
  currentAction.value = action
  currentEquipment.value = equipment
  showStatusDialog.value = true
}

// 查看档案
const viewArchive = (equipment) => {
  if (equipment.archivePath) {
    // 在新窗口打开档案文件
    window.open(`http://localhost:3000${equipment.archivePath}`, '_blank')
  }
}

// 导出数据
const exportData = async () => {
  try {
    ElMessage.info('导出功能开发中...')
    // TODO: 实现数据导出
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

// 文件上传处理
const handleFileChange = (file, fileList) => {
  fileList.value = fileList
}

const handleFileRemove = (file, fileList) => {
  fileList.value = fileList
}

const beforeUpload = (file) => {
  const isValidType = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isValidType) {
    ElMessage.error('只能上传 JPG/PNG/PDF/DOC/DOCX 格式的文件!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('文件大小不能超过 5MB!')
    return false
  }
  return false // 阻止自动上传
}

// 提交设备表单
const submitEquipment = async () => {
  if (!equipmentFormRef.value) return
  
  try {
    await equipmentFormRef.value.validate()
    submitLoading.value = true
    
    const formData = new FormData()
    
    // 添加表单数据
    Object.keys(equipmentForm).forEach(key => {
      if (equipmentForm[key] !== null && equipmentForm[key] !== '') {
        formData.append(key, equipmentForm[key])
      }
    })
    
    // 添加文件
    fileList.value.forEach(file => {
      if (file.raw) {
        formData.append('files', file.raw)
      }
    })
    
    if (isEdit.value) {
      await updateEquipment(equipmentForm.id, formData)
      ElMessage.success('更新成功')
    } else {
      await createEquipment(formData)
      ElMessage.success('添加成功')
    }
    
    showAddDialog.value = false
    resetForm()
    loadData()
  } catch (error) {
    console.error('保存设备失败:', error)
    ElMessage.error('保存设备失败')
  } finally {
    submitLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(equipmentForm, {
    equipmentNo: '',
    name: '',
    model: '',
    purchaseDate: '',
    location: '',
    category: '',
    status: '运行中',
    description: '',
    value: null
  })
  fileList.value = []
  isEdit.value = false
  if (equipmentFormRef.value) {
    equipmentFormRef.value.clearValidate()
  }
}

// 获取状态标签类型
const getStatusType = (status) => {
  const typeMap = {
    '运行中': 'success',
    '维修中': 'danger',
    '待清洁': 'warning',
    '封存': 'info'
  }
  return typeMap[status] || 'info'
}

// 获取类型标签类型
const getCategoryType = (category) => {
  const typeMap = {
    '教学': 'primary',
    '科研': 'success',
    '办公': 'warning'
  }
  return typeMap[category] || 'info'
}

// 获取状态图标
const getStatusIcon = (status) => {
  const iconMap = {
    '运行中': 'CircleCheckFilled',
    '维修中': 'WarningFilled',
    '待清洁': 'Clock',
    '封存': 'InfoFilled'
  }
  return iconMap[status] || 'InfoFilled'
}

// 格式化日期时间
const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.equipment-page {
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

.status-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-info, .maintenance-info, .cleaning-info {
  font-size: 12px;
  line-height: 1.2;
}

.no-archive {
  color: #909399;
  font-size: 12px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.equipment-detail {
  padding: 16px 0;
}

.archive-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.archive-section h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
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

:deep(.el-upload__tip) {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
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
}
</style> 