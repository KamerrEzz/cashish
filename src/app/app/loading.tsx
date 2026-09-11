export default function AppLoading() {
  return (
    <div className="dash-enter space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-[var(--line)]" />
      <div className="h-4 w-72 max-w-full rounded bg-[var(--line)]" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-2xl bg-[var(--line)]/70" />
        <div className="h-24 rounded-2xl bg-[var(--line)]/70" />
        <div className="h-24 rounded-2xl bg-[var(--line)]/70" />
      </div>
      <div className="h-48 rounded-2xl bg-[var(--line)]/50" />
    </div>
  );
}
