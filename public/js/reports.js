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

// Placeholder functions for future report functionality
function generateSalesReport() {
    // TODO: Implement sales report generation
    alert('Функционал отчетов по продажам будет реализован в будущем');
}

function generateOrdersReport() {
    // TODO: Implement orders analysis report
    alert('Функционал анализа заказов будет реализован в будущем');
}

function generateMastersReport() {
    // TODO: Implement masters performance report
    alert('Функционал статистики работы мастеров будет реализован в будущем');
}

function generateFinancialReport() {
    // TODO: Implement financial reports
    alert('Функционал финансовых отчетов будет реализован в будущем');
}

function generatePeriodReport() {
    // TODO: Implement period-based reports
    alert('Функционал отчетов по периодам будет реализован в будущем');
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

    // Verify user role (managers, admins, and masters can access reports)
    if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'master') {
        alert('Доступ запрещен');
        window.location.href = '/';
        return;
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

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        const profileModal = document.getElementById('profileModal');

        if (event.target === profileModal) {
            profileModal.classList.remove('show');
        }
    });

    console.log('Reports page initialized - functionality will be implemented in future updates');
});