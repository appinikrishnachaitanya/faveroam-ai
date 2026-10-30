"use client";
import {useEffect,useState} from 'react';
export default function ThemeToggle(){
 const [dark,setDark]=useState(false);
 useEffect(()=>{
   const media=window.matchMedia('(prefers-color-scheme: dark)');
   const apply=()=>{let saved:string|null=null;try{saved=localStorage.getItem('faveroam.theme');}catch{}const next=saved?saved==='dark':media.matches;setDark(next);document.documentElement.dataset.theme=next?'dark':'light';};
   apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);
 },[]);
 return <button type="button" className="quiet-button theme-toggle" aria-pressed={dark} aria-label={dark?'Switch to light theme':'Switch to dark theme'} onClick={()=>{const next=!dark;setDark(next);document.documentElement.dataset.theme=next?'dark':'light';try{localStorage.setItem('faveroam.theme',next?'dark':'light');}catch{}}}>{dark?'☀ Light':'☾ Dark'}</button>;
}
