//import { setupRenderSystem } from './render.js';

let ENVURL = "" //remote server from which to grab env
let env = {};
let cfg = {}; //the user config
let dom = {
    input: {},
    label: {},
    box: {}, //an info-containing box
    icon: {},
    info: {}
};


//APP START HERE
$(document).ready(async function() {
    console.log('asdf');
    //the core loop of the client application
    // 1. setup relationship with DOM and grab references to its elements
    log('init DOM');
    await initDOM();
    
    log('init cfg');
    await initCfg();

    log('get env vars');
    await getServerEnvVars();
        
    log('init services');
    await initServices();

    //setupRenderSystem();


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
    await axios.get(`${ENVURL}`).then((res)=>{
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