export default function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto animate-pulse">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="p-3">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="p-3">
                  <div className="h-4 bg-gray-100 rounded w-24"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}