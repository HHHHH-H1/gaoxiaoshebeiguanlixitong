// 认证中间件 - 检查用户是否已登录
function requireAuth(req, res, next) {
    if (!req.session || !req.session.isLoggedIn || !req.session.userId) {
        return res.status(401).json({
            error: '未登录或会话已过期',
            code: 'UNAUTHORIZED'
        });
    }
    next();
}

// 角色权限中间件 - 检查用户角色
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.session || !req.session.role) {
            return res.status(401).json({
                error: '未登录或会话已过期',
                code: 'UNAUTHORIZED'
            });
        }

        if (!allowedRoles.includes(req.session.role)) {
            return res.status(403).json({
                error: '权限不足',
                code: 'FORBIDDEN',
                requiredRoles: allowedRoles,
                userRole: req.session.role
            });
        }

        next();
    };
}

// 管理员权限中间件
function requireAdmin(req, res, next) {
    return requireRole(['admin'])(req, res, next);
}

// 教师或管理员权限中间件
function requireTeacherOrAdmin(req, res, next) {
    return requireRole(['admin', 'teacher'])(req, res, next);
}

// 检查是否为资源所有者或管理员
function requireOwnerOrAdmin(getOwnerId) {
    return async (req, res, next) => {
        try {
            // 管理员有所有权限
            if (req.session.role === 'admin') {
                return next();
            }

            // 获取资源所有者ID
            const ownerId = await getOwnerId(req);

            if (ownerId === req.session.userId) {
                return next();
            }

            return res.status(403).json({
                error: '只能操作自己的资源',
                code: 'FORBIDDEN'
            });
        } catch (error) {
            console.error('权限检查错误:', error);
            return res.status(500).json({
                error: '权限检查失败',
                code: 'INTERNAL_ERROR'
            });
        }
    };
}

// 检查账户状态
function requireActiveAccount(req, res, next) {
    // 这里可以添加账户状态检查逻辑
    // 比如检查账户是否被冻结、是否需要重新验证等
    next();
}

module.exports = {
    requireAuth,
    requireRole,
    requireAdmin,
    requireTeacherOrAdmin,
    requireOwnerOrAdmin,
    requireActiveAccount
}; 