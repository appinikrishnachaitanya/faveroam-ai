"use client";
import {useEffect,useState} from 'react';
import {Icon} from './passport';

export default function ChatComposer({prompt,disabled,onSend}:{prompt:{text:string;version:number};disabled:boolean;onSend:(text:string)=>void}){
  const [draft,setDraft]=useState('');
  useEffect(()=>setDraft(prompt.text),[prompt.version,prompt.text]);
  return <form className="composer" onSubmit={event=>{
    event.preventDefault();
    const text=draft.trim();
    if(!text||disabled)return;
    setDraft('');
    onSend(text);
  }}>
    <label htmlFor="conversation-input" className="sr-only">Ask TastePassport</label>
    <textarea id="conversation-input" placeholder="Show me something quieter…" value={draft}
      onChange={event=>setDraft(event.target.value)} disabled={disabled} maxLength={1000} rows={2}/>
    <div className="composer-footer"><span>Updates your current suggestions</span>
      <button type="submit" aria-label="Send message" disabled={disabled||!draft.trim()}><Icon name="send" size={17}/>Send</button>
    </div>
  </form>;
}
