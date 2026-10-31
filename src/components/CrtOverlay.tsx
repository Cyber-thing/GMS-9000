export default function CrtOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden>
      <div className="crt-tint absolute inset-0" />
      <div className="crt-scanlines absolute inset-0 opacity-70" />
      <div className="crt-vignette absolute inset-0" />
    </div>
  );
}
