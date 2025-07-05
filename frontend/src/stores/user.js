import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login, logout, checkAuth } from '../api/auth'

export const useUserStore = defineStore('user', () => {
    const user = ref(null)
    const isLoggedIn = ref(false)

    // 登录
    const loginUser = async (credentials) => {
        try {
            const response = await login(credentials)
            user.value = response.user
            isLoggedIn.value = true
            return response
        } catch (error) {
            throw error
        }
    }

    // 登出
    const logoutUser = async () => {
        try {
            await logout()
        } catch (error) {
            console.warn('登出API调用失败:', error)
        } finally {
            user.value = null
            isLoggedIn.value = false
        }
    }

    // 检查认证状态
    const checkAuthStatus = async () => {
        try {
            const response = await checkAuth()
            user.value = response.user
            isLoggedIn.value = true
            return true
        } catch (error) {
            user.value = null
            isLoggedIn.value = false
            return false
        }
    }

    return {
        user,
        isLoggedIn,
        loginUser,
        logoutUser,
        checkAuthStatus
    }
}) 