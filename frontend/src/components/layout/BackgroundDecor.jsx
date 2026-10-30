// Soft, slowly drifting colour blobs behind every page (purely decorative)
export default function BackgroundDecor() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full bg-violet-300/35 blur-[110px] animate-drift" />
      <div
        className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full bg-fuchsia-300/25 blur-[120px] animate-drift"
        style={{ animationDelay: "-8s" }}
      />
      <div
        className="absolute -bottom-48 left-1/4 w-[600px] h-[480px] rounded-full bg-orange-200/35 blur-[120px] animate-drift"
        style={{ animationDelay: "-15s" }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(rgb(124 58 237 / 0.10) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
    </div>
  );
}
