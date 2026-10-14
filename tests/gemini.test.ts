import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("native Gemini SDK uses function declarations, validates selections, provides tool-free baseline and safe logs", () => {
  const output = execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e", `
import assert from 'node:assert/strict';
import { configuredProvider } from './src/agent/provider.ts';
import { debugEvent } from './src/agent/debug.ts';
process.env.GEMINI_API_KEY='native-test-secret';process.env.GEMINI_MODEL='gemini-2.5-flash';process.env.AGENT_MODEL_BASE_URL='invalid-unused-base';process.env.QLOO_API_KEY='qloo-test-secret';process.env.AGENT_DEBUG='1';
const logs=[];console.info=(line)=>logs.push(JSON.parse(line));const requests=[];let bad=false,fail=false;
globalThis.fetch=async (url,options)=>{
 assert.ok(String(url).includes('generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'));
 const body=JSON.parse(options.body);requests.push(body);
 assert.ok(!JSON.stringify(body).includes('native-test-secret'));
 if(fail)return new Response('{}',{status:429,headers:{'content-type':'application/json'}});
 const tool=body.tools?.[0]?.functionDeclarations?.[0];
 const parts=tool?[{functionCall:{name:bad?'invented_tool':tool.name,args:tool.name==='interpret_cultural_intent'?{kind:'refine',seeds:[],concepts:['art'],constraints:[],sections:['Culture'],strategy:'discover',affinity:99}:{query:'art',limit:5}}}]:[{text:'Unverified model-only suggestion'}];
 return Response.json({candidates:[{content:{role:'model',parts},finishReason:'STOP'}]});
};
const provider=configuredProvider();
const intent=await provider.interpret('Find art in Toronto');assert.deepEqual(intent.sections,['Culture']);assert.ok(!('affinity' in intent));assert.equal(requests[0].toolConfig.functionCallingConfig.mode,'ANY');
const choices=await provider.choose('Find art',{city:'Toronto',selected:[],cards:[],feedback:[],intent},[{name:'qloo_find_tags',inputSchema:{type:'object',properties:{query:{type:'string'}}}}]);assert.equal(choices[0].name,'qloo_find_tags');assert.equal(requests[1].toolConfig.functionCallingConfig.mode,'AUTO');assert.ok(requests[1].tools[0].functionDeclarations[0].parametersJsonSchema);
const request='Find art in Toronto';const baseline=await provider.baseline('Toronto',['Interstellar'],request);assert.equal(baseline.request,request);assert.equal(baseline.model,'gemini-2.5-flash');assert.ok(!requests[2].tools);assert.equal(JSON.parse(requests[2].contents[0].parts[0].text).request,request);
bad=true;await assert.rejects(provider.interpret('Find art'),/Model provider unavailable/);bad=false;fail=true;await assert.rejects(provider.interpret('Find art'),/Model provider unavailable/);assert.ok(logs.some(l=>l.event==='gemini.failed'&&l.status===429));
debugEvent('qloo.result',{tool:'native-test-secret',count:-1,trace:'qloo-test-secret'});
assert.ok(logs.some(l=>l.event==='gemini.request'));assert.ok(logs.some(l=>l.event==='gemini.tool_selected'&&l.tool==='qloo_find_tags'));
assert.ok(!JSON.stringify(logs).includes('native-test-secret'));assert.ok(!JSON.stringify(logs).includes('qloo-test-secret'));assert.ok(!JSON.stringify(logs).includes('Find art'));assert.ok(!JSON.stringify(logs).includes('invented_tool'));
delete process.env.GEMINI_MODEL;fail=false;assert.equal((await configuredProvider().baseline('Toronto',[],request)).model,'gemini-2.5-flash');
console.log('Native Gemini PASS');
`], { cwd:process.cwd(), encoding:"utf8",timeout:30000 });
  assert.match(output,/Native Gemini PASS/);
});
