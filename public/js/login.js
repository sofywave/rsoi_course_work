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

// Form inputs
const emailInput = document.getElementById('email');
const confirmPasswordInput = document.getElementById('confirmPassword');
const fullNameInput = document.getElementById('fullName');

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
        confirmPasswordError.classList.remove('show');
        fullNameError.classList.remove('show');
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
}

// Email validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
    }

    return isValid;
}

// Form submission
authForm.addEventListener('submit', function(e) {
    e.preventDefault();

    if (validateForm()) {
        // Here you would typically send the data to your backend
        console.log('Form is valid! Ready to submit to backend.');

        // For demonstration, show success message
        alert(isLoginMode ? 'Login successful!' : 'Account created successfully!');

        // Reset form after successful submission
        if (isLoginMode) {
            authForm.reset();
        } else {
            toggleForm('login');
            authForm.reset();
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