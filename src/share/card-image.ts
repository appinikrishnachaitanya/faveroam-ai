/** A self-contained image: no external fonts, photos, requests, or account data. */
export function tasteCardSvg(city:string,themes:string[],tastes:string[]) {
 const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
 const words=(themes.length?themes:tastes).slice(0,5).map(value=>escape(value.slice(0,55)));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#193e31"/><path d="M80 170C350 80 450 360 710 250S1020 180 1120 110" fill="none" stroke="#dfb776" stroke-width="8"/><text x="80" y="95" fill="#dfb776" font-family="Georgia,serif" font-size="38">FaveRoam</text><text x="80" y="345" fill="#fffaf0" font-family="Georgia,serif" font-size="54">My tastes in ${escape(city.slice(0,40))}</text>${words.map((word,index)=>`<text x="80" y="${410+index*36}" fill="#e4eedf" font-family="Arial,sans-serif" font-size="25">${word}</text>`).join('')}<text x="80" y="610" fill="#dfb776" font-family="Arial,sans-serif" font-size="18">Confirmed interests and returned themes · not a personality score</text></svg>`;
}

export async function tasteCardPng(svg:string):Promise<Blob> {
 const source=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 try {
   const picture=new Image();
   picture.src=source;
   await picture.decode();
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;
   const context=canvas.getContext('2d');if(!context)throw Error('Image export is unavailable.');
   context.drawImage(picture,0,0,1200,630);
   return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not create the image.')),'image/png'));
 } finally {URL.revokeObjectURL(source);}
}
