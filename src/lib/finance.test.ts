import {describe,it,expect} from "vitest";import {diwaliMonthlyAllocation,projectFinance} from "./finance";
const profile={monthlyIncome:120000,savingsTarget:65000,emergencyBuffer:5000};const date=new Date();const expenses:any[]=[];
describe("monthly finance forecast",()=>{
 it("calculates savings with no expenses",()=>{expect(projectFinance(profile,expenses,[],date).currentSavings).toBe(120000)});
 it("projects spending pace and upcoming obligations",()=>{const f=projectFinance(profile,[{amount:10000,date:new Date(date.getFullYear(),date.getMonth(),1).toISOString(),category:"Rent",type:"essential"}], [{amount:5000,dueDate:new Date(date.getFullYear(),date.getMonth(),date.getDate()+1).toISOString(),title:"Bill",category:"Bills"}],date);expect(f.spent).toBe(10000);expect(f.due).toBe(5000);expect(f.projectedSavings).toBeLessThan(105000)});
 it("protects buffer and target in safe-to-spend",()=>{const f=projectFinance(profile,[],[],date);expect(f.remainingAllowance).toBe(50000);expect(f.safeToday).toBeGreaterThanOrEqual(0)});
 it("flags savings targets above available income",()=>{const f=projectFinance({...profile,savingsTarget:130000},[],[],date);expect(f.remainingAllowance).toBe(0);expect(f.status).toBe("unlikely")});
 it("handles zero income without NaN",()=>{const f=projectFinance({...profile,monthlyIncome:0},[],[],date);expect(Number.isFinite(f.projectedSavings)).toBe(true);expect(f.status).toBe("unlikely")});
 it("includes recurring upcoming bills in the current month",()=>{const f=projectFinance(profile,[],[{amount:1000,dueDate:new Date(date.getFullYear(),date.getMonth(),1).toISOString(),title:"Internet",category:"Bills",recurring:true,frequency:"weekly"}],date);expect(f.due).toBeGreaterThan(0)});
 it("spreads a Diwali sinking fund across remaining months",()=>{expect(diwaliMonthlyAllocation({totalBudget:15000,eventDate:new Date(date.getFullYear(),date.getMonth()+2,15)},3000,date)).toBe(4000)});
});
