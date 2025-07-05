const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// 用户模型
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: '工号'
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '密码哈希'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '姓名'
    },
    role: {
        type: DataTypes.ENUM('admin', 'teacher', 'student'),
        allowNull: false,
        comment: '角色：管理员/教师/学生'
    },
    department: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '部门'
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '邮箱'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '手机号'
    },
    lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '最后登录时间'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: '账户状态'
    },
    remark: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '备注'
    }
}, {
    tableName: 'users',
    comment: '用户表'
});

// 设备模型
const Equipment = sequelize.define('Equipment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    equipmentNo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: '设备编号'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '设备名称'
    },
    model: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '型号'
    },
    purchaseDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '购置日期'
    },
    location: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '存放位置'
    },
    category: {
        type: DataTypes.ENUM('教学', '科研', '办公'),
        allowNull: false,
        comment: '设备类型'
    },
    status: {
        type: DataTypes.ENUM('运行中', '维修中', '待清洁', '封存'),
        defaultValue: '运行中',
        comment: '设备状态'
    },
    archivePath: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '电子档案路径'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '设备描述'
    },
    value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: '设备价值'
    }
}, {
    tableName: 'equipment',
    comment: '设备表'
});

// 设备使用记录模型
const EquipmentUsage = sequelize.define('EquipmentUsage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    equipmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '设备ID'
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '使用者ID'
    },
    purpose: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '使用目的'
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '开始时间'
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '结束时间'
    },
    status: {
        type: DataTypes.ENUM('使用中', '已完成'),
        defaultValue: '使用中',
        comment: '使用状态'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '备注'
    }
}, {
    tableName: 'equipment_usage',
    comment: '设备使用记录表'
});

// 预约记录模型
const Reservation = sequelize.define('Reservation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    equipmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '设备ID'
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '申请人ID'
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '预约开始时间'
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '预约结束时间'
    },
    purpose: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: '使用目的'
    },
    status: {
        type: DataTypes.ENUM('待审批', '已批准', '已拒绝', '已完成', '已取消'),
        defaultValue: '待审批',
        comment: '预约状态'
    },
    approvedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '审批人ID'
    },
    approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '审批时间'
    },
    rejectReason: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '拒绝原因'
    }
}, {
    tableName: 'reservations',
    comment: '预约记录表'
});

// 维修记录模型
const Maintenance = sequelize.define('Maintenance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ticketNo: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        comment: '工单编号'
    },
    equipmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '设备ID'
    },
    reporterId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '报修人ID'
    },
    maintainerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '维修人员ID'
    },
    faultDescription: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '故障描述'
    },
    faultType: {
        type: DataTypes.ENUM('硬件故障', '软件故障', '操作异常', '性能下降', '其他问题'),
        defaultValue: '其他问题',
        comment: '故障类型'
    },
    repairDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '维修描述'
    },
    status: {
        type: DataTypes.ENUM('待分配', '维修中', '待验收', '已完成', '已关闭'),
        defaultValue: '待分配',
        comment: '维修状态'
    },
    priority: {
        type: DataTypes.ENUM('低', '中', '高', '紧急'),
        defaultValue: '中',
        comment: '优先级'
    },
    urgency: {
        type: DataTypes.ENUM('低', '中', '高', '紧急'),
        defaultValue: '中',
        comment: '紧急程度'
    },
    contactPhone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '联系电话'
    },
    estimatedCompletion: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '预计完成时间'
    },
    actualCompletion: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '实际完成时间'
    },
    cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: '维修费用'
    }
}, {
    tableName: 'maintenance',
    comment: '维修记录表'
});

// 系统日志模型
const SystemLog = sequelize.define('SystemLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '操作用户ID'
    },
    action: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '操作动作'
    },
    module: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '操作模块'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '操作描述'
    },
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP地址'
    },
    userAgent: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '用户代理'
    }
}, {
    tableName: 'system_logs',
    comment: '系统日志表'
});

// 定义关联关系
// 用户与设备使用记录
User.hasMany(EquipmentUsage, { foreignKey: 'userId', as: 'usageRecords' });
EquipmentUsage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 设备与设备使用记录
Equipment.hasMany(EquipmentUsage, { foreignKey: 'equipmentId', as: 'usageRecords' });
EquipmentUsage.belongsTo(Equipment, { foreignKey: 'equipmentId', as: 'equipment' });

// 用户与预约记录
User.hasMany(Reservation, { foreignKey: 'userId', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 审批人与预约记录
User.hasMany(Reservation, { foreignKey: 'approvedBy', as: 'approvedReservations' });
Reservation.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// 设备与预约记录
Equipment.hasMany(Reservation, { foreignKey: 'equipmentId', as: 'reservations' });
Reservation.belongsTo(Equipment, { foreignKey: 'equipmentId', as: 'equipment' });

// 用户与维修记录
User.hasMany(Maintenance, { foreignKey: 'reporterId', as: 'reportedMaintenances' });
Maintenance.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

User.hasMany(Maintenance, { foreignKey: 'maintainerId', as: 'maintainedRecords' });
Maintenance.belongsTo(User, { foreignKey: 'maintainerId', as: 'maintainer' });

// 设备与维修记录
Equipment.hasMany(Maintenance, { foreignKey: 'equipmentId', as: 'maintenances' });
Maintenance.belongsTo(Equipment, { foreignKey: 'equipmentId', as: 'equipment' });

// 用户与系统日志
User.hasMany(SystemLog, { foreignKey: 'userId', as: 'logs' });
SystemLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
    sequelize,
    User,
    Equipment,
    EquipmentUsage,
    Reservation,
    Maintenance,
    SystemLog
}; 