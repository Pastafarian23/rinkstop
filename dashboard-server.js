const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8090;
const WEBHOOK_SECRET = 'rinkstop-webhook-2026';
const TASK_QUEUE_FILE = path.join(__dirname, 'task-queue.json');

// Initialize queue file
let pendingRequests = [];
if (fs.existsSync(TASK_QUEUE_FILE)) {
    try {
        pendingRequests = JSON.parse(fs.readFileSync(TASK_QUEUE_FILE, 'utf-8'));
    } catch (e) { pendingRequests = []; }
}

// Read dashboard HTML
const dashboardPath = path.join(__dirname, 'dashboard.html');
let dashboardHTML = fs.readFileSync(dashboardPath, 'utf-8');

// Update dashboard to POST to webhook
dashboardHTML = dashboardHTML.replace(
    "console.log('NEW TASK:', { agent: currentAgent, task: task });",
    `fetch('http://localhost:${PORT}/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': '${WEBHOOK_SECRET}' },
        body: JSON.stringify({ agent: currentAgent, task: task })
    }).then(r => r.json()).then(d => {
        alert('Task sent to ' + currentAgent + '! Status: ' + d.status);
        loadRequests();
    });`
);

// Add requests loader
dashboardHTML = dashboardHTML.replace(
    'renderQueue();',
    `loadRequests();`
);

dashboardHTML = dashboardHTML.replace(
    'function renderQueue() {',
    `function loadRequests() {
    fetch('http://localhost:${PORT}/requests', { headers: { 'X-Webhook-Secret': '${WEBHOOK_SECRET}' } })
    .then(r => r.json())
    .then(data => {
        requests = data.requests || [];
        renderQueue();
    });
}

function renderQueue() {`
);

function saveQueue() {
    fs.writeFileSync(TASK_QUEUE_FILE, JSON.stringify(pendingRequests, null, 2));
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Secret');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Dashboard
    if (req.url === '/' || req.url === '/dashboard.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(dashboardHTML);
        return;
    }

    // Get requests
    if (req.url === '/requests' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ requests: pendingRequests }));
        return;
    }

    // Delete/complete request
    if (req.url.startsWith('/requests/') && req.method === 'DELETE') {
        const id = parseInt(req.url.split('/')[2]);
        pendingRequests = pendingRequests.filter(r => r.id !== id);
        saveQueue();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'deleted' }));
        return;
    }

    // Webhook endpoint
    if (req.url === '/webhook' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const secret = req.headers['x-webhook-secret'];
                if (secret !== WEBHOOK_SECRET) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid secret' }));
                    return;
                }

                const { agent, task } = JSON.parse(body);
                
                // Agent names
                const agentNames = {
                    'rinkstop-head': 'Coach',
                    'rinkstop-marketing': 'Tyla', 
                    'rinkstop-sales': 'Marcus',
                    'rinkstop-research': 'Darcy',
                    'rinkstop-socialmedia': 'Nikki',
                    'rinkstop-content': 'Eddie'
                };
                
                // Create task record
                const taskRecord = {
                    id: Date.now(),
                    agent: agent,
                    agentName: agentNames[agent] || agent,
                    task: task,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                };
                pendingRequests.push(taskRecord);
                saveQueue();
                
                console.log(`\n🎯 ========================================`);
                console.log(`   NEW TASK for ${taskRecord.agentName} (${agent})`);
                console.log(`   Task: ${task}`);
                console.log(`   Use: sessions_send to deliver`);
                console.log(`==========================================\n`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    status: 'queued', 
                    agent: agent, 
                    agentName: taskRecord.agentName,
                    task: task,
                    queuePosition: pendingRequests.length
                }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log(`\n🎯 DASHBOARD SERVER RUNNING`);
    console.log(`   Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`   Webhook:   http://localhost:${PORT}/webhook`);
    console.log(`   Secret:    ${WEBHOOK_SECRET}`);
    console.log(`   Queue:     ${TASK_QUEUE_FILE}\n`);
    console.log(`   Pending tasks: ${pendingRequests.length}\n`);
});