const http = require('http');
const { spawn } = require('child_process');

const PORT = 3456;

// Map webhook triggers to agent tasks
const AGENT_TASKS = {
  'rinkstop-daily-activation': 'Run the RinkStop daily activation: post in RinkStop Ops channel (-5043773858), spawn rinkstop-content, rinkstop-marketing, rinkstop-sales agents with 24h deadline. Report back.',
  'rinkstop-support-check': 'Check RinkStop support channels (email and Telegram). Review pending tickets, draft initial replies. Report findings.',
  'csuite-evening-report': 'Generate evening report for C-Suite. Summarize: RinkStop status, SativaExchange status, Kevlar Data status, Top Shelf Toker status. Post to C-Suite (-4990884833).'
};

const server = http.createServer(async (req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // CORS headers for Make.com
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const trigger = data.trigger;
      
      console.log(`Received trigger: ${trigger}`);
      
      if (!trigger || !AGENT_TASKS[trigger]) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid trigger', available: Object.keys(AGENT_TASKS) }));
        return;
      }
      
      const task = AGENT_TASKS[trigger];
      console.log(`Spawning agent with task: ${task}`);
      
      // Spawn agent using OpenClaw CLI
      const agentProcess = spawn('openclaw', [
        'sessions_spawn',
        '--task', task,
        '--runtime', 'subagent',
        '--label', `webhook-${trigger}`
      ], {
        cwd: '/home/openclaw/.openclaw/workspace',
        env: { ...process.env }
      });
      
      let agentOutput = '';
      agentProcess.stdout.on('data', (d) => { agentOutput += d; console.log(d.toString()); });
      agentProcess.stderr.on('data', (d) => { console.error(d.toString()); });
      
      agentProcess.on('close', (code) => {
        console.log(`Agent spawn exited with code: ${code}`);
        res.writeHead(200);
        res.end(JSON.stringify({ 
          status: 'success', 
          trigger: trigger,
          message: `Agent spawned for ${trigger}`,
          output: agentOutput.substring(0, 500)
        }));
      });
      
    } catch (e) {
      console.error('Error:', e);
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log('Available triggers:', Object.keys(AGENT_TASKS));
});
