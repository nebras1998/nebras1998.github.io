export default function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200 p-5 ${className}`}>
      {children}
    </div>
  );
}
