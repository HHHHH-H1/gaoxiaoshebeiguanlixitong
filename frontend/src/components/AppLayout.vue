<template>
  <div class="app-layout">
    <div class="header">
      <div class="header-left">
        <div class="logo">
          <el-icon :size="20" :color="isCollapse ? '#1890ff' : '#fff'">
            <component :is="isCollapse ? 'Menu' : 'HomeFilled'" />
          </el-icon>
          <span v-show="!isCollapse">系统管理平台</span>
        </div>
      </div>
      <div class="header-right">
        <el-icon class="user-avatar" @click="handleLogout">
          <UserFilled />
        </el-icon>
      </div>
    </div>
    <div class="main-container">
      <div class="sidebar" :class="{ collapsed: isCollapse }">
        <el-menu :default-active="activeMenu" :collapse="isCollapse" :collapse-transition="false" @select="handleMenuSelect">
          <el-menu-item v-for="item in filteredMenuItems" :key="item.index" :index="item.index">
            <el-icon :size="20">
              <component :is="item.icon" />
            </el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </el-menu>
      </div>
      <div class="content">
        <!-- 状态栏 -->
        <div class="status-bar">
          <div class="status-left">
            <el-icon class="status-icon" :class="{ 'connected': dbStatus.connected, 'disconnected': !dbStatus.connected }">
              <component :is="dbStatus.connected ? 'CircleCheckFilled' : 'CircleCloseFilled'" />
            </el-icon>
            <span class="status-text">
              数据库: {{ dbStatus.connected ? '已连接' : '连接失败' }}
            </span>
            <span class="status-divider">|</span>
            <span class="status-text">
              当前用户: {{ userStore.user?.name || '未登录' }}
            </span>
            <el-tag :type="getUserRoleType(userStore.user?.role)" size="small" style="margin-left: 8px;">
              {{ getUserRoleText(userStore.user?.role) }}
            </el-tag>
          </div>
          <div class="status-right">
            <span class="status-text">系统时间: {{ currentTime }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import {
  Menu as IconMenu,
  HomeFilled,
  Monitor,
  Calendar,
  Tools,
  TrendCharts,
  UserFilled,
  Setting,
  SwitchButton,
  CircleCheckFilled,
  CircleCloseFilled
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)
const currentTime = ref('')
let timeInterval = null

// 数据库状态
const dbStatus = reactive({
  connected: true,
  lastCheck: new Date()
})

// 导航菜单项
const menuItems = [
  {
    index: '/dashboard',
    title: '仪表盘',
    icon: HomeFilled
  },
  {
    index: '/equipment',
    title: '设备管理',
    icon: Monitor
  },
  {
    index: '/reservation',
    title: '预约管理',
    icon: Calendar
  },
  {
    index: '/maintenance',
    title: '维修管理',
    icon: Tools
  },
  {
    index: '/statistics',
    title: '数据统计',
    icon: TrendCharts
  },
  {
    index: '/user-management',
    title: '用户管理',
    icon: UserFilled,
    adminOnly: true
  }
]

// 过滤菜单项（根据用户角色）
const filteredMenuItems = computed(() => {
  return menuItems.filter(item => {
    if (item.adminOnly) {
      return userStore.user?.role === 'admin'
    }
    return true
  })
})

// 处理菜单选择
const handleMenuSelect = (index) => {
  router.push(index)
}

// 退出登录
const handleLogout = async () => {
  await userStore.logout()
  router.push('/login')
}

// 更新系统时间
const updateCurrentTime = () => {
  currentTime.value = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// 检查数据库连接状态
const checkDatabaseStatus = async () => {
  try {
    // 模拟检查数据库连接
    const response = await fetch('/api/health')
    dbStatus.connected = response.ok
    dbStatus.lastCheck = new Date()
  } catch (error) {
    dbStatus.connected = false
    dbStatus.lastCheck = new Date()
  }
}

// 获取用户角色类型
const getUserRoleType = (role) => {
  const typeMap = {
    'admin': 'danger',
    'teacher': 'warning',
    'student': 'primary'
  }
  return typeMap[role] || 'info'
}

// 获取用户角色文本
const getUserRoleText = (role) => {
  const textMap = {
    'admin': '管理员',
    'teacher': '教师',
    'student': '学生'
  }
  return textMap[role] || '访客'
}

onMounted(() => {
  // 初始化时间
  updateCurrentTime()
  timeInterval = setInterval(updateCurrentTime, 1000)
  
  // 检查数据库状态
  checkDatabaseStatus()
  setInterval(checkDatabaseStatus, 30000) // 每30秒检查一次
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.app-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
  z-index: 1000;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
  color: #1890ff;
}

.toggle-btn {
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.toggle-btn:hover {
  background-color: #f5f5f5;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  cursor: pointer;
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  background: #fff;
  border-right: 1px solid #e8eaec;
  transition: width 0.3s;
  overflow-x: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.content {
  flex: 1;
  padding: 20px;
  background: #f5f5f5;
  overflow-y: auto;
}

.status-bar {
  height: 28px;
  background: #f8f9fa;
  border-top: 1px solid #e8eaec;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  font-size: 12px;
  color: #666;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  font-size: 14px;
}

.status-icon.connected {
  color: #67c23a;
}

.status-icon.disconnected {
  color: #f56c6c;
}

.status-text {
  white-space: nowrap;
}

.status-divider {
  color: #ddd;
  margin: 0 8px;
}

.status-right {
  display: flex;
  align-items: center;
}

:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
}

:deep(.el-menu-item.is-active) {
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}

:deep(.el-menu-item:hover) {
  background-color: #f5f5f5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header {
    padding: 0 12px;
  }
  
  .logo span {
    display: none;
  }
  
  .content {
    padding: 12px;
  }
  
  .status-bar {
    padding: 0 12px;
    font-size: 11px;
  }
  
  .status-left {
    gap: 4px;
  }
  
  .status-divider {
    margin: 0 4px;
  }
}
</style> 