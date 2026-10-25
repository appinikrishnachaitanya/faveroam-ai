import { Fragment } from 'react';
import { chatParagraphs } from '../../src/agent/chat-presentation';

/** Render only text and a small, safe formatting vocabulary; never provider HTML. */
function inline(text:string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part,index)=>part.startsWith('**')&&part.endsWith('**')
    ? <strong key={index}>{part.slice(2,-2)}</strong> : <Fragment key={index}>{part}</Fragment>);
}
export default function ChatReply({text,hasCards=false}:{text:string;hasCards?:boolean}) {
  return <div className="chat-reply-copy">{chatParagraphs(text,hasCards).map((block,index)=>{
    const rows=block.split('\n').map(line=>line.trim()).filter(Boolean);
    const groups:{list:boolean;lines:string[]}[]=[];
    for(const row of rows){
      const list=/^(?:[•*-]|\d+[.)])\s+/.test(row);
      const last=groups.at(-1);
      if(last?.list===list)last.lines.push(row);else groups.push({list,lines:[row]});
    }
    return <Fragment key={index}>{groups.map((group,i)=>group.list
      ? <ul key={i}>{group.lines.map((line,j)=><li key={j}>{inline(line.replace(/^(?:[•*-]|\d+[.)])\s+/,''))}</li>)}</ul>
      : <p key={i}>{inline(group.lines.join(' '))}</p>)}</Fragment>;
  })}</div>;
}
