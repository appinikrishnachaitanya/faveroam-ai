import {audienceContext} from '../../src/passport/audience-context';
import type {DemographicRecord} from '../../src/qloo/analysis';
export default function AudienceContext({interests,records,loading,disabled,onLoad}:{interests:{id:string;name:string}[];records?:DemographicRecord[];loading:boolean;disabled:boolean;onLoad:()=>void}){
 const eligible=interests;
 return <details className="audience-context"><summary>Who else connects with these tastes? <span>Optional</span></summary><div>
   <h3>Explore an audience perspective</h3><p>See aggregate audience associations for your selected artists, films, cuisines or other confirmed tastes. To try an age group in new discoveries, choose the optional audience lens in Preferences.</p>
   {!eligible.length?<p>Choose a confirmed interest above to explore audience patterns.</p>:<button type="button" disabled={disabled||loading} onClick={onLoad}>{loading?'Looking for audience patterns…':records?'Refresh audience patterns':'Explore audience patterns'}</button>}
   {records&&eligible.length>0&&<><ul>{audienceContext(records,eligible).map(item=><li key={item.id}><strong>{item.name}</strong>{item.bands.length?<><span>Strongest returned age-band association{item.bands.length>1?'s':''}</span><b>{item.bands.join(' · ')}</b></>:<span>No usable age-band breakdown was returned for this interest.</span>}</li>)}</ul><p className="helper">These are relative associations in the returned audience data, not audience percentages, your age, or a prediction that you’ll like a recommendation. They do not establish health, dietary or accessibility suitability.</p></>}
   <p className="helper">Your tastes and explicit requirements remain the basis of discovery. We don’t infer your age. An audience lens applies only when you select one.</p>
 </div></details>;
}
