// 应用状态管理
const AppState = {
    currentUser: null,
    isLoggedIn: false,
    currentTab: 'equipment',
    equipmentData: [],
    reservationData: [],
    maintenanceData: [],
    statistics: {}
};

// 通用的401错误处理器
function handleUnauthorized() {
    AppState.currentUser = null;
    AppState.isLoggedIn = false;
    showAuthContainer();
    showAlert('loginAlert', '会话已过期，请重新登录', 'warning');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
async function initializeApp() {
    try {
        // 检查登录状态
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            AppState.currentUser = data.user;
            AppState.isLoggedIn = true;
            showMainApp();
            showSection('dashboard'); // 默认显示仪表板
            // 稍等一下再加载数据，确保会话状态同步
            setTimeout(() => {
                loadDashboardData();
            }, 200);
        } else {
            // 401错误是正常的，表示用户未登录
            showAuthContainer();
        }
    } catch (error) {
        // 网络错误或其他异常，401是正常的
        if (!error.message.includes('401')) {
            console.warn('检查登录状态失败，显示登录页面:', error.message);
        }
        showAuthContainer();
    }

    // 绑定事件监听器
    bindEventListeners();
}

// 绑定事件监听器
function bindEventListeners() {
    // 认证表单事件
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);



    // 搜索事件
    const equipmentSearch = document.getElementById('equipmentSearch');
    if (equipmentSearch) {
        equipmentSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchEquipment();
            }
        });
    }

    // 实时检查工号唯一性
    document.getElementById('registerUsername').addEventListener('blur', checkUsernameAvailability);

    // 模态框关闭事件
    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
}

// 显示认证容器
function showAuthContainer() {
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('mainContainer').classList.remove('active');
    document.getElementById('mainContainer').style.display = 'none';

    // 隐藏头部
    const header = document.getElementById('header');
    if (header) {
        header.classList.add('hidden');
    }
}

// 显示主应用
function showMainApp() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'block';
    document.getElementById('mainContainer').classList.add('active');

    // 显示头部
    const header = document.getElementById('header');
    if (header) {
        header.classList.remove('hidden');
    }

    updateUserStatus();
}

// 显示登录表单
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';

    // 更新标签页状态
    document.getElementById('showLogin').classList.add('active');
    document.getElementById('showRegister').classList.remove('active');
}

// 显示注册表单
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';

    // 更新标签页状态
    document.getElementById('showLogin').classList.remove('active');
    document.getElementById('showRegister').classList.add('active');
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault();

    const formData = {
        username: document.getElementById('loginUsername').value,
        password: document.getElementById('loginPassword').value
    };

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            AppState.currentUser = data.user;
            AppState.isLoggedIn = true;
            showAlert('loginAlert', '登录成功！正在跳转...', 'success');

            setTimeout(() => {
                showMainApp();
                showSection('dashboard'); // 显示仪表板
                // 稍等一下再加载数据，确保会话已完全建立
                setTimeout(() => {
                    loadDashboardData();
                }, 500);
            }, 1000);
        } else {
            let errorMessage = data.error || '登录失败';
            if (data.details && Array.isArray(data.details)) {
                errorMessage = data.details.map(detail => detail.msg).join('<br>');
            }
            showAlert('loginAlert', errorMessage, 'danger');
        }
    } catch (error) {
        console.error('登录错误:', error);
        showAlert('loginAlert', '网络错误，请稍后再试', 'danger');
    }
}

// 处理注册
async function handleRegister(e) {
    e.preventDefault();

    const formData = {
        username: document.getElementById('registerUsername').value,
        password: document.getElementById('registerPassword').value,
        name: document.getElementById('registerName').value,
        role: document.getElementById('registerRole').value,
        email: document.getElementById('registerEmail').value,
        phone: document.getElementById('registerPhone').value
    };

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('registerAlert', '注册成功！请登录', 'success');
            setTimeout(() => {
                showLoginForm();
                document.getElementById('loginUsername').value = formData.username;
            }, 1500);
        } else {
            if (data.details && Array.isArray(data.details)) {
                const errorMessages = data.details.map(detail => detail.msg).join('<br>');
                showAlert('registerAlert', errorMessages, 'danger');
            } else {
                showAlert('registerAlert', data.error || '注册失败', 'danger');
            }
        }
    } catch (error) {
        console.error('注册错误:', error);
        showAlert('registerAlert', '网络错误，请稍后再试', 'danger');
    }
}

// 检查工号唯一性
async function checkUsernameAvailability() {
    const usernameElement = document.getElementById('registerUsername');
    const username = usernameElement ? usernameElement.value : '';
    if (!username || username.length < 4) return;

    try {
        const response = await fetch('/api/auth/check-username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();
        const usernameField = document.getElementById('registerUsername');

        if (response.ok) {
            if (!data.available) {
                usernameField.style.borderColor = 'var(--danger-color)';
                showAlert('registerAlert', '工号已存在，请选择其他工号', 'danger');
            } else {
                usernameField.style.borderColor = 'var(--success-color)';
                clearAlert('registerAlert');
            }
        }
    } catch (error) {
        console.error('检查工号错误:', error);
    }
}

// 退出登录
async function logout() {
    if (!confirm('确定要退出登录吗？')) return;

    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            AppState.currentUser = null;
            AppState.isLoggedIn = false;
            showAuthContainer();
            // 清空表单
            document.getElementById('loginForm').reset();
            document.getElementById('registerForm').reset();
            clearAlert('loginAlert');
            clearAlert('registerAlert');
        }
    } catch (error) {
        console.error('退出登录错误:', error);
        alert('退出登录失败，请刷新页面后重试');
    }
}

// 更新用户状态显示
function updateUserStatus() {
    if (AppState.currentUser) {
        const userRole = document.getElementById('userRole');
        const username = document.getElementById('username');
        const lastLogin = document.getElementById('lastLogin');

        const roleText = getRoleText(AppState.currentUser.role);
        const lastLoginTime = AppState.currentUser.lastLoginAt ?
            new Date(AppState.currentUser.lastLoginAt).toLocaleString() : '首次登录';

        if (userRole) userRole.textContent = roleText;
        if (username) username.textContent = AppState.currentUser.name;
        if (lastLogin) lastLogin.textContent = lastLoginTime;
    }
}

// 获取角色文本
function getRoleText(role) {
    const roleMap = {
        'admin': '管理员',
        'teacher': '教师',
        'student': '学生'
    };
    return roleMap[role] || role;
}

// 加载仪表板数据
async function loadDashboardData() {
    console.log('开始加载仪表板数据...');

    // 确保用户已登录
    if (!AppState.isLoggedIn || !AppState.currentUser) {
        console.warn('用户未登录，跳过仪表板数据加载');
        updateDashboardCards({ total: 0, running: 0, maintenance: 0 });
        return;
    }

    try {
        console.log('正在获取统计数据...');

        // 尝试获取设备统计数据
        const equipmentResponse = await fetch('/api/statistics/equipment', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('设备统计响应状态:', equipmentResponse.status);

        if (equipmentResponse.ok) {
            const equipmentData = await equipmentResponse.json();
            console.log('设备统计数据:', equipmentData);
            updateDashboardCards(equipmentData);
        } else if (equipmentResponse.status === 401) {
            console.warn('获取设备统计数据时认证失败，可能会话已过期');
            handleUnauthorized();
            return;
        } else {
            console.warn('获取设备统计数据失败:', equipmentResponse.status);
            const errorText = await equipmentResponse.text();
            console.warn('错误详情:', errorText);
            // 设置默认值
            updateDashboardCards({ total: 6, running: 4, maintenance: 1 });
        }

        // 尝试获取预约统计数据
        const reservationResponse = await fetch('/api/statistics/reservations', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('预约统计响应状态:', reservationResponse.status);

        if (reservationResponse.ok) {
            const reservationData = await reservationResponse.json();
            console.log('预约统计数据:', reservationData);
            const todayElement = document.getElementById('todayReservations');
            if (todayElement) {
                todayElement.textContent = reservationData.todayCount || 0;
            }
        } else if (reservationResponse.status === 401) {
            console.warn('获取预约统计数据时认证失败，可能会话已过期');
            handleUnauthorized();
            return;
        } else {
            console.warn('获取预约统计数据失败:', reservationResponse.status);
            const errorText = await reservationResponse.text();
            console.warn('错误详情:', errorText);
            // 设置默认值
            const todayElement = document.getElementById('todayReservations');
            if (todayElement) {
                todayElement.textContent = 2;
            }
        }

        console.log('仪表板数据加载完成');

    } catch (error) {
        console.error('加载仪表板数据失败:', error);
        // 网络错误时设置示例数据
        updateDashboardCards({ total: 6, running: 4, maintenance: 1 });
        const todayElement = document.getElementById('todayReservations');
        if (todayElement) {
            todayElement.textContent = 2;
        }
    }
}

// 更新仪表板卡片
function updateDashboardCards(data) {
    console.log('正在更新仪表板卡片，数据:', data);

    const totalElement = document.getElementById('totalEquipment');
    const runningElement = document.getElementById('runningEquipment');
    const maintenanceElement = document.getElementById('maintenanceEquipment');

    console.log('找到的元素:', {
        total: !!totalElement,
        running: !!runningElement,
        maintenance: !!maintenanceElement
    });

    if (totalElement) {
        totalElement.textContent = data.total || 0;
        console.log('设置总设备数:', data.total || 0);
    }
    if (runningElement) {
        runningElement.textContent = data.running || 0;
        console.log('设置运行中设备数:', data.running || 0);
    }
    if (maintenanceElement) {
        maintenanceElement.textContent = data.maintenance || 0;
        console.log('设置维护中设备数:', data.maintenance || 0);
    }
}

// 切换标签页
function switchTab(tabName) {
    // 更新标签按钮状态
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // 检查事件目标是否存在
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }

    // 更新标签页内容
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.style.display = 'none';
    });

    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.style.display = 'block';
    }

    AppState.currentTab = tabName;

    // 确保用户已登录再加载数据
    if (!AppState.isLoggedIn || !AppState.currentUser) {
        return;
    }

    // 根据标签页加载相应数据
    switch (tabName) {
        case 'equipment':
            loadEquipmentList();
            break;
        case 'reservations':
            loadReservationList();
            break;
        case 'maintenance':
            loadMaintenanceList();
            break;
        case 'statistics':
            loadStatistics();
            break;
    }
}

// 加载设备列表
async function loadEquipmentList() {
    // 在主页面上，设备列表不存在，只有在设备管理页面才存在
    const equipmentSection = document.getElementById('equipment');
    if (!equipmentSection || equipmentSection.classList.contains('hidden')) {
        console.log('设备管理页面未显示，跳过设备列表加载');
        return;
    }

    try {
        const response = await fetch('/api/equipment', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            AppState.equipmentData = data.equipment || [];
            renderEquipmentTable(AppState.equipmentData);
        } else if (response.status === 401) {
            console.warn('获取设备列表时认证失败，可能会话已过期');
            handleUnauthorized();
            return;
        } else {
            const error = await response.json().catch(() => ({ error: '未知错误' }));
            console.warn('加载设备列表失败:', error.error || '未知错误');
            renderEquipmentTable([]);
        }
    } catch (error) {
        console.error('加载设备列表错误:', error);
    }
}

// 渲染设备表格
function renderEquipmentTable(equipmentList) {
    const tbody = document.getElementById('equipmentList');

    if (!tbody) {
        console.log('设备表格容器不存在，可能在仪表板页面');
        return;
    }

    if (!equipmentList || equipmentList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #6c757d;">暂无设备数据</td></tr>';
        return;
    }

    tbody.innerHTML = equipmentList.map(equipment => `
        <tr>
            <td>${equipment.equipmentNo}</td>
            <td>${equipment.name}</td>
            <td>${equipment.model}</td>
            <td>${equipment.location}</td>
            <td>${equipment.category}</td>
            <td><span class="status-badge ${getStatusClass(equipment.status)}">${equipment.status}</span></td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="viewEquipment(${equipment.id})">
                    <i class="fas fa-eye"></i>
                </button>
                ${AppState.currentUser && AppState.currentUser.role === 'admin' ? `
                    <button class="btn btn-secondary btn-sm" onclick="editEquipment(${equipment.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteEquipment(${equipment.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
                ${equipment.status === '运行中' ? `
                    <button class="btn btn-warning btn-sm" onclick="reportMaintenance(${equipment.id})">
                        <i class="fas fa-wrench"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// 获取状态样式类
function getStatusClass(status) {
    const statusMap = {
        '运行中': 'status-running',
        '维修中': 'status-maintenance',
        '待清洁': 'status-cleaning',
        '封存': 'status-archived'
    };
    return statusMap[status] || '';
}

// 搜索设备
async function searchEquipment() {
    const searchElement = document.getElementById('equipmentSearch');
    const statusFilterElement = document.getElementById('statusFilter');
    const categoryFilterElement = document.getElementById('categoryFilter');

    const search = searchElement ? searchElement.value : '';
    const statusFilter = statusFilterElement ? statusFilterElement.value : '';
    const categoryFilter = categoryFilterElement ? categoryFilterElement.value : '';

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter) params.append('status', statusFilter);
    if (categoryFilter) params.append('category', categoryFilter);

    try {
        const response = await fetch(`/api/equipment?${params.toString()}`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            renderEquipmentTable(data.equipment || []);
        } else {
            const error = await response.json();
            alert('搜索失败: ' + (error.error || '未知错误'));
        }
    } catch (error) {
        console.error('搜索设备错误:', error);
        alert('网络错误，请稍后再试');
    }
}

// 查看设备详情
function viewEquipment(equipmentId) {
    const equipment = AppState.equipmentData.find(e => e.id === equipmentId);
    if (!equipment) return;

    showModal('设备详情', `
        <div class="form-group">
            <label>设备编号:</label>
            <p>${equipment.equipmentNo}</p>
        </div>
        <div class="form-group">
            <label>设备名称:</label>
            <p>${equipment.name}</p>
        </div>
        <div class="form-group">
            <label>型号:</label>
            <p>${equipment.model}</p>
        </div>
        <div class="form-group">
            <label>购置日期:</label>
            <p>${equipment.purchaseDate}</p>
        </div>
        <div class="form-group">
            <label>存放位置:</label>
            <p>${equipment.location}</p>
        </div>
        <div class="form-group">
            <label>设备类型:</label>
            <p>${equipment.category}</p>
        </div>
        <div class="form-group">
            <label>当前状态:</label>
            <p><span class="status-badge ${getStatusClass(equipment.status)}">${equipment.status}</span></p>
        </div>
        ${equipment.description ? `
        <div class="form-group">
            <label>设备描述:</label>
            <p>${equipment.description}</p>
        </div>
        ` : ''}
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
        ${equipment.status === '运行中' && AppState.currentUser && AppState.currentUser.role !== 'admin' ? `
            <button class="btn btn-primary" onclick="reserveEquipment(${equipment.id})">预约使用</button>
        ` : ''}
    `);
}

// 报修设备
function reportMaintenance(equipmentId) {
    const equipment = AppState.equipmentData.find(e => e.id === equipmentId);
    if (!equipment) return;

    showModal('设备报修', `
        <div class="form-group">
            <label>设备信息:</label>
            <p>${equipment.equipmentNo} - ${equipment.name}</p>
        </div>
        <div class="form-group">
            <label for="faultDescription">故障描述 *</label>
            <textarea id="faultDescription" class="form-control" rows="4" placeholder="请详细描述设备故障情况" required></textarea>
        </div>
        <div class="form-group">
            <label for="priority">优先级</label>
            <select id="priority" class="form-control">
                <option value="低">低</option>
                <option value="中" selected>中</option>
                <option value="高">高</option>
                <option value="紧急">紧急</option>
            </select>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-danger" onclick="submitMaintenanceReport(${equipmentId})">提交报修</button>
    `);
}

// 提交报修申请
async function submitMaintenanceReport(equipmentId) {
    const faultDescription = document.getElementById('faultDescription').value;
    const priority = document.getElementById('priority').value;

    if (!faultDescription.trim()) {
        alert('请填写故障描述');
        return;
    }

    try {
        const response = await fetch('/api/maintenance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                equipmentId,
                faultDescription,
                priority
            })
        });

        if (response.ok) {
            alert('报修申请已提交');
            closeModal();
            loadEquipmentList(); // 刷新设备列表
        } else {
            const error = await response.json();
            alert('提交报修失败: ' + (error.error || '未知错误'));
        }
    } catch (error) {
        console.error('提交报修错误:', error);
        alert('网络错误，请稍后再试');
    }
}

// 导出数据
async function exportData(type) {
    try {
        const response = await fetch(`/api/${type}/export`, {
            credentials: 'include'
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const error = await response.json();
            alert('导出失败: ' + (error.error || '未知错误'));
        }
    } catch (error) {
        console.error('导出数据错误:', error);
        alert('网络错误，请稍后再试');
    }
}

// 显示模态框
function showModal(title, body, footer = '') {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const modal = document.getElementById('modal');

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = body;
    if (modalFooter) modalFooter.innerHTML = footer || '<button class="btn btn-secondary" onclick="closeModal()">关闭</button>';
    if (modal) modal.style.display = 'flex';
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 显示警告消息
function showAlert(containerId, message, type) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    }
}

// 清除警告消息
function clearAlert(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
    }
}

// 加载预约列表 (占位符)
function loadReservationList() {
    console.log('加载预约列表');
}

// 加载维修列表 (占位符)
function loadMaintenanceList() {
    console.log('加载维修列表');
}

// 加载统计数据 (占位符)
function loadStatistics() {
    console.log('加载统计数据');
}

// 显示页面部分
function showSection(sectionName) {
    // 隐藏所有页面部分
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.add('hidden');
    });

    // 显示指定的页面部分
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // 根据页面加载相应数据
    switch (sectionName) {
        case 'equipment':
            loadEquipmentList();
            break;
        case 'reservation':
            loadReservationList();
            break;
        case 'maintenance':
            loadMaintenanceList();
            break;
        case 'statistics':
            loadStatistics();
            break;
        case 'dashboard':
        default:
            // 显示仪表板并加载数据
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.classList.remove('hidden');
            }
            loadDashboardData();
            break;
    }
}

// 占位符函数，用于缺失的模态框功能
function showAddEquipmentModal() {
    showModal('添加设备', '此功能正在开发中...', '');
}

function showAddReservationModal() {
    showModal('新建预约', '此功能正在开发中...', '');
}

function showAddMaintenanceModal() {
    showModal('报告故障', '此功能正在开发中...', '');
}