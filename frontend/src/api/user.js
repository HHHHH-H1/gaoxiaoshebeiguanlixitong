import api from './index'

// 获取用户列表
export const getUserList = (params = {}) => {
    return api.get('/user', { params })
}

// 获取用户详情
export const getUser = (id) => {
    return api.get(`/user/${id}`)
}

// 创建用户
export const createUser = (data) => {
    return api.post('/user', data)
}

// 更新用户信息
export const updateUser = (id, data) => {
    return api.put(`/user/${id}`, data)
}

// 更新个人信息
export const updateProfile = (data) => {
    return api.put('/user/profile', data)
}

// 重置用户密码
export const resetUserPassword = (id, data) => {
    return api.put(`/user/${id}/reset-password`, data)
}

// 切换用户状态（启用/禁用）
export const toggleUserStatus = (id, data) => {
    return api.put(`/user/${id}/status`, data)
}

// 删除用户
export const deleteUser = (id) => {
    return api.delete(`/user/${id}`)
}

// 获取用户统计
export const getUserStats = () => {
    return api.get('/user/stats')
}

// 获取系统日志
export const getSystemLogs = (params = {}) => {
    return api.get('/user/logs', { params })
}

// 导出用户数据
export const exportUsers = () => {
    return api.get('/user/export', { responseType: 'blob' })
} 