/* 
   BACKGROUND PARTICLE GRID
 */
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');

let W, H, particles = [];

function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => { resize(); initParticles(); });
resize();

function initParticles() {
    const count = Math.floor((W * H) / 12000);
    particles = [];
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 1.5 + 0.3,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            alpha: Math.random() * 0.6 + 0.1
        });
    }
}
initParticles();

function drawBg() {
    ctx.clearRect(0, 0, W, H);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(0, 245, 255, ${0.12 * (1 - dist / 120)})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    // Draw dots
    for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 245, 255, ${p.alpha})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
    }

    requestAnimationFrame(drawBg);
}
drawBg();


/* 
   SURVEY DATA & LOGIC
 */
let responses = [];

const totalEl  = document.getElementById('totalResponses');
const domainEl = document.getElementById('popularDomain');
const hoursEl  = document.getElementById('averageHours');
const formMsg  = document.getElementById('formMsg');

// --- Chart.js setup ---
const chartDefaults = {
    plugins: {
        legend: { labels: { color: '#c8e8f0', font: { family: 'Rajdhani', size: 13 } } }
    }
};

const domainCtx = document.getElementById('domainChart').getContext('2d');
const domainChart = new Chart(domainCtx, {
    type: 'doughnut',
    data: {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: ['#00f5ff','#b200ff','#ff00a8','#00ff88','#ffcc00'],
            borderColor: '#050810',
            borderWidth: 3
        }]
    },
    options: {
        ...chartDefaults,
        cutout: '65%',
        animation: { animateRotate: true }
    }
});

const langCtx = document.getElementById('langChart').getContext('2d');
const langChart = new Chart(langCtx, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Votes',
            data: [],
            backgroundColor: 'rgba(0, 245, 255, 0.25)',
            borderColor: '#00f5ff',
            borderWidth: 2,
            borderRadius: 6
        }]
    },
    options: {
        ...chartDefaults,
        scales: {
            x: { ticks: { color: '#c8e8f0', font: { family: 'Rajdhani' } }, grid: { color: 'rgba(0,245,255,0.06)' } },
            y: { ticks: { color: '#c8e8f0', font: { family: 'Rajdhani' }, stepSize: 1 }, grid: { color: 'rgba(0,245,255,0.06)' }, beginAtZero: true }
        }
    }
});


// --- Update dashboard ---
function updateDashboard() {
    // Total
    totalEl.textContent = responses.length;

    if (responses.length === 0) {
        domainEl.textContent = '—';
        hoursEl.textContent  = '0';
        domainChart.data.labels = [];
        domainChart.data.datasets[0].data = [];
        domainChart.update();
        langChart.data.labels = [];
        langChart.data.datasets[0].data = [];
        langChart.update();
        return;
    }

    // Average hours
    const total = responses.reduce((sum, r) => sum + r.hours, 0);
    hoursEl.textContent = (total / responses.length).toFixed(1);

    // Domain counts
    const domainCount = {};
    responses.forEach(r => { domainCount[r.domain] = (domainCount[r.domain] || 0) + 1; });
    const topDomain = Object.entries(domainCount).sort((a, b) => b[1] - a[1])[0][0];
    domainEl.textContent = topDomain;

    // Language counts
    const langCount = {};
    responses.forEach(r => { if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1; });

    // Update charts
    domainChart.data.labels = Object.keys(domainCount);
    domainChart.data.datasets[0].data = Object.values(domainCount);
    domainChart.update();

    langChart.data.labels = Object.keys(langCount);
    langChart.data.datasets[0].data = Object.values(langCount);
    langChart.update();

    // Pulse animation on cards
    ['cardTotal','cardDomain','cardHours'].forEach(id => {
        const card = document.getElementById(id);
        card.classList.remove('updated');
        void card.offsetWidth; // reflow
        card.classList.add('updated');
    });
}


// --- Form submission ---
document.getElementById('surveyForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const name     = document.getElementById('nameInput').value.trim();
    const branch   = document.getElementById('branchInput').value;
    const domain   = document.querySelector('input[name="domain"]:checked')?.value;
    const language = document.getElementById('languageInput').value;
    const hours    = parseFloat(document.getElementById('hoursInput').value);

    // Validation
    if (!name) {
        showMsg('⚠ Enter your name to proceed.', 'error'); return;
    }
    if (!branch) {
        showMsg('⚠ Select your branch.', 'error'); return;
    }
    if (!domain) {
        showMsg('⚠ Select a preferred domain.', 'error'); return;
    }
    if (isNaN(hours) || hours < 0 || hours > 24) {
        showMsg('⚠ Enter valid study hours (0–24).', 'error'); return;
    }

    responses.push({ name, branch, domain, language, hours });
    updateDashboard();
    this.reset();
    showMsg(`✓ Response logged for ${name}.`, 'success');
});

function showMsg(text, type) {
    formMsg.textContent = text;
    formMsg.className = 'form-msg ' + type;
    setTimeout(() => { formMsg.textContent = ''; formMsg.className = 'form-msg'; }, 3500);
}