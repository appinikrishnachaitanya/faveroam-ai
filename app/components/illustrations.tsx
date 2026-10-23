import type { Section } from "../../src/passport/model";

/** Original vector artwork. Decorative, city-neutral, and never presented as venue photography. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
    <path d="M24 2C13.5 2 6 9.7 6 19.5 6 31.8 24 46 24 46s18-14.2 18-26.5C42 9.7 34.5 2 24 2Z" fill="#a54435" />
    <circle cx="24" cy="19" r="8" fill="#fff9f5" />
    <circle cx="24" cy="19" r="5.2" stroke="#e8b397" strokeWidth="1.5" />
    <path d="M10 11v5a2 2 0 0 0 4 0v-5m-2 0v15M36 11c-3 3-4 8-1 9h1m0-9v15" stroke="#fff9f5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

type Scene = "journey" | "together" | "saved" | "plan" | "insights";

export function PassportIllustration({ scene = "journey", className = "" }: { scene?: Scene; className?: string }) {
  return <svg className={`passport-illustration ${className}`} data-scene={scene} viewBox="0 0 480 320" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="250" cy="288" rx="192" ry="16" fill="var(--art-shadow)" />
    <circle className="illustration-sun" cx="352" cy="98" r="70" fill="var(--art-sun)" />
    <path d="M42 231c41-66 82-70 129-54 54 18 70-20 121-14 52 7 93 21 144 68v48H42v-48Z" fill="var(--art-haze)" />
    <g stroke="var(--art-line)" strokeWidth="2" strokeLinejoin="round">
      <path d="M60 275v-79h47v79m-39-79v-18h31v18m-23-18v-12m9 12v-28m9 28v-12" fill="var(--art-paper)" />
      <path d="M116 275V162l28-17 28 17v113M125 169h38m-38 17h38m-38 17h38m-38 17h38m-38 17h38" fill="var(--art-lilac)" />
      <path d="M345 276V172h49v104m-42-104v-17h35v17m-28-17v-24h21v24m-10-24v-19" fill="var(--art-paper)" />
      <path d="M402 276v-72h29v72m-23-61h17m-17 15h17m-17 15h17M70 208h26m-26 16h26m-26 16h26m-13-32v49m-7 18v-18h14v18m258-89h32m-32 17h32m-32 17h32m-32 17h32m-16-51v66" />
    </g>
    <path className="illustration-route" d="M43 279c42-45 72 20 117-15 33-25 54-22 83-5 43 26 60 13 83-14 30-34 72-29 111-2" stroke="var(--art-accent)" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" />
    {scene === "together" ? <>
      <PassportBook x={137} y={105} angle={-10} />
      <PassportBook x={248} y={123} angle={10} secondary />
      <path d="M229 69c-17-20-43 8 0 32 43-24 17-52 0-32Z" fill="var(--art-accent)" />
    </> : scene === "plan" ? <>
      <g transform="translate(178 82) rotate(-5 75 90)" stroke="var(--art-line)" strokeWidth="2">
        <rect width="154" height="179" rx="15" fill="var(--art-paper)" />
        <path d="M0 44h154" /><path d="M35-9v23m84-23v23" strokeWidth="5" strokeLinecap="round" />
        <circle cx="37" cy="80" r="10" fill="var(--art-sun)" /><circle cx="37" cy="118" r="10" fill="var(--art-lilac)" /><circle cx="37" cy="153" r="10" fill="var(--art-accent)" />
        <path d="M61 79h61m-61 38h45m-45 36h54" strokeLinecap="round" />
      </g>
      <g transform="translate(311 207)"><circle r="34" fill="var(--art-sun)" stroke="var(--art-line)" strokeWidth="2" /><path d="M0-20V0l13 8" stroke="var(--art-line)" strokeWidth="3" strokeLinecap="round" /></g>
    </> : scene === "saved" ? <>
      <g transform="translate(168 87) rotate(-6 80 90)" stroke="var(--art-line)" strokeWidth="2">
        <rect width="161" height="187" rx="15" fill="var(--art-paper)" />
        <rect x="15" y="17" width="131" height="90" rx="8" fill="var(--art-lilac)" />
        <path d="M20 93c25-44 44-39 64-5 15-23 33-31 55 5" fill="var(--art-sun)" />
        <path d="M24 133h111m-111 20h82" strokeLinecap="round" />
        <path d="m115-6 29 2-3 58-14-12-15 11 3-59Z" fill="var(--art-accent)" />
      </g>
    </> : scene === "insights" ? <>
      <g stroke="var(--art-line)" strokeWidth="2">
        <path d="m240 169-68-70m68 70 81-49m-81 49 71 69m-71-69-77 67" strokeDasharray="5 5" />
        <circle cx="240" cy="169" r="43" fill="var(--art-paper)" />
        <circle cx="172" cy="99" r="25" fill="var(--art-lilac)" /><circle cx="321" cy="120" r="29" fill="var(--art-sun)" /><circle cx="311" cy="238" r="24" fill="var(--art-lilac)" /><circle cx="163" cy="236" r="27" fill="var(--art-sun)" />
        <path d="m240 145 7 16 18 2-13 12 4 18-16-9-16 9 4-18-13-12 18-2 7-16Z" fill="var(--art-accent)" />
      </g>
    </> : <>
      <PassportBook x={170} y={81} angle={-9} />
      <g className="illustration-ticket" transform="translate(284 185) rotate(12)">
        <path d="M0 0h93v25a8 8 0 0 0 0 16v25H0V41a8 8 0 0 0 0-16V0Z" fill="var(--art-paper)" stroke="var(--art-line)" strokeWidth="2" />
        <path d="M67 8v50" stroke="var(--art-line)" strokeDasharray="3 4" />
        <path d="m26 17 5 10 12 2-9 8 2 12-10-6-11 6 2-12-8-8 12-2 5-10Z" fill="var(--art-accent)" />
      </g>
    </>}
    <g className="illustration-sparkles" stroke="var(--art-accent)" strokeWidth="2.5" strokeLinecap="round">
      <path d="M87 102v15m-7-7h14M387 75v14m-7-7h14M118 132v8m-4-4h8" />
    </g>
  </svg>;
}

function PassportBook({ x, y, angle, secondary = false }: { x: number; y: number; angle: number; secondary?: boolean }) {
  return <g transform={`translate(${x} ${y}) rotate(${angle} 65 90)`} stroke="var(--art-line)" strokeWidth="2">
    <rect x="7" y="5" width="130" height="180" rx="14" fill="var(--art-paper)" />
    <rect width="130" height="180" rx="14" fill={secondary ? "var(--art-lilac)" : "var(--art-passport)"} />
    <rect x="10" y="10" width="110" height="160" rx="7" stroke={secondary ? "var(--art-line)" : "var(--art-sun)"} opacity=".55" />
    <g stroke={secondary ? "var(--art-line)" : "var(--art-paper)"}>
      <circle cx="65" cy="77" r="27" /><ellipse cx="65" cy="77" rx="12" ry="27" /><path d="M38 77h54m-49-15h44m-44 30h44" />
      <path d="M37 128h56m-45 13h34" strokeLinecap="round" />
    </g>
  </g>;
}

export function CategoryIllustration({ section }: { section: Section }) {
  const food = section === "Eat";
  const coffee = section === "Coffee";
  const screen = section === "Movies" || section === "Shows";
  const sound = section === "Music" || section === "Podcasts";
  const book = section === "Books";
  return <svg className="category-illustration" viewBox="0 0 360 200" fill="none" aria-hidden="true" focusable="false">
    <circle cx="276" cy="48" r="67" fill="var(--art-sun)" opacity=".6" />
    <path d="M0 172c66-41 118-30 171-7 62 26 125-31 189-7v42H0v-28Z" fill="var(--art-lilac)" />
    <g stroke="var(--art-line)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {food ? <>
        <ellipse cx="186" cy="165" rx="79" ry="10" fill="var(--art-shadow)" stroke="none" />
        <path d="M114 119h144c-5 38-28 53-72 53s-67-15-72-53Z" fill="var(--art-paper)" />
        <path d="M115 119c1-27 37-48 71-48s69 21 71 48" fill="var(--art-accent)" /><path d="m163 97 13-8m25 13 13-10m-29 19 13-8" stroke="var(--art-paper)" />
        <path className="illustration-steam" d="M162 57c-12-13 9-16 0-30m25 32c-12-13 9-16 0-30m25 31c-12-13 9-16 0-30" opacity=".65" />
        <path d="M82 83v70m-8-70v24c0 10 16 10 16 0V83m198 2v68m0-68c-11 9-14 30 0 31" />
      </> : coffee ? <>
        <ellipse cx="174" cy="167" rx="81" ry="9" fill="var(--art-shadow)" stroke="none" />
        <path d="M112 80h119v26c0 33-22 57-60 57s-59-24-59-57V80Z" fill="var(--art-paper)" />
        <path d="M232 91h16c38 0 28 53-22 44" /><ellipse cx="171" cy="80" rx="59" ry="13" fill="var(--art-accent)" /><path d="M97 169h152" />
        <path className="illustration-steam" d="M148 52c-17-15 16-17 0-34m29 37c-17-15 16-17 0-34m29 30c-17-15 16-17 0-34" opacity=".65" />
      </> : screen ? <>
        <rect x="95" y="30" width="174" height="115" rx="9" fill="var(--art-passport)" />
        <path d="m164 57 43 27-43 27V57Z" fill="var(--art-sun)" stroke="none" />
        <path d="M104 48h8m-8 19h8m-8 19h8m-8 19h8m-8 19h8m139-76h8m-8 19h8m-8 19h8m-8 19h8m-8 19h8" stroke="var(--art-paper)" />
        <path d="M108 183v-23c0-20 44-20 44 0v23m12 0v-23c0-20 44-20 44 0v23m12 0v-23c0-20 44-20 44 0v23" fill="var(--art-accent)" />
      </> : sound ? <>
        <circle cx="177" cy="99" r="70" fill="var(--art-passport)" /><circle cx="177" cy="99" r="53" stroke="var(--art-lilac)" opacity=".45" /><circle cx="177" cy="99" r="35" stroke="var(--art-lilac)" opacity=".45" /><circle cx="177" cy="99" r="18" fill="var(--art-sun)" /><circle cx="177" cy="99" r="4" fill="var(--art-line)" />
        <path d="M264 56v75c-24-9-40 18-19 22 11 1 19-8 19-22m0-75 26-8v22l-26 8" fill="var(--art-accent)" />
        <path d="m79 60-10 10m9 23H63m22 22-12 10" />
      </> : book ? <>
        <path d="M79 62c35-15 69-12 101 8 32-20 66-23 101-8v105c-35-15-69-12-101 8-32-20-66-23-101-8V62Z" fill="var(--art-paper)" /><path d="M180 70v105m-81-91c20-5 38-2 61 9m-61 10c20-5 38-2 61 9m-61 10c20-5 38-2 61 9m40-38c23-11 41-14 61-9m-61 28c23-11 41-14 61-9" />
        <path d="M234 57v71l13-10 13 8V56" fill="var(--art-accent)" />
      </> : section === "Games" ? <>
        <path d="M130 68h100c20 0 42 71 20 89-15 12-32-28-46-28h-48c-14 0-31 40-46 28-22-18 0-89 20-89Z" fill="var(--art-paper)" />
        <path d="M139 88v33m-16-17h33" strokeWidth="6" /><circle cx="218" cy="96" r="6" fill="var(--art-accent)" /><circle cx="236" cy="113" r="6" fill="var(--art-passport)" />
        <path d="M180 68V43c0-17 27-15 27-31" />
      </> : section === "Brands" || section === "Lifestyle" ? <>
        <path d="m133 42 30-10c9 17 26 17 35 0l30 10 37 42-25 23-21-22v82H142V85l-21 22-25-23 37-42Z" fill="var(--art-paper)" />
        <path d="M142 113h77v26h-77" fill="var(--art-lilac)" /><path d="M163 32c2 35 33 35 35 0" />
        <path d="m270 141 18-13 17 12-18 25-17-24Z" fill="var(--art-accent)" />
      </> : section === "People" ? <>
        <rect x="108" y="27" width="144" height="155" rx="12" fill="var(--art-paper)" /><circle cx="180" cy="82" r="27" fill="var(--art-sun)" /><path d="M129 159v-4c0-51 102-51 102 0v4H129Z" fill="var(--art-lilac)" /><path d="M159 69c7-27 46-25 48 5" fill="var(--art-passport)" />
        <path d="m272 71 6 13 15 2-11 10 3 14-13-7-13 7 3-14-11-10 15-2 6-13Z" fill="var(--art-accent)" />
      </> : section === "Destinations" ? <>
        <path d="m91 55 60-18 59 18 60-18v124l-60 18-59-18-60 18V55Z" fill="var(--art-paper)" /><path d="M151 37v124m59-106v124" />
        <path d="M131 135c28-47 54 16 83-36" stroke="var(--art-accent)" strokeDasharray="4 6" />
        <path d="M233 52c-34 0-35 39 0 66 35-27 34-66 0-66Z" fill="var(--art-accent)" /><circle cx="233" cy="77" r="10" fill="var(--art-paper)" />
      </> : <>
        <path d="m99 88 81-47 81 47H99Z" fill="var(--art-accent)" /><path d="M90 167h180v14H90v-14Zm15-17h150v17H105v-17Z" fill="var(--art-paper)" />
        {[117, 153, 189, 225].map(x => <path key={x} d={`M${x} 94h18v56h-18V94Z`} fill="var(--art-paper)" />)}
        <path d="m286 107 5 10 12 2-9 8 2 12-10-6-11 6 2-12-8-8 12-2 5-10Z" fill="var(--art-sun)" />
      </>}
    </g>
    <g stroke="var(--art-accent)" strokeWidth="2" strokeLinecap="round"><path d="M53 42v12m-6-6h12M312 119v10m-5-5h10" /></g>
  </svg>;
}
