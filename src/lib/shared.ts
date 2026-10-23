export type SplitKind="equal"|"exact"|"percentage"|"shares";
export type SplitEntry={userId:string;value?:number};
export type Payer={userId:string;amount:number};
export type Participant={userId:string;share:number};
const cents=(n:number)=>Math.round((n+Number.EPSILON)*100);
const dollars=(n:number)=>Math.round(n*100)/100;
export function splitAmount(total:number,kind:SplitKind,entries:SplitEntry[]):Participant[]{
 if(!Number.isFinite(total)||total<=0||!entries.length||new Set(entries.map(e=>e.userId)).size!==entries.length)throw new Error("Split needs a positive total and unique participants.");
 const totalCents=cents(total);let parts:number[];
 if(kind==="equal"){const q=Math.floor(totalCents/entries.length),r=totalCents%entries.length;parts=entries.map((_,i)=>q+(i<r?1:0));}
 else if(kind==="exact"){parts=entries.map(e=>cents(Number(e.value)));if(parts.some(x=>!Number.isFinite(x)||x<0)||parts.reduce((a,b)=>a+b,0)!==totalCents)throw new Error("Exact shares must add up to the expense total.");}
 else if(kind==="percentage"){const pct=entries.map(e=>Number(e.value));if(pct.some(x=>!Number.isFinite(x)||x<0)||Math.abs(pct.reduce((a,b)=>a+b,0)-100)>.001)throw new Error("Percentages must add up to 100.");const raw=pct.map(x=>totalCents*x/100),floors=raw.map(Math.floor);let remainder=totalCents-floors.reduce((a,b)=>a+b,0);parts=floors.map((x,i)=>x+(remainder-->0?1:0));}
 else {const weights=entries.map(e=>Number(e.value));if(weights.some(x=>!Number.isFinite(x)||x<=0))throw new Error("Each share weight must be positive.");const totalWeight=weights.reduce((a,b)=>a+b,0),raw=weights.map(x=>totalCents*x/totalWeight),floors=raw.map(Math.floor);let remainder=totalCents-floors.reduce((a,b)=>a+b,0);parts=floors.map((x,i)=>x+(remainder-->0?1:0));}
 return entries.map((e,i)=>({userId:e.userId,share:dollars(parts[i]/100)}));
}
export function validatePayers(total:number,payers:Payer[]){if(!payers.length||payers.some(p=>!p.userId||!Number.isFinite(p.amount)||p.amount<=0)||new Set(payers.map(p=>p.userId)).size!==payers.length||Math.abs(payers.reduce((s,p)=>s+p.amount,0)-total)>.01)throw new Error("Payer amounts must be positive, unique, and add up to the expense total.");return payers;}
export function balanceLedger(expenses:Array<{paidBy:Payer[];participants:Participant[]}>,settlements:Array<{fromUserId:string;toUserId:string;amount:number}>){const balances=new Map<string,number>();const add=(id:string,n:number)=>balances.set(id,Math.round(((balances.get(id)||0)+n)*100)/100);for(const e of expenses){for(const p of e.paidBy)add(p.userId,p.amount);for(const p of e.participants)add(p.userId,-p.share);}for(const s of settlements){add(s.fromUserId,s.amount);add(s.toUserId,-s.amount);}return balances;}
export function calculateUserBalance(expenses:Array<{paidBy:Payer[];participants:Participant[]}>,settlements:Array<{fromUserId:string;toUserId:string;amount:number}>,uid:string){return balanceLedger(expenses,settlements).get(uid)||0;}
export function calculateSettlementPlan(balances:Map<string,number>){const debtors=[...balances].filter(([,v])=>v<-.005).map(([userId,v])=>({userId,amount:-v})).sort((a,b)=>b.amount-a.amount),creditors=[...balances].filter(([,v])=>v>.005).map(([userId,v])=>({userId,amount:v})).sort((a,b)=>b.amount-a.amount),plan:Array<{fromUserId:string;toUserId:string;amount:number}>=[];let i=0,j=0;while(i<debtors.length&&j<creditors.length){const amount=dollars(Math.min(debtors[i].amount,creditors[j].amount));if(amount>.005)plan.push({fromUserId:debtors[i].userId,toUserId:creditors[j].userId,amount});debtors[i].amount=dollars(debtors[i].amount-amount);creditors[j].amount=dollars(creditors[j].amount-amount);if(debtors[i].amount<.005)i++;if(creditors[j].amount<.005)j++;}return plan;}
export function personalShareForUser(expenses:Array<{date:Date|string;amount:number;category:string;participants:Participant[]}>,uid:string,start:Date,end:Date){return expenses.filter(e=>{const d=new Date(e.date);return d>=start&&d<=end}).map(e=>({amount:e.participants.find(p=>p.userId===uid)?.share||0,date:new Date(e.date).toISOString(),category:e.category})).filter(e=>e.amount>0);}
export const calculateReceivable=(balance:number)=>Math.max(0,Math.round(balance*100)/100);
export const calculatePayable=(balance:number)=>Math.max(0,Math.round(-balance*100)/100);
