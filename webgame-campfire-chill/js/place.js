import * as P from './pixi.min.mjs';
import { setupRenderSystem } from './renderWithPixi.js'; //can "plug in" different rendering systems

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

//APP START HERE
$(document).ready(async function() {
    // 1. setup relationship with DOM and grab references to its elements
    await initDOM();
    //await initCfg();
    //await getServerEnvVars();
    await initServices();
    //setupPixi();

    setupRenderSystem(dom/*, cfg*/);
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
    //connect to websocket server
    //grab endpoints from cfg
}

function initDOM(){
    dom.body = $('body')[0];
}

function log(msg, lvl=1){
    if (dom.debugInfo){
        dom.debugInfo.innerHTML = msg; //TODO running log + timestamp
    }
    console.log(msg);
}
