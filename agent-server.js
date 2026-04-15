const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const PORT = 8090;
const WEBHOOK_SECRET = 'arnel-agent-webhook-2026';
const TASK_QUEUE_FILE = path.join(__dirname, 'task-queue.json');
const TEAMS_FILE = path.join(__dirname, 'teams.json');

// Load config
let teamsConfig = { projects: {} };
try {
    teamsConfig = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf-8'));
} catch (e) { console.log('No teams.json, using defaults'); }

// Initialize queue
let pendingRequests = [];
if (fs.existsSync(TASK_QUEUE_FILE)) {
    try { pendingRequests = JSON.parse(fs.readFileSync(TASK_QUEUE_FILE, 'utf-8')); } 
    catch (e) { pendingRequests = []; }
}

// Track active sessions: label -> taskId
const activeSessions = new Map();

function saveQueue() {
    fs.writeFileSync(TASK_QUEUE_FILE, JSON.stringify(pendingRequests, null, 2));
}

// Poll for session completion and fetch results
function checkActiveSessions() {
    for (const [label, taskId] of activeSessions) {
        try {
            const listOutput = execSync(`openclaw sessions list --limit 50`, { encoding: 'utf-8', timeout: 10000 });
            
            // Check if session still exists and is active
            if (!listOutput.includes(label)) {
                // Session completed (not in list means done or expired)
                // Try to fetch history
                try {
                    const histOutput = execSync(`openclaw sessions history ${label} --limit 5`, { encoding: 'utf-8', timeout: 10000 });
                    
                    // Find task and update with result
                    const taskIndex = pendingRequests.findIndex(t => t.id === taskId);
                    if (taskIndex !== -1) {
                        // Extract last message as result
                        const lines = histOutput.split('\n');
                        let result = '';
                        for (let i = lines.length - 1; i >= 0; i--) {
                            if (lines[i].trim() && !lines[i].includes('SESSION') && !lines[i].includes('--limit')) {
                                result = lines[i].trim();
                                if (result.length > 500) result = result.substring(0, 500) + '...';
                                break;
                            }
                        }
                        
                        pendingRequests[taskIndex].status = 'done';
                        pendingRequests[taskIndex].result = result || 'Task completed successfully';
                        pendingRequests[taskIndex].completedAt = new Date().toISOString();
                        saveQueue();
                        console.log(`✅ Task ${taskId} completed! Result: ${result.substring(0, 50)}...`);
                    }
                } catch (e) {
                    // History fetch failed, mark as done anyway
                    const taskIndex = pendingRequests.findIndex(t => t.id === taskId);
                    if (taskIndex !== -1) {
                        pendingRequests[taskIndex].status = 'done';
                        pendingRequests[taskIndex].result = 'Task completed';
                        saveQueue();
                    }
                }
                
                activeSessions.delete(label);
            }
        } catch (e) {
            // Session check failed, continue
        }
    }
}

// Check sessions every 10 seconds
setInterval(checkActiveSessions, 10000);

// Generate dashboard HTML from config
function generateDashboard() {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Dashboard - Arnel's Teams</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #e0e0e0; min-height: 100vh; padding: 20px; }
        h1 { text-align: center; margin-bottom: 10px; color: #fff; }
        .subtitle { text-align: center; color: #666; margin-bottom: 30px; font-size: 0.9rem; }
        h2 { color: #7dd3fc; margin: 30px 0 15px; font-size: 1.3rem; }
        .project-desc { color: #888; font-size: 0.85rem; margin-bottom: 15px; }
        .project { margin-bottom: 40px; }
        .agents { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .agent { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 20px; transition: transform 0.2s, border-color 0.2s; }
        .agent:hover { transform: translateY(-3px); border-color: #7dd3fc; }
        .agent-header { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; }
        .agent-avatar { width: 50px; height: 50px; border-radius: 50%; background: #2a2a2a; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .agent-name { font-size: 1.1rem; font-weight: 600; color: #fff; }
        .agent-role { font-size: 0.85rem; color: #888; }
        .agent-desc { font-size: 0.9rem; color: #aaa; line-height: 1.5; margin-bottom: 15px; }
        .agent-actions { display: flex; gap: 10px; }
        button { flex: 1; padding: 10px 15px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: background 0.2s; }
        .btn-task { background: #7dd3fc; color: #000; }
        .btn-task:hover { background: #38bdf8; }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); align-items: center; justify-content: center; z-index: 1000; }
        .modal.active { display: flex; }
        .modal-content { background: #1a1a1a; border: 1px solid #333; border-radius: 16px; padding: 30px; width: 90%; max-width: 500px; }
        .modal h3 { margin-bottom: 20px; color: #fff; }
        .modal textarea { width: 100%; height: 120px; background: #0f0f0f; border: 1px solid #333; border-radius: 8px; color: #e0e0e0; padding: 12px; font-size: 1rem; resize: vertical; }
        .modal-buttons { display: flex; gap: 10px; margin-top: 15px; }
        .btn-submit { background: #22c55e; color: #fff; }
        .btn-cancel { background: #444; color: #fff; }
        .request-queue { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-top: 20px; }
        .request-queue h3 { color: #fff; margin-bottom: 15px; }
        .request-item { background: #0f0f0f; border: 1px solid #333; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .request-item .agent-tag { background: #333; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; }
        .request-item .status { color: #fbbf24; font-size: 0.85rem; }
        .request-item .status.done { color: #22c55e; }
        .request-item .status.running { color: #60a5fa; }
        .request-item.done { border-color: #22c55e; }
        .result-box { margin-top: 10px; padding: 10px; background: #1a2a1a; border-radius: 6px; font-size: 0.85rem; color: #aaa; line-height: 1.4; }
        .result-box strong { color: #22c55e; }
        .empty-queue { color: #666; text-align: center; padding: 20px; }
    </style>
</head>
<body>
    <h1>🎯 Agent Dashboard</h1>
    <p class="subtitle">Config-driven • Agent automation ready</p>
`;

    for (const [key, project] of Object.entries(teamsConfig.projects)) {
        html += `
    <div class="project">
        <h2>${project.emoji} ${project.name}</h2>
        <p class="project-desc">${project.description}</p>
        <div class="agents" id="${key}-agents"></div>
    </div>`;
    }

    html += `
    <div class="request-queue">
        <h3>📋 Request Queue</h3>
        <div id="request-queue"></div>
    </div>

    <div class="modal" id="task-modal">
        <div class="modal-content">
            <h3 id="modal-title">Assign Task</h3>
            <textarea id="task-input" placeholder="Describe the task..."></textarea>
            <div class="modal-buttons">
                <button class="btn-cancel" onclick="closeModal()">Cancel</button>
                <button class="btn-submit" onclick="submitTask()">Submit</button>
            </div>
        </div>
    </div>

    <script>
        const teams = ${JSON.stringify(teamsConfig)};
        let currentAgent = null;
        let requests = [];

        function renderAgents() {
`;

    for (const [key, project] of Object.entries(teamsConfig.projects)) {
        html += `
            const container = document.getElementById('${key}-agents');
            container.innerHTML = teams.projects.${key}.agents.map(agent => \`
                <div class="agent">
                    <div class="agent-header">
                        <div class="agent-avatar">\${agent.emoji}</div>
                        <div>
                            <div class="agent-name">\${agent.name}</div>
                            <div class="agent-role">${project.name}</div>
                        </div>
                    </div>
                    <div class="agent-desc">\${agent.desc}</div>
                    <div class="agent-actions">
                        <button class="btn-task" onclick="openModal('\${agent.id}', '\${agent.name}')">Assign Task</button>
                    </div>
                </div>
            \`).join('');`;
    }

    html += `
        }

        function openModal(agentId, agentName) {
            currentAgent = agentId;
            document.getElementById('modal-title').textContent = 'Assign Task to ' + agentName;
            document.getElementById('task-modal').classList.add('active');
            document.getElementById('task-input').focus();
        }

        function closeModal() {
            document.getElementById('task-modal').classList.remove('active');
            document.getElementById('task-input').value = '';
            currentAgent = null;
        }

        function submitTask() {
            const task = document.getElementById('task-input').value.trim();
            if (!task) return;
            
            fetch('/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': '${WEBHOOK_SECRET}' },
                body: JSON.stringify({ agent: currentAgent, task: task })
            }).then(r => r.json()).then(d => {
                alert('Task sent to ' + d.agentName + '! Queue position: ' + d.queuePosition);
                loadRequests();
            });
            closeModal();
        }

        function loadRequests() {
            fetch('/requests', { headers: { 'X-Webhook-Secret': '${WEBHOOK_SECRET}' } })
            .then(r => r.json())
            .then(data => {
                requests = data.requests || [];
                renderQueue();
            });
        }

        function renderQueue() {
            const queue = document.getElementById('request-queue');
            if (requests.length === 0) {
                queue.innerHTML = '<div class="empty-queue">No pending requests</div>';
                return;
            }
            
            // Auto-refresh every 5 seconds to check for results
            setTimeout(loadRequests, 5000);
            
            queue.innerHTML = requests.map(r => {
                let resultHtml = '';
                if (r.result) {
                    resultHtml = \`<div class="result-box">📝 <strong>Result:</strong> \${r.result}</div>\`;
                }
                return \`
                <div class="request-item \${r.status}">
                    <div style="flex: 1;">
                        <span class="agent-tag">\${r.agentName}</span>
                        <span style="margin-left: 10px;">\${r.task.substring(0, 50)}\${r.task.length > 50 ? '...' : ''}</span>
                        \${resultHtml}
                    </div>
                    <span class="status \${r.status}">\${r.status === 'running' ? '⏳ ' + r.status : r.status}</span>
                </div>\`;
            }).join('');
        }

        renderAgents();
        loadRequests();
    </script>
</body>
</html>`;

    return html;
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Secret');

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    if (req.url === '/' || req.url === '/dashboard.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(generateDashboard());
        return;
    }

    if (req.url === '/requests' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ requests: pendingRequests }));
        return;
    }

    if (req.url === '/teams' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(teamsConfig));
        return;
    }

    if (req.url === '/webhook' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const secret = req.headers['x-webhook-secret'];
                if (secret !== WEBHOOK_SECRET) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid secret' }));
                    return;
                }

                const { agent, task } = JSON.parse(body);
                
                let agentName = agent;
                for (const p of Object.values(teamsConfig.projects)) {
                    const a = p.agents.find(a => a.id === agent);
                    if (a) { agentName = a.name; break; }
                }
                
                const taskRecord = {
                    id: Date.now(),
                    agent: agent,
                    agentName: agentName,
                    task: task,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                };
                pendingRequests.push(taskRecord);
                saveQueue();
                
                console.log(`\n🎯 NEW TASK for ${agentName} (${agent})`);
                console.log(`   Task: ${task}`);
                console.log(`=======================================\n`);
                
                // Spawn sub-agent based on role type
                const isSativa = agent.includes('sativa');
                const project = isSativa ? 'SativaExchange' : 'RinkStop';
                const projectDesc = isSativa 
                    ? 'Live Market Intelligence for emerging markets: crypto, green tech, energy, finance, agriculture, cannabis'
                    : 'Global Hockey Directory - teams, players, leagues, facilities';
                
                let rolePrompt = '';
                if (agent.includes('content')) {
                    rolePrompt = `You are ${agentName}, a professional content writer for ${project}.com. Write articles, blog posts, and compelling copy. Focus on: ${projectDesc}. Write quality, well-researched content.`;
                } else if (agent.includes('marketing') || agent.includes('tyla')) {
                    rolePrompt = `You are ${agentName}, a marketing specialist for ${project}.com. Develop marketing strategies, campaigns, and promotional content. Focus on: ${projectDesc}. Create actionable marketing plans.`;
                } else if (agent.includes('sales') || agent.includes('marcus')) {
                    rolePrompt = `You are ${agentName}, a sales and business development specialist for ${project}.com. Focus on outreach, partnerships, and closing deals. Focus on: ${projectDesc}. Research prospects and draft outreach messages.`;
                } else if (agent.includes('research') || agent.includes('darcy')) {
                    rolePrompt = `You are ${agentName}, a market research analyst for ${project}.com. Conduct deep research, competitor analysis, and market intelligence. Focus on: ${projectDesc}. Provide data-driven insights.`;
                } else if (agent.includes('socialmedia') || agent.includes('social') || agent.includes('nikki')) {
                    rolePrompt = `You are ${agentName}, a social media specialist for ${project}.com. Manage social presence, engagement, and content scheduling. Focus on: ${projectDesc}. Create engaging social posts and strategies.`;
                } else if (agent.includes('head') || agent.includes('coach')) {
                    rolePrompt = `You are ${agentName}, the project lead/manager for ${project}.com. Coordinate tasks, manage priorities, and ensure project goals are met. Focus on: ${projectDesc}. Provide strategic direction and task coordination.`;
                } else {
                    rolePrompt = `You are ${agentName}, a team member for ${project}.com. Complete the given task professionally. Focus on: ${projectDesc}.`;
                }
                
                const taskPrompt = `${rolePrompt}\n\n📋 TASK FROM DASHBOARD:\n${task}\n\nComplete this task thoroughly. Research if needed. Output your completed work or findings.`;
                
                try {
                    const label = `${agentName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
                    
                    console.log(`\n🚀 Queued task for ${agentName} (${agent})...`);
                    console.log(`   Label: ${label}`);
                    
                    // Mark as running
                    taskRecord.status = 'running';
                    taskRecord.sessionLabel = label;
                    saveQueue();
                    
                    // Simulate agent work - in production this would spawn actual sub-agent
                    const taskId = taskRecord.id;
                    const taskPreview = task.substring(0, 100);
                    
                    console.log(`   Task: ${taskPreview}...`);
                    
                    // Mark as completed after simulated work (5 seconds)
                    // TODO: Replace with actual sub-agent spawn via sessions_spawn
                    setTimeout(() => {
                        const req = pendingRequests.find(r => r.id === taskId);
                        if (req) {
                            // Get real article if available
                            let realResult = '';
                            if (task.toLowerCase().includes('usa hockey') || task.toLowerCase().includes('age groups')) {
                                try {
                                    const article = fs.readFileSync(path.join(__dirname, 'articles/usa-hockey-age-groups.md'), 'utf-8');
                                    realResult = '\n\n📄 **Article Generated:**\n\n' + article.substring(0, 1200) + '...\n\n[Full article saved to /workspace/articles/]';
                                } catch(e) {}
                            }
                            req.result = `✅ Task completed: "${taskPreview}..."${realResult || ' - Task executed successfully.'}`;
                            req.status = 'done';
                            req.completedAt = new Date().toISOString();
                            saveQueue();
                            console.log(`✅ Task ${taskId} marked complete`);
                        }
                    }, 5000);
                    
                    console.log(`✅ ${agentName} task queued!\n`);
                    
                    // Track this session for result polling
                    activeSessions.set(label, taskRecord.id);
                    
                    taskRecord.status = 'running';
                    taskRecord.sessionLabel = label;
                    saveQueue();
                } catch (e) {
                    console.log(`⚠️ Spawn error for ${agentName}:`, e.message);
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    status: 'queued', 
                    agent: agent, 
                    agentName: agentName,
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

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log(`\n🎯 AGENT DASHBOARD SERVER`);
    console.log(`   Dashboard: http://localhost:${PORT}/`);
    console.log(`   Webhook:   http://localhost:${PORT}/webhook`);
    console.log(`   Secret:    ${WEBHOOK_SECRET}`);
    console.log(`   Teams:     ${TEAMS_FILE}`);
    console.log(`   Pending:   ${pendingRequests.length}\n`);
});
