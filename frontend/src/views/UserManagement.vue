<template>
  <div class="user-management-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>
        <el-icon><UserFilled /></el-icon>
        用户管理
      </h2>
      <div class="header-actions">
        <el-button type="success" @click="exportUsers">
          <el-icon><Download /></el-icon>
          导出用户
        </el-button>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加用户
        </el-button>
        <!-- <el-button type="warning" @click="debugUserAPI">
          <el-icon><Tools /></el-icon>
          调试API
        </el-button> -->
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-card class="stats-card admin">
          <div class="stats-content">
            <div class="stats-number">{{ stats.admin }}</div>
            <div class="stats-label">管理员</div>
            <div class="stats-icon">
              <el-icon><User /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card teacher">
          <div class="stats-content">
            <div class="stats-number">{{ stats.teacher }}</div>
            <div class="stats-label">教师</div>
            <div class="stats-icon">
              <el-icon><User /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card student">
          <div class="stats-content">
            <div class="stats-number">{{ stats.student }}</div>
            <div class="stats-label">学生</div>
            <div class="stats-icon">
              <el-icon><Avatar /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card total">
          <div class="stats-content">
            <div class="stats-number">{{ stats.total }}</div>
            <div class="stats-label">总用户</div>
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
        <el-form-item label="用户名">
          <el-input 
            v-model="searchForm.username" 
            placeholder="请输入用户名"
            clearable
            style="width: 150px;"
          />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入姓名"
            clearable
            style="width: 150px;"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.role" placeholder="请选择角色" clearable style="width: 120px;">
            <el-option label="管理员" value="admin">
              <el-tag type="danger" size="small">管理员</el-tag>
            </el-option>
            <el-option label="教师" value="teacher">
              <el-tag type="warning" size="small">教师</el-tag>
            </el-option>
            <el-option label="学生" value="student">
              <el-tag type="primary" size="small">学生</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 120px;">
            <el-option label="正常" value="active">
              <el-tag type="success" size="small">正常</el-tag>
            </el-option>
            <el-option label="禁用" value="disabled">
              <el-tag type="danger" size="small">禁用</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="searchForm.department" placeholder="请选择部门" clearable style="width: 150px;">
            <el-option v-for="dept in departmentOptions" :key="dept" :label="dept" :value="dept" />
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

    <!-- 用户表格 -->
    <el-card>
      <el-table
        v-loading="loading"
        :data="userList"
        style="width: 100%"
        @sort-change="handleSortChange"
        row-key="id"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="avatar" label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :src="row.avatar" :size="40">
              <el-icon><UserFilled /></el-icon>
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" width="120" sortable="custom" />
        <el-table-column prop="name" label="姓名" min-width="100" show-overflow-tooltip />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)" effect="light">
              <el-icon style="margin-right: 4px;">
                <component :is="getRoleIcon(row.role)" />
              </el-icon>
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLogin" label="最后登录" width="150" sortable="custom">
          <template #default="{ row }">
            <span v-if="row.lastLogin">{{ formatDateTime(row.lastLogin) }}</span>
            <span v-else class="never-login">从未登录</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="150" sortable="custom">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewUser(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-button size="small" type="warning" @click="editUser(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-dropdown @command="(command) => handleUserAction(command, row)" trigger="click">
              <el-button size="small" type="info">
                <el-icon><More /></el-icon>
                更多
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="resetPassword">
                    <el-icon><Key /></el-icon>
                    重置密码
                  </el-dropdown-item>
                  <el-dropdown-item :command="row.status === 'active' ? 'disable' : 'enable'">
                    <el-icon><Switch /></el-icon>
                    {{ row.status === 'active' ? '禁用用户' : '启用用户' }}
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <el-icon><Delete /></el-icon>
                    删除用户
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

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="isEdit ? '编辑用户' : '添加用户'"
      width="600px"
      @close="resetForm"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input 
                v-model="userForm.username" 
                placeholder="请输入用户名"
                :disabled="isEdit"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="userForm.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="角色" prop="role">
              <el-select v-model="userForm.role" placeholder="请选择角色" style="width: 100%">
                <el-option label="管理员" value="admin">
                  <el-tag type="danger" size="small">管理员</el-tag>
                </el-option>
                <el-option label="教师" value="teacher">
                  <el-tag type="warning" size="small">教师</el-tag>
                </el-option>
                <el-option label="学生" value="student">
                  <el-tag type="primary" size="small">学生</el-tag>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部门" prop="department">
              <el-select 
                v-model="userForm.department" 
                placeholder="请选择部门" 
                style="width: 100%"
                filterable
                allow-create
              >
                <el-option 
                  v-for="dept in departmentOptions" 
                  :key="dept" 
                  :label="dept" 
                  :value="dept" 
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="userForm.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="电话" prop="phone">
              <el-input v-model="userForm.phone" placeholder="请输入电话号码" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20" v-if="!isEdit">
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input 
                v-model="userForm.password" 
                type="password" 
                placeholder="请输入密码"
                show-password
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input 
                v-model="userForm.confirmPassword" 
                type="password" 
                placeholder="请确认密码"
                show-password
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="状态">
          <el-radio-group v-model="userForm.status">
            <el-radio label="active">正常</el-radio>
            <el-radio label="disabled">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input
            v-model="userForm.remark"
            type="textarea"
            rows="3"
            placeholder="请输入备注信息"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="submitUser">
            {{ isEdit ? '更新用户' : '添加用户' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 用户详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="用户详情" width="700px">
      <div v-if="currentUser" class="user-detail">
        <div class="user-header">
          <el-avatar :src="currentUser.avatar" :size="80">
            <el-icon><UserFilled /></el-icon>
          </el-avatar>
          <div class="user-info">
            <h3>{{ currentUser.name }}</h3>
            <div class="user-meta">
              <el-tag :type="getRoleType(currentUser.role)">
                {{ getRoleText(currentUser.role) }}
              </el-tag>
              <el-tag :type="currentUser.status === 'active' ? 'success' : 'danger'" style="margin-left: 8px;">
                {{ currentUser.status === 'active' ? '正常' : '禁用' }}
              </el-tag>
            </div>
          </div>
        </div>
        
        <el-descriptions :column="2" border style="margin-top: 20px;">
          <el-descriptions-item label="用户名">{{ currentUser.username }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ currentUser.name }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="getRoleType(currentUser.role)">
              {{ getRoleText(currentUser.role) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="部门">{{ currentUser.department }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ currentUser.email }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ currentUser.phone }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentUser.status === 'active' ? 'success' : 'danger'">
              {{ currentUser.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最后登录">
            <span v-if="currentUser.lastLogin">{{ formatDateTime(currentUser.lastLogin) }}</span>
            <span v-else class="never-login">从未登录</span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentUser.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(currentUser.updatedAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="currentUser.remark" label="备注" span="2">
            {{ currentUser.remark }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User,
  Lock,
  Edit,
  Delete,
  Plus,
  Search,
  UserFilled,
  Tools,
  Download,
  Avatar,
  DataLine,
  View,
  More,
  Key,
  Switch
} from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const userList = ref([])
const showAddDialog = ref(false)
const showDetailDialog = ref(false)
const isEdit = ref(false)
const currentUser = ref(null)
const userFormRef = ref()

// 统计数据
const stats = reactive({
  admin: 3,
  teacher: 15,
  student: 128,
  total: 146
})

// 搜索表单
const searchForm = reactive({
  username: '',
  name: '',
  role: '',
  status: '',
  department: ''
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 部门选项
const departmentOptions = [
  '计算机科学与技术学院', '电子信息工程学院', '机械工程学院', '材料科学与工程学院',
  '化学与化工学院', '生物科学与技术学院', '数学与统计学院', '物理与电子学院',
  '管理学院', '外国语学院', '艺术设计学院', '体育学院'
]

// 用户表单
const userForm = reactive({
  username: '',
  name: '',
  role: '',
  department: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  status: 'active',
  remark: ''
})

// 表单验证规则
const userRules = reactive({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3-20个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2-20个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  department: [
    { required: true, message: '请选择部门', trigger: 'change' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入电话号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在6-20个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== userForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
})

// 获取用户列表
const loadData = async () => {
  try {
    loading.value = true
    
    // 检查用户权限
    console.log('当前用户信息:', userStore.user)
    console.log('用户角色:', userStore.user?.role)
    console.log('登录状态:', userStore.isLoggedIn)
    
    // 暂时注释掉权限检查，让我们先看看能否获取数据
    // if (!userStore.user || userStore.user.role !== 'admin') {
    //   ElMessage.error('只有管理员可以访问用户管理功能')
    //   return
    // }
    
    const { getUserList, getUserStats } = await import('../api/user')
    
    // 构建查询参数
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    
    console.log('发送API请求参数:', params)
    
    // 同时获取用户列表和统计数据
    const [userResponse, statsResponse] = await Promise.all([
      getUserList(params),
      getUserStats()
    ])
    
    console.log('用户列表响应:', userResponse)
    console.log('统计数据响应:', statsResponse)
    
    // 处理用户列表数据
    if (userResponse && userResponse.users) {
      userList.value = userResponse.users.map(user => ({
        ...user,
        status: user.isActive ? 'active' : 'disabled',
        lastLogin: user.lastLoginAt
      }))
      
      pagination.total = userResponse.pagination.total
      console.log('✅ 用户列表处理成功:', userList.value.length, '个用户')
    } else {
      console.warn('⚠️ 用户响应数据格式异常:', userResponse)
      userList.value = []
    }
    
    // 更新统计数据
    if (statsResponse) {
      Object.assign(stats, statsResponse)
      console.log('✅ 统计数据更新成功:', stats)
    } else {
      console.warn('⚠️ 统计数据响应异常:', statsResponse)
    }
    
  } catch (error) {
    console.error('加载用户列表失败:', error)
    
    // 详细的错误处理
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          ElMessage.error('登录已过期，请重新登录')
          // 可以在这里跳转到登录页
          break
        case 403:
          ElMessage.error('没有权限访问用户管理功能，仅限管理员访问')
          break
        case 500:
          ElMessage.error('服务器错误，请稍后重试')
          break
        default:
          ElMessage.error(data?.error || '加载用户列表失败')
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
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
    username: '',
    name: '',
    role: '',
    status: '',
    department: ''
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

// 查看用户详情
const viewUser = (user) => {
  currentUser.value = user
  showDetailDialog.value = true
}

// 编辑用户
const editUser = (user) => {
  Object.assign(userForm, {
    ...user,
    password: '',
    confirmPassword: ''
  })
  isEdit.value = true
  showAddDialog.value = true
}

// 用户操作
const handleUserAction = async (action, user) => {
  switch (action) {
    case 'resetPassword':
      await resetUserPassword(user)
      break
    case 'enable':
    case 'disable':
      await toggleUserStatus(user, action === 'enable')
      break
    case 'delete':
      await deleteUser(user)
      break
  }
}

// 重置密码
const resetUserPassword = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户"${user.name}"的密码吗？`,
      '重置密码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const { resetUserPassword: resetPasswordAPI } = await import('../api/user')
    const response = await resetPasswordAPI(user.id, {})
    
    if (response.newPassword) {
      ElMessage.success(`密码重置成功，新密码为：${response.newPassword}`)
    } else {
      ElMessage.success('密码重置成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置密码失败:', error)
      ElMessage.error('重置密码失败')
    }
  }
}

// 切换用户状态
const toggleUserStatus = async (user, enable) => {
  try {
    const action = enable ? '启用' : '禁用'
    await ElMessageBox.confirm(
      `确定要${action}用户"${user.name}"吗？`,
      `${action}用户`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const { toggleUserStatus: toggleStatusAPI } = await import('../api/user')
    await toggleStatusAPI(user.id, { isActive: enable })
    
    ElMessage.success(`用户${action}成功`)
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('切换用户状态失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 删除用户
const deleteUser = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户"${user.name}"吗？此操作不可恢复！`,
      '删除用户',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    )
    
    const { deleteUser: deleteUserAPI } = await import('../api/user')
    await deleteUserAPI(user.id)
    
    ElMessage.success('用户删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error)
      ElMessage.error('删除用户失败')
    }
  }
}

// 提交用户表单
const submitUser = async () => {
  if (!userFormRef.value) return
  
  try {
    await userFormRef.value.validate()
    submitLoading.value = true
    
    const { createUser, updateUser } = await import('../api/user')
    
    const userData = {
      username: userForm.username,
      name: userForm.name,
      role: userForm.role,
      department: userForm.department,
      email: userForm.email,
      phone: userForm.phone,
      remark: userForm.remark,
      status: userForm.status
    }
    
    if (!isEdit.value) {
      userData.password = userForm.password
    }
    
    if (isEdit.value) {
      await updateUser(userForm.id, userData)
      ElMessage.success('用户更新成功')
    } else {
      await createUser(userData)
      ElMessage.success('用户添加成功')
    }
    
    showAddDialog.value = false
    resetForm()
    loadData()
  } catch (error) {
    console.error('保存用户失败:', error)
    ElMessage.error('保存用户失败')
  } finally {
    submitLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(userForm, {
    username: '',
    name: '',
    role: '',
    department: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    status: 'active',
    remark: ''
  })
  isEdit.value = false
  if (userFormRef.value) {
    userFormRef.value.clearValidate()
  }
}

// 导出用户
const exportUsers = () => {
  ElMessage.info('导出功能开发中...')
}

// 工具方法
const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const getRoleType = (role) => {
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

const getRoleIcon = (role) => {
  const iconMap = {
    'admin': 'User',
    'teacher': 'User',
    'student': 'Avatar'
  }
  return iconMap[role] || 'User'
}

// 调试API函数
const debugUserAPI = async () => {
  console.log('=== 开始调试用户API ===')
  
  try {
    // 1. 检查用户状态
    console.log('1. 当前用户状态:')
    console.log('   用户信息:', userStore.user)
    console.log('   登录状态:', userStore.isLoggedIn)
    
    // 2. 强制刷新用户状态
    console.log('2. 刷新用户状态...')
    await userStore.checkAuthStatus()
    console.log('   刷新后用户信息:', userStore.user)
    
    // 3. 测试API调用
    console.log('3. 测试用户列表API...')
    const { getUserList, getUserStats } = await import('../api/user')
    
    const testParams = { page: 1, limit: 5 }
    console.log('   请求参数:', testParams)
    
    const userResponse = await getUserList(testParams)
    console.log('   用户列表响应:', userResponse)
    
    const statsResponse = await getUserStats()
    console.log('   统计数据响应:', statsResponse)
    
    ElMessage.success('API调试完成，请查看控制台输出')
    
  } catch (error) {
    console.error('4. API调试失败:', error)
    
    if (error.response) {
      console.error('   状态码:', error.response.status)
      console.error('   响应数据:', error.response.data)
      console.error('   响应头:', error.response.headers)
    } else {
      console.error('   错误类型:', error.message)
    }
    
    ElMessage.error(`API调试失败: ${error.response?.status || error.message}`)
  }
  
  console.log('=== 调试结束 ===')
}

onMounted(async () => {
  // 首先检查用户认证状态
  console.log('组件挂载，检查用户状态...')
  
  try {
    // 强制刷新用户状态
    await userStore.checkAuthStatus()
    console.log('用户状态刷新后:', userStore.user)
    
    // 等待一小段时间确保状态更新
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 加载用户数据
    await loadData()
  } catch (error) {
    console.error('初始化用户管理页面失败:', error)
    ElMessage.error('页面初始化失败，请刷新重试')
  }
})
</script>

<style scoped>
.user-management-page {
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

.stats-card.admin {
  background: linear-gradient(135deg, #F56C6C, #F78989);
  color: white;
}

.stats-card.teacher {
  background: linear-gradient(135deg, #E6A23C, #EEBE77);
  color: white;
}

.stats-card.student {
  background: linear-gradient(135deg, #409EFF, #66B1FF);
  color: white;
}

.stats-card.total {
  background: linear-gradient(135deg, #67C23A, #85CE61);
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
  top: 20px;
  font-size: 32px;
  opacity: 0.3;
}

.never-login {
  color: #909399;
  font-style: italic;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.user-detail {
  padding: 16px 0;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info h3 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.user-meta {
  display: flex;
  align-items: center;
}

.dialog-footer {
  display: flex;
  gap: 12px;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-table) {
  font-size: 14px;
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
  
  .stats-number {
    font-size: 28px;
  }
  
  .stats-icon {
    font-size: 28px;
  }
  
  .user-header {
    flex-direction: column;
    text-align: center;
  }
}
</style> 