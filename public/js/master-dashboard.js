// JWT utility functions
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
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

    const descriptionText = order.description ? order.description : 'Описание отсутствует';
    document.getElementById('modalDescription').textContent = descriptionText;

    // Attachments
    populateAttachments(order);
}

// Populate attachments section
function populateAttachments(order) {
    const attachmentsContainer = document.getElementById('modalAttachments');

    if (!order.attachments || order.attachments.length === 0) {
        attachmentsContainer.innerHTML = '<div class="no-attachments">Файлы не прикреплены</div>';
        return;
    }

    attachmentsContainer.innerHTML = '';

    order.attachments.forEach((attachment, index) => {
        const attachmentDiv = document.createElement('div');
        attachmentDiv.className = 'attachment-item';

        const link = document.createElement('a');
        link.className = 'attachment-link';
        link.href = attachment.url;
        link.target = '_blank';
        link.textContent = attachment.filename || `Файл ${index + 1}`;

        attachmentDiv.appendChild(link);
        attachmentsContainer.appendChild(attachmentDiv);
    });
}

// Status text mapping
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

// Save order changes
async function saveOrderChanges(orderId) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            throw new Error('Пользователь не авторизован');
        }

        const price = document.getElementById('modalFixedPrice').value;
        const deadline = document.getElementById('modalDeadline').value;

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
        successMessage.style.color = 'white';
        successMessage.style.display = 'block';

        setTimeout(() => {
            successMessage.style.display = 'none';
            successMessage.style.backgroundColor = '';
            successMessage.style.color = '';
            successMessage.textContent = 'Изменения сохранены';
        }, 5000);
    }
}

// Copy order number to clipboard
function copyOrderNumber() {
    const orderNumber = document.getElementById('modalOrderNumber').textContent;
    navigator.clipboard.writeText(orderNumber).then(() => {
        // Show temporary feedback
        const copyBtn = document.getElementById('copyOrderNumber');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Скопировано';
        copyBtn.style.backgroundColor = '#27ae60';

        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.backgroundColor = '';
        }, 2000);
    });
}

// Load orders for master dashboard
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

        console.log('Loading orders for master:', user);

        // Fetch orders assigned to this master
        const response = await fetch('/api/orders', {
            headers: getAuthHeaders()
        });

        const result = await response.json();
        console.log('Orders API response:', result);

        if (result.success) {
            allOrders = result.orders || [];

            console.log('All orders received:', allOrders.map(o => ({ id: o.id, assignedTo: o.assignedTo, status: o.status })));
            console.log('Current user:', user);

            // Filter orders to show only those assigned to current master
            const masterOrders = allOrders.filter(order => order.assignedTo && order.assignedTo._id === user.id);

            console.log('Filtered master orders:', masterOrders.map(o => ({ id: o.id, assignedTo: o.assignedTo, status: o.status })));

            if (masterOrders.length > 0) {
                renderOrdersTable(masterOrders);
                ordersTable.style.display = 'table';
            } else {
                noOrdersMessage.style.display = 'block';
            }
        } else {
            throw new Error(result.message || 'Ошибка при загрузке заказов');
        }

    } catch (error) {
        console.error('Load orders error:', error);
        errorMessage.textContent = error.message || 'Ошибка при загрузке заказов';
        errorMessage.style.display = 'block';
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Render orders table
function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';

    orders.forEach(order => {
        const row = createOrderRow(order);
        tbody.appendChild(row);
    });
}

// Create order row for table
function createOrderRow(order) {
    const row = document.createElement('tr');

    // Format dates
    const createdDate = new Date(order.createdAt).toLocaleDateString('ru-RU');

    // Format deadline
    let deadlineText = 'Не указан';
    let deadlineClass = '';
    if (order.deadline) {
        const deadlineDate = new Date(order.deadline);
        deadlineText = deadlineDate.toLocaleDateString('ru-RU');

        // Add class for overdue deadlines
        if (deadlineDate < new Date() && order.status !== 'completed' && order.status !== 'delivered' && order.status !== 'cancelled') {
            deadlineClass = 'overdue-deadline';
        }
    }

    // Format price
    const priceText = order.price ? `${order.price} BYN` : (order.priceRange || 'Не указана');

    row.innerHTML = `
        <td class="order-number">${order.orderNumber}</td>
        <td>${order.client ? order.client.fullName : 'Не указан'}</td>
        <td><span class="status-badge status-${order.status}" data-order-id="${order.id}" data-current-status="${order.status}">${getStatusText(order.status)}</span></td>
        <td>${order.productType || 'Не указан'}</td>
        <td class="order-price">${priceText}</td>
        <td class="${deadlineClass}">${deadlineText}</td>
        <td class="actions">
            <button class="action-btn edit" onclick="editOrderStatus('${order.id}', '${order.status}')">✏️</button>
        </td>
    `;

    return row;
}

// Filter orders
function filterOrders() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    let filteredOrders = allOrders.filter(order => {
        // Only show orders assigned to current master
        const user = JSON.parse(localStorage.getItem('user'));
        return order.assignedTo && order.assignedTo._id === user.id;
    });

    // Filter by status
    if (statusFilter) {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }

    // Filter by search term (order number or client name)
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => {
            const orderNumberMatch = order.orderNumber && order.orderNumber.toLowerCase().includes(searchTerm);
            const clientNameMatch = order.client && order.client.fullName && order.client.fullName.toLowerCase().includes(searchTerm);
            return orderNumberMatch || clientNameMatch;
        });
    }

    if (filteredOrders.length > 0) {
        renderOrdersTable(filteredOrders);
        document.getElementById('ordersTable').style.display = 'table';
        document.getElementById('noOrdersMessage').style.display = 'none';
    } else {
        document.getElementById('ordersTable').style.display = 'none';
        document.getElementById('noOrdersMessage').style.display = 'block';
    }
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

// Global editOrderStatus function - inline status editing
function editOrderStatus(orderId, currentStatus) {
    // Find the status cell for this order
    const statusSpan = document.querySelector(`[data-order-id="${orderId}"]`);
    if (!statusSpan) return;

    const statusCell = statusSpan.parentElement;

    // Store original content
    const originalContent = statusCell.innerHTML;

    // Create dropdown
    const select = document.createElement('select');
    select.className = 'status-select';
    const options = [
        { value: 'new', label: 'Новый' },
        { value: 'clarification', label: 'Уточнение' },
        { value: 'in_progress', label: 'В работе' },
        { value: 'awaiting_payment', label: 'Ожидает оплаты' },
        { value: 'completed', label: 'Завершен' },
        { value: 'delivered', label: 'Доставлен' },
        { value: 'cancelled', label: 'Отменен' }
    ];

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        if (option.value === currentStatus) {
            optionElement.selected = true;
        }
        select.appendChild(optionElement);
    });

    // Replace cell content with dropdown
    statusCell.innerHTML = '';
    statusCell.appendChild(select);
    select.focus();

    let statusChanged = false;

    // Handle selection
    const handleSelection = async () => {
        const newStatus = select.value;
        console.log('Selected status:', newStatus, 'Current status:', currentStatus);

        // If no change, restore original content
        if (newStatus === currentStatus) {
            console.log('No status change detected');
            statusCell.innerHTML = originalContent;
            statusChanged = false; // Reset flag
            return;
        }

        // Show loading state
        select.disabled = true;
        select.style.opacity = '0.6';

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                throw new Error('Пользователь не авторизован');
            }

            console.log('Updating order status:', { orderId, newStatus, currentStatus, userId: user.id });

            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status: newStatus })
            });

            console.log('API response status:', response.status);

            const result = await response.json();
            console.log('API response:', result);

            if (result.success) {
                // Update the display with new status
                const statusText = getStatusText(newStatus);
                const statusClass = `status-badge status-${newStatus}`;
                statusCell.innerHTML = `<span class="${statusClass}" data-order-id="${orderId}" data-current-status="${newStatus}">${statusText}</span>`;

                // Update the order in our local array
                const orderIndex = allOrders.findIndex(order => order.id === orderId);
                if (orderIndex !== -1) {
                    allOrders[orderIndex].status = newStatus;
                }

                // Show success feedback
                console.log('Status updated successfully');

                // Re-enable select (though it will be replaced)
                select.disabled = false;
                select.style.opacity = '1';
            } else {
                throw new Error(result.message || 'Ошибка при изменении статуса');
            }

        } catch (error) {
            console.error('Status change error:', error);
            // Restore original content on error
            statusCell.innerHTML = originalContent;
            statusChanged = false; // Reset flag
            // Re-enable select (though it will be replaced)
            select.disabled = false;
            select.style.opacity = '1';
            alert('Ошибка при изменении статуса: ' + error.message);
        }
    };

    // Handle events
    select.addEventListener('change', () => {
        statusChanged = true;
        handleSelection();
    });

    select.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Cancel editing, restore original content
            statusCell.innerHTML = originalContent;
        }
    });

    // Add blur handler to restore if user clicks away without selecting
    select.addEventListener('blur', () => {
        setTimeout(() => {
            if (!statusChanged && document.activeElement !== select) {
                statusCell.innerHTML = originalContent;
            }
        }, 150);
    });
}

// Logout function
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token) {
        window.location.href = '/';
        return;
    }

    // Verify user role
    if (user.role !== 'master') {
        alert('Доступ запрещен');
        window.location.href = '/';
        return;
    }

    // Update user info in header
    document.getElementById('userName').textContent = user.fullName;
    const avatarText = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('userAvatar').textContent = avatarText;

    // Load initial data
    loadOrders();

    // Event listeners
    document.getElementById('statusFilter').addEventListener('change', filterOrders);
    document.getElementById('searchInput').addEventListener('input', filterOrders);
    document.getElementById('refreshOrders').addEventListener('click', loadOrders);

    // Modal event listeners
    document.getElementById('closeOrderModal').addEventListener('click', () => {
        document.getElementById('orderDetailsModal').style.display = 'none';
    });

    document.getElementById('saveOrderChanges').addEventListener('click', () => {
        saveOrderChanges(currentOrderId);
    });

    document.getElementById('copyOrderNumber').addEventListener('click', copyOrderNumber);

    // Profile modal
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
        const orderModal = document.getElementById('orderDetailsModal');
        const profileModal = document.getElementById('profileModal');

        if (event.target === orderModal) {
            orderModal.style.display = 'none';
        }
        if (event.target === profileModal) {
            profileModal.classList.remove('show');
        }
    });
});