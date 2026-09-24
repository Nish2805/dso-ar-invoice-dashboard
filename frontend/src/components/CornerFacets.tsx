// Decorative geometric facet pattern echoing the DIEZ template's corner graphic.
// Chrome only — purely decorative, never encodes data.
export function CornerFacets() {
  return (
    <>
      <svg
        className="pointer-events-none fixed bottom-0 left-0 h-40 w-64 opacity-90"
        viewBox="0 0 260 160"
        preserveAspectRatio="none"
        aria-hidden
      >
        <polygon points="0,160 0,60 90,160" fill="#0c2b3a" />
        <polygon points="0,60 0,160 130,160 60,90" fill="#12707a" opacity="0.85" />
        <polygon points="40,160 130,160 90,110" fill="#2a9d8f" opacity="0.6" />
        <polygon points="0,0 70,0 0,70" fill="#2a78d6" opacity="0.12" />
      </svg>
      <svg
        className="pointer-events-none fixed right-0 top-0 h-32 w-56 opacity-70"
        viewBox="0 0 220 130"
        preserveAspectRatio="none"
        aria-hidden
      >
        <polygon points="220,0 220,90 130,0" fill="#0c2b3a" opacity="0.9" />
        <polygon points="220,90 220,130 160,130 190,60" fill="#12707a" opacity="0.5" />
        <polygon points="150,0 220,0 220,55" fill="#2a9d8f" opacity="0.35" />
      </svg>
    </>
  )
}
