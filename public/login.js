class LoginManager {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.notification = document.getElementById('notification');

        this.bindEvents();
        this.checkServerConnection();
        this.checkAuthStatus();
    }

    bindEvents() {
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Enter key support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') {
                this.handleLogin();
            }
        });
    }

    async checkServerConnection() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();

            if (data.status === 'OK') {
                console.log('Server connection: OK');
            }
        } catch (error) {
            console.error('Server connection failed:', error);
            this.showNotification('Warning: Cannot connect to server. Please check if the server is running.', 'warning');
        }
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth-status');
            const data = await response.json();

            if (data.authenticated && data.user.role === 'admin') {
                // Already logged in, redirect to admin
                this.showNotification('Already logged in. Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/admin';
                }, 1000);
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            // If there's an error, user is likely not authenticated, so stay on login page
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showNotification('Please enter both username and password', 'error');
            return;
        }

        const loginBtn = document.querySelector('.login-btn');
        const originalText = loginBtn.innerHTML;

        // Show loading state
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
        loginBtn.disabled = true;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            // Check if response is ok
            if (!response.ok) {
                if (response.status === 401) {
                    this.showNotification('Invalid username or password', 'error');
                } else if (response.status === 500) {
                    this.showNotification('Server error. Please try again later.', 'error');
                } else {
                    this.showNotification(`Login failed (${response.status})`, 'error');
                }
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
                return;
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification('Login successful! Redirecting...', 'success');

                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = '/admin';
                }, 1500);
            } else {
                this.showNotification(data.error || 'Login failed', 'error');
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
            }
        } catch (error) {
            console.error('Login error:', error);

            // More specific error messages
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showNotification('Cannot connect to server. Please check if the server is running.', 'error');
            } else if (error.name === 'SyntaxError') {
                this.showNotification('Server response error. Please try again.', 'error');
            } else {
                this.showNotification(`Network error: ${error.message}`, 'error');
            }

            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    }

    showNotification(message, type = 'info') {
        this.notification.textContent = message;
        this.notification.className = `notification ${type} show`;

        setTimeout(() => {
            this.notification.classList.remove('show');
        }, 4000);
    }
}

// Global functions
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('passwordToggleIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// Initialize login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});