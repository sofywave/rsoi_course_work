// Reports Page JavaScript
// Basic structure for future report functionality

// JWT utility functions
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// User profile management
async function updateProfile() {
    const fullName = document.getElementById('modalProfileFullName').value.trim();
    const email = document.getElementById('modalProfileEmail').value.trim();

    if (!fullName || !email) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    try {
        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fullName, email })
        });

        const result = await response.json();

        if (result.success) {
            // Update local storage
            const user = JSON.parse(localStorage.getItem('user'));
            user.fullName = fullName;
            user.email = email;
            localStorage.setItem('user', JSON.stringify(user));

            // Update UI
            document.getElementById('userName').textContent = fullName;
            const avatarText = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
            document.getElementById('userAvatar').textContent = avatarText;

            alert('Профиль успешно обновлен');
            document.getElementById('profileModal').classList.remove('show');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Profile update error:', error);
        alert('Ошибка при обновлении профиля: ' + error.message);
    }
}

async function updatePassword() {
    const currentPassword = document.getElementById('modalCurrentPassword').value;
    const newPassword = document.getElementById('modalNewPassword').value;
    const confirmPassword = document.getElementById('modalConfirmNewPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('Новый пароль и подтверждение не совпадают');
        return;
    }

    if (newPassword.length < 6) {
        alert('Новый пароль должен содержать минимум 6 символов');
        return;
    }

    try {
        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const result = await response.json();

        if (result.success) {
            alert('Пароль успешно изменен');
            document.getElementById('profileModal').classList.remove('show');
            // Reset form
            document.getElementById('passwordForm').reset();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Password update error:', error);
        alert('Ошибка при изменении пароля: ' + error.message);
    }
}

// Logout function
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
}

// Report generation functions
async function generateWorkloadReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert('Пожалуйста, выберите период для формирования отчета');
        return;
    }

    try {
        const response = await fetch(`/api/reports/workload?startDate=${startDate}&endDate=${endDate}`, {
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            displayWorkloadReport(result.data);
            document.getElementById('workloadResults').style.display = 'block';
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Workload report error:', error);
        alert('Ошибка при формировании отчета: ' + error.message);
    }
}

function displayWorkloadReport(data) {
    const tbody = document.getElementById('workloadTableBody');
    tbody.innerHTML = '';

    data.forEach(master => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${master.masterName}</td>
            <td>${master.statusCounts.new || 0}</td>
            <td>${master.statusCounts.clarification || 0}</td>
            <td>${master.statusCounts.in_progress || 0}</td>
            <td>${master.statusCounts.awaiting_payment || 0}</td>
            <td>${master.statusCounts.completed || 0}</td>
            <td>${master.statusCounts.delivered || 0}</td>
            <td>${master.statusCounts.cancelled || 0}</td>
            <td><strong>${master.totalOrders}</strong></td>
        `;
        tbody.appendChild(row);
    });
}

async function exportWorkloadReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert('Пожалуйста, сформируйте отчет перед экспортом');
        return;
    }

    try {
        const response = await fetch(`/api/reports/workload/export?startDate=${startDate}&endDate=${endDate}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `workload_report_${startDate}_${endDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const result = await response.json();
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Ошибка при экспорте отчета: ' + error.message);
    }
}

function printWorkloadReport() {
    window.print();
}

// Production Plan functions
async function generateProductionPlan() {
    const startDate = document.getElementById('planStartDate').value;
    const endDate = document.getElementById('planEndDate').value;

    if (!startDate || !endDate) {
        alert('Пожалуйста, выберите период для формирования плана');
        return;
    }

    try {
        const response = await fetch(`/api/reports/production-plan?startDate=${startDate}&endDate=${endDate}`, {
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            displayProductionPlan(result.data, result.totalOrders);
            document.getElementById('productionPlanResults').style.display = 'block';
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Production plan error:', error);
        alert('Ошибка при формировании плана производства: ' + error.message);
    }
}

function displayProductionPlan(data, totalOrders) {
    const tbody = document.getElementById('productionPlanTableBody');
    const summary = document.getElementById('planSummary');

    tbody.innerHTML = '';
    summary.innerHTML = `<h3>Итого: ${totalOrders} заказов в производстве</h3>`;

    data.forEach(item => {
        const row = document.createElement('tr');
        const orderNumbers = item.orders.map(order => order.orderNumber).join(', ');

        row.innerHTML = `
            <td>${item.productType}</td>
            <td>${item.priceRange}</td>
            <td><strong>${item.quantity}</strong></td>
            <td>${orderNumbers}</td>
        `;
        tbody.appendChild(row);
    });
}

async function exportProductionPlan() {
    const startDate = document.getElementById('planStartDate').value;
    const endDate = document.getElementById('planEndDate').value;

    if (!startDate || !endDate) {
        alert('Пожалуйста, сформируйте план перед экспортом');
        return;
    }

    try {
        const response = await fetch(`/api/reports/production-plan/export?startDate=${startDate}&endDate=${endDate}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `production_plan_${startDate}_${endDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const result = await response.json();
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Ошибка при экспорте плана производства: ' + error.message);
    }
}

function printProductionPlan() {
    window.print();
}

// Financial Report functions
async function generateFinancialReport() {
    const startDate = document.getElementById('financialStartDate').value;
    const endDate = document.getElementById('financialEndDate').value;

    if (!startDate || !endDate) {
        alert('Пожалуйста, выберите период для формирования отчета');
        return;
    }

    try {
        const response = await fetch(`/api/reports/financial?startDate=${startDate}&endDate=${endDate}`, {
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            displayFinancialReport(result.data);
            document.getElementById('financialReportResults').style.display = 'block';
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Financial report error:', error);
        alert('Ошибка при формировании финансового отчета: ' + error.message);
    }
}

function displayFinancialReport(data) {
    const tbody = document.getElementById('financialReportTableBody');
    const summary = document.getElementById('financialSummary');

    tbody.innerHTML = '';

    // Display summary
    summary.innerHTML = `
        <div class="financial-metrics">
            <div class="metric-card">
                <h4>Всего заказов</h4>
                <span class="metric-value">${data.summary.totalOrders}</span>
            </div>
            <div class="metric-card">
                <h4>Общая выручка</h4>
                <span class="metric-value">${data.summary.totalRevenue.toFixed(2)} BYN</span>
            </div>
            <div class="metric-card">
                <h4>Средняя цена заказа</h4>
                <span class="metric-value">${data.summary.averagePrice.toFixed(2)} BYN</span>
            </div>
        </div>
    `;

    // Display order details
    data.orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.orderNumber}</td>
            <td>${order.clientName}</td>
            <td>${order.masterName}</td>
            <td>${order.productType}</td>
            <td>${order.status === 'completed' ? 'Завершен' : 'Доставлен'}</td>
            <td><strong>${order.price.toFixed(2)} BYN</strong></td>
            <td>${order.createdAt}</td>
            <td>${order.completedAt}</td>
        `;
        tbody.appendChild(row);
    });
}

async function exportFinancialReport() {
    const startDate = document.getElementById('financialStartDate').value;
    const endDate = document.getElementById('financialEndDate').value;

    if (!startDate || !endDate) {
        alert('Пожалуйста, сформируйте отчет перед экспортом');
        return;
    }

    try {
        const response = await fetch(`/api/reports/financial/export?startDate=${startDate}&endDate=${endDate}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `financial_report_${startDate}_${endDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const result = await response.json();
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Ошибка при экспорте финансового отчета: ' + error.message);
    }
}

function printFinancialReport() {
    window.print();
}

// UI management functions
function showReportSelection() {
    document.getElementById('reportSelection').style.display = 'block';
    document.getElementById('workloadReportSection').style.display = 'none';
}

function showWorkloadReport() {
    document.getElementById('reportSelection').style.display = 'none';
    document.getElementById('workloadReportSection').style.display = 'block';
    document.getElementById('workloadResults').style.display = 'none';

    // Set default date range (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    document.getElementById('startDate').value = startOfMonth.toISOString().split('T')[0];
    document.getElementById('endDate').value = endOfMonth.toISOString().split('T')[0];
}

function showFinancialReport() {
    document.getElementById('reportSelection').style.display = 'none';
    document.getElementById('financialReportSection').style.display = 'block';
    document.getElementById('financialReportResults').style.display = 'none';

    // Set default date range (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    document.getElementById('financialStartDate').value = startOfMonth.toISOString().split('T')[0];
    document.getElementById('financialEndDate').value = endOfMonth.toISOString().split('T')[0];
}

function showProductionReport() {
    document.getElementById('reportSelection').style.display = 'none';
    document.getElementById('productionPlanSection').style.display = 'block';
    document.getElementById('productionPlanResults').style.display = 'none';

    // Configure back button based on user role
    const user = JSON.parse(localStorage.getItem('user'));
    const backBtn = document.getElementById('backToReportsBtn2');
    if (user && user.role === 'master') {
        backBtn.textContent = '← Назад на главную';
        backBtn.onclick = () => window.location.href = '/master-dashboard';
        backBtn.style.display = 'inline-block';
    } else {
        backBtn.textContent = '← Назад к выбору отчетов';
        backBtn.onclick = showReportSelection;
        backBtn.style.display = 'inline-block';
    }

    // Set default date range (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    document.getElementById('planStartDate').value = startOfMonth.toISOString().split('T')[0];
    document.getElementById('planEndDate').value = endOfMonth.toISOString().split('T')[0];
}

// Initialize reports page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token) {
        window.location.href = '/';
        return;
    }

    // Verify user role (admins, managers, and masters can access reports)
    if (user.role === 'master') {
        // Masters can only access production plan
        showProductionReport();
    } else if (user.role === 'admin' || user.role === 'manager') {
        // Show report selection for admins and managers
        showReportSelection();
    } else {
        // Other roles cannot access reports
        document.getElementById('reportSelection').style.display = 'none';
        document.getElementById('workloadReportSection').style.display = 'none';
        document.getElementById('productionPlanSection').style.display = 'none';
        document.getElementById('financialReportSection').style.display = 'none';
    }

    // Update user info in header
    document.getElementById('userName').textContent = user.fullName;
    const avatarText = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('userAvatar').textContent = avatarText;

    // Profile modal event listeners
    document.getElementById('userName').addEventListener('click', () => {
        // Populate profile form
        document.getElementById('modalProfileFullName').value = user.fullName;
        document.getElementById('modalProfileEmail').value = user.email;

        document.getElementById('profileModal').classList.add('show');
    });

    document.getElementById('closeProfileModal').addEventListener('click', () => {
        document.getElementById('profileModal').classList.remove('show');
    });

    // Profile form submissions
    document.querySelector('.profile-form-modal').addEventListener('submit', (e) => {
        e.preventDefault();
        updateProfile();
    });

    document.querySelector('.password-form-modal').addEventListener('submit', (e) => {
        e.preventDefault();
        updatePassword();
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Report selection event listeners
    document.getElementById('workloadReportBtn').addEventListener('click', showWorkloadReport);
    document.getElementById('financialReportBtn').addEventListener('click', showFinancialReport);
    document.getElementById('productionReportBtn').addEventListener('click', showProductionReport);

    // Workload report event listeners
    document.getElementById('backToReportsBtn').addEventListener('click', showReportSelection);
    document.getElementById('generateWorkloadBtn').addEventListener('click', generateWorkloadReport);
    document.getElementById('exportWorkloadBtn').addEventListener('click', exportWorkloadReport);
    document.getElementById('printWorkloadBtn').addEventListener('click', printWorkloadReport);

    // Production plan event listeners
    document.getElementById('generateProductionPlanBtn').addEventListener('click', generateProductionPlan);
    document.getElementById('exportProductionPlanBtn').addEventListener('click', exportProductionPlan);
    document.getElementById('printProductionPlanBtn').addEventListener('click', printProductionPlan);

    // Financial report event listeners
    document.getElementById('backToReportsBtn3').addEventListener('click', showReportSelection);
    document.getElementById('generateFinancialReportBtn').addEventListener('click', generateFinancialReport);
    document.getElementById('exportFinancialReportBtn').addEventListener('click', exportFinancialReport);
    document.getElementById('printFinancialReportBtn').addEventListener('click', printFinancialReport);

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        const profileModal = document.getElementById('profileModal');

        if (event.target === profileModal) {
            profileModal.classList.remove('show');
        }
    });

    console.log('Reports page initialized for role:', user.role);
});