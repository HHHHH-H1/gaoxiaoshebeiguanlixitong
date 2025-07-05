const { Sequelize } = require('sequelize');

// 数据库配置
const config = {
    development: {
        username: 'root',
        password: '1234qwer',
        database: 'equipment_management',
        host: 'localhost',
        port: 3306,
        dialect: 'mysql',
        logging: console.log,
        timezone: '+08:00',
        define: {
            timestamps: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        }
    },
    production: {
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '1234qwer',
        database: process.env.DB_NAME || 'equipment_management',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false,
        timezone: '+08:00',
        define: {
            timestamps: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        }
    }
};

const env = process.env.NODE_ENV || 'development';
const sequelize = new Sequelize(config[env]);

// 测试数据库连接
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ 数据库连接成功');
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        console.log('请确保MySQL服务已启动，并且数据库配置正确');
        process.exit(1);
    }
};

module.exports = {
    sequelize,
    testConnection
}; 