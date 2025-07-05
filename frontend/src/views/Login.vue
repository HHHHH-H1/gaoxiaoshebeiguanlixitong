<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>高校设备管理系统</h1>
        <p>欢迎登录</p>
      </div>
      
      <el-tabs v-model="activeTab" class="login-tabs">
        <el-tab-pane label="登录" name="login">
          <el-form 
            ref="loginFormRef" 
            :model="loginForm" 
            :rules="loginRules"
            @submit.prevent="handleLogin"
          >
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="请输入工号"
                size="large"
                :prefix-icon="User"
              />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                :prefix-icon="Lock"
                @keyup.enter="handleLogin"
                show-password
              />
            </el-form-item>
            <el-form-item>
              <el-button 
                type="primary" 
                size="large" 
                :loading="loading"
                @click="handleLogin"
                style="width: 100%"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="注册" name="register">
          <el-form 
            ref="registerFormRef" 
            :model="registerForm" 
            :rules="registerRules"
            @submit.prevent="handleRegister"
          >
            <el-form-item prop="username">
              <el-input
                v-model="registerForm.username"
                placeholder="请输入工号"
                size="large"
                :prefix-icon="User"
                @blur="checkUsernameAvailable"
              />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                :prefix-icon="Lock"
                show-password
              />
            </el-form-item>
            <el-form-item prop="name">
              <el-input
                v-model="registerForm.name"
                placeholder="请输入真实姓名"
                size="large"
              />
            </el-form-item>
            <el-form-item prop="role">
              <el-select 
                v-model="registerForm.role" 
                placeholder="请选择角色"
                size="large"
                style="width: 100%"
              >
                <el-option label="学生" value="student" />
                <el-option label="教师" value="teacher" />
              </el-select>
            </el-form-item>
            <el-form-item prop="email">
              <el-input
                v-model="registerForm.email"
                placeholder="请输入邮箱（可选）"
                size="large"
                :prefix-icon="Message"
              />
            </el-form-item>
            <el-form-item>
              <el-button 
                type="primary" 
                size="large" 
                :loading="loading"
                @click="handleRegister"
                style="width: 100%"
              >
                注册
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Message } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { register, checkUsername } from '../api/auth'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('login')
const loading = ref(false)
const loginFormRef = ref()
const registerFormRef = ref()

// 登录表单
const loginForm = reactive({
  username: '',
  password: ''
})

const loginRules = {
  username: [
    { required: true, message: '请输入工号', trigger: 'blur' },
    { min: 4, max: 20, message: '工号长度在4-20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在6-20个字符', trigger: 'blur' }
  ]
}

// 注册表单
const registerForm = reactive({
  username: '',
  password: '',
  name: '',
  role: '',
  email: ''
})

const registerRules = {
  username: [
    { required: true, message: '请输入工号', trigger: 'blur' },
    { min: 4, max: 20, message: '工号长度在4-20个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9]+$/, message: '工号只能包含字母和数字', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在6-20个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2-20个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
}

// 防抖计时器
let loginDebounce = null

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value || loading.value) return
  
  // 防抖：如果已有登录请求在进行，取消新的请求
  if (loginDebounce) {
    clearTimeout(loginDebounce)
  }
  
  // 设置防抖延迟
  loginDebounce = setTimeout(async () => {
    try {
      await loginFormRef.value.validate()
      loading.value = true
      
      await userStore.loginUser(loginForm)
      ElMessage.success('登录成功！')
      router.push('/dashboard')
    } catch (error) {
      console.error('登录失败:', error)
      
      // 详细的错误处理
      if (error.response) {
        const { status, data } = error.response
        
        switch (status) {
          case 429:
            ElMessage.error('登录请求过于频繁，请稍后再试（15分钟内限制）')
            break
          case 401:
            ElMessage.error('用户名或密码错误')
            break
          case 403:
            ElMessage.error('账户被禁用，请联系管理员')
            break
          case 500:
            ElMessage.error('服务器错误，请稍后重试')
            break
          default:
            ElMessage.error(data?.error || '登录失败，请重试')
        }
      } else {
        ElMessage.error('网络错误，请检查网络连接')
      }
    } finally {
      loading.value = false
      loginDebounce = null
    }
  }, 300) // 300ms防抖延迟
}

// 处理注册
const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  try {
    await registerFormRef.value.validate()
    loading.value = true
    
    await register(registerForm)
    ElMessage.success('注册成功！请登录')
    activeTab.value = 'login'
  } catch (error) {
    console.error('注册失败:', error)
  } finally {
    loading.value = false
  }
}

// 检查用户名可用性
const checkUsernameAvailable = async () => {
  if (!registerForm.username || registerForm.username.length < 4) return
  
  try {
    const response = await checkUsername(registerForm.username)
    if (!response.available) {
      ElMessage.warning('该工号已被使用')
    }
  } catch (error) {
    console.error('检查用户名失败:', error)
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  color: #1f2937;
  margin-bottom: 8px;
  font-size: 24px;
  font-weight: 700;
}

.login-header p {
  color: #6b7280;
  font-size: 16px;
}

.login-tabs {
  margin-top: 24px;
}

:deep(.el-tabs__header) {
  margin: 0 0 32px 0;
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 500;
}
</style> 