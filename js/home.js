import { setupRenderSystem } from './render.js';

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

    log('load links');
    await loadLinks();

    setupRenderSystem();


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
    //fetch
}

function initServices(){
    //connect to websocket server
    //grab endpoints from cfg
}

function initDOM(){
    dom.body = $('body')[0];
}

async function loadLinks(){
    try {
        let res = await fetch('https://raw.githubusercontent.com/grothedev/links-resources-info-etc/refs/heads/main/data/links.json');
        let data = await res.json();
        renderLinks(data);
    } catch (e) {
        log('failed to fetch links: ' + e);
    }
}

function renderLinks(links){
    let $section = $('<section>');
    let $h4 = $('<h4>').text('Links & Resources');
    let $ul = $('<ul>');
    links.forEach(item => {
        let $li = $('<li>');
        let $a = $('<a>').attr('href', item.url).attr('target', '_blank').text(item.label);
        $li.append($a);
        if (item.description){
            $li.append($('<br>'));
            $li.append($('<small>').text(item.description));
        }
        $ul.append($li);
    });
    $section.append($h4).append($ul);
    $('main').append($section);
}

function log(msg, lvl=1){
    if (dom.debugInfo){
        dom.debugInfo.innerHTML = msg; //TODO running log + timestamp
    }
    console.log(msg);
}
