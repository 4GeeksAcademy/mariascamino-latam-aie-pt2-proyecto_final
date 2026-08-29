export function LoadingState({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-slate-500">
      {label}
    </div>
  );
}