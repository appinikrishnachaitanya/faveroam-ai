import { NextResponse } from 'next/server';
import { cities, passport } from '../../../src/passport/service.ts';
import { QlooError } from '../../../src/qloo/client.ts';
export async function POST(request:Request){try{const raw=await request.text();if(raw.length>30000)throw new QlooError('Input is too long.',400);const b=JSON.parse(raw);
if(!cities.includes(b.city)||typeof b.token!=='string'||!Array.isArray(b.ids)||b.ids.length<3||b.ids.length>5||b.ids.some((id:unknown)=>typeof id!=='string'))throw new QlooError('Choose a supported destination and confirm three to five tastes.',400);
return NextResponse.json(await passport(b.city,b.token,b.ids),{headers:{'Cache-Control':'no-store'}});
}catch(e){return NextResponse.json({error:e instanceof QlooError?e.message:'Could not build your passport. Resolve your tastes and try again.'},{status:e instanceof QlooError&&e.status===400?400:502});}}
