const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, SystemLog } = require('../models');
const { logUserAction } = require('../utils/logger');
const router = express.Router();

// 用户登录
router.post('/login', [
    body('username')
        .isLength({ min: 4, max: 20 })
        .withMessage('工号长度必须在4-20个字符之间'),
    body('password')
        .isLength({ min: 6, max: 20 })
        .withMessage('密码长度必须在6-20个字符之间')
], async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const { username, password } = req.body;

        // 查找用户
        const user = await User.findOne({
            where: { username: username.toLowerCase() }
        });

        if (!user) {
            await logUserAction(null, '登录失败', '用户认证',
                `工号: ${username}, 原因: 用户不存在`, req.ip, req.get('User-Agent'));
            return res.status(400).json({ error: '工号或密码错误' });
        }

        // 检查账户状态
        if (!user.isActive) {
            await logUserAction(user.id, '登录失败', '用户认证',
                `工号: ${username}, 原因: 账户被冻结`, req.ip, req.get('User-Agent'));
            return res.status(400).json({ error: '账户已被冻结，请联系管理员' });
        }

        // 验证密码（明文对比）
        if (password !== user.password) {
            await logUserAction(user.id, '登录失败', '用户认证',
                `工号: ${username}, 原因: 密码错误`, req.ip, req.get('User-Agent'));
            return res.status(400).json({ error: '工号或密码错误' });
        }

        // 更新最后登录时间
        await user.update({ lastLoginAt: new Date() });

        // 设置会话
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.name = user.name;
        req.session.role = user.role;
        req.session.isLoggedIn = true;

        // 记录登录日志
        await logUserAction(user.id, '用户登录', '用户认证',
            `用户 ${user.name} 登录成功`, req.ip, req.get('User-Agent'));

        res.json({
            message: '登录成功',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                lastLoginAt: user.lastLoginAt
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 用户注册
router.post('/register', [
    body('username')
        .isLength({ min: 4, max: 20 })
        .withMessage('工号长度必须在4-20个字符之间')
        .matches(/^[a-zA-Z0-9]+$/)
        .withMessage('工号只能包含字母和数字'),
    body('password')
        .isLength({ min: 6, max: 20 })
        .withMessage('密码长度必须在6-20个字符之间'),
    body('name')
        .isLength({ min: 2, max: 20 })
        .withMessage('姓名长度必须在2-20个字符之间'),
    body('role')
        .isIn(['student', 'teacher'])
        .withMessage('角色必须是学生或教师'),
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
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const { username, password, name, role, email, phone } = req.body;

        // 检查工号唯一性
        const existingUser = await User.findOne({
            where: { username: username.toLowerCase() }
        });

        if (existingUser) {
            return res.status(400).json({ error: '工号已存在' });
        }

        // 创建用户（明文密码）
        const user = await User.create({
            username: username.toLowerCase(),
            password: password,
            name,
            role,
            email,
            phone
        });

        // 记录注册日志
        await logUserAction(user.id, '用户注册', '用户认证',
            `新用户 ${name} 注册成功`, req.ip, req.get('User-Agent'));

        res.status(201).json({
            message: '注册成功',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 检查工号唯一性
router.post('/check-username', [
    body('username')
        .isLength({ min: 4, max: 20 })
        .withMessage('工号长度必须在4-20个字符之间')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const { username } = req.body;
        const existingUser = await User.findOne({
            where: { username: username.toLowerCase() }
        });

        res.json({ available: !existingUser });
    } catch (error) {
        console.error('检查工号错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 用户登出
router.post('/logout', (req, res) => {
    const userId = req.session.userId;
    const userName = req.session.name;

    req.session.destroy(async (err) => {
        if (err) {
            console.error('登出错误:', err);
            return res.status(500).json({ error: '登出失败' });
        }

        // 记录登出日志
        if (userId) {
            await logUserAction(userId, '用户登出', '用户认证',
                `用户 ${userName} 登出`, req.ip, req.get('User-Agent'));
        }

        res.json({ message: '登出成功' });
    });
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
    try {
        if (!req.session.isLoggedIn) {
            return res.status(401).json({ error: '未登录' });
        }

        const user = await User.findByPk(req.session.userId, {
            attributes: ['id', 'username', 'name', 'role', 'email', 'phone', 'lastLoginAt', 'isActive']
        });

        if (!user) {
            req.session.destroy();
            return res.status(401).json({ error: '用户不存在' });
        }

        res.json({ user });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 修改密码
router.put('/change-password', [
    body('oldPassword')
        .isLength({ min: 6, max: 20 })
        .withMessage('原密码长度必须在6-20个字符之间'),
    body('newPassword')
        .isLength({ min: 6, max: 20 })
        .withMessage('新密码长度必须在6-20个字符之间')
], async (req, res) => {
    try {
        if (!req.session.isLoggedIn) {
            return res.status(401).json({ error: '未登录' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const { oldPassword, newPassword } = req.body;
        const user = await User.findByPk(req.session.userId);

        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 验证原密码（明文对比）
        if (oldPassword !== user.password) {
            return res.status(400).json({ error: '原密码错误' });
        }

        // 更新密码（明文存储）
        await user.update({ password: newPassword });

        // 记录修改密码日志
        await logUserAction(user.id, '修改密码', '用户认证',
            `用户 ${user.name} 修改密码`, req.ip, req.get('User-Agent'));

        res.json({ message: '密码修改成功' });
    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

module.exports = router; 