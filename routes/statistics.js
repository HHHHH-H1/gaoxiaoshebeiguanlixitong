const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const moment = require('moment');
const { Equipment, EquipmentUsage, Maintenance, Reservation, User } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// 认证中间件
router.use(requireAuth);

// 获取概览统计
router.get('/overview', async (req, res) => {
    try {
        // 设备总数
        const totalEquipment = await Equipment.count();

        // 设备总价值
        const equipmentValue = await Equipment.findAll({
            attributes: [[fn('SUM', fn('COALESCE', col('value'), 0)), 'totalValue']]
        });
        const totalValue = parseFloat(equipmentValue[0].dataValues.totalValue) || 0;

        // 故障数量（本月）
        const thisMonth = moment().startOf('month').format('YYYY-MM-DD');
        const faultCount = await Maintenance.count({
            where: {
                createdAt: {
                    [Op.gte]: thisMonth + ' 00:00:00'
                }
            }
        });

        // 平均利用率（最近30天）
        const startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
        const usageStats = await EquipmentUsage.findAll({
            attributes: [
                [fn('COALESCE', fn('AVG', literal('TIMESTAMPDIFF(HOUR, startTime, COALESCE(endTime, NOW()))')), 0), 'avgHours']
            ],
            where: {
                startTime: {
                    [Op.gte]: startDate + ' 00:00:00'
                }
            }
        });

        const avgHours = parseFloat(usageStats[0]?.dataValues.avgHours) || 0;
        const averageUtilization = Math.min((avgHours / 8) * 100, 100); // 假设每日工作8小时

        res.json({
            totalEquipment,
            totalValue: Math.round(totalValue),
            faultCount,
            averageUtilization: Math.round(averageUtilization * 100) / 100
        });
    } catch (error) {
        console.error('获取概览统计错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取设备详细统计列表
router.get('/equipment-details', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            category = '',
            location = ''
        } = req.query;

        const whereConditions = {};

        if (search) {
            whereConditions[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { equipmentNo: { [Op.like]: `%${search}%` } }
            ];
        }

        if (category) {
            whereConditions.category = category;
        }

        if (location) {
            whereConditions.location = { [Op.like]: `%${location}%` };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // 获取设备列表
        const { count, rows: equipmentList } = await Equipment.findAndCountAll({
            where: whereConditions,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        // 为每个设备计算统计数据
        const detailedStats = await Promise.all(
            equipmentList.map(async (equipment) => {
                // 使用次数
                const usageCount = await EquipmentUsage.count({
                    where: { equipmentId: equipment.id }
                });

                // 总使用时长
                const usageHours = await EquipmentUsage.findAll({
                    attributes: [
                        [fn('SUM', literal('TIMESTAMPDIFF(HOUR, startTime, COALESCE(endTime, NOW()))')), 'totalHours']
                    ],
                    where: { equipmentId: equipment.id }
                });
                const totalHours = parseFloat(usageHours[0]?.dataValues.totalHours) || 0;

                // 故障次数
                const faultCount = await Maintenance.count({
                    where: { equipmentId: equipment.id }
                });

                // 最后维护日期
                const lastMaintenance = await Maintenance.findOne({
                    where: {
                        equipmentId: equipment.id,
                        status: '已完成'
                    },
                    order: [['actualCompletion', 'DESC']]
                });

                // 利用率计算（基于创建时间到现在）
                const daysSinceCreated = moment().diff(moment(equipment.createdAt), 'days') || 1;
                const totalAvailableHours = daysSinceCreated * 8; // 假设每日工作8小时
                const utilizationRate = Math.min((totalHours / totalAvailableHours) * 100, 100);

                return {
                    id: equipment.id,
                    equipmentNo: equipment.equipmentNo,
                    name: equipment.name,
                    category: equipment.category,
                    location: equipment.location,
                    status: equipment.status,
                    utilizationRate: Math.round(utilizationRate * 100) / 100,
                    dailyUsageHours: Math.round((totalHours / daysSinceCreated) * 100) / 100,
                    idleRate: Math.round((100 - utilizationRate) * 100) / 100,
                    faultCount,
                    lastMaintenanceDate: lastMaintenance ?
                        moment(lastMaintenance.actualCompletion).format('YYYY-MM-DD') :
                        '从未维护',
                    value: equipment.value || 0
                };
            })
        );

        res.json({
            equipment: detailedStats,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('获取设备详细统计错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取部门统计
router.get('/departments', async (req, res) => {
    try {
        // 按部门统计用户
        const userStats = await User.findAll({
            attributes: [
                'department',
                [fn('COUNT', col('id')), 'userCount']
            ],
            where: {
                department: { [Op.not]: null }
            },
            group: ['department']
        });

        // 按部门统计设备使用
        const usageStats = await EquipmentUsage.findAll({
            attributes: [
                [col('user.department'), 'department'],
                [fn('COUNT', col('EquipmentUsage.id')), 'usageCount'],
                [fn('COUNT', fn('DISTINCT', col('equipmentId'))), 'equipmentCount']
            ],
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: [],
                    where: {
                        department: { [Op.not]: null }
                    }
                }
            ],
            group: ['user.department']
        });

        // 合并统计数据
        const departmentStats = userStats.map(dept => {
            const usage = usageStats.find(u => u.dataValues.department === dept.department);
            return {
                department: dept.department,
                userCount: parseInt(dept.dataValues.userCount),
                usageCount: usage ? parseInt(usage.dataValues.usageCount) : 0,
                equipmentCount: usage ? parseInt(usage.dataValues.equipmentCount) : 0
            };
        });

        res.json({ departments: departmentStats });
    } catch (error) {
        console.error('获取部门统计错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取设备统计
router.get('/equipment', async (req, res) => {
    try {
        // 设备状态统计
        const statusStats = await Equipment.findAll({
            attributes: [
                'status',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['status']
        });

        // 设备类型统计
        const categoryStats = await Equipment.findAll({
            attributes: [
                'category',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['category']
        });

        // 转换为对象格式
        const statusMap = {};
        statusStats.forEach(stat => {
            statusMap[stat.status] = parseInt(stat.dataValues.count);
        });

        const categoryMap = {};
        categoryStats.forEach(stat => {
            categoryMap[stat.category] = parseInt(stat.dataValues.count);
        });

        const total = await Equipment.count();

        res.json({
            total,
            running: statusMap['运行中'] || 0,
            maintenance: statusMap['维修中'] || 0,
            cleaning: statusMap['待清洁'] || 0,
            archived: statusMap['封存'] || 0,
            statusDistribution: statusMap,
            categoryDistribution: categoryMap
        });
    } catch (error) {
        console.error('获取设备统计错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取预约统计
router.get('/reservations', async (req, res) => {
    try {
        const today = moment().format('YYYY-MM-DD');
        const thisWeek = moment().startOf('week').format('YYYY-MM-DD');
        const thisMonth = moment().startOf('month').format('YYYY-MM-DD');

        // 今日预约数量
        const todayCount = await Reservation.count({
            where: {
                createdAt: {
                    [Op.gte]: today + ' 00:00:00',
                    [Op.lt]: moment(today).add(1, 'day').format('YYYY-MM-DD HH:mm:ss')
                }
            }
        });

        // 本周预约数量
        const weekCount = await Reservation.count({
            where: {
                createdAt: {
                    [Op.gte]: thisWeek + ' 00:00:00'
                }
            }
        });

        // 本月预约数量
        const monthCount = await Reservation.count({
            where: {
                createdAt: {
                    [Op.gte]: thisMonth + ' 00:00:00'
                }
            }
        });

        // 预约状态统计
        const statusStats = await Reservation.findAll({
            attributes: [
                'status',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['status']
        });

        const statusMap = {};
        statusStats.forEach(stat => {
            statusMap[stat.status] = parseInt(stat.dataValues.count);
        });

        res.json({
            todayCount,
            weekCount,
            monthCount,
            statusDistribution: statusMap
        });
    } catch (error) {
        console.error('获取预约统计错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取维修统计
router.get('/maintenance', async (req, res) => {
    try {
        const thisMonth = moment().startOf('month').format('YYYY-MM-DD');

        // 本月维修数量
        const monthCount = await Maintenance.count({
            where: {
                createdAt: {
                    [Op.gte]: thisMonth + ' 00:00:00'
                }
            }
        });

        // 维修状态统计
        const statusStats = await Maintenance.findAll({
            attributes: [
                'status',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['status']
        });

        // 故障频率统计（按设备类型）
        const faultByCategory = await Maintenance.findAll({
            attributes: [
                [col('equipment.category'), 'category'],
                [fn('COUNT', col('Maintenance.id')), 'count']
            ],
            include: [
                {
                    model: Equipment,
                    as: 'equipment',
                    attributes: []
                }
            ],
            group: ['equipment.category']
        });

        // 故障优先级统计
        const priorityStats = await Maintenance.findAll({
            attributes: [
                'priority',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['priority']
        });

        const statusMap = {};
        statusStats.forEach(stat => {
            statusMap[stat.status] = parseInt(stat.dataValues.count);
        });

        const categoryFaultMap = {};
        faultByCategory.forEach(stat => {
            categoryFaultMap[stat.dataValues.category] = parseInt(stat.dataValues.count);
        });

        const priorityMap = {};
        priorityStats.forEach(stat => {
            priorityMap[stat.priority] = parseInt(stat.dataValues.count);
        });

        res.json({
            monthCount,
            statusDistribution: statusMap,
            faultByCategory: categoryFaultMap,
            priorityDistribution: priorityMap
        });
    } catch (error) {
        console.error('获取维修统计错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取设备利用率统计
router.get('/utilization', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = moment().subtract(days, 'days').format('YYYY-MM-DD');

        // 获取所有设备的使用记录
        const usageStats = await EquipmentUsage.findAll({
            attributes: [
                'equipmentId',
                [fn('COUNT', col('EquipmentUsage.id')), 'usageCount'],
                [fn('SUM', literal('TIMESTAMPDIFF(HOUR, startTime, COALESCE(endTime, NOW()))')), 'totalHours']
            ],
            where: {
                startTime: {
                    [Op.gte]: startDate + ' 00:00:00'
                }
            },
            include: [
                {
                    model: Equipment,
                    as: 'equipment',
                    attributes: ['equipmentNo', 'name', 'category']
                }
            ],
            group: ['equipmentId']
        });

        // 计算利用率
        const utilizationData = usageStats.map(stat => {
            const totalHours = parseFloat(stat.dataValues.totalHours) || 0;
            const totalAvailableHours = parseInt(days) * 24; // 假设设备全天可用
            const utilizationRate = Math.min((totalHours / totalAvailableHours) * 100, 100);

            return {
                equipment: stat.equipment,
                usageCount: parseInt(stat.dataValues.usageCount),
                totalHours: Math.round(totalHours * 100) / 100,
                utilizationRate: Math.round(utilizationRate * 100) / 100
            };
        });

        // 按利用率排序
        utilizationData.sort((a, b) => b.utilizationRate - a.utilizationRate);

        res.json({
            period: `最近${days}天`,
            data: utilizationData
        });
    } catch (error) {
        console.error('获取设备利用率错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取使用趋势数据
router.get('/trends', async (req, res) => {
    try {
        const { period = 'week' } = req.query; // week, month, year

        let dateFormat, startDate, groupFormat;

        switch (period) {
            case 'week':
                startDate = moment().subtract(7, 'days').format('YYYY-MM-DD');
                dateFormat = '%Y-%m-%d';
                groupFormat = 'YYYY-MM-DD';
                break;
            case 'month':
                startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
                dateFormat = '%Y-%m-%d';
                groupFormat = 'YYYY-MM-DD';
                break;
            case 'year':
                startDate = moment().subtract(12, 'months').format('YYYY-MM-DD');
                dateFormat = '%Y-%m';
                groupFormat = 'YYYY-MM';
                break;
            default:
                return res.status(400).json({ error: '无效的时间周期' });
        }

        // 设备使用趋势
        const usageTrend = await EquipmentUsage.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('startTime'), dateFormat), 'date'],
                [fn('COUNT', col('id')), 'count']
            ],
            where: {
                startTime: {
                    [Op.gte]: startDate + ' 00:00:00'
                }
            },
            group: [fn('DATE_FORMAT', col('startTime'), dateFormat)],
            order: [[fn('DATE_FORMAT', col('startTime'), dateFormat), 'ASC']]
        });

        // 预约趋势
        const reservationTrend = await Reservation.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('createdAt'), dateFormat), 'date'],
                [fn('COUNT', col('id')), 'count']
            ],
            where: {
                createdAt: {
                    [Op.gte]: startDate + ' 00:00:00'
                }
            },
            group: [fn('DATE_FORMAT', col('createdAt'), dateFormat)],
            order: [[fn('DATE_FORMAT', col('createdAt'), dateFormat), 'ASC']]
        });

        // 维修趋势
        const maintenanceTrend = await Maintenance.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('createdAt'), dateFormat), 'date'],
                [fn('COUNT', col('id')), 'count']
            ],
            where: {
                createdAt: {
                    [Op.gte]: startDate + ' 00:00:00'
                }
            },
            group: [fn('DATE_FORMAT', col('createdAt'), dateFormat)],
            order: [[fn('DATE_FORMAT', col('createdAt'), dateFormat), 'ASC']]
        });

        res.json({
            period,
            usage: usageTrend.map(item => ({
                date: item.dataValues.date,
                count: parseInt(item.dataValues.count)
            })),
            reservations: reservationTrend.map(item => ({
                date: item.dataValues.date,
                count: parseInt(item.dataValues.count)
            })),
            maintenance: maintenanceTrend.map(item => ({
                date: item.dataValues.date,
                count: parseInt(item.dataValues.count)
            }))
        });
    } catch (error) {
        console.error('获取趋势数据错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取热门设备排行
router.get('/popular-equipment', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const popularEquipment = await EquipmentUsage.findAll({
            attributes: [
                'equipmentId',
                [fn('COUNT', col('EquipmentUsage.id')), 'usageCount'],
                [fn('AVG', literal('TIMESTAMPDIFF(HOUR, startTime, COALESCE(endTime, NOW()))')), 'avgDuration']
            ],
            include: [
                {
                    model: Equipment,
                    as: 'equipment',
                    attributes: ['equipmentNo', 'name', 'category', 'location']
                }
            ],
            group: ['equipmentId'],
            order: [[fn('COUNT', col('EquipmentUsage.id')), 'DESC']],
            limit: parseInt(limit)
        });

        const result = popularEquipment.map(item => ({
            equipment: item.equipment,
            usageCount: parseInt(item.dataValues.usageCount),
            avgDuration: Math.round((parseFloat(item.dataValues.avgDuration) || 0) * 100) / 100
        }));

        res.json({ data: result });
    } catch (error) {
        console.error('获取热门设备错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取用户活跃度统计
router.get('/user-activity', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = moment().subtract(days, 'days').format('YYYY-MM-DD');

        // 按角色统计活跃用户
        const userActivity = await EquipmentUsage.findAll({
            attributes: [
                [col('user.role'), 'role'],
                [fn('COUNT', fn('DISTINCT', col('userId'))), 'activeUsers'],
                [fn('COUNT', col('EquipmentUsage.id')), 'totalUsage']
            ],
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: []
                }
            ],
            where: {
                startTime: {
                    [Op.gte]: startDate + ' 00:00:00'
                }
            },
            group: ['user.role']
        });

        const activityMap = {};
        userActivity.forEach(stat => {
            activityMap[stat.dataValues.role] = {
                activeUsers: parseInt(stat.dataValues.activeUsers),
                totalUsage: parseInt(stat.dataValues.totalUsage)
            };
        });

        res.json({
            period: `最近${days}天`,
            data: activityMap
        });
    } catch (error) {
        console.error('获取用户活跃度错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取综合仪表板数据
router.get('/dashboard', async (req, res) => {
    try {
        // 并行获取各种统计数据
        const [
            equipmentStats,
            reservationStats,
            maintenanceStats,
            recentUsage
        ] = await Promise.all([
            // 设备统计
            Equipment.findAll({
                attributes: [
                    'status',
                    [fn('COUNT', col('Equipment.id')), 'count']
                ],
                group: ['status']
            }),

            // 今日预约统计
            Reservation.count({
                where: {
                    createdAt: {
                        [Op.gte]: moment().format('YYYY-MM-DD') + ' 00:00:00'
                    }
                }
            }),

            // 待处理维修统计
            Maintenance.count({
                where: { status: '待处理' }
            }),

            // 最近使用记录
            EquipmentUsage.findAll({
                include: [
                    {
                        model: Equipment,
                        as: 'equipment',
                        attributes: ['name', 'equipmentNo']
                    },
                    {
                        model: User,
                        as: 'user',
                        attributes: ['name', 'role']
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: 5
            })
        ]);

        // 处理设备统计
        const statusMap = {};
        equipmentStats.forEach(stat => {
            statusMap[stat.status] = parseInt(stat.dataValues.count);
        });

        res.json({
            equipment: {
                total: Object.values(statusMap).reduce((sum, count) => sum + count, 0),
                running: statusMap['运行中'] || 0,
                maintenance: statusMap['维修中'] || 0,
                cleaning: statusMap['待清洁'] || 0,
                archived: statusMap['封存'] || 0
            },
            todayReservations: reservationStats,
            pendingMaintenance: maintenanceStats,
            recentActivity: recentUsage.map(usage => ({
                id: usage.id,
                equipment: usage.equipment,
                user: usage.user,
                startTime: usage.startTime,
                purpose: usage.purpose,
                status: usage.status
            }))
        });
    } catch (error) {
        console.error('获取仪表板数据错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

module.exports = router; 