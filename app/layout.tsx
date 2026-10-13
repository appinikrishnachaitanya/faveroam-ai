import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'TastePassport — Move anywhere. Keep your vibe.',description:'Turn your tastes into discoveries in a new city.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
