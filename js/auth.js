// Authentication Module
const AUTH = {
    // Constants
    PASSWORD: 'Ratubagus',
    
    // State
    currentUser: null,
    
    // Initialize authentication
    init() {
        this.loginForm = document.getElementById('loginForm');
        this.loginSection = document.getElementById('loginSection');
        this.chatSection = document.getElementById('chatSection');
        this.setupEventListeners();
        this.checkExistingSession();
    },

    // Set up event listeners
    setupEventListeners() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logoutBtn').addEventListener('click', (e) => this.handleLogoutRequest(e));
    },

    // Handle login form submission
    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (this.validateCredentials(username, password)) {
            this.loginSuccess(username);
        } else {
            this.loginError();
        }
    },

    // Validate user credentials
    validateCredentials(username, password) {
        // Allow admin login with admin password
        if (username === 'admin' && password === 'admin555') {
            return true;
        }
        // Check if username already taken (except admin)
        if (username !== 'admin') {
            const existingUserData = localStorage.getItem(`user_data_${username}`);
            if (existingUserData && !sessionStorage.getItem('user')) {
                alert('Username already taken. Please choose another.');
                return false;
            }
        }
        return username.length > 0 && password === this.PASSWORD;
    },

    // Handle successful login
    loginSuccess(username) {
        // Check if user already exists in localStorage
        const existingUserData = localStorage.getItem(`user_data_${username}`);
        let userId;

        if (existingUserData) {
            // Use existing user ID
            const userData = JSON.parse(existingUserData);
            userId = userData.id;
        } else {
            // Generate new user ID
            userId = this.generateUserId();
            // Save user data to localStorage
            localStorage.setItem(`user_data_${username}`, JSON.stringify({ id: userId }));
        }

        this.currentUser = {
            username,
            id: userId,
            loginTime: new Date().toISOString()
        };

        // Save to session storage
        sessionStorage.setItem('user', JSON.stringify(this.currentUser));

        // Update UI
        this.updateUserInterface();
        
        // Show chat section with animation
        this.loginSection.classList.add('fade-out');
        setTimeout(() => {
            this.loginSection.style.display = 'none';
            this.chatSection.classList.add('fade-in');
            this.chatSection.style.display = 'block';
            
            // Initialize Ably after successful login
            ABLY.init();
        }, 300);
    },

    // Handle login error
    loginError() {
        const input = document.getElementById('password');
        input.classList.add('border-red-500');
        input.classList.add('shake');
        
        setTimeout(() => {
            input.classList.remove('border-red-500');
            input.classList.remove('shake');
        }, 1000);

        alert('Invalid password. Please try again.');
    },

    // Generate unique user ID
    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    },

    // Check for existing session
    checkExistingSession() {
        const savedUser = sessionStorage.getItem('user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.updateUserInterface();
            this.loginSection.style.display = 'none';
            this.chatSection.style.display = 'block';
            
            // Initialize Ably for existing session
            ABLY.init();
        }
    },

    // Update UI with user information
    updateUserInterface() {
        document.getElementById('userDisplayName').textContent = this.currentUser.username;
        document.getElementById('userId').textContent = this.currentUser.id;
        document.getElementById('userInitial').textContent = this.currentUser.username.charAt(0).toUpperCase();
    },

    // Handle logout request
    handleLogoutRequest(e) {
        e.preventDefault();
        
        // Create modal for password verification
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-96 space-y-4">
                <h3 class="text-lg font-semibold">Verify Password to Logout</h3>
                <input type="password" id="logoutPassword" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter password">
                <div class="flex justify-end space-x-3">
                    <button id="cancelLogout" 
                        class="px-4 py-2 text-gray-600 hover:text-gray-800">
                        Cancel
                    </button>
                    <button id="confirmLogout" 
                        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        Logout
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle modal interactions
        document.getElementById('cancelLogout').onclick = () => {
            document.body.removeChild(modal);
        };

        document.getElementById('confirmLogout').onclick = () => {
            const password = document.getElementById('logoutPassword').value;
            if (password === this.PASSWORD) {
                this.handleLogout();
                document.body.removeChild(modal);
            } else {
                alert('Incorrect password');
            }
        };
    },

    // Handle logout
    handleLogout() {
        // Clean up Ably connection
        ABLY.cleanup();
        
        // Clear session
        sessionStorage.removeItem('user');
        this.currentUser = null;
        
        // Show login section with animation
        this.chatSection.classList.add('fade-out');
        setTimeout(() => {
            this.chatSection.style.display = 'none';
            this.loginSection.classList.add('fade-in');
            this.loginSection.style.display = 'flex';
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        }, 300);
    }
};

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => AUTH.init());
