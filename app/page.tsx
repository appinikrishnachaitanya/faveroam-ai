import {connection} from 'next/server';
import Home from './home';

export default async function Page(){
  // Cloud Run supplies this at runtime. It is a website key, visible in browser
  // tile requests, and must be restricted to our origins in the CARTO dashboard.
  await connection();
  return <Home cartoKey={process.env.CARTO_API_KEY?.trim()??''}/>;
}
