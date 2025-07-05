import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
    withCredentials: true
})

// 请求拦截器
api.interceptors.request.use(
    config => {
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// 响应拦截器
api.interceptors.response.use(
    response => {
        return response.data
    },
    error => {
        if (error.response) {
            const { status, data } = error.response

            switch (status) {
                case 400:
                    // 400错误不在这里显示错误消息，让具体组件处理
                    console.warn('请求参数错误:', data)
                    break
                case 401:
                    ElMessage.error('登录已过期，请重新登录')
                    // 可以在这里处理登录过期的逻辑
                    break
                case 403:
                    ElMessage.error('没有权限访问')
                    break
                case 404:
                    ElMessage.error('请求的资源不存在')
                    break
                case 500:
                    ElMessage.error('服务器内部错误')
                    break
                default:
                    // 其他错误也不在这里统一处理，让具体组件决定
                    console.warn('请求失败:', status, data)
            }
        } else {
            ElMessage.error('网络错误，请检查网络连接')
        }

        return Promise.reject(error)
    }
)

export default api 