class GameWebSocket {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.playerId = null;
        this.messageHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect(url = 'ws://localhost:8080') {
        try {
            this.ws = new WebSocket(url);
            this.setupEventHandlers();
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.scheduleReconnect();
        }
    }

    setupEventHandlers() {
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.send('join', { type: 'player' });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
            this.connected = false;
            this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                console.log(`Reconnection attempt ${this.reconnectAttempts}`);
                this.connect();
            }, 2000 * this.reconnectAttempts);
        }
    }

    handleMessage(data) {
        const handler = this.messageHandlers.get(data.type);
        if (handler) {
            handler(data);
        } else {
            console.log('Unhandled message type:', data.type, data);
        }
    }

    onMessage(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    send(type, data = {}) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, ...data }));
        } else {
            console.warn('WebSocket not connected, message not sent:', type, data);
        }
    }

    sendPlayerMove(x, y) {
        this.send('player_move', { x, y });
    }

    sendChatMessage(message) {
        this.send('chat', { message });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

export default GameWebSocket;