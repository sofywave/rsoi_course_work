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

document.addEventListener('DOMContentLoaded', function() {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');

    // Order form elements
    const orderForm = document.querySelector('.order-form');
    const productTypeSelect = document.getElementById('productType');
    const orderDescription = document.getElementById('orderDescription');
    const priceEstimation = document.querySelector('.price-estimation');
    const priceAmount = document.querySelector('.price-amount');
    const priceNote = document.querySelector('.price-note');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const photoInput = document.getElementById('photoInput');

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

    // Contact modal elements
    const contactManagerBtn = document.getElementById('contactManagerBtn');
    const contactModal = document.getElementById('contactModal');
    const closeContactModal = document.getElementById('closeContactModal');
    const cancelContact = document.getElementById('cancelContact');
    const contactForm = document.getElementById('contactForm');
    const sendEmailLink = document.getElementById('sendEmailLink');

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
        userName.textContent = 'Гость';
        userAvatar.textContent = 'Г';
    }

    // Contact modal functionality
    function openContactModal() {
        contactModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeContactModalFunc() {
        contactModal.classList.remove('show');
        document.body.style.overflow = '';
        contactForm.reset();
    }

    contactManagerBtn.addEventListener('click', openContactModal);
    closeContactModal.addEventListener('click', closeContactModalFunc);
    cancelContact.addEventListener('click', closeContactModalFunc);

    // Close modal when clicking outside
    contactModal.addEventListener('click', function(e) {
        if (e.target === contactModal) {
            closeContactModalFunc();
        }
    });

    // Handle email link click
    sendEmailLink.addEventListener('click', function(e) {
        e.preventDefault();

        const subject = document.getElementById('contactSubject').value.trim();
        const message = document.getElementById('contactMessage').value.trim();

        if (!subject || !message) {
            alert('Пожалуйста, заполните тему и сообщение.');
            return;
        }

        // Build email content
        const userInfo = user ? `\n\nИнформация о клиенте:\nИмя: ${user.fullName}\nEmail: ${user.email}` : '';
        const fullMessage = `${message}${userInfo}\n\nОтправлено через систему управления ООО «Панна сувенир»`;

        // Create Gmail compose URL
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=s.gorbachyonok@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullMessage)}`;

        // Open Gmail in new tab
        window.open(gmailUrl, '_blank');

        // Close modal
        closeContactModalFunc();
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

    // Logout functionality
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/';
    });

    // Load product types and populate dropdown
    async function loadProductTypes() {
        try {
            const response = await fetch('/api/product-types');
            const result = await response.json();

            if (result.success) {
                const productTypes = result.productTypes;

                // Clear existing options except the first one
                productTypeSelect.innerHTML = '<option value="">Выберите тип изделия</option>';

                // Add product type options
                Object.keys(productTypes).forEach(key => {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = productTypes[key].displayName;
                    option.dataset.priceRange = productTypes[key].priceRange;
                    option.dataset.minPrice = productTypes[key].minPrice;
                    option.dataset.maxPrice = productTypes[key].maxPrice;
                    productTypeSelect.appendChild(option);
                });
            } else {
                console.error('Failed to load product types:', result.message);
                showMessage('error', 'Не удалось загрузить типы изделий', orderForm);
            }
        } catch (error) {
            console.error('Error loading product types:', error);
            showMessage('error', 'Ошибка при загрузке типов изделий', orderForm);
        }
    }

    // Update price estimation based on selected product type
    function updatePriceEstimation() {
        const selectedOption = productTypeSelect.options[productTypeSelect.selectedIndex];

        if (selectedOption.value && selectedOption.dataset.priceRange) {
            priceAmount.textContent = selectedOption.dataset.priceRange;
            priceNote.textContent = 'Точная цена будет рассчитана после согласования деталей';
        } else {
            priceAmount.textContent = 'от 500 BYN';
            priceNote.textContent = 'Выберите тип изделия для просмотра примерной стоимости';
        }
    }

    // Handle product type change
    productTypeSelect.addEventListener('change', updatePriceEstimation);

    // Handle file upload area click
    fileUploadArea.addEventListener('click', function(e) {
        // Prevent triggering if clicking on the file input itself
        if (e.target !== photoInput) {
            photoInput.click();
        }
    });

    // Handle file input change to show selected files
    photoInput.addEventListener('change', function(e) {
        const files = e.target.files;
        const uploadText = fileUploadArea.querySelector('.upload-text');

        if (files.length > 0) {
            uploadText.textContent = `Выбрано файлов: ${files.length}`;
        } else {
            uploadText.textContent = 'Перетащите файлы сюда или нажмите для выбора';
        }
    });

    // Handle drag and drop
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
    });

    fileUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
    });

    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Create a new DataTransfer to set files on the input
            const dt = new DataTransfer();
            for (let i = 0; i < files.length; i++) {
                if (files[i].type.startsWith('image/')) {
                    dt.items.add(files[i]);
                }
            }
            photoInput.files = dt.files;

            // Trigger change event
            const event = new Event('change', { bubbles: true });
            photoInput.dispatchEvent(event);
        }
    });

    // Handle order form submission
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Check if user is logged in
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (!currentUser || !currentUser.id) {
            showMessage('error', 'Пожалуйста, войдите в систему для создания заказа', orderForm);
            return;
        }

        const formData = new FormData();
        formData.append('clientId', currentUser.id);
        formData.append('productType', productTypeSelect.value);
        formData.append('description', orderDescription.value.trim());

        // Add photos if any are selected
        const photoInput = document.querySelector('input[type="file"]');
        if (photoInput && photoInput.files.length > 0) {
            for (let i = 0; i < photoInput.files.length; i++) {
                formData.append('photos', photoInput.files[i]);
            }
        }

        try {
            const submitBtn = document.querySelector('.create-order-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Создание...';

            const response = await fetch('/api/orders', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showMessage('success', 'Заказ успешно создан!', orderForm);

                // Reset form
                orderForm.reset();
                updatePriceEstimation();

                // Reset file upload area
                const uploadText = fileUploadArea.querySelector('.upload-text');
                uploadText.textContent = 'Перетащите файлы сюда или нажмите для выбора';
                photoInput.value = '';

                // Refresh orders list
                loadOrders();

            } else {
                showMessage('error', result.message || 'Ошибка при создании заказа', orderForm);
            }
        } catch (error) {
            console.error('Order creation error:', error);
            showMessage('error', 'Произошла ошибка при создании заказа', orderForm);
        } finally {
            const submitBtn = document.querySelector('.create-order-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Создать заказ';
        }
    });

    // Load orders and display them
    async function loadOrders() {
        try {
            const response = await fetch('/api/orders', {
                headers: getAuthHeaders()
            });

            const result = await response.json();

            if (result.success) {
                displayOrders(result.orders);
            } else {
                console.error('Failed to load orders:', result.message);
                displayOrders([]); // Show empty state
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            displayOrders([]); // Show empty state
        }
    }

    // Display orders in both table and cards format
    function displayOrders(orders) {
        const tableBody = document.getElementById('ordersTableBody');
        const cardsContainer = document.getElementById('ordersCardsContainer');

        // Clear existing content
        tableBody.innerHTML = '';
        cardsContainer.innerHTML = '';

        if (orders.length === 0) {
            // Show empty state for table
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="4" style="text-align: center; padding: 2rem; color: #666;">
                    У вас пока нет заказов. Создайте свой первый заказ выше.
                </td>
            `;
            tableBody.appendChild(emptyRow);

            // Show empty state for cards
            const emptyCard = document.createElement('div');
            emptyCard.style.textAlign = 'center';
            emptyCard.style.padding = '2rem';
            emptyCard.style.color = '#666';
            emptyCard.textContent = 'У вас пока нет заказов. Создайте свой первый заказ выше.';
            cardsContainer.appendChild(emptyCard);
            return;
        }

        // Populate table rows
        orders.forEach(order => {
            const row = document.createElement('tr');
            const statusClass = getStatusClass(order.status);
            const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : '';

            row.innerHTML = `
                <td class="order-number">${order.orderNumber || `#${order.id.slice(-4)}`}</td>
                <td class="order-description">${order.description || 'Без описания'}</td>
                <td><span class="status-badge ${statusClass}">${getStatusText(order.status)}</span></td>
                <td class="order-date">${formattedDate}</td>
            `;
            tableBody.appendChild(row);
        });

        // Populate mobile cards
        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card';

            const statusClass = getStatusClass(order.status);
            const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : '';

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${order.orderNumber || `#${order.id.slice(-4)}`}</span>
                    <span class="status-badge ${statusClass}">${getStatusText(order.status)}</span>
                </div>
                <div class="card-description">${order.description || 'Без описания'}</div>
                <div class="card-footer">
                    <span class="order-date">${formattedDate}</span>
                </div>
            `;
            cardsContainer.appendChild(card);
        });
    }

    // Helper function to get status class
    function getStatusClass(status) {
        const statusMap = {
            'new': 'status-new',
            'clarification': 'status-new',
            'in_progress': 'status-progress',
            'awaiting_payment': 'status-progress',
            'completed': 'status-completed',
            'delivered': 'status-completed',
            'cancelled': 'status-new'
        };
        return statusMap[status] || 'status-new';
    }

    // Helper function to get status text in Russian
    function getStatusText(status) {
        const statusTextMap = {
            'new': 'новый',
            'clarification': 'уточнение',
            'in_progress': 'в работе',
            'awaiting_payment': 'ожидает оплаты',
            'completed': 'выполнен',
            'delivered': 'доставлен',
            'cancelled': 'отменен'
        };
        return statusTextMap[status] || status;
    }

    // Load product types and orders on page load
    loadProductTypes();
    loadOrders();
});