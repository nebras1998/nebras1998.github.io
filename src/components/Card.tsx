export default function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-concrete-0 rounded-xl border border-concrete-200 p-5 ${className}`}>
      {children}
    </div>
  );
}
