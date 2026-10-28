import type { Metadata } from 'next';
import './globals.css';
import './progressive.css';
import './styles/tokens.css';
import './styles/foundation.css';
import './styles/navigation.css';
import './styles/onboarding.css';
import './styles/discoveries.css';
import './styles/dialogs.css';
import './styles/assistant.css';
import './styles/library.css';
import './styles/feedback.css';
import './styles/intelligence.css';
import './styles/controls.css';
import './styles/illustrations.css';
import './styles/experience.css';
import './styles/motion.css';
import './styles/workspace.css';
import './styles/new-features.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/faveroam.css';
import './styles/planning.css';
import './styles/common-ground.css';
import './styles/flow-alignment.css';
import './styles/experience-v2.css';
export const metadata:Metadata={
  metadataBase:new URL('https://my-faveroam-app.cloud.run/'),
  title:'FaveRoam — From what you love to where you belong.',
  description:'Turn what you love into places, experiences, and shared discoveries in a new city.',
  icons:{icon:'/brand/faveroam-mark.svg'},
  openGraph:{title:'FaveRoam',description:'From what you love to where you belong.',images:[{url:'/brand/faveroam-cover.png',width:1200,height:800}]},
};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
