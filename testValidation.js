const { delegateTask } = require('./lib/agentDelegation');
process.env.NODE_ENV = 'development';
(async () => {
  // Allowed endpoint (validation should pass, but fetch will likely fail if no server)
  let res = await delegateTask({title:'t',description:'d',category:'c',agentId:'coordinator',endpoint:'http://localhost:3002/api/agents/real'});
  console.log('Dev allowed:', res.status, res.error || 'ok');
  // Disallowed different port
  res = await delegateTask({title:'t',description:'d',category:'c',agentId:'coordinator',endpoint:'http://localhost:4000/api/agents/real'});
  console.log('Dev wrong port:', res.status, res.error);
  // Production mode should reject even allowed endpoint
  process.env.NODE_ENV = 'production';
  res = await delegateTask({title:'t',description:'d',category:'c',agentId:'coordinator',endpoint:'http://localhost:3002/api/agents/real'});
  console.log('Prod allowed endpoint:', res.status, res.error);
})();
