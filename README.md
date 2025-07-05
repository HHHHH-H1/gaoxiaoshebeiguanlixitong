# 高校设备管理系统

一个基于Node.js + Express + MySQL的现代化设备管理系统，支持多角色用户管理、设备全生命周期管理、预约系统、维修管理和数据统计分析。

## 🚀 系统特性

### 用户管理
- ✅ 多角色支持：管理员、教师、学生
- ✅ 安全认证：密码加密、验证码防暴力破解
- ✅ 权限控制：基于角色的访问控制(RBAC)
- ✅ 账户管理：冻结/解冻、密码重置
- ✅ 实时状态：显示用户角色、姓名、最后登录时间

### 设备管理
- ✅ 完整信息：设备编号、名称、型号、购置日期、存放位置
- ✅ 分类管理：教学设备、科研设备、办公设备
- ✅ 状态管理：运行中(绿)、维修中(红)、待清洁(黄)、封存(灰)
- ✅ 电子档案：支持图片/PDF文档上传
- ✅ 智能搜索：支持拼音首字母搜索（如"显微镜"→"xwj"）

### 预约系统
- ✅ 在线预约：学生提交设备使用申请
- ✅ 审批流程：教师/管理员审批
- ✅ 时间冲突检测：自动防止重复预约
- ✅ 状态跟踪：待审批、已批准、已拒绝、已完成

### 维修管理
- ✅ 故障报修：用户提交设备故障报告
- ✅ 进度跟踪：待处理、处理中、已完成
- ✅ 详细记录：故障描述、维修人员、预计完成时间
- ✅ 优先级管理：低、中、高、紧急

### 数据统计
- ✅ 设备利用率：计算日均使用时长/闲置率
- ✅ 故障热力图：按设备类型/部门统计故障频率
- ✅ 使用趋势：时间序列数据分析
- ✅ 热门设备排行：使用频率统计

### 数据导出
- ✅ CSV格式导出：支持设备、预约、维修数据导出
- ✅ 中文编码支持：UTF-8 BOM格式

## 🛠️ 技术栈

**后端**
- Node.js 18+
- Express.js - Web框架
- MySQL 8.0+ - 数据库
- Sequelize - ORM框架
- bcryptjs - 密码加密
- express-session - 会话管理
- express-validator - 数据验证
- multer - 文件上传
- canvas - 验证码生成

**前端**
- 原生JavaScript (ES6+)
- CSS3 + 响应式设计
- Font Awesome - 图标库
- Animate.css - 动画库

**安全特性**
- Helmet.js - 安全头设置
- 限流保护 - 防止暴力破解
- CORS配置 - 跨域资源共享
- 输入验证 - 防止SQL注入/XSS

## 📦 安装部署

### 1. 环境要求

```bash
Node.js >= 18.0.0
MySQL >= 8.0.0
npm >= 9.0.0
```

### 2. 克隆项目

```bash
git clone <repository-url>
cd equipment-management-system
```

### 3. 安装依赖

```bash
npm install
```

### 4. 数据库配置

修改 `config/database.js` 中的数据库连接信息：

```javascript
{
  username: 'your_mysql_username',
  password: 'your_mysql_password', 
  database: 'equipment_management',
  host: 'localhost',
  port: 3306
}
```

### 5. 创建数据库

```sql
CREATE DATABASE equipment_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 6. 初始化数据库

```bash
npm run init-db
```

这将创建所有表结构并插入初始数据，包括：
- 默认管理员账户：`admin` / `admin123`
- 示例教师账户：`teacher001` / `teacher123`
- 示例学生账户：`student001` / `student123`
- 示例设备数据

### 7. 启动服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动

## 📱 系统使用

### 登录系统
1. 打开浏览器访问 `http://localhost:3000`
2. 使用默认账户登录：
   - 管理员：`admin` / `admin123`
   - 教师：`teacher001` / `teacher123`
   - 学生：`student001` / `student123`
3. 输入验证码完成登录

### 设备管理
- **查看设备**：在设备管理页面查看所有设备信息
- **搜索设备**：支持设备编号、名称、型号搜索，支持拼音首字母
- **筛选设备**：按状态、类型、位置筛选
- **设备详情**：点击查看按钮查看详细信息
- **报修设备**：点击维修按钮提交故障报告

### 预约管理
- **创建预约**：选择设备和时间段提交预约申请
- **审批预约**：教师/管理员审批预约申请
- **查看预约**：查看预约状态和历史记录

### 维修管理
- **提交报修**：描述故障情况和优先级
- **处理报修**：管理员分配维修人员和处理进度
- **跟踪进度**：实时查看维修状态

### 数据统计
- **设备统计**：总数、运行中、维修中等状态统计
- **利用率分析**：设备使用频率和时长统计
- **故障分析**：故障频率和类型分布
- **趋势分析**：时间序列数据分析

## 🔧 配置说明

### 环境变量

创建 `.env` 文件（可选）：

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=1234qwer
DB_NAME=equipment_management
SESSION_SECRET=your-secret-key
```

### 上传配置

文件上传限制：
- 文件大小：最大5MB
- 支持格式：JPG, PNG, PDF, DOC, DOCX
- 存储路径：`uploads/equipment/`

### 安全配置

- 会话过期时间：24小时
- 登录限流：每IP每15分钟最多5次尝试
- API限流：每IP每15分钟最多100次请求
- 密码强度：6-20个字符

## 📊 数据库结构

### 主要数据表

- `users` - 用户表
- `equipment` - 设备表
- `equipment_usage` - 设备使用记录表
- `reservations` - 预约记录表
- `maintenance` - 维修记录表
- `system_logs` - 系统日志表

详细的数据库结构请参考 `models/index.js`

## 🎯 API文档

### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/captcha` - 获取验证码

### 设备管理
- `GET /api/equipment` - 获取设备列表
- `POST /api/equipment` - 创建设备
- `PUT /api/equipment/:id` - 更新设备
- `DELETE /api/equipment/:id` - 删除设备
- `GET /api/equipment/export/csv` - 导出设备数据

### 预约管理
- `GET /api/reservation` - 获取预约列表
- `POST /api/reservation` - 创建预约
- `PUT /api/reservation/:id/approve` - 审批预约

### 维修管理
- `GET /api/maintenance` - 获取维修列表
- `POST /api/maintenance` - 创建维修记录
- `PUT /api/maintenance/:id` - 更新维修状态

### 统计分析
- `GET /api/statistics/equipment` - 设备统计
- `GET /api/statistics/reservations` - 预约统计
- `GET /api/statistics/utilization` - 利用率统计

## 🚨 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查MySQL服务是否启动
   - 验证数据库配置信息
   - 确认数据库用户权限

2. **验证码不显示**
   - 确保安装了canvas依赖
   - 检查系统字体支持

3. **文件上传失败**
   - 检查uploads目录权限
   - 确认文件大小和格式限制

4. **端口被占用**
   ```bash
   # 查找占用端口的进程
   netstat -an | findstr 3000
   
   # 修改端口
   set PORT=3001 && npm start
   ```

### 日志查看

系统日志存储在数据库中，管理员可以通过 `/api/user/logs` 接口查看：
- 用户操作日志
- 系统错误日志
- 安全事件日志

## 🔄 系统更新

### 数据库迁移

当数据库结构发生变化时：

```bash
# 备份现有数据
mysqldump -u username -p equipment_management > backup.sql

# 运行迁移（开发环境）
npm run init-db

# 恢复数据（如需要）
mysql -u username -p equipment_management < backup.sql
```

### 版本升级

```bash
# 拉取最新代码
git pull origin main

# 更新依赖
npm install

# 重启服务
npm restart
```

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 支持

如果您遇到问题或有建议，请：
1. 查看[常见问题](#故障排除)
2. 提交[Issue](issues)
3. 联系开发团队

---

**开发者**: 系统开发团队  
**最后更新**: 2024年  
**版本**: 1.0.0 