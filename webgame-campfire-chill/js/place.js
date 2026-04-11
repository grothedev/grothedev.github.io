import * as P from './pixi.min.mjs';
import setupRenderSystem from './renderWithPixi.js';
import GameWebSocket from './websocket.js';
import TimeSystem from './timeSystem.js';
import ChatSystem from './chatSystem.js';

let ENVURL = "https://belthelziquor/env"
let env = {};
let cfg = {}; //the user config
let dom = {
    input: {},
    label: {},
    box: {}, //an info-containing box
    icon: {},
    info: {},
    g: {}, //element to render graphics to. yes, it's just "g", deal with it
};
let app;
let gameWS;
let timeSystem;
let chatSystem;

//APP START HERE
$(document).ready(async function() {
    // 1. setup relationship with DOM and grab references to its elements
    initDOM();
    //await initCfg();
    //await getServerEnvVars();
    initServices();
    initTimeSystem();
    window.renderSystem = setupRenderSystem(dom.g);
    initChatSystem();
    resizeCanvas();
    updateTimeDisplay();
});


//gets user config from local storage if there is any
function initCfg(){
    let localCfg = localStorage.getItem('cfg');
    if (localCfg) {
        try {
            cfg = JSON.parse(localCfg);
        } catch (e) {
            cfg = {};
        }
    } else {

    }
}

async function getServerEnvVars(){
    await axios.get(`${ENVURL}/env`).then((res)=>{
        env = res.data;
        //log(env);
    }).catch((err)=>{
        //log(err);
    });
    log('')
}

function initServices(){
    gameWS = new GameWebSocket();
    
    gameWS.onMessage('player_joined', (data) => {
        if (window.renderSystem) {
            window.renderSystem.createPlayer(data.playerId, data.x, data.y);
        }
    });
    
    gameWS.onMessage('player_moved', (data) => {
        if (window.renderSystem) {
            window.renderSystem.movePlayerTo(data.playerId, data.x, data.y);
        }
    });
    
    gameWS.onMessage('player_left', (data) => {
        if (window.renderSystem && window.renderSystem.players.has(data.playerId)) {
            const player = window.renderSystem.players.get(data.playerId);
            window.renderSystem.gameContainer.removeChild(player.sprite);
            window.renderSystem.players.delete(data.playerId);
        }
    });
    
    gameWS.onMessage('chat', (data) => {
        if (chatSystem) {
            chatSystem.displayMessage(data.playerId, data.message, data.x, data.y);
        }
    });
    
    gameWS.connect();
}

function initTimeSystem() {
    timeSystem = new TimeSystem();
    
    timeSystem.onEvent('new_day', (gameTime) => {
        console.log(`Day ${gameTime.day} has begun!`);
        updateTimeDisplay();
    });
    
    timeSystem.onTimeEvent('06:00', () => {
        console.log('Morning has arrived!');
    });
    
    timeSystem.onTimeEvent('18:00', () => {
        console.log('Evening is here!');
    });
    
    timeSystem.onTimeEvent('22:00', () => {
        console.log('Night time!');
    });
}

function initChatSystem() {
    chatSystem = new ChatSystem(window.renderSystem, gameWS);
    chatSystem.setupChatInput();
    
    // Update chat visibility based on player position
    if (window.renderSystem && window.renderSystem.app) {
        window.renderSystem.app.ticker.add(() => {
            if (chatSystem) {
                chatSystem.updateChatVisibility();
            }
        });
    }
}

function initDOM(){
    dom.body = $('body')[0];
    dom.g = $('#g')[0]; //the canvas
    dom.timeDisplay = $('#time-display')[0];
    
    // Add click listener for movement
    dom.g.addEventListener('click', (e) => {
        const rect = dom.g.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert screen coordinates to world coordinates
        const worldX = x - (window.renderSystem?.gameContainer?.x || 0);
        const worldY = y - (window.renderSystem?.gameContainer?.y || 0);
        
        // Move player
        if (window.renderSystem && window.renderSystem.movePlayerTo) {
            window.renderSystem.movePlayerTo('self', worldX, worldY);
            
            // Send movement to server
            if (gameWS && gameWS.connected) {
                gameWS.sendPlayerMove(worldX, worldY);
            }
        }
    });
}

function log(msg, lvl=1){
    if (dom.debugInfo){
        dom.debugInfo.innerHTML = msg; //TODO running log + timestamp
    }
    console.log(msg);
}

function resizeCanvas() {
    dom.g.width = .7*window.outerWidth;
    dom.g.height = .5* window.outerHeight;
}

function updateTimeDisplay() {
    if (timeSystem && dom.timeDisplay) {
        const gameTime = timeSystem.getCurrentGameTime();
        const timeOfDay = timeSystem.getTimeOfDay();
        const remainingMovement = timeSystem.getRemainingMovement();
        
        dom.timeDisplay.innerHTML = `
            Day ${gameTime.day} - ${gameTime.timeString} (${timeOfDay})<br>
            Movement remaining: ${remainingMovement}px
        `;
    }
    
    setTimeout(updateTimeDisplay, 10000);
}
