// Shared by Pricing, the member profile and Admin. Prices are in USD cents.
export const subscriptionPlans = [
  {id:'free',name:'Free',amount:0,interval:'none'},
  {id:'monthly',name:'Plus Monthly',amount:399,interval:'month'},
  {id:'annual',name:'Plus Annual',amount:2999,interval:'year'}
];
export const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
export const planById = id => subscriptionPlans.find(plan=>plan.id===id);
// Financial records must have an explicit currency; do not combine currencies.
export function subscriptionMetrics(data,now=new Date()) {
  const active=(data.subscriptions||[]).filter(s=>s.status==='active'&&s.currency==='USD'&&s.startedOn&&new Date(s.startedOn)<=now&&(!s.endsOn||new Date(s.endsOn)>now)&&Number.isInteger(s.amount)&&s.amount>0&&['month','year'].includes(s.interval));
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const payments=(data.payments||[]).filter(p=>p.currency==='USD'&&p.status==='paid'&&Number.isInteger(p.amount)&&p.amount>=0&&Number.isInteger(p.refundedAmount??0)&&(p.refundedAmount??0)>=0&&(p.refundedAmount??0)<=p.amount&&new Date(p.paidOn)>=monthStart&&new Date(p.paidOn)<=now);
  return {active:active.length,mrr:Math.round(active.reduce((sum,s)=>sum+s.amount/(s.interval==='year'?12:1),0)),collected:payments.reduce((sum,p)=>sum+p.amount,0),refunded:payments.reduce((sum,p)=>sum+(p.refundedAmount||0),0)};
}
