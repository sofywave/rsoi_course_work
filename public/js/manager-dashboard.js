// JWT utility functions
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

function getAuthHeadersForFormData() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Global functions for order actions
let currentGalleryImages = [];
let currentGalleryIndex = 0;
let currentOrderId = null;

// Global orders management variables and functions
let allOrders = []; // Store all orders for filtering

// Global modal functions
async function showOrderDetails(orderId) {
    const modal = document.getElementById('orderDetailsModal');
    const loading = document.getElementById('orderModalLoading');
    const error = document.getElementById('orderModalError');
    const content = document.getElementById('orderModalContent');

    if (!modal) {
        console.error('Modal element not found!');
        return;
    }

    // Store current order ID for save functionality
    currentOrderId = orderId;

    // Show modal and loading state
    modal.style.display = 'block';
    loading.style.display = 'block';
    error.style.display = 'none';
    content.style.display = 'none';

    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            throw new Error('Пользователь не авторизован');
        }

        // Load masters for dropdown first
        await loadMastersForDropdown();

        // Fetch order details
        console.log('Fetching order details for ID:', orderId);
        console.log('User:', user);

        const response = await fetch(`/api/orders/${orderId}`, {
            headers: getAuthHeaders()
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('API response:', result);

        if (result.success) {
            populateOrderModal(result.order);
            loading.style.display = 'none';
            content.style.display = 'block';
        } else {
            throw new Error(result.message || 'Ошибка при загрузке заказа');
        }

    } catch (error) {
        console.error('Show order details error:', error);
        loading.style.display = 'none';
        error.style.display = 'block';
        error.querySelector('p').textContent = error.message || 'Данные не загружены';
    }
}

// Populate modal with order data
function populateOrderModal(order) {
    if (!order) {
        console.error('No order data provided');
        return;
    }

    // Basic Details
    document.getElementById('modalOrderNumber').textContent = order.orderNumber || 'Не указан';
    document.getElementById('modalOrderStatus').textContent = getStatusText(order.status);
    document.getElementById('modalOrderStatus').className = `order-status status status-${order.status}`;

    const createdDate = new Date(order.createdAt).toLocaleDateString('ru-RU');
    const updatedDate = new Date(order.updatedAt).toLocaleDateString('ru-RU');
    document.getElementById('modalOrderCreated').textContent = `Создан: ${createdDate}`;
    document.getElementById('modalOrderUpdated').textContent = `Обновлен: ${updatedDate}`;

    // Client Information
    document.getElementById('modalClientName').textContent = order.client ? order.client.fullName : 'Не указан';
    document.getElementById('modalClientEmail').textContent = order.client ? order.client.email : 'Не указан';
    document.getElementById('modalClientPhone').textContent = order.client && order.client.phone ? order.client.phone : 'Не указан';

    // Order Specifications
    document.getElementById('modalProductType').textContent = order.productType || 'Не указан';
    document.getElementById('modalPriceRange').textContent = order.priceRange || 'Не указан';
    document.getElementById('modalFixedPrice').value = order.price || '';

    const deadlineValue = order.deadline ? new Date(order.deadline).toISOString().split('T')[0] : '';
    document.getElementById('modalDeadline').value = deadlineValue;

    document.getElementById('modalAssignedMaster').value = order.assignedTo ? order.assignedTo._id : '';

    const descriptionText = order.description ? order.description : 'Описание отсутствует';
    document.getElementById('modalDescription').textContent = descriptionText;

    // Attachments
    populateAttachments(order);
}

// Load masters for dropdown
async function loadMastersForDropdown() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch('/api/users/masters', {
            headers: {
                'user-id': user.id,
                'user-role': user.role
            }
        });

        const result = await response.json();
        if (result.success) {
            const masterSelect = document.getElementById('modalAssignedMaster');
            // Clear existing options except the first one
            masterSelect.innerHTML = '<option value="">Не назначен</option>';

            // Add masters
            result.masters.forEach(master => {
                const option = document.createElement('option');
                option.value = master.id;
                option.textContent = master.fullName;
                masterSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading masters:', error);
    }
}

// Save order changes
async function saveOrderChanges(orderId) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            throw new Error('Пользователь не авторизован');
        }

        const price = document.getElementById('modalFixedPrice').value;
        const deadline = document.getElementById('modalDeadline').value;
        const assignedTo = document.getElementById('modalAssignedMaster').value;

        const updateData = {};

        if (price !== '') {
            updateData.price = parseFloat(price);
        } else {
            updateData.price = null;
        }

        if (deadline !== '') {
            updateData.deadline = deadline;
        } else {
            updateData.deadline = null;
        }

        if (assignedTo !== '') {
            updateData.assignedTo = assignedTo;
        } else {
            updateData.assignedTo = null;
        }

        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updateData)
        });

        const result = await response.json();

        if (result.success) {
            // Show success message
            const successMessage = document.getElementById('saveSuccessMessage');
            successMessage.style.display = 'block';

            // Close modal and hide message after 3 seconds
            setTimeout(() => {
                successMessage.style.display = 'none';
                document.getElementById('orderDetailsModal').style.display = 'none';
            }, 3000);

            // Refresh orders list
            loadOrders();
        } else {
            throw new Error(result.message || 'Ошибка при сохранении изменений');
        }

    } catch (error) {
        console.error('Save order changes error:', error);
        // Show error in the success message area with red color
        const successMessage = document.getElementById('saveSuccessMessage');
        successMessage.textContent = 'Ошибка: ' + error.message;
        successMessage.style.backgroundColor = '#dc3545';
        successMessage.style.display = 'inline-block';

        // Reset and hide error message after 5 seconds
        setTimeout(() => {
            successMessage.textContent = 'Изменения сохранены';
            successMessage.style.backgroundColor = '#28a745';
            successMessage.style.display = 'none';
        }, 5000);
    }
}

// Populate attachments section
function populateAttachments(order) {
    const attachmentsContainer = document.getElementById('modalAttachments');
    const photos = order.photos || [];
    const attachments = order.attachments || [];

    // Combine photos and attachments
    const allAttachments = [...photos, ...attachments];

    if (allAttachments.length === 0) {
        attachmentsContainer.innerHTML = '<div class="no-attachments">Файлы не прикреплены</div>';
        return;
    }

    // Filter to get only photos for gallery
    currentGalleryImages = photos.map(photo => ({
        url: `/uploads/orders/photos/${photo.filename}`,
        filename: photo.originalName || photo.filename
    }));

    attachmentsContainer.innerHTML = '<div class="attachments-grid"></div>';
    const grid = attachmentsContainer.querySelector('.attachments-grid');

    allAttachments.forEach((attachment, index) => {
        const item = document.createElement('div');
        item.className = 'attachment-item';

        // Check if it's a photo
        const isPhoto = attachment.filename && photos.some(p => p.filename === attachment.filename);

        if (isPhoto) {
            item.innerHTML = `
                <img src="/uploads/orders/photos/${attachment.filename}"
                     alt="${attachment.alt || attachment.originalName || attachment.filename}"
                     class="attachment-image"
                     onclick="openImageGallery(${photos.findIndex(p => p.filename === attachment.filename)})">
                <div class="attachment-info">
                    <div class="attachment-filename">${attachment.originalName || attachment.filename}</div>
                </div>
            `;
        } else {
            // For non-photo attachments, show download link
            item.innerHTML = `
                <div class="attachment-info" style="height: 120px; display: flex; align-items: center; justify-content: center; background-color: #f8f9fa;">
                    <div style="text-align: center;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📄</div>
                        <div class="attachment-filename">${attachment.originalName || attachment.filename}</div>
                    </div>
                </div>
            `;
            item.onclick = () => window.open(`/uploads/${attachment.path || attachment.filename}`, '_blank');
        }

        grid.appendChild(item);
    });
}

// Image gallery functions
function openImageGallery(index) {
    if (currentGalleryImages.length === 0) return;

    currentGalleryIndex = index;
    updateGallery();

    document.getElementById('imageGalleryModal').style.display = 'block';
}

function updateGallery() {
    const image = document.getElementById('galleryImage');
    const counter = document.getElementById('galleryCounter');
    const filename = document.getElementById('galleryFilename');
    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');

    image.src = currentGalleryImages[currentGalleryIndex].url;
    counter.textContent = `${currentGalleryIndex + 1} / ${currentGalleryImages.length}`;
    filename.textContent = currentGalleryImages[currentGalleryIndex].filename;

    prevBtn.disabled = currentGalleryIndex === 0;
    nextBtn.disabled = currentGalleryIndex === currentGalleryImages.length - 1;
}

function navigateGallery(direction) {
    currentGalleryIndex += direction;
    if (currentGalleryIndex < 0) currentGalleryIndex = currentGalleryImages.length - 1;
    if (currentGalleryIndex >= currentGalleryImages.length) currentGalleryIndex = 0;
    updateGallery();
}

// Copy order number to clipboard
function copyOrderNumber() {
    const orderNumber = document.getElementById('modalOrderNumber').textContent;
    navigator.clipboard.writeText(orderNumber).then(() => {
        const btn = document.getElementById('copyOrderNumber');
        const originalText = btn.textContent;
        btn.textContent = 'Скопировано!';
        btn.style.backgroundColor = '#28a745';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = orderNumber;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        const btn = document.getElementById('copyOrderNumber');
        const originalText = btn.textContent;
        btn.textContent = 'Скопировано!';
        btn.style.backgroundColor = '#28a745';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
        }, 2000);
    });
}

// Global helper function
function getStatusText(status) {
    const statusMap = {
        'new': 'Новый',
        'clarification': 'Уточнение',
        'in_progress': 'В работе',
        'awaiting_payment': 'Ожидает оплаты',
        'completed': 'Завершен',
        'delivered': 'Доставлен',
        'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
}

// Global viewOrder function
function viewOrder(orderId) {
    showOrderDetails(orderId);
}

// Global users management variables and functions
let allUsers = []; // Store all users for filtering

// Global helper function to get role text in Russian
function getRoleText(role) {
    const roleMap = {
        'client': 'Клиент',
        'master': 'Мастер',
        'manager': 'Администратор',
        'admin': 'Администратор'
    };
    return roleMap[role] || role;
}

// Global loadUsers function
async function loadUsers() {
    const loadingSpinner = document.getElementById('usersLoadingSpinner');
    const errorMessage = document.getElementById('usersErrorMessage');
    const usersTable = document.getElementById('usersTable');
    const noUsersMessage = document.getElementById('noUsersMessage');

    // Show loading, hide others
    loadingSpinner.style.display = 'block';
    errorMessage.style.display = 'none';
    usersTable.style.display = 'none';
    noUsersMessage.style.display = 'none';

    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            throw new Error('Пользователь не авторизован');
        }

        const response = await fetch('/api/manager/users', {
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            allUsers = result.users;
            displayUsers(allUsers);
        } else {
            throw new Error(result.message || 'Ошибка при загрузке пользователей');
        }

    } catch (error) {
        console.error('Load users error:', error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Global displayUsers function
function displayUsers(users) {
    const usersTableBody = document.getElementById('usersTableBody');
    const usersTable = document.getElementById('usersTable');
    const noUsersMessage = document.getElementById('noUsersMessage');

    if (users.length === 0) {
        usersTable.style.display = 'none';
        noUsersMessage.style.display = 'block';
        return;
    }

    usersTableBody.innerHTML = '';

    users.forEach(user => {
        const row = createUserRow(user);
        usersTableBody.appendChild(row);
    });

    usersTable.style.display = 'table';
    noUsersMessage.style.display = 'none';
}

// Global createUserRow function
function createUserRow(user) {
    const row = document.createElement('tr');

    // Format registration date
    const registrationDate = new Date(user.createdAt).toLocaleDateString('ru-RU');

    // Format role
    const roleText = getRoleText(user.role);
    const roleClass = `user-role role-${user.role}`;

    row.innerHTML = `
        <td>${user.fullName}</td>
        <td>${user.email}</td>
        <td><span class="${roleClass}">${roleText}</span></td>
        <td>${user.phone || 'Не указан'}</td>
        <td>${registrationDate}</td>
        <td class="actions">
            <button class="action-btn edit" onclick="editUserRole('${user.id}', '${user.role}')">✏️</button>
        </td>
    `;

    return row;
}

// Global filterUsers function
function filterUsers() {
    const roleFilter = document.getElementById('userRoleFilter').value;
    const searchTerm = document.getElementById('userSearchInput').value.toLowerCase();

    let filteredUsers = allUsers;

    // Filter by role
    if (roleFilter) {
        filteredUsers = filteredUsers.filter(user => {
            if (roleFilter === 'admin') {
                // Treat both 'admin' and 'manager' as admin role
                return user.role === 'admin' || user.role === 'manager';
            }
            return user.role === roleFilter;
        });
    }

    // Filter by search term
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user =>
            user.fullName.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
        );
    }

    displayUsers(filteredUsers);
}

// Global editUserRole function - inline role editing
function editUserRole(userId, currentRole) {
    // Find the role cell for this user
    const rows = document.querySelectorAll('#usersTableBody tr');
    let targetCell = null;

    rows.forEach(row => {
        const editBtn = row.querySelector('.action-btn.edit');
        if (editBtn && editBtn.getAttribute('onclick').includes(userId)) {
            targetCell = row.cells[2]; // Role column (0-indexed: 0=name, 1=email, 2=role)
        }
    });

    if (!targetCell) return;

    // Store original content
    const originalContent = targetCell.innerHTML;

    // Create dropdown
    const select = document.createElement('select');
    select.className = 'role-select';
    select.innerHTML = `
        <option value="client" ${currentRole === 'client' ? 'selected' : ''}>Клиент</option>
        <option value="admin" ${currentRole === 'admin' || currentRole === 'manager' ? 'selected' : ''}>Администратор</option>
        <option value="master" ${currentRole === 'master' ? 'selected' : ''}>Мастер</option>
    `;

    // Replace cell content with dropdown
    targetCell.innerHTML = '';
    targetCell.appendChild(select);
    select.focus();

    // Handle selection
    const handleSelection = async () => {
        const newRole = select.value;
        if (newRole === currentRole) {
            // No change, restore original content
            targetCell.innerHTML = originalContent;
            return;
        }

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                throw new Error('Пользователь не авторизован');
            }

            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ role: newRole })
            });

            const result = await response.json();

            if (result.success) {
                // Update the display with new role
                const roleText = getRoleText(newRole);
                const roleClass = `user-role role-${newRole}`;
                targetCell.innerHTML = `<span class="${roleClass}">${roleText}</span>`;
            } else {
                throw new Error(result.message || 'Ошибка при изменении роли');
            }

        } catch (error) {
            console.error('Role update error:', error);
            // Show error and restore original content
            targetCell.innerHTML = originalContent;
            alert('Ошибка при изменении роли: ' + error.message);
        }
    };

    // Handle events
    select.addEventListener('change', handleSelection);
    select.addEventListener('blur', handleSelection);
    select.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSelection();
        } else if (e.key === 'Escape') {
            // Cancel editing, restore original content
            targetCell.innerHTML = originalContent;
        }
    });
}

// Global loadOrders function
async function loadOrders() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const ordersTable = document.getElementById('ordersTable');
    const noOrdersMessage = document.getElementById('noOrdersMessage');

    // Show loading, hide others
    loadingSpinner.style.display = 'block';
    errorMessage.style.display = 'none';
    ordersTable.style.display = 'none';
    noOrdersMessage.style.display = 'none';

    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            throw new Error('Пользователь не авторизован');
        }

        const response = await fetch('/api/manager/orders', {
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            allOrders = result.orders;
            displayOrders(allOrders);
        } else {
            throw new Error(result.message || 'Ошибка при загрузке заказов');
        }

    } catch (error) {
        console.error('Load orders error:', error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Global displayOrders function
function displayOrders(orders) {
    const ordersTableBody = document.getElementById('ordersTableBody');
    const ordersTable = document.getElementById('ordersTable');
    const noOrdersMessage = document.getElementById('noOrdersMessage');

    if (orders.length === 0) {
        ordersTable.style.display = 'none';
        noOrdersMessage.style.display = 'block';
        return;
    }

    ordersTableBody.innerHTML = '';

    orders.forEach(order => {
        const row = createOrderRow(order);
        ordersTableBody.appendChild(row);
    });

    ordersTable.style.display = 'table';
    noOrdersMessage.style.display = 'none';
}

// Global createOrderRow function
function createOrderRow(order) {
    const row = document.createElement('tr');

    // Format deadline
    const deadlineText = order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : 'Не указан';
    const deadlineClass = order.isOverdue ? 'overdue' : (order.daysUntilDeadline !== null && order.daysUntilDeadline <= 3 ? 'near-deadline' : '');

    // Format price
    const priceText = order.price ? `${order.price} BYN` : 'Не указана';

    // Format status
    const statusText = getStatusText(order.status);
    const statusClass = `status status-${order.status}`;

    row.innerHTML = `
        <td>${order.orderNumber}</td>
        <td>${order.client ? order.client.fullName : 'Не указан'}</td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>${order.productType || 'Не указан'}</td>
        <td>${priceText}</td>
        <td class="${deadlineClass}">${deadlineText}</td>
        <td>${order.assignedTo ? order.assignedTo.fullName : 'Не назначен'}</td>
        <td class="actions">
            <button class="action-btn view" onclick="viewOrder('${order.id}')">👁</button>
        </td>
    `;

    return row;
}

// Global filterOrders function
function filterOrders() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    let filteredOrders = allOrders;

    // Filter by status
    if (statusFilter) {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order =>
            order.orderNumber.toLowerCase().includes(searchTerm) ||
            (order.client && order.client.fullName.toLowerCase().includes(searchTerm)) ||
            (order.assignedTo && order.assignedTo.fullName.toLowerCase().includes(searchTerm))
        );
    }

    displayOrders(filteredOrders);
}

document.addEventListener('DOMContentLoaded', function() {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.content-section');

    // Profile modal elements
    const profileModal = document.getElementById('profileModal');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const modalProfileFullName = document.getElementById('modalProfileFullName');
    const modalProfileEmail = document.getElementById('modalProfileEmail');
    const modalCurrentPassword = document.getElementById('modalCurrentPassword');
    const modalNewPassword = document.getElementById('modalNewPassword');
    const modalConfirmNewPassword = document.getElementById('modalConfirmNewPassword');
    const profileUpdateBtnModal = document.querySelector('.profile-update-btn-modal');
    const passwordUpdateBtnModal = document.querySelector('.password-update-btn-modal');
    const profileFormModal = document.querySelector('.profile-form-modal');
    const passwordFormModal = document.querySelector('.password-form-modal');

    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem('user'));

    if (user && user.fullName) {
        userName.textContent = user.fullName;

        // Generate initials for avatar
        const nameParts = user.fullName.split(' ');
        const initials = nameParts.length >= 2
            ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
            : nameParts[0][0].toUpperCase();
        userAvatar.textContent = initials;
    } else {
        userName.textContent = 'Пользователь не найден';
        userAvatar.textContent = '?';
    }

    // Logout functionality
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/';
    });

    // Profile modal functionality
    function openProfileModal() {
        if (user) {
            modalProfileFullName.value = user.fullName || '';
            modalProfileEmail.value = user.email || '';
        }
        profileModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        modalProfileFullName.focus();
    }

    function closeProfileModalFunc() {
        profileModal.classList.remove('show');
        document.body.style.overflow = '';
        // Clear password fields
        modalCurrentPassword.value = '';
        modalNewPassword.value = '';
        modalConfirmNewPassword.value = '';
        // Clear any messages
        const messages = profileModal.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
    }

    userName.addEventListener('click', openProfileModal);
    closeProfileModal.addEventListener('click', closeProfileModalFunc);

    // Close modal when clicking outside
    profileModal.addEventListener('click', function(e) {
        if (e.target === profileModal) {
            closeProfileModalFunc();
        }
    });

    // Utility function to show messages
    function showMessage(type, text, parentElement) {
        // Remove existing messages
        const existingMessage = parentElement.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        message.classList.add('show');

        parentElement.insertBefore(message, parentElement.firstChild);

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                message.classList.remove('show');
                setTimeout(() => message.remove(), 300);
            }, 5000);
        }
    }

    // Profile form submission (modal)
    profileFormModal.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            fullName: modalProfileFullName.value.trim(),
            email: modalProfileEmail.value.trim()
        };

        // Basic validation
        if (!formData.fullName || !formData.email) {
            showMessage('error', 'Все поля обязательны для заполнения', profileFormModal);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showMessage('error', 'Пожалуйста, введите корректный email адрес', profileFormModal);
            return;
        }

        try {
            profileUpdateBtnModal.disabled = true;
            profileUpdateBtnModal.textContent = 'Обновление...';

            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                // Update localStorage and UI
                const updatedUser = { ...user, ...result.user };
                localStorage.setItem('user', JSON.stringify(updatedUser));

                // Update header display
                document.getElementById('userName').textContent = updatedUser.fullName;
                const nameParts = updatedUser.fullName.split(' ');
                const initials = nameParts.length >= 2
                    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
                    : nameParts[0][0].toUpperCase();
                document.getElementById('userAvatar').textContent = initials;

                showMessage('success', 'Профиль успешно обновлен', profileFormModal);
            } else {
                showMessage('error', result.message || 'Ошибка при обновлении профиля', profileFormModal);
            }
        } catch (error) {
            console.error('Profile update error:', error);
            showMessage('error', 'Произошла ошибка при обновлении профиля', profileFormModal);
        } finally {
            profileUpdateBtnModal.disabled = false;
            profileUpdateBtnModal.textContent = 'Обновить профиль';
        }
    });

    // Password form submission (modal)
    passwordFormModal.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            currentPassword: modalCurrentPassword.value,
            newPassword: modalNewPassword.value,
            confirmPassword: modalConfirmNewPassword.value
        };

        // Basic validation
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            showMessage('error', 'Все поля обязательны для заполнения', passwordFormModal);
            return;
        }

        if (formData.newPassword.length < 6) {
            showMessage('error', 'Новый пароль должен быть не менее 6 символов', passwordFormModal);
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            showMessage('error', 'Пароли не совпадают', passwordFormModal);
            return;
        }

        try {
            passwordUpdateBtnModal.disabled = true;
            passwordUpdateBtnModal.textContent = 'Изменение...';

            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword
                })
            });

            const result = await response.json();

            if (result.success) {
                // Clear password fields
                modalCurrentPassword.value = '';
                modalNewPassword.value = '';
                modalConfirmNewPassword.value = '';

                showMessage('success', 'Пароль успешно изменен', passwordFormModal);
            } else {
                showMessage('error', result.message || 'Ошибка при изменении пароля', passwordFormModal);
            }
        } catch (error) {
            console.error('Password update error:', error);
            showMessage('error', 'Произошла ошибка при изменении пароля', passwordFormModal);
        } finally {
            passwordUpdateBtnModal.disabled = false;
            passwordUpdateBtnModal.textContent = 'Изменить пароль';
        }
    });

    // Set initial state for orders section
    document.querySelector('main').classList.add('orders-top');
    document.querySelector('main').classList.remove('users-top');

    // Navigation functionality
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and sections
            navButtons.forEach(btn => btn.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));

            // Remove orders-top and users-top classes from main
            document.querySelector('main').classList.remove('orders-top');
            document.querySelector('main').classList.remove('users-top');

            // Add active class to clicked button and corresponding section
            this.classList.add('active');
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');

            // Add orders-top class to main if orders section is active
            if (sectionId === 'orders') {
                document.querySelector('main').classList.add('orders-top');
            }

            // Add users-top class to main if users section is active
            if (sectionId === 'users') {
                document.querySelector('main').classList.add('users-top');
                loadUsers();
            }
        });
    });

    // Orders Management Functionality

    // Load orders when page loads
    loadOrders();

    // Event listeners for filters and controls
    document.getElementById('statusFilter').addEventListener('change', filterOrders);
    document.getElementById('searchInput').addEventListener('input', filterOrders);
    document.getElementById('refreshOrders').addEventListener('click', loadOrders);

    // Users Management Functionality

    // Load users when users section becomes active
    // We'll handle this in the navigation functionality below

    // Event listeners for user filters and controls
    document.getElementById('userRoleFilter').addEventListener('change', filterUsers);
    document.getElementById('userSearchInput').addEventListener('input', filterUsers);
    document.getElementById('refreshUsers').addEventListener('click', loadUsers);

    // Modal event listeners setup
    // Ensure modals are hidden on page load
    document.getElementById('orderDetailsModal').style.display = 'none';
    document.getElementById('imageGalleryModal').style.display = 'none';

    // Close modals when clicking outside or on close button
    document.getElementById('closeOrderModal').onclick = () => {
        document.getElementById('orderDetailsModal').style.display = 'none';
    };

    document.getElementById('closeGalleryModal').onclick = () => {
        document.getElementById('imageGalleryModal').style.display = 'none';
    };

    // Click outside to close
    window.onclick = function(event) {
        const orderModal = document.getElementById('orderDetailsModal');
        const galleryModal = document.getElementById('imageGalleryModal');

        if (event.target === orderModal) {
            orderModal.style.display = 'none';
        }
        if (event.target === galleryModal) {
            galleryModal.style.display = 'none';
        }
    };

    // ESC key to close modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            document.getElementById('orderDetailsModal').style.display = 'none';
            document.getElementById('imageGalleryModal').style.display = 'none';
            closeProfileModalFunc();
        }
    });

    // Gallery navigation
    document.getElementById('galleryPrev').onclick = () => navigateGallery(-1);
    document.getElementById('galleryNext').onclick = () => navigateGallery(1);

    // Copy order number button
    document.getElementById('copyOrderNumber').onclick = copyOrderNumber;

    // Save order changes button
    document.getElementById('saveOrderChanges').onclick = () => {
        if (currentOrderId) {
            saveOrderChanges(currentOrderId);
        } else {
            alert('Ошибка: ID заказа не найден');
        }
    };

    // Modal functionality moved to global scope

    // Reports functionality
    setupReportsFunctionality();

});

// Reports functionality
function setupReportsFunctionality() {
    // Report selection event listeners
    const workloadReportBtn = document.getElementById('workloadReportBtn');
    const financialReportBtn = document.getElementById('financialReportBtn');
    const productionReportBtn = document.getElementById('productionReportBtn');

    if (workloadReportBtn) {
        workloadReportBtn.addEventListener('click', showWorkloadReport);
    }
    if (financialReportBtn) {
        financialReportBtn.addEventListener('click', showFinancialReport);
    }
    if (productionReportBtn) {
        productionReportBtn.addEventListener('click', showProductionReport);
    }

    // Workload report event listeners
    const backToReportsBtn = document.getElementById('backToReportsBtn');
    const generateWorkloadBtn = document.getElementById('generateWorkloadBtn');
    const exportWorkloadBtn = document.getElementById('exportWorkloadBtn');
    const printWorkloadBtn = document.getElementById('printWorkloadBtn');

    if (backToReportsBtn) {
        backToReportsBtn.addEventListener('click', showReportSelection);
    }
    if (generateWorkloadBtn) {
        generateWorkloadBtn.addEventListener('click', generateWorkloadReport);
    }
    if (exportWorkloadBtn) {
        exportWorkloadBtn.addEventListener('click', exportWorkloadReport);
    }
    if (printWorkloadBtn) {
        printWorkloadBtn.addEventListener('click', printWorkloadReport);
    }
}

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
    alert('Функционал финансовых отчетов будет реализован в будущем');
}

function showProductionReport() {
    alert('Функционал планов производства будет реализован в будущем');
}

async function generateWorkloadReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert('Пожалуйста, выберите период для формирования отчета');
        return;
    }

    try {
        const response = await fetch(`/api/reports/workload?startDate=${startDate}&endDate=${endDate}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
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