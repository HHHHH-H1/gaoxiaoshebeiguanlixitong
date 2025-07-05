import api from './index'

// 获取预约列表
export const getReservationList = (params = {}) => {
    return api.get('/reservation', { params })
}

// 获取预约详情
export const getReservation = (id) => {
    return api.get(`/reservation/${id}`)
}

// 创建预约
export const createReservation = (data) => {
    return api.post('/reservation', data)
}

// 取消预约
export const cancelReservation = (id) => {
    return api.put(`/reservation/${id}/cancel`)
}

// 审批预约（管理员和教师）
export const approveReservation = (id, data) => {
    return api.put(`/reservation/${id}/approve`, data)
}

// 完成预约
export const completeReservation = (id) => {
    return api.put(`/reservation/${id}/complete`)
}

// 获取设备可预约时间段
export const getAvailableSlots = (equipmentId, date) => {
    return api.get(`/reservation/available-slots/${equipmentId}`, {
        params: { date }
    })
}

// 获取预约统计
export const getReservationStats = () => {
    return api.get('/statistics/reservations')
} 