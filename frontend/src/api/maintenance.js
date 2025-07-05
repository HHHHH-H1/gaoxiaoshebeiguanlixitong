import api from './index'

// 获取维修记录列表
export const getMaintenanceList = (params = {}) => {
    return api.get('/maintenance', { params })
}

// 获取维修记录详情
export const getMaintenance = (id) => {
    return api.get(`/maintenance/${id}`)
}

// 创建维修记录
export const createMaintenance = (data) => {
    return api.post('/maintenance', data)
}

// 更新维修状态
export const updateMaintenanceStatus = (id, data) => {
    return api.put(`/maintenance/${id}`, data)
}

// 分配维修人员
export const assignMaintainer = (id, data) => {
    return api.put(`/maintenance/${id}/assign`, data)
}

// 完成维修
export const completeMaintenance = (id, data) => {
    return api.put(`/maintenance/${id}/complete`, data)
}

// 获取维修统计
export const getMaintenanceStats = () => {
    return api.get('/maintenance/stats')
} 