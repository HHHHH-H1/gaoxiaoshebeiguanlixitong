import api from './index'

// 获取设备统计
export const getEquipmentStats = (params = {}) => {
    return api.get('/statistics/equipment', { params })
}

// 获取预约统计
export const getReservationStats = (params = {}) => {
    return api.get('/statistics/reservations', { params })
}

// 获取维修统计
export const getMaintenanceStats = (params = {}) => {
    return api.get('/statistics/maintenance', { params })
}

// 获取设备利用率统计
export const getUtilizationStats = (params = {}) => {
    return api.get('/statistics/utilization', { params })
}

// 获取使用趋势数据
export const getTrendsData = (params = {}) => {
    return api.get('/statistics/trends', { params })
}

// 获取热门设备排行
export const getPopularEquipment = (params = {}) => {
    return api.get('/statistics/popular-equipment', { params })
}

// 获取用户活跃度统计
export const getUserActivity = (params = {}) => {
    return api.get('/statistics/user-activity', { params })
}

// 获取部门统计
export const getDepartmentStats = (params = {}) => {
    return api.get('/statistics/departments', { params })
}

// 获取设备详细统计列表
export const getEquipmentDetailStats = (params = {}) => {
    return api.get('/statistics/equipment-details', { params })
}

// 获取概览统计
export const getOverviewStats = (params = {}) => {
    return api.get('/statistics/overview', { params })
} 