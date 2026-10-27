const {delegateTask}=require('./lib/agentDelegation');
process.env.NODE_ENV='development';
process.env.COORDINATOR_AGENT_ENDPOINT='http://localhost:3005/api/agents/real';
(async()=>{
  const res=await delegateTask({title:'t',description:'d',category:'general',agentId:'coordinator'});
  console.log('Result:',res);
})();
