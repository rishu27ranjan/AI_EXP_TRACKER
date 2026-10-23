import {NextResponse} from "next/server";
import {database} from "@/lib/db";
import {userId} from "@/lib/auth";
import {diwaliMonthlyAllocation,monthWindow,projectFinance,Profile,Expense,UpcomingExpense} from "@/lib/finance";
import {balanceLedger,calculatePayable,calculateReceivable,personalShareForUser} from "@/lib/shared";
export async function GET(){
 try{
  const uid=await userId();if(!uid)return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=await database();
  const [profile,expenses,upcoming,diwali,groups]=await Promise.all([
   db.collection("profiles").findOne({userId:uid}),db.collection("expenses").find({userId:uid}).sort({date:-1}).limit(500).toArray(),
   db.collection("upcoming").find({userId:uid}).sort({dueDate:1}).limit(100).toArray(),db.collection("diwali").findOne({userId:uid}),db.collection("groups").find({"members.userId":uid},{projection:{name:1}}).toArray()
  ]);
  const groupIds=groups.map(g=>String(g._id)),[shared,settlements]=groupIds.length?await Promise.all([db.collection("sharedExpenses").find({groupId:{$in:groupIds}}).toArray(),db.collection("settlements").find({groupId:{$in:groupIds},status:"completed"}).toArray()]):[[],[]];
  const p=(profile||{monthlyIncome:0,savingsTarget:65000,emergencyBuffer:0}) as Profile;
  const monthlyDiwali=diwaliMonthlyAllocation(diwali as any,expenses.filter(e=>e.type==="diwali").reduce((sum,e)=>sum+e.amount,0));
  const forecastUpcoming=[...upcoming.map(e=>({...e,dueDate:new Date(e.dueDate).toISOString()})),...(monthlyDiwali?[{amount:monthlyDiwali,title:"Diwali fund allocation",category:"Diwali",dueDate:new Date(new Date().getFullYear(),new Date().getMonth()+1,0).toISOString()}]:[])] as unknown as UpcomingExpense[];
  const diwaliData=diwali?{...diwali,spent:expenses.filter(e=>e.type==="diwali").reduce((sum,e)=>sum+e.amount,0),monthlyAllocation:monthlyDiwali}:null;
  const {start,end}=monthWindow(),personalShares=personalShareForUser(shared as any,uid,start,end),forecastExpenses=[...expenses.map(e=>({...e,date:new Date(e.date).toISOString()})),...personalShares.map(e=>({amount:e.amount,date:e.date,category:`Shared · ${e.category}`,type:"non-essential" as const}))] as unknown as Expense[];
  const ledgers=groupIds.map(groupId=>balanceLedger(shared.filter(e=>e.groupId===groupId) as any,settlements.filter(s=>s.groupId===groupId) as any)),receivable=ledgers.reduce((sum,l)=>sum+calculateReceivable(l.get(uid)||0),0),payable=ledgers.reduce((sum,l)=>sum+calculatePayable(l.get(uid)||0),0),cashOutflow=expenses.filter(e=>new Date(e.date)>=start&&new Date(e.date)<=end).reduce((sum,e)=>sum+e.amount,0)+shared.filter(e=>new Date(e.date)>=start&&new Date(e.date)<=end).reduce((sum,e)=>sum+e.paidBy.filter((payer:any)=>payer.userId===uid).reduce((s:number,p:any)=>s+p.amount,0),0);
  const groupBalances=groups.map((g,i)=>({groupId:String(g._id),name:g.name,receivable:calculateReceivable(ledgers[i].get(uid)||0),payable:calculatePayable(ledgers[i].get(uid)||0)}));
  return NextResponse.json({profile:p,expenses:expenses.map(e=>({...e,_id:String(e._id),date:new Date(e.date).toISOString()})),upcoming:upcoming.map(e=>({...e,_id:String(e._id),dueDate:new Date(e.dueDate).toISOString()})),diwali:diwaliData,sharedExpenseShares:personalShares,sharedMoney:{receivable,payable,net:receivable-payable,personalShare:personalShares.reduce((sum,e)=>sum+e.amount,0),cashOutflow,groups:groupBalances},finance:projectFinance(p,forecastExpenses,forecastUpcoming)});
 }catch{return NextResponse.json({error:"Unable to load dashboard."},{status:500});}
}
