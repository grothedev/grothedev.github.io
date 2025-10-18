import * as PIXI from './pixi.min.mjs';

let g = {};
let path_assets = '';
let app;
let gameContainer;
let players = new Map();
let worldWidth = 2000;
let worldHeight = 2000;

function setupRenderSystem(canvas) {
    g = canvas;
    setupPixi();
    return m;
}

async function setupPixi() {
    app = new PIXI.Application();
    await app.init({
        canvas: g,
        background: '#2d5a3d',
        width: g.width,
        height: g.height
    });
    
    gameContainer = new PIXI.Container();
    app.stage.addChild(gameContainer);
    
    generateWorld();
    createPlayer('self', worldWidth/2, worldHeight/2);
    
    app.ticker.add(gameLoop);
}

function generateWorld() {
    const graphics = new PIXI.Graphics();
    
    for (let x = 0; x < worldWidth; x += 100) {
        for (let y = 0; y < worldHeight; y += 100) {
            const tileType = Math.random();
            if (tileType < 0.7) {
                graphics.rect(x, y, 100, 100).fill('#4a7c59');
            } else if (tileType < 0.85) {
                graphics.rect(x, y, 100, 100).fill('#8B4513');
            } else {
                graphics.rect(x, y, 100, 100).fill('#2980b9');
            }
        }
    }
    
    gameContainer.addChild(graphics);
}

function createPlayer(id, x, y) {
    const player = new PIXI.Graphics();
    player.circle(0, 0, 15).fill('#ff6b6b');
    player.x = x;
    player.y = y;
    
    players.set(id, {
        sprite: player,
        x: x,
        y: y,
        targetX: x,
        targetY: y
    });
    
    gameContainer.addChild(player);
    
    if (id === 'self') {
        centerCameraOnPlayer(player);
    }
}

function centerCameraOnPlayer(player) {
    gameContainer.x = -player.x + g.width / 2;
    gameContainer.y = -player.y + g.height / 2;
}

function gameLoop() {
    const selfPlayer = players.get('self');
    if (selfPlayer) {
        updatePlayerMovement(selfPlayer);
        centerCameraOnPlayer(selfPlayer.sprite);
    }
}

function updatePlayerMovement(player) {
    const speed = 2;
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > speed) {
        player.x += (dx / distance) * speed;
        player.y += (dy / distance) * speed;
        player.sprite.x = player.x;
        player.sprite.y = player.y;
    } else {
        player.x = player.targetX;
        player.y = player.targetY;
        player.sprite.x = player.x;
        player.sprite.y = player.y;
    }
}

function movePlayerTo(playerId, x, y) {
    const player = players.get(playerId);
    if (player) {
        player.targetX = x;
        player.targetY = y;
    }
}

const m = {
    setupRenderSystem,
    setupPixi,
    createPlayer,
    movePlayerTo,
    players,
    gameContainer,
    app
};

export default m;
