const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Maintenance, Equipment, User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logUserAction } = require('../utils/logger');

const router = express.Router();

// 获取维修统计 - 不需要登录
router.get('/stats', async (req, res) => {
    try {
        // 获取各种状态的维修记录数量（所有记录，不区分用户）
        const [pending, processing, completed, total] = await Promise.all([
            Maintenance.count({ where: { status: '待分配' } }),
            Maintenance.count({ where: { status: '维修中' } }),
            Maintenance.count({ where: { status: '已完成' } }),
            Maintenance.count({})
        ]);

        res.json({
            pending,
            processing,
            completed,
            total
        });
    } catch (error) {
        console.error('获取维修统计错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 认证中间件 - 其他路由需要登录
router.use(requireAuth);

// 创建维修报修
router.post('/', [
    body('equipmentId')
        .isInt({ min: 1 })
        .withMessage('设备ID无效'),
    body('faultDescription')
        .isLength({ min: 10, max: 1000 })
        .withMessage('故障描述长度必须在10-1000个字符之间'),
    body('priority')
        .optional()
        .isIn(['低', '中', '高', '紧急'])
        .withMessage('优先级无效'),
    body('faultType')
        .optional()
        .isIn(['硬件故障', '软件故障', '操作异常', '性能下降', '其他问题'])
        .withMessage('故障类型无效'),
    body('contactPhone')
        .optional()
        .matches(/^1[3-9]\d{9}$/)
        .withMessage('联系电话格式错误')
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
            equipmentId,
            faultDescription,
            priority = '中',
            faultType = '其他问题',
            contactPhone,
            description
        } = req.body;

        // 检查设备是否存在
        const equipment = await Equipment.findByPk(equipmentId);
        if (!equipment) {
            return res.status(404).json({ error: '设备不存在' });
        }

        // 生成工单编号
        const ticketNo = 'MT' + Date.now();

        // 创建维修记录
        const maintenance = await Maintenance.create({
            ticketNo,
            equipmentId,
            reporterId: req.session.userId,
            faultDescription: description || faultDescription,
            faultType,
            priority,
            urgency: priority, // 兼容前端字段
            contactPhone,
            status: '待分配'
        });

        // 更新设备状态为维修中
        await equipment.update({ status: '维修中' });

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            '提交维修报修',
            '维修管理',
            `设备: ${equipment.name} (${equipment.equipmentNo})`,
            req.ip,
            req.get('User-Agent')
        );

        res.status(201).json({
            message: '维修报修提交成功',
            ticketNo,
            maintenance
        });
    } catch (error) {
        console.error('创建维修记录错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取维修记录列表
router.get('/', async (req, res) => {
    try {
        const {
            status,
            priority,
            faultType,
            ticketNo,
            equipmentName,
            urgency,
            page = 1,
            limit = 20
        } = req.query;

        const whereConditions = {};

        if (status) {
            whereConditions.status = status;
        }

        if (priority) {
            whereConditions.priority = priority;
        }

        if (urgency) {
            whereConditions.urgency = urgency;
        }

        if (faultType) {
            whereConditions.faultType = faultType;
        }

        if (ticketNo) {
            whereConditions.ticketNo = {
                [Op.like]: `%${ticketNo}%`
            };
        }

        // 设备名称搜索条件
        let equipmentCondition = {};
        if (equipmentName) {
            equipmentCondition = {
                name: {
                    [Op.like]: `%${equipmentName}%`
                }
            };
        }

        // 如果不是管理员，只能看到自己的报修记录
        if (req.session.role !== 'admin') {
            whereConditions.reporterId = req.session.userId;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: maintenanceList } = await Maintenance.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: Equipment,
                    as: 'equipment',
                    attributes: ['equipmentNo', 'name', 'model', 'location'],
                    where: equipmentCondition,
                    required: equipmentName ? true : false
                },
                {
                    model: User,
                    as: 'reporter',
                    attributes: ['name', 'role']
                },
                {
                    model: User,
                    as: 'maintainer',
                    attributes: ['name'],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        // 格式化数据以匹配前端需求
        const formattedList = maintenanceList.map(item => ({
            id: item.id,
            ticketNo: item.ticketNo,
            equipmentName: item.equipment?.name || '',
            equipmentNo: item.equipment?.equipmentNo || '',
            faultType: item.faultType,
            urgency: item.urgency || item.priority,
            status: item.status,
            reporter: item.reporter?.name || '',
            maintainer: item.maintainer?.name || null,
            reportTime: item.createdAt,
            expectedTime: item.estimatedCompletion,
            completedTime: item.actualCompletion,
            progress: getMaintenanceProgress(item.status),
            description: item.faultDescription,
            solution: item.repairDescription,
            contactPhone: item.contactPhone,
            images: [], // 图片功能暂未实现
            maintenanceRecords: [] // 维修记录暂未实现
        }));

        res.json({
            maintenance: formattedList,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('获取维修记录错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取单个维修记录详情
router.get('/:id', async (req, res) => {
    try {
        const maintenance = await Maintenance.findByPk(req.params.id, {
            include: [
                {
                    model: Equipment,
                    as: 'equipment',
                    attributes: ['equipmentNo', 'name', 'model', 'location']
                },
                {
                    model: User,
                    as: 'reporter',
                    attributes: ['name', 'role', 'department']
                },
                {
                    model: User,
                    as: 'maintainer',
                    attributes: ['name', 'role'],
                    required: false
                }
            ]
        });

        if (!maintenance) {
            return res.status(404).json({ error: '维修记录不存在' });
        }

        // 权限检查：非管理员只能查看自己的报修记录
        if (req.session.role !== 'admin' && maintenance.reporterId !== req.session.userId) {
            return res.status(403).json({ error: '无权访问此维修记录' });
        }

        const formattedMaintenance = {
            id: maintenance.id,
            ticketNo: maintenance.ticketNo,
            equipmentName: maintenance.equipment?.name || '',
            equipmentNo: maintenance.equipment?.equipmentNo || '',
            faultType: maintenance.faultType,
            urgency: maintenance.urgency || maintenance.priority,
            status: maintenance.status,
            reporter: maintenance.reporter?.name || '',
            maintainer: maintenance.maintainer?.name || null,
            reportTime: maintenance.createdAt,
            expectedTime: maintenance.estimatedCompletion,
            completedTime: maintenance.actualCompletion,
            progress: getMaintenanceProgress(maintenance.status),
            description: maintenance.faultDescription,
            solution: maintenance.repairDescription,
            contactPhone: maintenance.contactPhone,
            cost: maintenance.cost,
            images: [], // 图片功能暂未实现
            maintenanceRecords: [] // 维修记录暂未实现
        };

        res.json(formattedMaintenance);
    } catch (error) {
        console.error('获取维修记录详情错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 更新维修状态（管理员和技术人员）
router.put('/:id', requireRole(['admin', 'teacher']), [
    body('status')
        .optional()
        .isIn(['待分配', '维修中', '待验收', '已完成', '已关闭'])
        .withMessage('维修状态无效'),
    body('maintainerId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('维修人员ID无效'),
    body('repairDescription')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('维修描述不能超过1000个字符'),
    body('estimatedCompletion')
        .optional()
        .isISO8601()
        .withMessage('预计完成时间格式错误'),
    body('cost')
        .optional()
        .isDecimal({ decimal_digits: '0,2' })
        .withMessage('维修费用格式错误')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const maintenance = await Maintenance.findByPk(req.params.id, {
            include: [
                {
                    model: Equipment,
                    as: 'equipment'
                }
            ]
        });

        if (!maintenance) {
            return res.status(404).json({ error: '维修记录不存在' });
        }

        const updateData = {};
        const allowedFields = ['status', 'maintainerId', 'repairDescription', 'estimatedCompletion', 'cost'];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        // 如果状态变为已完成，设置实际完成时间
        if (updateData.status === '已完成') {
            updateData.actualCompletion = new Date();

            // 更新设备状态为运行中
            await maintenance.equipment.update({ status: '运行中' });
        }

        await maintenance.update(updateData);

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            '更新维修状态',
            '维修管理',
            `维修记录ID: ${maintenance.id}, 新状态: ${updateData.status || maintenance.status}`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: '维修记录更新成功',
            maintenance
        });
    } catch (error) {
        console.error('更新维修记录错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 分配维修人员
router.put('/:id/assign', requireRole(['admin', 'teacher']), [
    body('maintainerId')
        .isInt({ min: 1 })
        .withMessage('维修人员ID无效'),
    body('estimatedCompletion')
        .optional()
        .isISO8601()
        .withMessage('预计完成时间格式错误')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const { maintainerId, estimatedCompletion } = req.body;

        // 检查维修记录是否存在
        const maintenance = await Maintenance.findByPk(req.params.id);
        if (!maintenance) {
            return res.status(404).json({ error: '维修记录不存在' });
        }

        // 检查维修人员是否存在
        const maintainer = await User.findByPk(maintainerId);
        if (!maintainer) {
            return res.status(404).json({ error: '维修人员不存在' });
        }

        // 更新维修记录
        await maintenance.update({
            maintainerId,
            estimatedCompletion,
            status: '维修中'
        });

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            '分配维修人员',
            '维修管理',
            `维修记录ID: ${maintenance.id}, 维修人员: ${maintainer.name}`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: '维修人员分配成功',
            maintenance
        });
    } catch (error) {
        console.error('分配维修人员错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 完成维修
router.put('/:id/complete', requireRole(['admin', 'teacher']), [
    body('repairDescription')
        .isLength({ min: 10, max: 1000 })
        .withMessage('维修描述长度必须在10-1000个字符之间'),
    body('cost')
        .optional()
        .isDecimal({ decimal_digits: '0,2' })
        .withMessage('维修费用格式错误')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const { repairDescription, cost } = req.body;

        const maintenance = await Maintenance.findByPk(req.params.id, {
            include: [
                {
                    model: Equipment,
                    as: 'equipment'
                }
            ]
        });

        if (!maintenance) {
            return res.status(404).json({ error: '维修记录不存在' });
        }

        // 更新维修记录
        await maintenance.update({
            status: '已完成',
            repairDescription,
            cost,
            actualCompletion: new Date()
        });

        // 更新设备状态为运行中
        await maintenance.equipment.update({ status: '运行中' });

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            '完成维修',
            '维修管理',
            `维修记录ID: ${maintenance.id}`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: '维修完成',
            maintenance
        });
    } catch (error) {
        console.error('完成维修错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});



// 辅助函数：根据状态计算进度
function getMaintenanceProgress(status) {
    const progressMap = {
        '待分配': 0,
        '维修中': 50,
        '待验收': 80,
        '已完成': 100,
        '已关闭': 100
    };
    return progressMap[status] || 0;
}

module.exports = router; 