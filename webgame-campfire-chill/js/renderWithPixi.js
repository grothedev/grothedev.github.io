let dom = {};
let path_assets = ''; //textures, sounds, etc. . can also load from remote server


//give the dom for interaction between pixi-space and dom-space
function setupRenderSystem(dom = null){
    dom = dom;
    setupPixi();
}

function setupPixi(){
    app = new P.Application();
    app.init({background: '#104432'}).then(async ()=>{
        dom.g.appendChild(app.view);
    });
    //loadResources();
    drawPlayer();
}

function loadResources(){
    //grab the list of resources to load from config
    app.loader.baseurl('./res/');
    app.loader.add('player', 'player.png');
}

function draw(){}

function drawPlayer(){
    
}
