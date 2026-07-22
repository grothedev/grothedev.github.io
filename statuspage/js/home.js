let ENVURL = "https://belthelziquor/env"
let env = {};
let cfg = {
    WS_URL: 'wss://echo.websocket.org/'
}; //the user config
let dom = {
    input: {},
    label: {},
    box: {}, //an info-containing box
    icon: {},
    info: {}
};
let services = {};


//APP START HERE
$(document).ready(async function() {
    console.log('asdf');
    //the core loop of the client application
    // 1. setup relationship with DOM and grab references to its elements
    log('init DOM');
    await initDOM();
    
    log('init cgf');
    await initCfg();

    log('get env vars');
    await getServerEnvVars();
        


    log('init services');
    await initServices();



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
    await fetch(`${ENVURL}/`, {
        mode: 'no-cors'
    }).then((res)=>{
        log(res);
        env = res.text();
        //log(env);
    }).catch((err)=>{
        //log(err);
    });
    log('')
}

function initServices(){
    //connect to websocket server
    //grab endpoints from cfg
    //
    let wsurl = cfg.WS_URL;
    if (wsurl == null) wsurl = env['WS_URL'];
    let skt = new WebSocket(wsurl);
    skt.onopen = (err) => {
        log('connected to websocket');
        dom.servicepanels[0].innerHTML = 'connected to websocket server';
    };
}

function initDOM(){
    dom.body = $('body')[0];
    //dom.input. = $('#input_who')[0];
    dom.servicepanels = []; 
    $('.service-card').toArray().forEach((elem)=>{
        console.log(elem);
        dom.servicepanels.push(elem);
    });;
    
    //dom.inputWho.onchange = ()=> { myNickname = domElems.inputWho.value; };
    
}

function log(msg, lvl=1){
    if (dom.debugInfo){
        dom.debugInfo.innerHTML = msg; //TODO running log + timestamp
    }
    console.log(msg);
}
