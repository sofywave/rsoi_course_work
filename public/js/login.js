// DOM Elements
const loginToggle = document.getElementById('loginToggle');
const registerToggle = document.getElementById('registerToggle');
const authForm = document.getElementById('authForm');
const registrationFields = document.getElementById('registrationFields');
const passwordToggle = document.getElementById('passwordToggle');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');

// Error message elements
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');
const fullNameError = document.getElementById('fullNameError');
const phoneError = document.getElementById('phoneError');

// Form inputs
const emailInput = document.getElementById('email');
const confirmPasswordInput = document.getElementById('confirmPassword');
const fullNameInput = document.getElementById('fullName');
const phoneInput = document.getElementById('phone');

let isLoginMode = true;

// Toggle between Login and Registration
function toggleForm(mode) {
    isLoginMode = mode === 'login';

    if (isLoginMode) {
        loginToggle.classList.add('active');
        registerToggle.classList.remove('active');
        registrationFields.classList.remove('show');
        submitBtn.textContent = 'Войти';
        // Reset registration fields
        confirmPasswordInput.value = '';
        fullNameInput.value = '';
        phoneInput.value = '';
        confirmPasswordError.classList.remove('show');
        fullNameError.classList.remove('show');
        phoneError.classList.remove('show');
    } else {
        registerToggle.classList.add('active');
        loginToggle.classList.remove('active');
        registrationFields.classList.add('show');
        submitBtn.textContent = 'Создать аккаунт';
    }

    // Clear all errors when switching
    clearAllErrors();
}

// Event listeners for toggle buttons
loginToggle.addEventListener('click', () => toggleForm('login'));
registerToggle.addEventListener('click', () => toggleForm('register'));

// Password visibility toggle
passwordToggle.addEventListener('click', function() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

// Clear all error messages
function clearAllErrors() {
    emailError.classList.remove('show');
    passwordError.classList.remove('show');
    confirmPasswordError.classList.remove('show');
    fullNameError.classList.remove('show');
    phoneError.classList.remove('show');
}

// Email validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Phone validation
function validatePhone(phone) {
    // Allow optional + at start, then numbers, dashes, parentheses, spaces
    const phoneRegex = /^[\+]?[0-9\-\(\)\s]+$/;
    return phoneRegex.test(phone);
}

// Form validation
function validateForm() {
    let isValid = true;
    clearAllErrors();

    // Email validation
    if (!emailInput.value.trim()) {
        emailError.textContent = 'Email is required';
        emailError.classList.add('show');
        isValid = false;
    } else if (!validateEmail(emailInput.value)) {
        emailError.textContent = 'Please enter a valid email address';
        emailError.classList.add('show');
        isValid = false;
    }

    // Password validation
    if (!passwordInput.value.trim()) {
        passwordError.classList.add('show');
        isValid = false;
    }

    // Registration-specific validation
    if (!isLoginMode) {
        // Confirm password validation
        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordError.classList.add('show');
            isValid = false;
        }

        // Full name validation
        if (!fullNameInput.value.trim()) {
            fullNameError.classList.add('show');
            isValid = false;
        }

        // Phone validation (optional, but if provided, must be valid)
        if (phoneInput.value.trim() && !validatePhone(phoneInput.value)) {
            phoneError.classList.add('show');
            isValid = false;
        }
    }

    return isValid;
}

// Form submission
authForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (validateForm()) {
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = isLoginMode ? 'Вход...' : 'Создание...';

            const formData = {
                email: emailInput.value.trim(),
                password: passwordInput.value
            };

            if (!isLoginMode) {
                // Registration
                formData.name = fullNameInput.value.trim();
                if (phoneInput.value.trim()) {
                    formData.phone = phoneInput.value.trim();
                }
            }

            const endpoint = isLoginMode ? '/api/login' : '/api/register';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                // Success

                if (isLoginMode) {
                    // Store user data and token (in a real app, you'd store the JWT)
                    localStorage.setItem('user', JSON.stringify(result.user));
                    localStorage.setItem('token', result.token);

                    // Redirect to dashboard or main app
                    window.location.href = '/dashboard'; // You'll need to create this route
                } else {
                    // After successful registration, automatically log the user in and redirect to dashboard
                    localStorage.setItem('user', JSON.stringify(result.user));
                    localStorage.setItem('token', result.token);

                    // Redirect to dashboard
                    window.location.href = '/dashboard';
                }

                authForm.reset();
            } else {
                // Error
                if (result.message.includes('email')) {
                    emailError.textContent = result.message;
                    emailError.classList.add('show');
                } else if (result.message.includes('password')) {
                    passwordError.classList.add('show');
                } else {
                    alert(result.message);
                }
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Произошла ошибка. Попробуйте еще раз.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isLoginMode ? 'Войти' : 'Создать аккаунт';
        }
    }
});

emailInput.addEventListener('blur', function() {
    if (this.value && !validateEmail(this.value)) {
        emailError.classList.add('show');
    } else {
        emailError.classList.remove('show');
    }
});

passwordInput.addEventListener('input', function() {
    if (this.value.trim()) {
        passwordError.classList.remove('show');
    }
});

confirmPasswordInput.addEventListener('input', function() {
    if (passwordInput.value === this.value) {
        confirmPasswordError.classList.remove('show');
    }
});

fullNameInput.addEventListener('input', function() {
    if (this.value.trim()) {
        fullNameError.classList.remove('show');
    }
});

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    emailInput.focus();
});