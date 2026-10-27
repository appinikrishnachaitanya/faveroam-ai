import {ritualHandler} from '../../../../src/account/ritual-handler';
import {debugRequest} from '../../../../src/agent/debug';
export const runtime='nodejs';
export const maxDuration=120;
export function GET(request:Request){return debugRequest('account.rituals',()=>ritualHandler(request));}
export function POST(request:Request){return debugRequest('account.rituals',()=>ritualHandler(request));}
