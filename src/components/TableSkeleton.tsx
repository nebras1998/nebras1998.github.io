export default function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface-dim border-b border-border">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="p-4 text-right">
                <div className="h-3.5 bg-border rounded-lg w-20 animate-shimmer"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-border/50">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="p-4">
                  <div className="h-3.5 bg-surface-muted rounded-lg w-24 animate-shimmer" style={{ animationDelay: `${(r * cols + c) * 50}ms` }}></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
