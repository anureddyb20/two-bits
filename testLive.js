const fetch = require('node-fetch');
(async () => {
  const r = await fetch('http://localhost:3008/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'test', description: 'desc', category: 'general', mode: 'live', agentId: 'coordinator' })
  });
  console.log('status', r.status);
  const txt = await r.text();
  console.log('body', txt);
})();
