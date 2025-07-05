const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { User, SystemLog } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logUserAction } = require('../utils/logger');

const router = express.Router();

// 认证中间件
router.use(requireAuth);

// 获取用户列表（仅管理员）
router.get('/', requireRole(['admin']), async (req, res) => {
    try {
        const { username, name, role, status, department, page = 1, limit = 20 } = req.query;

        const whereConditions = {};

        // 修复空字符串的处理问题
        if (username && username.trim() !== '') {
            whereConditions.username = { [Op.like]: `%${username}%` };
        }

        if (name && name.trim() !== '') {
            whereConditions.name = { [Op.like]: `%${name}%` };
        }

        if (role && role.trim() !== '') {
            whereConditions.role = role;
        }

        if (status !== undefined && status !== '' && status !== null) {
            whereConditions.isActive = status === 'active';
        }

        if (department && department.trim() !== '') {
            whereConditions.department = department;
        }



        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: users } = await User.findAndCountAll({
            where: whereConditions,
            attributes: ['id', 'username', 'name', 'role', 'department', 'email', 'phone', 'lastLoginAt', 'isActive', 'createdAt', 'updatedAt', 'remark'],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        res.json({
            users,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取用户统计（仅管理员）
router.get('/stats', requireRole(['admin']), async (req, res) => {
    try {
        const [adminCount, teacherCount, studentCount, totalCount] = await Promise.all([
            User.count({ where: { role: 'admin', isActive: true } }),
            User.count({ where: { role: 'teacher', isActive: true } }),
            User.count({ where: { role: 'student', isActive: true } }),
            User.count({ where: { isActive: true } })
        ]);

        res.json({
            admin: adminCount,
            teacher: teacherCount,
            student: studentCount,
            total: totalCount
        });
    } catch (error) {
        console.error('获取用户统计错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取用户详情（仅管理员）
router.get('/:id', requireRole(['admin']), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: ['id', 'username', 'name', 'role', 'department', 'email', 'phone', 'lastLoginAt', 'isActive', 'createdAt', 'updatedAt', 'remark']
        });

        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json({ user });
    } catch (error) {
        console.error('获取用户详情错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 创建用户（仅管理员）
router.post('/', requireRole(['admin']), [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('用户名长度必须在3-20个字符之间')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('用户名只能包含字母、数字和下划线'),
    body('name')
        .isLength({ min: 2, max: 20 })
        .withMessage('姓名长度必须在2-20个字符之间'),
    body('role')
        .isIn(['admin', 'teacher', 'student'])
        .withMessage('角色必须是admin、teacher或student'),
    body('department')
        .notEmpty()
        .withMessage('部门不能为空'),
    body('email')
        .isEmail()
        .withMessage('邮箱格式错误'),
    body('phone')
        .matches(/^1[3-9]\d{9}$/)
        .withMessage('手机号格式错误'),
    body('password')
        .isLength({ min: 6, max: 20 })
        .withMessage('密码长度必须在6-20个字符之间')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const { username, name, role, department, email, phone, password, remark } = req.body;

        // 检查用户名是否已存在
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        // 检查邮箱是否已存在
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(400).json({ error: '邮箱已存在' });
        }

        // 创建用户
        const user = await User.create({
            username,
            name,
            role,
            department,
            email,
            phone,
            password,
            remark,
            isActive: true
        });

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            '创建用户',
            '用户管理',
            `创建用户: ${name} (${username})`,
            req.ip,
            req.get('User-Agent')
        );

        res.status(201).json({
            message: '用户创建成功',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                department: user.department,
                email: user.email,
                phone: user.phone,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('创建用户错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 更新用户信息（仅管理员）
router.put('/:id', requireRole(['admin']), [
    body('name')
        .optional()
        .isLength({ min: 2, max: 20 })
        .withMessage('姓名长度必须在2-20个字符之间'),
    body('role')
        .optional()
        .isIn(['admin', 'teacher', 'student'])
        .withMessage('角色必须是admin、teacher或student'),
    body('department')
        .optional()
        .notEmpty()
        .withMessage('部门不能为空'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('邮箱格式错误'),
    body('phone')
        .optional()
        .matches(/^1[3-9]\d{9}$/)
        .withMessage('手机号格式错误')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 不能修改自己的角色
        if (user.id === req.session.userId && req.body.role && req.body.role !== user.role) {
            return res.status(400).json({ error: '不能修改自己的角色' });
        }

        const updateData = {};
        const allowedFields = ['name', 'role', 'department', 'email', 'phone', 'remark'];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        // 检查邮箱唯一性
        if (updateData.email && updateData.email !== user.email) {
            const existingEmail = await User.findOne({
                where: {
                    email: updateData.email,
                    id: { [Op.ne]: user.id }
                }
            });
            if (existingEmail) {
                return res.status(400).json({ error: '邮箱已存在' });
            }
        }

        await user.update(updateData);

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            '更新用户信息',
            '用户管理',
            `更新用户: ${user.name} (${user.username}) - 字段: ${Object.keys(updateData).join(', ')}`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: '用户信息更新成功',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                department: user.department,
                email: user.email,
                phone: user.phone,
                isActive: user.isActive,
                remark: user.remark
            }
        });
    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 更新个人信息
router.put('/profile', [
    body('name')
        .optional()
        .isLength({ min: 2, max: 20 })
        .withMessage('姓名长度必须在2-20个字符之间'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('邮箱格式错误'),
    body('phone')
        .optional()
        .matches(/^1[3-9]\d{9}$/)
        .withMessage('手机号格式错误')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const user = await User.findByPk(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        const updateData = {};
        const allowedFields = ['name', 'email', 'phone'];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        await user.update(updateData);

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            '更新个人信息',
            '用户管理',
            `更新字段: ${Object.keys(updateData).join(', ')}`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: '个人信息更新成功',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 删除用户（仅管理员）
router.delete('/:id', requireRole(['admin']), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 不能删除自己
        if (user.id === req.session.userId) {
            return res.status(400).json({ error: '不能删除自己的账户' });
        }

        // 不能删除其他管理员
        if (user.role === 'admin') {
            return res.status(400).json({ error: '不能删除管理员账户' });
        }

        await user.destroy();

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            '删除用户',
            '用户管理',
            `删除用户: ${user.name} (${user.username})`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({ message: '用户删除成功' });
    } catch (error) {
        console.error('删除用户错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 管理员管理用户（冻结/解冻账户）
router.put('/:id/status', requireRole(['admin']), [
    body('isActive')
        .isBoolean()
        .withMessage('账户状态必须是布尔值')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 不能操作自己的账户
        if (targetUser.id === req.session.userId) {
            return res.status(400).json({ error: '不能操作自己的账户' });
        }

        // 不能操作其他管理员账户
        if (targetUser.role === 'admin') {
            return res.status(400).json({ error: '不能操作其他管理员账户' });
        }

        const { isActive } = req.body;
        await targetUser.update({ isActive });

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            isActive ? '解冻账户' : '冻结账户',
            '用户管理',
            `目标用户: ${targetUser.name} (${targetUser.username})`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: isActive ? '账户已解冻' : '账户已冻结',
            user: {
                id: targetUser.id,
                username: targetUser.username,
                name: targetUser.name,
                isActive: targetUser.isActive
            }
        });
    } catch (error) {
        console.error('更新用户状态错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 管理员重置用户密码
router.put('/:id/reset-password', requireRole(['admin']), [
    body('newPassword')
        .optional()
        .isLength({ min: 6, max: 20 })
        .withMessage('新密码长度必须在6-20个字符之间')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 不能操作其他管理员账户
        if (targetUser.role === 'admin' && targetUser.id !== req.session.userId) {
            return res.status(400).json({ error: '不能重置其他管理员密码' });
        }

        // 如果没有提供新密码，则使用默认密码
        const newPassword = req.body.newPassword || '123456';

        await targetUser.update({ password: newPassword });

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            '重置用户密码',
            '用户管理',
            `目标用户: ${targetUser.name} (${targetUser.username})`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: '密码重置成功',
            newPassword: req.body.newPassword ? undefined : '123456'
        });
    } catch (error) {
        console.error('重置密码错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取系统日志（仅管理员）
router.get('/logs', requireRole(['admin']), async (req, res) => {
    try {
        const { action, module, userId, page = 1, limit = 50 } = req.query;

        const whereConditions = {};

        if (action) {
            whereConditions.action = { [Op.like]: `%${action}%` };
        }

        if (module) {
            whereConditions.module = module;
        }

        if (userId) {
            whereConditions.userId = userId;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: logs } = await SystemLog.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['name', 'role'],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        res.json({
            logs,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('获取系统日志错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

module.exports = router; 