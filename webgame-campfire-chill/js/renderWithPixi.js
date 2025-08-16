//let dom = {};
let g = {};
let path_assets = ''; //textures, sounds, etc. . can also load from remote server

let m = {
    //give the canvas element for interaction between pixi-space and dom-space
    setupRenderSystem: (canvas = null) => {
        g = canvas;
        setupPixi();
        resizeCanvas();
    },

    setupPixi: () => {
        app = new P.Application();
        app.init({background: '#104432'}).then(async ()=>{
            dom.g.appendChild(app.view);
        });
        //loadResources();
        drawPlayer();
    },

    loadResources: () => {
        //grab the list of resources to load from config
        app.loader.baseurl('./res/');
        app.loader.add('player', 'player.png');
    },

    //draw(){}

    //drawPlayer(){}
    resizeCanvas: () => {
        W = window.outerWidth;
        H = window.outerHeight;
        dom.cnv.width = W;
        dom.cnv.height = H;
    }
};

export default m;
