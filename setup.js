#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setup() {
    console.log('🎉 欢迎使用高校设备管理系统！');
    console.log('📋 现在开始配置您的系统...\n');

    try {
        // 数据库配置
        console.log('📊 数据库配置:');
        const dbHost = await question('MySQL主机地址 (默认: localhost): ') || 'localhost';
        const dbPort = await question('MySQL端口 (默认: 3306): ') || '3306';
        const dbUsername = await question('MySQL用户名 (默认: root): ') || 'root';
        const dbPassword = await question('MySQL密码: ');
        const dbName = await question('数据库名称 (默认: equipment_management): ') || 'equipment_management';

        // 管理员账户配置
        console.log('\n👤 管理员账户配置:');
        const adminUsername = await question('管理员工号 (默认: admin): ') || 'admin';
        const adminPassword = await question('管理员密码 (默认: admin123): ') || 'admin123';
        const adminName = await question('管理员姓名 (默认: 系统管理员): ') || '系统管理员';
        const adminEmail = await question('管理员邮箱 (可选): ') || 'admin@university.edu.cn';

        // 服务器配置
        console.log('\n🌐 服务器配置:');
        const serverPort = await question('服务器端口 (默认: 3000): ') || '3000';
        const sessionSecret = await question('会话密钥 (可直接回车生成随机密钥): ') || generateRandomString(32);

        // 创建配置文件
        console.log('\n📝 正在生成配置文件...');

        const config = {
            development: {
                username: dbUsername,
                password: dbPassword,
                database: dbName,
                host: dbHost,
                port: parseInt(dbPort),
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
                username: process.env.DB_USERNAME || dbUsername,
                password: process.env.DB_PASSWORD || dbPassword,
                database: process.env.DB_NAME || dbName,
                host: process.env.DB_HOST || dbHost,
                port: process.env.DB_PORT || parseInt(dbPort),
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

        // 备份原配置文件
        try {
            await fs.copyFile('config/database.js', 'config/database.js.backup');
            console.log('✅ 已备份原配置文件');
        } catch (error) {
            // 忽略备份错误
        }

        // 写入新配置
        const configContent = `const { Sequelize } = require('sequelize');

// 数据库配置
const config = ${JSON.stringify(config, null, 2)};

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
};`;

        await fs.writeFile('config/database.js', configContent);

        // 创建环境变量文件
        const envContent = `NODE_ENV=development
PORT=${serverPort}
SESSION_SECRET=${sessionSecret}
DB_HOST=${dbHost}
DB_PORT=${dbPort}
DB_USERNAME=${dbUsername}
DB_PASSWORD=${dbPassword}
DB_NAME=${dbName}`;

        await fs.writeFile('.env', envContent);

        // 更新初始化脚本中的管理员信息
        const initScriptPath = 'scripts/init-database.js';
        try {
            const initScriptContent = await fs.readFile(initScriptPath, 'utf8');
            const updatedInitScript = initScriptContent
                .replace(/username: 'admin'/, `username: '${adminUsername}'`)
                .replace(/name: '系统管理员'/, `name: '${adminName}'`)
                .replace(/email: 'admin@university\.edu\.cn'/, `email: '${adminEmail}'`)
                .replace(/await bcrypt\.hash\('admin123', 12\)/, `'${adminPassword}'`);

            await fs.writeFile(initScriptPath, updatedInitScript);
            console.log('✅ 初始化脚本更新完成');
        } catch (error) {
            console.warn('⚠️  警告: 无法更新初始化脚本:', error.message);
        }

        console.log('✅ 配置文件生成完成！');
        console.log('\n📋 配置摘要:');
        console.log(`   数据库: ${dbHost}:${dbPort}/${dbName}`);
        console.log(`   管理员: ${adminUsername} / ${adminPassword}`);
        console.log(`   端口: ${serverPort}`);

        console.log('\n🚀 下一步操作:');
        console.log('1. 确保MySQL服务正在运行');
        console.log(`2. 创建数据库: CREATE DATABASE ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        console.log('3. 运行: npm install');
        console.log('4. 运行: npm run init-db');
        console.log('5. 运行: npm start');
        console.log(`6. 访问: http://localhost:${serverPort}`);

        const shouldInstall = await question('\n要现在安装依赖吗？(y/N): ');
        if (shouldInstall.toLowerCase() === 'y') {
            console.log('\n📦 正在安装依赖...');
            const { spawn } = require('child_process');
            const npmInstall = spawn('npm', ['install'], { stdio: 'inherit' });

            npmInstall.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ 依赖安装完成！');
                    console.log('\n现在请:');
                    console.log(`1. 创建数据库: CREATE DATABASE ${dbName};`);
                    console.log('2. 运行: npm run init-db');
                    console.log('3. 运行: npm start');
                } else {
                    console.log('❌ 依赖安装失败，请手动运行 npm install');
                }
                rl.close();
            });
        } else {
            rl.close();
        }

    } catch (error) {
        console.error('❌ 配置过程中发生错误:', error.message);
        rl.close();
    }
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 运行设置
setup(); 