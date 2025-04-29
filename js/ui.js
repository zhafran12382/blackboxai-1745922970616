// UI Interactions Module
const UI = {
    // Initialize UI elements
    init() {
        this.menuBtn = document.getElementById('menuBtn');
        this.sideMenu = document.getElementById('sideMenu');
        this.menuOverlay = document.getElementById('menuOverlay');
        this.setupEventListeners();
        this.setupAnimations();
    },

    // Set up event listeners
    setupEventListeners() {
        // Hamburger menu toggle
        this.menuBtn.addEventListener('click', () => this.toggleMenu());
        this.menuOverlay.addEventListener('click', () => this.closeMenu());

        // Navigation links
        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                if (e.currentTarget.id !== 'logoutBtn') {
                    e.preventDefault();
                    this.handleNavigation(e.currentTarget.getAttribute('href').substring(1));
                }
            });
        });

        // Handle escape key for menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeMenu();
        });
    },

    // Set up animations
    setupAnimations() {
        // Add transition classes
        this.sideMenu.classList.add('transition-transform', 'duration-300', 'ease-in-out');
    },

    // Toggle menu
    toggleMenu() {
        const isOpen = !this.sideMenu.classList.contains('-translate-x-full');
        if (isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    },

    // Open menu
    openMenu() {
        this.sideMenu.classList.remove('-translate-x-full');
        this.menuOverlay.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    },

    // Close menu
    closeMenu() {
        this.sideMenu.classList.add('-translate-x-full');
        this.menuOverlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    },

    // Handle navigation
    handleNavigation(route) {
        // Close menu first
        this.closeMenu();

        // Update header title
        const header = document.querySelector('header h1');
        
        // Handle different routes
        switch(route) {
            case 'profile':
                header.textContent = 'Profile';
                this.showProfile();
                break;
            case 'global':
                header.textContent = 'Global Chat';
                CHAT.switchToGlobalChat();
                break;
            case 'add-user':
                header.textContent = 'Add User';
                this.showAddUser();
                break;
            case 'servers':
                header.textContent = 'Server List';
                this.showServerList();
                break;
        }
    },

    // Show profile section
    showProfile() {
        const user = JSON.parse(sessionStorage.getItem('user'));
        const chatArea = document.getElementById('chatMessages');
        
        chatArea.innerHTML = `
            <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 fade-in">
                <div class="text-center mb-6">
                    <div class="w-20 h-20 rounded-full bg-indigo-600 mx-auto flex items-center justify-center mb-4">
                        <span class="text-white text-3xl font-semibold">${user.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <h2 class="text-2xl font-semibold text-gray-800">${user.username}</h2>
                    <p class="text-gray-500">User ID: ${user.id}</p>
                </div>
                <div class="border-t pt-4">
                    <p class="text-gray-600 text-sm">Login Time: ${new Date(user.loginTime).toLocaleString()}</p>
                </div>
            </div>
        `;
    },

    // Show add user section
    showAddUser() {
        const chatArea = document.getElementById('chatMessages');
        chatArea.innerHTML = `
            <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 fade-in">
                <h2 class="text-xl font-semibold mb-4">Add User for Private Chat</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                        <input type="text" id="privateUserId" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                            placeholder="Enter user ID">
                    </div>
                    <button onclick="CHAT.sendPrivateChatRequest(document.getElementById('privateUserId').value)"
                        class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all">
                        Send Chat Request
                    </button>
                </div>
            </div>
        `;
    },

    // Show server list section
    showServerList() {
        const chatArea = document.getElementById('chatMessages');
        chatArea.innerHTML = `
            <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 fade-in">
                <h2 class="text-xl font-semibold mb-4">Active Servers</h2>
                <div class="space-y-3">
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div class="flex items-center space-x-3">
                            <i class="fas fa-globe text-indigo-600"></i>
                            <span class="font-medium">Global Chat Server</span>
                        </div>
                        <span class="text-green-500 text-sm">Active</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div class="flex items-center space-x-3">
                            <i class="fas fa-comments text-indigo-600"></i>
                            <span class="font-medium">Private Chat Server</span>
                        </div>
                        <span class="text-green-500 text-sm">Active</span>
                    </div>
                </div>
            </div>
        `;
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 z-50 notification-slide-in ${
            type === 'error' ? 'border-l-4 border-red-500' :
            type === 'success' ? 'border-l-4 border-green-500' :
            'border-l-4 border-indigo-500'
        }`;
        
        toast.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas ${
                    type === 'error' ? 'fa-exclamation-circle text-red-500' :
                    type === 'success' ? 'fa-check-circle text-green-500' :
                    'fa-info-circle text-indigo-500'
                }"></i>
                <p class="text-gray-800">${message}</p>
            </div>
        `;

        document.body.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.add('notification-slide-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Show error message
    showError(message) {
        return `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span class="block sm:inline">${message}</span>
            </div>
        `;
    },

    // Show loading spinner
    showLoading() {
        return `
            <div class="flex items-center justify-center p-4">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        `;
    }
};

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => UI.init());
