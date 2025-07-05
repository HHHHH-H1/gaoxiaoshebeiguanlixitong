<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside width="250px" class="sidebar">
      <div class="logo">
        <i class="el-icon-setting" style="font-size: 24px; margin-right: 8px;"></i>
        <span>设备管理系统</span>
      </div>
      
      <el-menu
        :default-active="$route.path"
        class="sidebar-menu"
        @select="handleMenuSelect"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>仪表板</span>
        </el-menu-item>
        
        <el-menu-item index="/equipment">
          <el-icon><Monitor /></el-icon>
          <span>设备管理</span>
        </el-menu-item>
        
        <el-menu-item index="/reservation">
          <el-icon><Calendar /></el-icon>
          <span>设备预约</span>
        </el-menu-item>
        
        <el-menu-item index="/maintenance">
          <el-icon><Tools /></el-icon>
          <span>故障维护</span>
        </el-menu-item>
        
        <el-menu-item index="/statistics">
          <el-icon><DataAnalysis /></el-icon>
          <span>数据统计</span>
        </el-menu-item>
        
        <el-menu-item 
          v-if="userStore.user?.role === 'admin'" 
          index="/user-management"
        >
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>{{ getBreadcrumbText() }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32" class="user-avatar">
                {{ userStore.user?.name?.charAt(0) }}
              </el-avatar>
              <span class="username">{{ userStore.user?.name }}</span>
              <span class="user-role">{{ getRoleText(userStore.user?.role) }}</span>
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 页面内容 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { 
  Odometer, 
  Monitor, 
  Calendar, 
  Tools, 
  DataAnalysis, 
  User,
  ArrowDown
} from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

onMounted(async () => {
  // 检查登录状态
  await userStore.checkAuthStatus()
})

const handleMenuSelect = (index) => {
  if (index !== route.path) {
    router.push(index)
  }
}

const handleCommand = async (command) => {
  switch (command) {
    case 'profile':
      // TODO: 打开个人信息对话框
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        await userStore.logoutUser()
        router.push('/login')
      } catch {
        // 用户取消
      }
      break
  }
}

const getBreadcrumbText = () => {
  const routeMap = {
    '/dashboard': '仪表板',
    '/equipment': '设备管理',
    '/reservation': '设备预约',
    '/maintenance': '故障维护',
    '/statistics': '数据统计',
    '/user-management': '用户管理'
  }
  return routeMap[route.path] || '首页'
}

const getRoleText = (role) => {
  const roleMap = {
    'admin': '管理员',
    'teacher': '教师',
    'student': '学生'
  }
  return roleMap[role] || role
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  border-right: 1px solid #e6e6e6;
}

.logo {
  display: flex;
  align-items: center;
  padding: 20px;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid #434a5a;
}

.sidebar-menu {
  border: none;
}

.header {
  background-color: #ffffff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.user-avatar {
  margin-right: 8px;
  background-color: #409eff;
}

.username {
  margin-right: 8px;
  font-weight: 500;
}

.user-role {
  background-color: #409eff;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  margin-right: 8px;
}

.main-content {
  background-color: #f5f7fa;
  padding: 20px;
}

:deep(.el-menu-item) {
  border-radius: 0 25px 25px 0;
  margin: 4px 0;
  margin-right: 20px;
}

:deep(.el-menu-item.is-active) {
  background-color: #409eff !important;
  color: #ffffff !important;
}
</style> 