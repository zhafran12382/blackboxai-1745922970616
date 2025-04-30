// Chat Module
const CHAT = {
    // Initialize chat functionality
    init() {
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendMessage');
        this.chatMessages = document.getElementById('chatMessages');
        this.currentChannel = 'global';
        this.privateChannels = new Map();
        this.pendingRequests = new Map();
        this.inboxMessages = [];
        this.inboxRequests = [];
        this.setupEventListeners();
    },

    // Set up event listeners
    setupEventListeners() {
        // Send message on button click
        this.sendButton.addEventListener('click', () => this.sendMessage());

        // Send message on Enter key
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Handle typing indicator
        this.messageInput.addEventListener('input', () => this.handleTyping());
    },

    // Send message
    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        const user = JSON.parse(sessionStorage.getItem('user'));
        if (!user) {
            alert('Please login first');
            return;
        }

        const messageData = {
            text: message,
            sender: user.username,
            senderId: user.id,
            timestamp: new Date().toISOString()
        };

        // Send to appropriate channel
        if (this.currentChannel === 'global') {
            ABLY.publishToGlobal(messageData);
        } else {
            ABLY.publishToPrivate(this.currentChannel, messageData);
        }

        // Clear input
        this.messageInput.value = '';
        this.messageInput.focus();
    },

    // Handle typing indicator
    handleTyping() {
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (!user) return;

        // Publish typing indicator
        if (this.currentChannel === 'global') {
            ABLY.publishTypingIndicator(user.username);
        }
    },

    // Add message to chat
    addMessage(message, isPrivate = false) {
        const messageElement = this.createMessageElement(message, isPrivate);
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();

        // Animate new message
        setTimeout(() => messageElement.classList.remove('opacity-0'), 100);
    },

    // Create message element
    createMessageElement(message, isPrivate) {
        const user = JSON.parse(sessionStorage.getItem('user'));
        const isOwnMessage = message.senderId === user.id;
        
        const div = document.createElement('div');
        div.className = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'} opacity-0 transition-opacity duration-300`;
        
        const messageTime = new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        div.innerHTML = `
            <div class="${isOwnMessage ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'} 
                        rounded-lg px-4 py-2 max-w-[70%] break-words shadow-sm">
                ${!isOwnMessage ? `<p class="text-xs font-medium ${isOwnMessage ? 'text-indigo-200' : 'text-gray-600'} mb-1">${message.sender}</p>` : ''}
                <p class="text-sm">${this.formatMessage(message.text)}</p>
                <p class="text-xs ${isOwnMessage ? 'text-indigo-200' : 'text-gray-500'} text-right mt-1">
                    ${messageTime}
                </p>
            </div>
        `;

        return div;
    },

    // Format message text
    formatMessage(text) {
        // Convert URLs to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, url => `<a href="${url}" target="_blank" class="underline">${url}</a>`)
                  .replace(/\n/g, '<br>');
    },

    // Send private chat request
    sendPrivateChatRequest(targetUserId) {
        if (!targetUserId) {
            alert('Please enter a user ID');
            return;
        }

        const user = JSON.parse(sessionStorage.getItem('user'));
        if (targetUserId === user.id) {
            alert('You cannot start a private chat with yourself');
            return;
        }

        // Create request channel name
        const requestChannel = `request-${targetUserId}`;
        
        // Send chat request
        ABLY.publishPrivateChatRequest({
            from: user.id,
            fromUsername: user.username,
            to: targetUserId,
            timestamp: new Date().toISOString()
        });

        // Show pending request UI
        this.showPendingRequestUI(targetUserId);
    },

    // Show pending request UI
    showPendingRequestUI(targetUserId) {
        const pendingElement = document.createElement('div');
        pendingElement.className = 'fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50';
        pendingElement.innerHTML = `
            <p class="text-sm text-gray-600">Waiting for user ${targetUserId} to accept...</p>
            <div class="mt-2">
                <button class="text-sm text-red-600" onclick="CHAT.cancelPrivateChatRequest('${targetUserId}')">
                    Cancel Request
                </button>
            </div>
        `;
        document.body.appendChild(pendingElement);
        this.pendingRequests.set(targetUserId, pendingElement);
    },

    // Handle incoming private chat request
    handlePrivateChatRequest(request) {
        // Add to inbox requests
        this.inboxRequests.push(request);
        this.updateMessagesList();
    },

    // Add message to inbox and update UI
    addMessageToInbox(message) {
        this.inboxMessages.push(message);
        this.updateMessagesList();
    },

    // Update messages list UI
    updateMessagesList() {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;

        if (this.inboxMessages.length === 0 && this.inboxRequests.length === 0) {
            messagesList.innerHTML = `<p class="text-gray-500">No new messages or requests.</p>`;
            return;
        }

        let html = '';

        // List private chat requests
        this.inboxRequests.forEach(req => {
            html += `
                <div class="p-3 border rounded-lg mb-2 bg-gray-50 flex justify-between items-center">
                    <div>
                        <p class="font-semibold">${req.fromUsername} wants to start a private chat</p>
                        <p class="text-sm text-gray-600">${new Date(req.timestamp).toLocaleString()}</p>
                    </div>
                    <div class="space-x-2">
                        <button class="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm"
                            onclick="CHAT.acceptPrivateChat('${req.from}', '${req.fromUsername}')">
                            Accept
                        </button>
                        <button class="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm"
                            onclick="CHAT.rejectPrivateChat('${req.from}')">
                            Decline
                        </button>
                    </div>
                </div>
            `;
        });

        // List private messages
        this.inboxMessages.forEach(msg => {
            html += `
                <div class="p-3 border rounded-lg mb-2 bg-white flex justify-between items-center cursor-pointer hover:bg-gray-100"
                    onclick="CHAT.switchToPrivateChat('${[msg.senderId, JSON.parse(sessionStorage.getItem('user')).id].sort().join('-')}', '${msg.sender}')">
                    <div>
                        <p class="font-semibold">${msg.sender}</p>
                        <p class="text-sm text-gray-600">${msg.text.length > 30 ? msg.text.substring(0, 30) + '...' : msg.text}</p>
                    </div>
                    <div class="text-xs text-gray-500">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
                </div>
            `;
        });

        messagesList.innerHTML = html;
    },

    // Accept private chat
    acceptPrivateChat(userId, username) {
        // Create private channel name (sorted IDs to ensure same channel name for both users)
        const user = JSON.parse(sessionStorage.getItem('user'));
        const channelName = [user.id, userId].sort().join('-');
        
        // Subscribe to private channel
        ABLY.subscribeToPrivate(channelName, (message) => {
            if (this.currentChannel === channelName) {
                this.addMessage(message, true);
            } else {
                this.showPrivateChatNotification(username, message.text);
            }
        });

        // Notify other user
        ABLY.publishPrivateChatAccepted({
            from: user.id,
            fromUsername: user.username,
            to: userId
        });

        // Switch to private chat view
        this.switchToPrivateChat(channelName, username);

        // Remove request UI
        const requestElement = document.querySelector(`[data-request="${userId}"]`);
        if (requestElement) {
            requestElement.remove();
        }
    },

    // Reject private chat
    rejectPrivateChat(userId) {
        const user = JSON.parse(sessionStorage.getItem('user'));
        
        // Notify other user
        ABLY.publishPrivateChatRejected({
            from: user.id,
            fromUsername: user.username,
            to: userId
        });

        // Remove request UI
        const requestElement = document.querySelector(`[data-request="${userId}"]`);
        if (requestElement) {
            requestElement.remove();
        }
    },

    // Cancel private chat request
    cancelPrivateChatRequest(targetUserId) {
        const pendingElement = this.pendingRequests.get(targetUserId);
        if (pendingElement) {
            pendingElement.remove();
            this.pendingRequests.delete(targetUserId);
        }

        // Notify other user
        const user = JSON.parse(sessionStorage.getItem('user'));
        ABLY.publishPrivateChatCancelled({
            from: user.id,
            fromUsername: user.username,
            to: targetUserId
        });
    },

    // Switch to private chat view
    switchToPrivateChat(channelName, username) {
        this.currentChannel = channelName;
        this.chatMessages.innerHTML = ''; // Clear messages
        
        // Update header
        document.querySelector('header h1').textContent = `Chat with ${username}`;
        
        // Close menu if open
        UI.closeMenu();
    },

    // Switch to global chat
    switchToGlobalChat() {
        this.currentChannel = 'global';
        this.chatMessages.innerHTML = ''; // Clear messages
        document.querySelector('header h1').textContent = 'Global Chat';
    },

    // Show private chat notification
    showPrivateChatNotification(fromUsername, message) {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 notification-slide-in';
        notification.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-1">
                    <p class="font-medium text-gray-900">${fromUsername}</p>
                    <p class="text-sm text-gray-600">${message.length > 30 ? message.substring(0, 30) + '...' : message}</p>
                </div>
                <button class="text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(notification);

        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.classList.add('notification-slide-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    },

    // Show typing indicator
    showTypingIndicator(username) {
        const existingIndicator = document.getElementById('typing-indicator');
        if (existingIndicator) {
            clearTimeout(this.typingTimeout);
        } else {
            const indicator = document.createElement('div');
            indicator.id = 'typing-indicator';
            indicator.className = 'text-sm text-gray-500 italic ml-4 mb-2';
            indicator.textContent = `${username} is typing...`;
            this.chatMessages.appendChild(indicator);
        }

        // Remove indicator after 2 seconds
        this.typingTimeout = setTimeout(() => {
            const indicator = document.getElementById('typing-indicator');
            if (indicator) {
                indicator.remove();
            }
        }, 2000);
    },

    // Scroll chat to bottom
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
};

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => CHAT.init());
