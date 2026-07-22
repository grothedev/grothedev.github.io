let env = {};
let dom = {
    input: {},
    label: {},
    box: {}, //an info-containing box
    icon: {},
    info: {}
};
let stor = {}; //storage
let itemKeys = [
    'resume',
    'api_url',

];

//APP START HERE
$(document).ready(async function() {
    console.log('asdf');
    //the core loop of the client application
    // 1. setup relationship with DOM and grab references to its elements
    log('init DOM');
    await initDOM();
    
    await initStorage();

    log('get env vars');
    await getServerEnvVars();
    

});

/*
 * see if any relevant values are available on any storages, in priority:
 * local, remote, 
*/
async function initStorage(){
    stor = localStorage.get('resume').then((res)=>{});
}

async function getServerEnvVars(){
    await axios.get('/env').then((res)=>{
        env = res.data;
        //log(env);
    }).catch((err)=>{
        //log(err);
    });
}

function initDOM(){
    dom.body = $('body')[0];
    //dom.input. = $('#input_who')[0];
    
    $('.service-card').toArray().forEach((elem)=>{
        console.log(elem);
    });;
    dom.views['resume'] = resumeHTML; 
    //dom.inputWho.onchange = ()=> { myNickname = domElems.inputWho.value; };
    
}

function log(msg, lvl=1){
    if (dom.debugInfo){
        dom.debugInfo.innerHTML = msg; //TODO running log + timestamp
    }
    console.log(msg);
}

function renderResume(data) {
    const resume = document.getElementById('resume');
    let html = '';

    // Header
    html += '<div class="header">';
    html += `<h1 class="name">${data.personal?.name || 'Your Name'}</h1>`;
    if (data.personal?.title) {
        html += `<div class="title">${data.personal.title}</div>`;
    }
    
    html += '<div class="contact">';
    if (data.personal?.email) html += `<div class="contact-line">${data.personal.email}</div>`;
    if (data.personal?.phone) html += `<div class="contact-line">${data.personal.phone}</div>`;
    if (data.personal?.location) html += `<div class="contact-line">${data.personal.location}</div>`;
    if (data.personal?.linkedin) html += `<div class="contact-line"><a href="https://${data.personal.linkedin}">${data.personal.linkedin}</a></div>`;
    if (data.personal?.github) html += `<div class="contact-line"><a href="https://${data.personal.github}">${data.personal.github}</a></div>`;
    if (data.personal?.website) html += `<div class="contact-line"><a href="https://${data.personal.website}">${data.personal.website}</a></div>`;
    html += '</div></div>';

    // Summary
    if (data.summary) {
        html += '<div class="section">';
        html += '<h2 class="section-title">Summary</h2>';
        html += `<div class="summary">${data.summary}</div>`;
        html += '</div>';
    }

    // Experience
    if (data.experience?.length) {
        html += '<div class="section">';
        html += '<h2 class="section-title">Experience</h2>';
        data.experience.forEach(exp => {
            html += '<div class="item">';
            html += '<div class="item-header">';
            html += `<div class="item-title">${exp.title}</div>`;
            html += `<div class="item-company">${exp.company}</div>`;
            
            let meta = [];
            if (exp.location) meta.push(exp.location);
            if (exp.startDate && exp.endDate) meta.push(`${exp.startDate} – ${exp.endDate}`);
            if (meta.length) html += `<div class="item-meta">${meta.join(' • ')}</div>`;
            
            html += '</div>';
            
            if (exp.description) {
                html += '<div class="item-description"><ul>';
                const descriptions = Array.isArray(exp.description) ? exp.description : [exp.description];
                descriptions.forEach(desc => {
                    html += `<li>${desc}</li>`;
                });
                html += '</ul></div>';
            }
            html += '</div>';
        });
        html += '</div>';
    }

    // Education
    if (data.education?.length) {
        html += '<div class="section">';
        html += '<h2 class="section-title">Education</h2>';
        data.education.forEach(edu => {
            html += '<div class="item">';
            html += `<div class="item-title">${edu.degree}</div>`;
            html += `<div class="item-company">${edu.school}</div>`;
            
            let meta = [];
            if (edu.location) meta.push(edu.location);
            if (edu.startDate && edu.endDate) meta.push(`${edu.startDate} – ${edu.endDate}`);
            if (edu.gpa) meta.push(`GPA: ${edu.gpa}`);
            if (meta.length) html += `<div class="item-meta">${meta.join(' • ')}</div>`;
            
            if (edu.description) html += `<div style="margin-top: 8px; font-size: 14px;">${edu.description}</div>`;
            html += '</div>';
        });
        html += '</div>';
    }

    // Skills
    if (data.skills) {
        html += '<div class="section">';
        html += '<h2 class="section-title">Skills</h2>';
        html += '<div class="skills-section">';
        Object.entries(data.skills).forEach(([category, skills]) => {
            html += '<div class="skill-group">';
            html += `<h4>${category}</h4>`;
            const skillList = Array.isArray(skills) ? skills.join(', ') : skills;
            html += `<div class="skill-list">${skillList}</div>`;
            html += '</div>';
        });
        html += '</div></div>';
    }

    // Projects
    if (data.projects?.length) {
        html += '<div class="section projects">';
        html += '<h2 class="section-title">Projects</h2>';
        data.projects.forEach(project => {
            html += '<div class="item">';
            html += `<div class="item-title">${project.name}</div>`;
            if (project.description) html += `<div style="margin-top: 5px; font-size: 14px;">${project.description}</div>`;
            if (project.technologies) {
                const tech = Array.isArray(project.technologies) ? project.technologies.join(', ') : project.technologies;
                html += `<div class="project-tech">Technologies: ${tech}</div>`;
            }
            if (project.link) html += `<div class="project-link"><a href="https://${project.link}">${project.link}</a></div>`;
            html += '</div>';
        });
        html += '</div>';
    }

    // Certifications
    if (data.certifications?.length) {
        html += '<div class="section">';
        html += '<h2 class="section-title">Certifications</h2>';
        html += '<div class="certifications">';
        data.certifications.forEach(cert => {
            html += '<div class="cert-item">';
            html += `<div class="cert-name">${cert.name}</div>`;
            html += `<div class="cert-issuer">${cert.issuer}</div>`;
            if (cert.date) html += `<div class="cert-date">${cert.date}</div>`;
            html += '</div>';
        });
        html += '</div></div>';
    }

    resume.innerHTML = html;
}

function toggleModal() {
    document.getElementById('modal').classList.toggle('active');
}

function loadResume() {
    const input = document.getElementById('json-input');
    try {
        const data = JSON.parse(input.value);
        renderResume(data);
        toggleModal();
    } catch (e) {
        alert('Invalid JSON format');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    renderResume(sampleResume);
    document.getElementById('json-input').value = JSON.stringify(sampleResume, null, 2);
});

// Close modal on outside click
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) toggleModal();
});

