class ChatSystem {
    constructor(renderSystem, webSocket) {
        this.renderSystem = renderSystem;
        this.webSocket = webSocket;
        this.chatBubbles = new Map();
        this.maxChatDistance = 300;
        this.fadeStartDistance = 200;
        this.bubbleLifetime = 5000; // 5 seconds
        this.chatContainer = new PIXI.Container();
        
        if (renderSystem && renderSystem.gameContainer) {
            renderSystem.gameContainer.addChild(this.chatContainer);
        }
    }

    sendMessage(message) {
        if (this.webSocket && this.webSocket.connected) {
            this.webSocket.sendChatMessage(message);
        } else {
            this.displayLocalMessage('self', message);
        }
    }

    displayMessage(playerId, message, x, y) {
        this.createChatBubble(playerId, message, x, y);
    }

    displayLocalMessage(playerId, message) {
        const player = this.renderSystem.players.get(playerId);
        if (player) {
            this.createChatBubble(playerId, message, player.x, player.y);
        }
    }

    createChatBubble(playerId, message, x, y) {
        if (this.chatBubbles.has(playerId)) {
            this.removeChatBubble(playerId);
        }

        const bubble = this.createBubbleSprite(message);
        bubble.x = x;
        bubble.y = y - 40; // Position above player

        this.chatBubbles.set(playerId, {
            sprite: bubble,
            timestamp: Date.now(),
            x: x,
            y: y
        });

        this.chatContainer.addChild(bubble);

        setTimeout(() => {
            this.removeChatBubble(playerId);
        }, this.bubbleLifetime);
    }

    createBubbleSprite(message) {
        const container = new PIXI.Container();
        
        // Create background
        const background = new PIXI.Graphics();
        const padding = 10;
        const maxWidth = 200;
        
        // Create text
        const text = new PIXI.Text({
            text: this.wrapText(message, maxWidth - padding * 2),
            style: {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: '#000000',
                wordWrap: true,
                wordWrapWidth: maxWidth - padding * 2,
                align: 'center'
            }
        });

        // Size background to fit text
        const bgWidth = Math.min(text.width + padding * 2, maxWidth);
        const bgHeight = text.height + padding * 2;

        background.roundRect(0, 0, bgWidth, bgHeight, 5)
                  .fill('#ffffff')
                  .stroke({ color: '#000000', width: 1 });

        // Add tail
        background.moveTo(bgWidth / 2 - 5, bgHeight)
                  .lineTo(bgWidth / 2, bgHeight + 8)
                  .lineTo(bgWidth / 2 + 5, bgHeight)
                  .fill('#ffffff')
                  .stroke({ color: '#000000', width: 1 });

        // Center text in background
        text.x = (bgWidth - text.width) / 2;
        text.y = (bgHeight - text.height) / 2;

        container.addChild(background);
        container.addChild(text);

        // Center the bubble
        container.pivot.x = bgWidth / 2;
        container.pivot.y = bgHeight + 8;

        return container;
    }

    wrapText(text, maxWidth) {
        // Simple text wrapping - can be improved
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            if (testLine.length * 7 > maxWidth && currentLine) { // Rough character width estimation
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }

        return lines.join('\n');
    }

    removeChatBubble(playerId) {
        const bubble = this.chatBubbles.get(playerId);
        if (bubble) {
            this.chatContainer.removeChild(bubble.sprite);
            this.chatBubbles.delete(playerId);
        }
    }

    updateChatVisibility() {
        const selfPlayer = this.renderSystem.players.get('self');
        if (!selfPlayer) return;

        this.chatBubbles.forEach((bubble, playerId) => {
            const distance = this.calculateDistance(
                selfPlayer.x, selfPlayer.y,
                bubble.x, bubble.y
            );

            if (distance > this.maxChatDistance) {
                bubble.sprite.visible = false;
            } else {
                bubble.sprite.visible = true;
                
                // Apply fade effect based on distance
                if (distance > this.fadeStartDistance) {
                    const fadeRatio = 1 - (distance - this.fadeStartDistance) / 
                                     (this.maxChatDistance - this.fadeStartDistance);
                    bubble.sprite.alpha = Math.max(0.1, fadeRatio);
                    
                    // Make text more difficult to read at distance
                    if (distance > this.fadeStartDistance + 50) {
                        this.applyDistortionEffect(bubble.sprite, distance);
                    }
                } else {
                    bubble.sprite.alpha = 1;
                    this.removeDistortionEffect(bubble.sprite);
                }
            }
        });
    }

    applyDistortionEffect(sprite, distance) {
        // Simple distortion effect - could make text partially illegible
        const distortionLevel = Math.min(0.5, (distance - this.fadeStartDistance) / 100);
        // This is a placeholder - in a real implementation you might:
        // - Replace some characters with '?'
        // - Make text blurry
        // - Add visual noise
    }

    removeDistortionEffect(sprite) {
        // Remove any distortion effects
    }

    calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    setupChatInput() {
        // Create chat input overlay
        const chatInput = document.createElement('input');
        chatInput.type = 'text';
        chatInput.id = 'chat-input';
        chatInput.placeholder = 'Type a message...';
        chatInput.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 300px;
            padding: 10px;
            border: 2px solid #3498db;
            border-radius: 5px;
            font-size: 14px;
            display: none;
            z-index: 1000;
        `;

        document.body.appendChild(chatInput);

        // Show/hide chat input with Enter key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (chatInput.style.display === 'none' || !chatInput.style.display) {
                    chatInput.style.display = 'block';
                    chatInput.focus();
                } else {
                    if (chatInput.value.trim()) {
                        this.sendMessage(chatInput.value.trim());
                        chatInput.value = '';
                    }
                    chatInput.style.display = 'none';
                }
                e.preventDefault();
            } else if (e.key === 'Escape' && chatInput.style.display === 'block') {
                chatInput.style.display = 'none';
                chatInput.value = '';
            }
        });

        return chatInput;
    }
}

export default ChatSystem;