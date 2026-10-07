import { AsyncLocalStorage } from 'node:async_hooks';
import type { Pool } from 'pg';

// Request-local scope: concurrent operators never share mutable authentication state.
const scope = new AsyncLocalStorage<{agentId:number|null;database?:Pick<Pool,'query'>}>();
export function runWithSupportCrmScope<T>(agentId:number|null,operation:()=>T,database?:Pick<Pool,'query'>):T {
  if(agentId!==null&&(!Number.isSafeInteger(agentId)||agentId<=0))throw new Error('Invalid CRM agent');
  return scope.run({agentId,database:database??scope.getStore()?.database},operation);
}
export function supportCrmAgentScope():number|null { return scope.getStore()?.agentId??null; }
export function crmVisibilitySql(userExpression:string):string {
  const agentId=supportCrmAgentScope();
  return agentId===null?'TRUE':`EXISTS(SELECT 1 FROM support_crm_assignments crm_assignment WHERE crm_assignment.user_id=${userExpression} AND crm_assignment.agent_id=${agentId})`;
}

export function supportCrmDatabase(){ return scope.getStore()?.database; }
