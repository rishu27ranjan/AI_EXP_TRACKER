export async function sendSms(to:string,message:string){
 const provider=(process.env.SMS_PROVIDER||"").toLowerCase();
 if(provider==="twilio"){
  const sid=process.env.TWILIO_ACCOUNT_SID,token=process.env.TWILIO_AUTH_TOKEN,from=process.env.TWILIO_FROM;
  if(!sid||!token||!from)throw new Error("Twilio is not configured.");
  const body=new URLSearchParams({To:to,From:from,Body:message});
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,"content-type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok)throw new Error("SMS provider rejected the message.");return {provider:"twilio",messageId:data.sid as string};
 }
 if(provider==="msg91"){
  const key=process.env.MSG91_AUTH_KEY,sender=process.env.MSG91_SENDER_ID,template=process.env.MSG91_TEMPLATE_ID;
  if(!key||!sender||!template)throw new Error("MSG91 is not configured with an approved template.");
  const response=await fetch("https://control.msg91.com/api/v5/flow/",{method:"POST",headers:{authkey:key,"content-type":"application/json"},body:JSON.stringify({template_id:template,recipients:[{mobiles:to,VAR1:message,sender}]}),signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error("SMS provider rejected the message.");return {provider:"msg91",messageId:String(data.request_id||"")};
 }
 throw new Error("Configure SMS_PROVIDER as twilio or msg91 and add provider credentials.");
}
