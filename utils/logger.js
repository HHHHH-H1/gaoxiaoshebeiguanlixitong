const { SystemLog } = require('../models');

// 记录用户操作日志
async function logUserAction(userId, action, module, description, ipAddress, userAgent) {
    try {
        await SystemLog.create({
            userId,
            action,
            module,
            description,
            ipAddress,
            userAgent
        });
    } catch (error) {
        console.error('记录日志失败:', error);
    }
}

// 记录系统事件
async function logSystemEvent(action, module, description) {
    try {
        await SystemLog.create({
            userId: null,
            action,
            module,
            description,
            ipAddress: 'system',
            userAgent: 'system'
        });
    } catch (error) {
        console.error('记录系统日志失败:', error);
    }
}

module.exports = {
    logUserAction,
    logSystemEvent
}; 