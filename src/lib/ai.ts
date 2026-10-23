export async function coachReply(question:string,snapshot:Record<string,unknown>){
 const f=snapshot as any,fmt=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
 if(!process.env.GEMINI_API_KEY){
  const q=question.toLowerCase();
  if(f.scenario){const s=f.scenario;return `A purchase of ${fmt(s.amount)} would put your month-end savings estimate at ${fmt(s.projectedSavingsAfter)}. ${s.stillMeetsTarget?`That keeps you ${fmt(s.projectedSavingsAfter-f.target)} above your ${fmt(f.target)} goal.`:`That leaves you ${fmt(s.shortfallAfter)} below your ${fmt(f.target)} goal.`} Your safe-to-spend amount today is ${fmt(f.safeToday)}. Forecasts are estimates.`;}
  if(/where|category|spend most|wasting/.test(q))return `You have spent ${fmt(f.spent)} so far. Review your biggest categories in Insights and look first at flexible spending. Your current projection is ${fmt(f.projectedSavings)} against your ${fmt(f.target||65000)} goal.`;
  return `Your safe-to-spend amount today is ${fmt(f.safeToday)}. Current month-end savings projection: ${fmt(f.projectedSavings)} against your ${fmt(f.target||65000)} target. ${f.status==="on-track"?"You are currently on track. Keep upcoming bills reserved.":`Your forecast is below the target by ${fmt(f.shortfall)}. Consider pausing flexible purchases and checking upcoming plans.`} Add GEMINI_API_KEY to enable personalized follow-up advice.`;
 }
 const model=process.env.GEMINI_MODEL||"gemini-flash-lite-latest";
 const prompt=`You are Money Coach, a practical personal budgeting assistant. The application calculated every financial number; never perform arithmetic, invent numbers, promise outcomes, or give investing, credit, or tax advice. Use only the supplied snapshot for amounts. Protect essentials, emergency reserve, and savings goal before lifestyle spending. Forecasts are estimates. Keep advice warm, concise, and actionable.\n\nFinancial snapshot JSON:\n${JSON.stringify(snapshot)}\n\nUser question:\n${question}`;
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"content-type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.3,maxOutputTokens:350}}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`Gemini request failed (${response.status}).`);
 const result=await response.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>} ;
 return result.candidates?.[0]?.content?.parts?.map(part=>part.text||"").join("").trim()||"I couldn't form a response just now.";
}
