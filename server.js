const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { testConnection } = require('./config/database');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// 安全性中间件
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    }
}));

// 跨域配置
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://yourdomain.com'])
        : [`http://localhost:${PORT}`, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // 24小时
}));

// 限流配置 - 开发环境放宽限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 开发环境放宽到1000个请求
    message: {
        error: '请求过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // 开发环境跳过本地请求
    skip: (req) => {
        if (process.env.NODE_ENV !== 'production') {
            const ip = req.ip || req.connection.remoteAddress;
            return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
        }
        return false;
    }
});

// 登录限流配置 - 已禁用
// const loginLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15分钟
//     max: 5, // 限制每个IP每15分钟最多5次登录尝试
//     message: {
//         error: '登录尝试次数过多，请15分钟后再试'
//     },
//     standardHeaders: true,
//     legacyHeaders: false
// });

app.use(limiter);

// 请求ID中间件（用于追踪）
app.use((req, res, next) => {
    req.requestId = Math.random().toString(36).substr(2, 9);
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

// 解析JSON和URL编码的数据
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            res.status(400).json({ error: '无效的JSON格式' });
            throw new Error('Invalid JSON');
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session配置
app.use(session({
    secret: process.env.SESSION_SECRET || 'equipment-management-secret-key-' + Math.random().toString(36),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 24小时
        sameSite: 'strict'
    },
    name: 'sessionId' // 隐藏默认的session名称
}));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 导入路由
const authRoutes = require('./routes/auth');
const equipmentRoutes = require('./routes/equipment');
const reservationRoutes = require('./routes/reservation');
const maintenanceRoutes = require('./routes/maintenance');
const statisticsRoutes = require('./routes/statistics');
const userRoutes = require('./routes/user');

// 使用路由
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/reservation', reservationRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/user', userRoutes);

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: '设备管理系统运行正常'
    });
});

// 404处理
app.use('*', (req, res) => {
    res.status(404).json({
        error: '页面未找到',
        path: req.originalUrl
    });
});

// 全局错误处理
app.use((err, req, res, next) => {
    const errorId = req.requestId || 'unknown';
    console.error(`[${errorId}] 服务器错误:`, {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // 处理特定错误类型
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: '请求数据格式错误',
            requestId: errorId
        });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            error: '文件大小超出限制',
            requestId: errorId
        });
    }

    // 开发环境返回详细错误信息
    if (process.env.NODE_ENV === 'development') {
        res.status(err.status || 500).json({
            error: '服务器内部错误',
            message: err.message,
            stack: err.stack,
            requestId: errorId
        });
    } else {
        // 生产环境返回简化错误信息
        res.status(err.status || 500).json({
            error: '服务器内部错误，请稍后再试',
            requestId: errorId
        });
    }
});

// 启动服务器
const startServer = async () => {
    try {
        // 环境检查
        if (process.env.NODE_ENV === 'production') {
            if (!process.env.SESSION_SECRET) {
                console.warn('⚠️  警告: 生产环境未设置SESSION_SECRET环境变量');
            }
            if (!process.env.DB_PASSWORD) {
                console.warn('⚠️  警告: 生产环境未设置DB_PASSWORD环境变量');
            }
        }

        // 测试数据库连接
        await testConnection();

        // 同步数据库模型
        console.log('📋 正在同步数据库模型...');
        await sequelize.sync({
            alter: process.env.NODE_ENV === 'development',
            force: false // 确保不会意外删除数据
        });
        console.log('✅ 数据库模型同步完成');

        // 启动服务器
        const server = app.listen(PORT, () => {
            console.log('🚀 服务器启动成功!');
            console.log(`📍 服务地址: http://localhost:${PORT}`);
            console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
            console.log('📊 系统状态: 运行中');
            console.log('='.repeat(50));
        });

        // 设置服务器超时
        server.timeout = 30000; // 30秒

        return server;
    } catch (error) {
        console.error('❌ 服务器启动失败:', error.message);
        process.exit(1);
    }
};

// 优雅关闭
let server;

const gracefulShutdown = async (signal) => {
    console.log(`📥 收到${signal}信号，正在关闭服务器...`);

    if (server) {
        server.close(async (err) => {
            if (err) {
                console.error('❌ 服务器关闭时出错:', err);
            } else {
                console.log('✅ HTTP服务器已关闭');
            }

            try {
                await sequelize.close();
                console.log('✅ 数据库连接已关闭');
            } catch (error) {
                console.error('❌ 数据库关闭时出错:', error);
            }

            process.exit(err ? 1 : 0);
        });

        // 强制关闭超时
        setTimeout(() => {
            console.log('❌ 强制关闭服务器');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的Promise拒绝:', reason);
    gracefulShutdown('unhandledRejection');
});

// 启动服务器
startServer().then(s => {
    server = s;
}).catch(error => {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
}); 