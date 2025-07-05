const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Reservation, Equipment, User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logUserAction } = require('../utils/logger');

const router = express.Router();

// 认证中间件
router.use(requireAuth);

// 创建预约
router.post('/', [
    body('equipmentId')
        .isInt({ min: 1 })
        .withMessage('设备ID无效'),
    body('startTime')
        .isISO8601()
        .withMessage('开始时间格式错误'),
    body('endTime')
        .isISO8601()
        .withMessage('结束时间格式错误'),
    body('purpose')
        .isLength({ min: 5, max: 500 })
        .withMessage('使用目的长度必须在5-500个字符之间')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const { equipmentId, startTime, endTime, purpose } = req.body;

        // 检查时间有效性
        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        if (start >= end) {
            return res.status(400).json({ error: '结束时间必须晚于开始时间' });
        }

        if (start < now) {
            return res.status(400).json({ error: '预约时间不能早于当前时间' });
        }

        // 检查设备是否存在且可预约
        const equipment = await Equipment.findByPk(equipmentId);
        if (!equipment) {
            return res.status(404).json({ error: '设备不存在' });
        }

        if (equipment.status !== '运行中') {
            return res.status(400).json({ error: '设备当前状态不可预约' });
        }

        // 检查时间冲突
        const conflictingReservation = await Reservation.findOne({
            where: {
                equipmentId,
                status: { [Op.in]: ['待审批', '已批准'] },
                [Op.or]: [
                    {
                        startTime: { [Op.lte]: start },
                        endTime: { [Op.gt]: start }
                    },
                    {
                        startTime: { [Op.lt]: end },
                        endTime: { [Op.gte]: end }
                    },
                    {
                        startTime: { [Op.gte]: start },
                        endTime: { [Op.lte]: end }
                    }
                ]
            }
        });

        if (conflictingReservation) {
            return res.status(400).json({ error: '该时间段已被预约' });
        }

        // 创建预约
        const reservation = await Reservation.create({
            equipmentId,
            userId: req.session.userId,
            startTime,
            endTime,
            purpose,
            status: '待审批'
        });

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            '创建设备预约',
            '预约管理',
            `设备: ${equipment.name} (${equipment.equipmentNo})`,
            req.ip,
            req.get('User-Agent')
        );

        res.status(201).json({
            message: '预约申请提交成功',
            reservation
        });
    } catch (error) {
        console.error('创建预约错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取预约列表
router.get('/', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const whereConditions = {};

        if (status) {
            whereConditions.status = status;
        }

        // 如果不是管理员或教师，只能看到自己的预约
        if (req.session.role === 'student') {
            whereConditions.userId = req.session.userId;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: reservationList } = await Reservation.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: Equipment,
                    as: 'equipment',
                    attributes: ['equipmentNo', 'name', 'model', 'location']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['name', 'role']
                },
                {
                    model: User,
                    as: 'approver',
                    attributes: ['name'],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        res.json({
            reservations: reservationList,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('获取预约列表错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 审批预约（管理员和教师）
router.put('/:id/approve', requireRole(['admin', 'teacher']), [
    body('action')
        .isIn(['approve', 'reject'])
        .withMessage('操作类型无效'),
    body('rejectReason')
        .optional()
        .isLength({ max: 500 })
        .withMessage('拒绝原因不能超过500个字符')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '输入验证失败',
                details: errors.array()
            });
        }

        const { action, rejectReason } = req.body;

        const reservation = await Reservation.findByPk(req.params.id, {
            include: [
                {
                    model: Equipment,
                    as: 'equipment'
                },
                {
                    model: User,
                    as: 'user'
                }
            ]
        });

        if (!reservation) {
            return res.status(404).json({ error: '预约记录不存在' });
        }

        if (reservation.status !== '待审批') {
            return res.status(400).json({ error: '该预约已被处理' });
        }

        const updateData = {
            approvedBy: req.session.userId,
            approvedAt: new Date()
        };

        if (action === 'approve') {
            updateData.status = '已批准';
        } else {
            updateData.status = '已拒绝';
            if (rejectReason) {
                updateData.rejectReason = rejectReason;
            }
        }

        await reservation.update(updateData);

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            action === 'approve' ? '批准预约' : '拒绝预约',
            '预约管理',
            `预约ID: ${reservation.id}, 申请人: ${reservation.user.name}`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: action === 'approve' ? '预约已批准' : '预约已拒绝',
            reservation
        });
    } catch (error) {
        console.error('审批预约错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 取消预约（申请人）
router.put('/:id/cancel', async (req, res) => {
    try {
        const reservation = await Reservation.findByPk(req.params.id, {
            include: [
                {
                    model: Equipment,
                    as: 'equipment'
                }
            ]
        });

        if (!reservation) {
            return res.status(404).json({ error: '预约记录不存在' });
        }

        // 只有申请人才能取消自己的预约
        if (reservation.userId !== req.session.userId) {
            return res.status(403).json({ error: '只能取消自己的预约' });
        }

        // 只有待审批的预约才能取消
        if (reservation.status !== '待审批') {
            return res.status(400).json({ error: '该预约状态不允许取消' });
        }

        await reservation.update({ status: '已取消' });

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            '取消预约',
            '预约管理',
            `预约ID: ${reservation.id}, 设备: ${reservation.equipment.name}`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: '预约已取消',
            reservation
        });
    } catch (error) {
        console.error('取消预约错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 完成预约（管理员和教师）
router.put('/:id/complete', requireRole(['admin', 'teacher']), async (req, res) => {
    try {
        const reservation = await Reservation.findByPk(req.params.id, {
            include: [
                {
                    model: Equipment,
                    as: 'equipment'
                },
                {
                    model: User,
                    as: 'user'
                }
            ]
        });

        if (!reservation) {
            return res.status(404).json({ error: '预约记录不存在' });
        }

        if (reservation.status !== '已批准') {
            return res.status(400).json({ error: '只有已批准的预约才能标记为完成' });
        }

        // 检查预约时间是否已结束
        const now = new Date();
        const endTime = new Date(reservation.endTime);

        if (now < endTime) {
            return res.status(400).json({ error: '预约时间尚未结束，无法标记为完成' });
        }

        await reservation.update({ status: '已完成' });

        // 记录操作日志
        await logUserAction(
            req.session.userId,
            '完成预约',
            '预约管理',
            `预约ID: ${reservation.id}, 申请人: ${reservation.user.name}`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            message: '预约已完成',
            reservation
        });
    } catch (error) {
        console.error('完成预约错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取设备可预约时间段
router.get('/available-slots/:equipmentId', async (req, res) => {
    try {
        const { equipmentId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: '请提供查询日期' });
        }

        // 检查设备是否存在
        const equipment = await Equipment.findByPk(equipmentId);
        if (!equipment) {
            return res.status(404).json({ error: '设备不存在' });
        }

        if (equipment.status !== '运行中') {
            return res.status(400).json({ error: '设备当前状态不可预约' });
        }

        // 获取指定日期的预约记录
        const startOfDay = new Date(date + ' 00:00:00');
        const endOfDay = new Date(date + ' 23:59:59');

        const reservations = await Reservation.findAll({
            where: {
                equipmentId,
                status: { [Op.in]: ['待审批', '已批准'] },
                [Op.or]: [
                    {
                        startTime: {
                            [Op.between]: [startOfDay, endOfDay]
                        }
                    },
                    {
                        endTime: {
                            [Op.between]: [startOfDay, endOfDay]
                        }
                    },
                    {
                        startTime: { [Op.lte]: startOfDay },
                        endTime: { [Op.gte]: endOfDay }
                    }
                ]
            },
            order: [['startTime', 'ASC']]
        });

        // 生成可用时间段（简单示例：8:00-18:00）
        const workStart = 8; // 8:00
        const workEnd = 18;  // 18:00
        const availableSlots = [];

        for (let hour = workStart; hour < workEnd; hour++) {
            const slotStart = new Date(date + ` ${hour.toString().padStart(2, '0')}:00:00`);
            const slotEnd = new Date(date + ` ${(hour + 1).toString().padStart(2, '0')}:00:00`);

            // 检查是否与现有预约冲突
            const isConflict = reservations.some(reservation => {
                const reservationStart = new Date(reservation.startTime);
                const reservationEnd = new Date(reservation.endTime);

                return (
                    (slotStart >= reservationStart && slotStart < reservationEnd) ||
                    (slotEnd > reservationStart && slotEnd <= reservationEnd) ||
                    (slotStart <= reservationStart && slotEnd >= reservationEnd)
                );
            });

            if (!isConflict) {
                availableSlots.push({
                    startTime: slotStart.toISOString(),
                    endTime: slotEnd.toISOString(),
                    available: true
                });
            }
        }

        res.json({
            date,
            equipment: {
                id: equipment.id,
                name: equipment.name,
                equipmentNo: equipment.equipmentNo
            },
            availableSlots,
            occupiedSlots: reservations.map(r => ({
                startTime: r.startTime,
                endTime: r.endTime,
                status: r.status
            }))
        });
    } catch (error) {
        console.error('获取可预约时间段错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

module.exports = router; 