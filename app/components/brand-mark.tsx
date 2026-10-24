/** Original, decorative food-and-places mark. Scales cleanly from mobile to desktop. */
export default function BrandMark({size=34}:{size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
    <path d="M24 44S7 29.8 7 19a17 17 0 1 1 34 0c0 10.8-17 25-17 25Z" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" />
    <circle cx="24" cy="19" r="10.5" stroke="currentColor" strokeWidth="1.7" opacity=".55" />
    <path d="M17 13v7m-3-7v5a3 3 0 0 0 6 0v-5m-3 7v8m14-15c-5.5 0-6.5 4.5-6.5 8H31v-8Zm0 8v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
