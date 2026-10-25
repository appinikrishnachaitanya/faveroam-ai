import type {Passport} from './state';
import type {Card,Section} from '../passport/model';
import {sectionOrder} from './state';
/** Preview events are read-only; the final session is authoritative for editing. */
export async function generatePassport(body:unknown,onCategory:(section:Section,cards:Card[])=>void):Promise<Passport>{
 const response=await fetch('/api/passport',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify(body),signal:AbortSignal.timeout(95000)});
 if(!response.ok||!response.body)throw Error('Could not connect to build your Passport. Please try again.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',result:Passport|undefined;
 const consume=(line:string)=>{if(!line.trim())return;const event=JSON.parse(line);if(!event||typeof event!=='object')throw Error('Invalid Passport response.');if(event.type==='error')throw Error(typeof event.message==='string'?event.message:'Could not complete your Passport.');if(event.type==='category'){
   if(!sectionOrder.includes(event.section)||!Array.isArray(event.cards)||event.cards.length>3||event.cards.some((card:Card)=>!card||typeof card.id!=='string'||typeof card.name!=='string'||card.section!==event.section))throw Error('Invalid Passport preview.');
   onCategory(event.section,event.cards);
 }if(event.type==='result')result=event.passport;};
 try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let index;while((index=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,index));buffer=buffer.slice(index+1);}}buffer+=decoder.decode();consume(buffer);}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 if(!result?.agent||!Array.isArray(result.cards))throw Error('Your Passport did not finish. Please try again.');return result;
}
