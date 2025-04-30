// Ably Integration Module
const ABLY = {
    // Initialize Ably client
    async init() {
        try {
            // Note: This is a demo API key. In production, the API key should be provided securely
            this.ably = new Ably.Realtime({
                key: 'AkNKLg.Nv6Baw:MWPfjT2-zo5T9SBQOVZ3kataK5V8jM8f4I_XyPcvBGA',
                clientId: JSON.parse(sessionStorage.getItem('user'))?.id
            });

            // Connect to Ably
            await this.connectToAbly();

            // Subscribe to global channel and private requests
            this.subscribeToGlobal();
            this.subscribeToPrivateRequests();

        } catch (error) {
            console.error('Ably initialization error:', error);
            CHAT.chatMessages.innerHTML = UI.showError('Failed to connect to chat server');
        }
    },

    // Connect to Ably
    connectToAbly() {
        return new Promise((resolve, reject) => {
            this.ably.connection.once('connected', () => {
                console.log('Connected to Ably');
                resolve();
            });

            this.ably.connection.once('failed', (error) => {
                console.error('Ably connection failed:', error);
                reject(error);
            });
        });
    },

    // Subscribe to global channel
    subscribeToGlobal() {
        this.globalChannel = this.ably.channels.get('global-chat');
        
        // Subscribe to messages
        this.globalChannel.subscribe('message', (message) => {
            CHAT.addMessage(message.data);
        });

        // Subscribe to typing indicators
        this.globalChannel.subscribe('typing', (message) => {
            CHAT.showTypingIndicator(message.data);
        });

        // Subscribe to presence events
        this.globalChannel.presence.subscribe('enter', (member) => {
            this.handlePresenceEnter(member);
        });

        this.globalChannel.presence.subscribe('leave', (member) => {
            this.handlePresenceLeave(member);
        });

        // Enter the presence set
        this.globalChannel.presence.enter({
            username: JSON.parse(sessionStorage.getItem('user'))?.username
        });
    },

    // Subscribe to private chat requests
    subscribeToPrivateRequests() {
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (!user) return;

        // Subscribe to personal request channel
        const requestChannel = this.ably.channels.get(`request-${user.id}`);
        
        // Listen for chat requests
        requestChannel.subscribe('request', (message) => {
            CHAT.handlePrivateChatRequest(message.data);
        });

        // Listen for request responses
        requestChannel.subscribe('accept', (message) => {
            this.handlePrivateChatAccepted(message.data);
        });

        requestChannel.subscribe('reject', (message) => {
            this.handlePrivateChatRejected(message.data);
        });

        requestChannel.subscribe('cancel', (message) => {
            this.handlePrivateChatCancelled(message.data);
        });
    },

    // Subscribe to private channel
    subscribeToPrivate(channelName, callback) {
        if (!this.privateChannels) {
            this.privateChannels = new Map();
        }

        // Check if already subscribed
        if (this.privateChannels.has(channelName)) {
            return;
        }

        // Create new private channel
        const privateChannel = this.ably.channels.get(`private-${channelName}`);
        
        // Subscribe to messages
        privateChannel.subscribe('message', (message) => {
            callback(message.data);
            // Add message to inbox for notification
            CHAT.addMessageToInbox(message.data);
        });

        // Store channel reference
        this.privateChannels.set(channelName, privateChannel);
    },

    // Publish private chat request
    publishPrivateChatRequest(request) {
        const requestChannel = this.ably.channels.get(`request-${request.to}`);
        requestChannel.publish('request', request, (err) => {
            if (err) {
                console.error('Error sending chat request:', err);
                alert('Failed to send chat request. Please try again.');
            }
        });
    },

    // Publish private chat acceptance
    publishPrivateChatAccepted(response) {
        const requestChannel = this.ably.channels.get(`request-${response.to}`);
        requestChannel.publish('accept', response, (err) => {
            if (err) {
                console.error('Error sending acceptance:', err);
            }
        });
    },

    // Publish private chat rejection
    publishPrivateChatRejected(response) {
        const requestChannel = this.ably.channels.get(`request-${response.to}`);
        requestChannel.publish('reject', response, (err) => {
            if (err) {
                console.error('Error sending rejection:', err);
            }
        });
    },

    // Publish private chat cancellation
    publishPrivateChatCancelled(response) {
        const requestChannel = this.ably.channels.get(`request-${response.to}`);
        requestChannel.publish('cancel', response, (err) => {
            if (err) {
                console.error('Error sending cancellation:', err);
            }
        });
    },

    // Handle private chat accepted
    handlePrivateChatAccepted(response) {
        const pendingElement = CHAT.pendingRequests.get(response.from);
        if (pendingElement) {
            pendingElement.remove();
            CHAT.pendingRequests.delete(response.from);
        }

        // Create and subscribe to private channel
        const channelName = [response.from, response.to].sort().join('-');
        this.subscribeToPrivate(channelName, (message) => {
            if (CHAT.currentChannel === channelName) {
                CHAT.addMessage(message, true);
            } else {
                CHAT.showPrivateChatNotification(response.fromUsername, message.text);
            }
        });

        // Switch to private chat view
        CHAT.switchToPrivateChat(channelName, response.fromUsername);
    },

    // Handle private chat rejected
    handlePrivateChatRejected(response) {
        const pendingElement = CHAT.pendingRequests.get(response.from);
        if (pendingElement) {
            pendingElement.remove();
            CHAT.pendingRequests.delete(response.from);
        }

        UI.showToast(`${response.fromUsername} declined your chat request`);
    },

    // Handle private chat cancelled
    handlePrivateChatCancelled(response) {
        const requestElement = document.querySelector(`[data-request="${response.from}"]`);
        if (requestElement) {
            requestElement.remove();
        }

        UI.showToast(`${response.fromUsername} cancelled their chat request`);
    },

    // Publish message to global channel
    publishToGlobal(message) {
        if (!this.globalChannel) {
            console.error('Global channel not initialized');
            return;
        }

        this.globalChannel.publish('message', message, (err) => {
            if (err) {
                console.error('Error publishing message:', err);
                alert('Failed to send message. Please try again.');
            }
        });
    },

    // Publish message to private channel
    publishToPrivate(channelName, message) {
        const privateChannel = this.privateChannels.get(channelName);
        if (!privateChannel) {
            console.error('Private channel not found:', channelName);
            return;
        }

        privateChannel.publish('message', message, (err) => {
            if (err) {
                console.error('Error publishing private message:', err);
                alert('Failed to send private message. Please try again.');
            }
        });
    },

    // Publish typing indicator
    publishTypingIndicator(username) {
        if (!this.globalChannel) return;

        // Throttle typing indicator to prevent spam
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        this.typingTimeout = setTimeout(() => {
            this.globalChannel.publish('typing', username);
        }, 500);
    },

    // Handle presence enter
    handlePresenceEnter(member) {
        console.log('Member entered:', member.data.username);
        UI.showToast(`${member.data.username} joined the chat`);
    },

    // Handle presence leave
    handlePresenceLeave(member) {
        console.log('Member left:', member.data.username);
        UI.showToast(`${member.data.username} left the chat`);
    },

    // Clean up on logout
    cleanup() {
        if (this.globalChannel) {
            this.globalChannel.presence.leave();
            this.globalChannel.unsubscribe();
        }

        if (this.privateChannels) {
            this.privateChannels.forEach(channel => {
                channel.unsubscribe();
            });
            this.privateChannels.clear();
        }

        if (this.ably) {
            this.ably.close();
        }
    }
};

// Add Ably SDK script
document.addEventListener('DOMContentLoaded', () => {
    const ablyScript = document.createElement('script');
    ablyScript.src = 'https://cdn.ably.io/lib/ably.min-1.js';
    ablyScript.onload = () => {
        // Only initialize if user is logged in
        if (sessionStorage.getItem('user')) {
            ABLY.init();
        }
    };
    document.body.appendChild(ablyScript);
});
