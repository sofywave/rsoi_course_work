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

// UI management functions
function showReportSelection() {
    document.getElementById('reportSelection').style.display = 'block';
    document.getElementById('workloadReportSection').style.display = 'none';
    document.getElementById('nonAdminPlaceholder').style.display = 'none';
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
    alert('Функционал финансовых отчетов будет реализован в будущем');
}

function showProductionReport() {
    alert('Функционал планов производства будет реализован в будущем');
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

    // Verify user role (admins and managers can access reports)
    if (user.role !== 'admin' && user.role !== 'manager') {
        document.getElementById('nonAdminPlaceholder').style.display = 'block';
        document.getElementById('reportSelection').style.display = 'none';
        document.getElementById('workloadReportSection').style.display = 'none';
    } else {
        // Show report selection for admins and managers
        showReportSelection();
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

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        const profileModal = document.getElementById('profileModal');

        if (event.target === profileModal) {
            profileModal.classList.remove('show');
        }
    });

    console.log('Reports page initialized for role:', user.role);
});