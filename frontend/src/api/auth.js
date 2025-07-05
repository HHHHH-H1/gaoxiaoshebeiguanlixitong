import api from './index'

// 登录
export const login = (credentials) => {
    return api.post('/auth/login', credentials)
}

// 注册
export const register = (userData) => {
    return api.post('/auth/register', userData)
}

// 登出
export const logout = () => {
    return api.post('/auth/logout')
}

// 检查认证状态
export const checkAuth = () => {
    return api.get('/auth/me')
}

// 检查用户名可用性
export const checkUsername = (username) => {
    return api.post('/auth/check-username', { username })
} 