import api from './index'

// 获取设备列表
export const getEquipmentList = (params = {}) => {
    return api.get('/equipment', { params })
}

// 获取设备详情
export const getEquipment = (id) => {
    return api.get(`/equipment/${id}`)
}

// 创建设备
export const createEquipment = (data) => {
    return api.post('/equipment', data)
}

// 更新设备
export const updateEquipment = (id, data) => {
    return api.put(`/equipment/${id}`, data)
}

// 删除设备
export const deleteEquipment = (id) => {
    return api.delete(`/equipment/${id}`)
}

// 设备封存
export const archiveEquipment = (id, data) => {
    return api.post(`/equipment/${id}/archive`, data)
}

// 解除设备封存
export const activateEquipment = (id, data) => {
    return api.post(`/equipment/${id}/activate`, data)
}

// 导出设备数据
export const exportEquipment = () => {
    return api.get('/equipment/export', { responseType: 'blob' })
} 