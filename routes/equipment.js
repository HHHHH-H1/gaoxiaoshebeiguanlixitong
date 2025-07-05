const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pinyin = require('pinyin');
const { Equipment, User, EquipmentUsage } = require('../models');
const { logUserAction } = require('../utils/logger');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/equipment/');
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'equipment-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function(req, file, cb) {
        // 允许的文件类型
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('只允许上传图片和文档文件'));
        }
    }
});

// 创建设备档案目录
async function ensureUploadDir() {
    try {
        await fs.mkdir('uploads/equipment', { recursive: true });
    } catch (error) {
        console.error('创建上传目录失败:', error);
    }
}
ensureUploadDir();

// 拼音首字母转换函数
function getPinyinInitials(text) {
    try {
        return pinyin(text, {
            style: pinyin.STYLE_FIRST_LETTER,
            heteronym: false
        }).map(item => item[0]).join('');
    } catch (error) {
        return '';
    }
}

// 获取设备列表
router.get('/', [
    query('equipmentNo').optional().trim(),
    query('search').optional().trim(),
    query('status').optional().custom(value => {
        if (value === '' || value === null || value === undefined) {
            return true;
        }
        return ['运行中', '维修中', '待清洁', '封存'].includes(value);
    }),
    query('category').optional().custom(value => {
        if (value === '' || value === null || value === undefined) {
            return true;
        }
        return ['教学', '科研', '办公'].includes(value);
    }),
    query('location').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '查询参数验证失败',
                details: errors.array()
            });
        }

        const {
            equipmentNo = '',
            search = '',
            status = '',
            category = '',
            location = '',
            page = 1,
            limit = 50
        } = req.query;

        // 构建查询条件
        const whereConditions = {};

        if (equipmentNo) {
            whereConditions.equipmentNo = { [Op.like]: `%${equipmentNo}%` };
        }

        if (status) {
            whereConditions.status = status;
        }

        if (category) {
            whereConditions.category = category;
        }

        if (location) {
            whereConditions.location = { [Op.like]: `%${location}%` };
        }

        // 搜索条件（支持拼音首字母）
        if (search) {
            const searchConditions = [];

            // 普通搜索
            searchConditions.push(
                { equipmentNo: { [Op.like]: `%${search}%` } },
                { name: { [Op.like]: `%${search}%` } },
                { model: { [Op.like]: `%${search}%` } }
            );

            // 拼音首字母搜索
            const allEquipment = await Equipment.findAll({
                attributes: ['id', 'name']
            });

            const matchingIds = allEquipment
                .filter(eq => {
                    const initials = getPinyinInitials(eq.name);
                    return initials.toLowerCase().includes(search.toLowerCase());
                })
                .map(eq => eq.id);

            if (matchingIds.length > 0) {
                searchConditions.push({ id: { [Op.in]: matchingIds } });
            }

            whereConditions[Op.or] = searchConditions;
        }

        // 分页计算
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // 查询设备
        const { count, rows: equipment } = await Equipment.findAndCountAll({
            where: whereConditions,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset,
            include: [
                {
                    model: EquipmentUsage,
                    as: 'usageRecords',
                    where: { status: '使用中' },
                    required: false,
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['name', 'role']
                        }
                    ]
                }
            ]
        });

        // 记录查询日志（如果用户已登录）
        if (req.session && req.session.userId) {
            await logUserAction(
                req.session.userId,
                '查询设备',
                '设备管理',
                `查询条件: ${JSON.stringify({ equipmentNo, search, status, category, location })}`,
                req.ip,
                req.get('User-Agent')
            );
        }

        res.json({
            equipment,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('获取设备列表错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取单个设备详情
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const equipment = await Equipment.findByPk(req.params.id, {
            include: [
                {
                    model: EquipmentUsage,
                    as: 'usageRecords',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['name', 'role']
                        }
                    ],
                    order: [['createdAt', 'DESC']],
                    limit: 10
                }
            ]
        });

        if (!equipment) {
            return res.status(404).json({ error: '设备不存在' });
        }

        // 记录查看日志
        await logUserAction(
            req.session.userId,
            '查看设备详情',
            '设备管理',
            `查看设备: ${equipment.name} (${equipment.equipmentNo})`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({ equipment });
    } catch (error) {
        console.error('获取设备详情错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 创建设备（仅管理员和教师）
router.post('/', requireRole(['admin', 'teacher']), upload.single('archive'), [
    body('equipmentNo')
        .isLength({ min: 1, max: 50 })
        .withMessage('设备编号长度必须在1-50个字符之间'),
    body('name')
        .isLength({ min: 1, max: 100 })
        .withMessage('设备名称长度必须在1-100个字符之间'),
    body('model')
        .isLength({ min: 1, max: 100 })
        .withMessage('型号长度必须在1-100个字符之间'),
    body('purchaseDate')
        .isISO8601()
        .withMessage('购置日期格式错误'),
    body('location')
        .isLength({ min: 1, max: 100 })
        .withMessage('存放位置长度必须在1-100个字符之间'),
    body('category')
        .isIn(['教学', '科研', '办公'])
        .withMessage('设备类型必须是教学、科研或办公'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('设备描述不能超过1000个字符'),
    body('value')
        .optional()
        .isDecimal({ decimal_digits: '0,2' })
        .withMessage('设备价值格式错误')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const {
            equipmentNo,
            name,
            model,
            purchaseDate,
            location,
            category,
            description,
            value
        } = req.body;

        // 检查设备编号唯一性
        const existingEquipment = await Equipment.findOne({
            where: { equipmentNo }
        });

        if (existingEquipment) {
            return res.status(400).json({ error: '设备编号已存在' });
        }

        // 处理文件上传
        let archivePath = null;
        if (req.file) {
            archivePath = req.file.path;
        }

        // 创建设备
        const equipment = await Equipment.create({
            equipmentNo,
            name,
            model,
            purchaseDate,
            location,
            category,
            description,
            value: value ? parseFloat(value) : null,
            archivePath,
            status: '运行中'
        });

        // 记录创建日志
        await logUserAction(
            req.session.userId,
            '创建设备',
            '设备管理',
            `创建设备: ${name} (${equipmentNo})`,
            req.ip,
            req.get('User-Agent')
        );

        res.status(201).json({
            message: '设备创建成功',
            equipment
        });
    } catch (error) {
        console.error('创建设备错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 更新设备（仅管理员和教师）
router.put('/:id', requireAuth, requireRole(['admin', 'teacher']), upload.single('archive'), [
    body('name')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('设备名称长度必须在1-100个字符之间'),
    body('model')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('型号长度必须在1-100个字符之间'),
    body('location')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('存放位置长度必须在1-100个字符之间'),
    body('category')
        .optional()
        .isIn(['教学', '科研', '办公'])
        .withMessage('设备类型必须是教学、科研或办公'),
    body('status')
        .optional()
        .isIn(['运行中', '维修中', '待清洁', '封存'])
        .withMessage('设备状态无效'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('设备描述不能超过1000个字符'),
    body('value')
        .optional()
        .isDecimal({ decimal_digits: '0,2' })
        .withMessage('设备价值格式错误')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const equipment = await Equipment.findByPk(req.params.id);
        if (!equipment) {
            return res.status(404).json({ error: '设备不存在' });
        }

        const updateData = {};
        const allowedFields = ['name', 'model', 'location', 'category', 'status', 'description', 'value'];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        // 处理价值字段
        if (updateData.value) {
            updateData.value = parseFloat(updateData.value);
        }

        // 处理文件上传
        if (req.file) {
            // 删除旧文件
            if (equipment.archivePath) {
                try {
                    await fs.unlink(equipment.archivePath);
                } catch (error) {
                    console.error('删除旧文件失败:', error);
                }
            }
            updateData.archivePath = req.file.path;
        }

        // 更新设备
        await equipment.update(updateData);

        // 记录更新日志
        await logUserAction(
            req.session.userId,
            '更新设备',
            '设备管理',
            `更新设备: ${equipment.name} (${equipment.equipmentNo})`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: '设备更新成功',
            equipment
        });
    } catch (error) {
        console.error('更新设备错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 删除设备（仅管理员）
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
        const equipment = await Equipment.findByPk(req.params.id);
        if (!equipment) {
            return res.status(404).json({ error: '设备不存在' });
        }

        // 检查是否有关联的使用记录
        const usageCount = await EquipmentUsage.count({
            where: { equipmentId: equipment.id }
        });

        if (usageCount > 0) {
            return res.status(400).json({
                error: '该设备存在使用记录，无法删除。请考虑将设备状态设置为"封存"。'
            });
        }

        // 删除关联文件
        if (equipment.archivePath) {
            try {
                await fs.unlink(equipment.archivePath);
            } catch (error) {
                console.error('删除设备文件失败:', error);
            }
        }

        // 删除设备
        await equipment.destroy();

        // 记录删除日志
        await logUserAction(
            req.session.userId,
            '删除设备',
            '设备管理',
            `删除设备: ${equipment.name} (${equipment.equipmentNo})`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({ message: '设备删除成功' });
    } catch (error) {
        console.error('删除设备错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 设备封存（管理员和教师）
router.post('/:id/archive', requireAuth, requireRole(['admin', 'teacher']), [
    body('archiveReason')
        .notEmpty()
        .withMessage('请选择封存原因'),
    body('archiveNote')
        .isLength({ min: 5, max: 300 })
        .withMessage('封存说明长度必须在5-300个字符之间'),
    body('archivePeriod')
        .notEmpty()
        .withMessage('请选择预计封存期')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const equipment = await Equipment.findByPk(req.params.id);
        if (!equipment) {
            return res.status(404).json({ error: '设备不存在' });
        }

        if (equipment.status === '封存') {
            return res.status(400).json({ error: '设备已经处于封存状态' });
        }

        const { archiveReason, archiveNote, archivePeriod } = req.body;

        // 更新设备状态为封存
        await equipment.update({
            status: '封存'
        });

        // 记录封存操作日志
        await logUserAction(
            req.session.userId,
            '设备封存',
            '设备管理',
            `封存设备: ${equipment.name} (${equipment.equipmentNo}) - 原因: ${archiveReason}, 期限: ${archivePeriod}`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: '设备封存成功',
            equipment: {
                ...equipment.toJSON(),
                archiveInfo: {
                    reason: archiveReason,
                    note: archiveNote,
                    period: archivePeriod,
                    archivedBy: req.session.userId,
                    archivedAt: new Date()
                }
            }
        });
    } catch (error) {
        console.error('设备封存错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 解除设备封存（管理员和教师）
router.post('/:id/activate', requireAuth, requireRole(['admin', 'teacher']), [
    body('activateReason')
        .isLength({ min: 5, max: 200 })
        .withMessage('解封原因长度必须在5-200个字符之间'),
    body('statusConfirm')
        .isIn(['正常', '需检修', '需更换'])
        .withMessage('请确认设备状态')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const equipment = await Equipment.findByPk(req.params.id);
        if (!equipment) {
            return res.status(404).json({ error: '设备不存在' });
        }

        if (equipment.status !== '封存') {
            return res.status(400).json({ error: '设备不在封存状态' });
        }

        const { activateReason, statusConfirm } = req.body;

        // 根据状态确认设置新状态
        let newStatus;
        if (statusConfirm === '正常') {
            newStatus = '运行中';
        } else if (statusConfirm === '需检修' || statusConfirm === '需更换') {
            newStatus = '维修中';
        }

        // 更新设备状态
        await equipment.update({
            status: newStatus
        });

        // 记录解除封存操作日志
        await logUserAction(
            req.session.userId,
            '解除设备封存',
            '设备管理',
            `解除封存: ${equipment.name} (${equipment.equipmentNo}) - 原因: ${activateReason}, 新状态: ${newStatus}`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: '设备解除封存成功',
            equipment: {
                ...equipment.toJSON(),
                activateInfo: {
                    reason: activateReason,
                    statusConfirm: statusConfirm,
                    activatedBy: req.session.userId,
                    activatedAt: new Date()
                }
            }
        });
    } catch (error) {
        console.error('解除设备封存错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 导出设备数据
router.get('/export/csv', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
        const equipment = await Equipment.findAll({
            order: [['createdAt', 'DESC']]
        });

        // 生成CSV数据
        const csvData = [
            ['设备编号', '设备名称', '型号', '购置日期', '存放位置', '设备类型', '状态', '设备价值', '创建时间']
        ];

        equipment.forEach(eq => {
            csvData.push([
                eq.equipmentNo,
                eq.name,
                eq.model,
                eq.purchaseDate,
                eq.location,
                eq.category,
                eq.status,
                eq.value || '',
                eq.createdAt.toISOString().split('T')[0]
            ]);
        });

        // 转换为CSV字符串
        const csvString = csvData.map(row =>
            row.map(field => `"${field}"`).join(',')
        ).join('\n');

        // 记录导出日志
        await logUserAction(
            req.session.userId,
            '导出设备数据',
            '设备管理',
            `导出${equipment.length}条设备数据`,
            req.ip,
            req.get('User-Agent')
        );

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=equipment_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\ufeff' + csvString); // 添加BOM以支持中文
    } catch (error) {
        console.error('导出设备数据错误:', error);
        res.status(500).json({ error: '导出失败' });
    }
});

// 获取设备使用统计
router.get('/:id/statistics', async (req, res) => {
    try {
        const equipment = await Equipment.findByPk(req.params.id);
        if (!equipment) {
            return res.status(404).json({ error: '设备不存在' });
        }

        // 获取使用统计
        const usageStats = await EquipmentUsage.findAll({
            where: { equipmentId: equipment.id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['name', 'role']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // 计算使用时长
        let totalUsageHours = 0;
        usageStats.forEach(usage => {
            if (usage.endTime) {
                const hours = (new Date(usage.endTime) - new Date(usage.startTime)) / (1000 * 60 * 60);
                totalUsageHours += hours;
            }
        });

        res.json({
            equipment,
            statistics: {
                totalUsageCount: usageStats.length,
                totalUsageHours: Math.round(totalUsageHours * 100) / 100,
                recentUsage: usageStats.slice(0, 10)
            }
        });
    } catch (error) {
        console.error('获取设备统计错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

module.exports = router; 