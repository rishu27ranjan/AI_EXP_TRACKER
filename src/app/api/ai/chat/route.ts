import {NextResponse} from "next/server";
import {z} from "zod";
import {database} from "@/lib/db";
import {userId} from "@/lib/auth";
import {diwaliMonthlyAllocation,monthWindow,projectFinance,Profile,Expense,UpcomingExpense} from "@/lib/finance";
import {balanceLedger,calculatePayable,calculateReceivable,calculateSettlementPlan,personalShareForUser} from "@/lib/shared";
import {rateLimit} from "@/lib/rate-limit";
import {coachReply} from "@/lib/ai";
export const runtime="nodejs";
const schema=z.object({message:z.string().min(1).max(1000)});
export async function POST(req:Request){
 try{
  const uid=await userId();if(!uid)return NextResponse.json({error:"Unauthorized"},{status:401});
  const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({error:"Ask a question up to 1,000 characters."},{status:400});
  const db=await database();if(!await rateLimit(db,`ai:${uid}`,20,60_000))return NextResponse.json({error:"Please wait a minute before sending more Money Coach questions."},{status:429});
  const [profile,expenses,upcoming,diwali,groups]=await Promise.all([
   db.collection("profiles").findOne({userId:uid}),db.collection("expenses").find({userId:uid}).toArray(),
   db.collection("upcoming").find({userId:uid}).toArray(),db.collection("diwali").findOne({userId:uid}),
   db.collection("groups").find({"members.userId":uid}).toArray()
  ]);
  const groupIds=groups.map(g=>String(g._id)),[shared,settlements]=groupIds.length?await Promise.all([db.collection("sharedExpenses").find({groupId:{$in:groupIds}}).toArray(),db.collection("settlements").find({groupId:{$in:groupIds},status:"completed"}).toArray()]):[[],[]];
  const baseProfile=(profile||{monthlyIncome:0,savingsTarget:65000,emergencyBuffer:0}) as Profile,{start,end}=monthWindow(),shares=personalShareForUser(shared as any,uid,start,end),
   currentExpenses=[...expenses.map(e=>({...e,date:new Date(e.date).toISOString()})),...shares.map(s=>({amount:s.amount,date:s.date,category:`Shared · ${s.category}`,type:"non-essential" as const}))] as unknown as Expense[];
  const monthlyDiwali=diwaliMonthlyAllocation(diwali as any,expenses.filter(e=>e.type==="diwali").reduce((sum,e)=>sum+e.amount,0));
  const forecastUpcoming=[...upcoming.map(e=>({...e,dueDate:new Date(e.dueDate).toISOString()})),...(monthlyDiwali?[{amount:monthlyDiwali,title:"Diwali fund allocation",category:"Diwali",dueDate:new Date(new Date().getFullYear(),new Date().getMonth()+1,0).toISOString()}]:[])] as unknown as UpcomingExpense[];
  const snapshot=projectFinance(baseProfile,currentExpenses,forecastUpcoming),amountMatch=p.data.message.match(/(?:₹|rs\.?\s*)([\d,]+(?:\.\d+)?)|(?:spend|buy|purchase)\s+(?:for\s+)?(?:₹\s*)?([\d,]+(?:\.\d+)?)/i);
  if(amountMatch){const amount=Number((amountMatch[1]||amountMatch[2]).replaceAll(",",""));if(Number.isFinite(amount)&&amount>0){const after=projectFinance(baseProfile,[...currentExpenses,{amount,date:new Date().toISOString(),category:"Planned purchase",type:"non-essential"}],forecastUpcoming);Object.assign(snapshot,{scenario:{amount,projectedSavingsAfter:after.projectedSavings,shortfallAfter:after.shortfall,stillMeetsTarget:after.projectedSavings>=after.target}});}}
  const ledgers=groupIds.map(groupId=>balanceLedger(shared.filter(e=>e.groupId===groupId) as any,settlements.filter(s=>s.groupId===groupId) as any)),groupBalances=groups.map((g,i)=>({group:g.name,receivable:calculateReceivable(ledgers[i].get(uid)||0),payable:calculatePayable(ledgers[i].get(uid)||0),settlementPlan:calculateSettlementPlan(ledgers[i])}));
  const spendingByCategory=Object.entries(currentExpenses.reduce((m,e)=>({...m,[e.category]:(m[e.category]||0)+e.amount}),{} as Record<string,number>)).map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount);
  Object.assign(snapshot,{spendingByCategory,upcomingExpenses:upcoming.map(e=>({title:e.title,amount:e.amount,dueDate:e.dueDate,category:e.category})),diwali:diwali?{totalBudget:diwali.totalBudget,spent:expenses.filter(e=>e.type==="diwali").reduce((s,e)=>s+e.amount,0),monthlyAllocation:monthlyDiwali,eventDate:diwali.eventDate}:null,sharedGroups:groupBalances});
  return NextResponse.json({answer:await coachReply(p.data.message,snapshot)});
 }catch{return NextResponse.json({error:"Money Coach is unavailable right now. Your dashboard forecast is still available."},{status:503});}
}
