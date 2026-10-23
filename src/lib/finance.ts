export const TARGET_DEFAULT = 65000;
export type Expense = { amount:number; date:string; category:string; type:"essential"|"non-essential"|"diwali"|"emergency"; description?:string; recurring?:boolean };
export type UpcomingExpense = { amount:number; dueDate:string; title:string; category:string; recurring?:boolean; frequency?:string; priority?:string };
export type Profile = { monthlyIncome:number; savingsTarget:number; emergencyBuffer:number; currency?:string };
export type DiwaliPlan={totalBudget:number;eventDate:string|Date};
export function monthWindow(now=new Date()) { const start=new Date(now.getFullYear(),now.getMonth(),1); const end=new Date(now.getFullYear(),now.getMonth()+1,0); start.setHours(0,0,0,0); end.setHours(23,59,59,999); return {start,end,days: end.getDate(),day:now.getDate(),remainingDays:Math.max(1,end.getDate()-now.getDate()+1)}; }
export function projectFinance(profile:Profile, expenses:Expense[], upcoming:UpcomingExpense[], now=new Date()) {
 const {start,end,days,day,remainingDays}=monthWindow(now), inMonth=expenses.filter(e=>{const d=new Date(e.date);return d>=start&&d<=end;});
 const spent=inMonth.reduce((a,e)=>a+e.amount,0), essential=inMonth.filter(e=>e.type==="essential"||e.type==="emergency").reduce((a,e)=>a+e.amount,0), nonEssential=inMonth.filter(e=>e.type==="non-essential").reduce((a,e)=>a+e.amount,0);
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const due=upcoming.reduce((sum,e)=>{let d=new Date(e.dueDate);if(!e.recurring||!e.frequency)return sum+(d>=today&&d<=end?e.amount:0);while(d<today){d=nextOccurrence(d,e.frequency);if(!Number.isFinite(d.getTime()))return sum;}let occurrences=0;while(d<=end&&occurrences<100){sum+=e.amount;occurrences++;d=nextOccurrence(d,e.frequency);}return sum;},0);
 const baseline=Math.max(spent, profile.monthlyIncome>0 ? spent/Math.max(1,day)*days : spent);
 const projected=Math.round(profile.monthlyIncome-baseline-due), current=profile.monthlyIncome-spent;
 const remainingAllowance=Math.max(0,profile.monthlyIncome-profile.savingsTarget-profile.emergencyBuffer-spent-due);
 const safeToday=Math.floor(remainingAllowance/remainingDays);
 const target=profile.savingsTarget||TARGET_DEFAULT, shortfall=Math.max(0,target-projected), status=projected>=target+5000?"on-track":projected>=target?"at-risk":"unlikely";
 return {income:profile.monthlyIncome,spent,essential,nonEssential,currentSavings:current,projectedSavings:projected,target,shortfall,status,due,remainingAllowance,safeToday,remainingDays,days,day,percent:profile.monthlyIncome?Math.min(100,Math.round(spent/profile.monthlyIncome*100)):0};
}
export function diwaliMonthlyAllocation(plan:DiwaliPlan|null|undefined,spent:number,now=new Date()){if(!plan||new Date(plan.eventDate)<now)return 0;const event=new Date(plan.eventDate);const months=Math.max(1,(event.getFullYear()-now.getFullYear())*12+event.getMonth()-now.getMonth()+1);return Math.ceil(Math.max(0,plan.totalBudget-spent)/months);}
function nextOccurrence(date:Date,frequency:string){const d=new Date(date);if(frequency==="daily")d.setDate(d.getDate()+1);else if(frequency==="weekly")d.setDate(d.getDate()+7);else if(frequency==="monthly")d.setMonth(d.getMonth()+1);else if(frequency==="quarterly")d.setMonth(d.getMonth()+3);else if(frequency==="yearly")d.setFullYear(d.getFullYear()+1);else d.setTime(Number.NaN);return d;}
export const rupees=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
export const compactRupees=(n:number)=>`₹${new Intl.NumberFormat("en-IN",{notation:"compact",maximumFractionDigits:1}).format(Number.isFinite(n)?n:0)}`;
