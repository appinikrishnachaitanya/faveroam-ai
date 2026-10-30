/** One shared, compressed sprite keeps the three decorative scenes inexpensive. */
export default function JourneyArt({scene}:{scene:'favourites'|'discover'|'together'}) {
  return <div className={`favourites-journey-art favourites-journey-${scene}`} aria-hidden="true" />;
}
