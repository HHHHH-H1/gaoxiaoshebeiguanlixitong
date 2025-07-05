import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/Login.vue')
    },
    {
        path: '/',
        name: 'Layout',
        component: () => import('../views/Layout.vue'),
        redirect: '/dashboard',
        children: [
            {
                path: '/dashboard',
                name: 'Dashboard',
                component: () => import('../views/Dashboard.vue')
            },
            {
                path: '/equipment',
                name: 'Equipment',
                component: () => import('../views/Equipment.vue')
            },
            {
                path: '/reservation',
                name: 'Reservation',
                component: () => import('../views/Reservation.vue')
            },
            {
                path: '/maintenance',
                name: 'Maintenance',
                component: () => import('../views/Maintenance.vue')
            },
            {
                path: '/statistics',
                name: 'Statistics',
                component: () => import('../views/Statistics.vue')
            },
            {
                path: '/user-management',
                name: 'UserManagement',
                component: () => import('../views/UserManagement.vue'),
                meta: { requireAdmin: true }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
    const userStore = useUserStore()

    // 检查是否需要登录
    if (to.path !== '/login' && !userStore.isLoggedIn) {
        next('/login')
        return
    }

    // 检查管理员权限
    if (to.meta.requireAdmin && userStore.user?.role !== 'admin') {
        next('/dashboard')
        return
    }

    // 如果已登录且访问登录页，重定向到仪表板
    if (to.path === '/login' && userStore.isLoggedIn) {
        next('/dashboard')
        return
    }

    next()
})

export default router 