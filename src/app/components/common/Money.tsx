export function formatPeso(amount: number, { allowNegative = false } = {}): string {
  const value = allowNegative ? amount : Math.max(amount, 0);
  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function Money({
  amount,
  allowNegative = false,
  className,
}: {
  amount: number;
  allowNegative?: boolean;
  className?: string;
}) {
  return <span className={className}>{formatPeso(amount, { allowNegative })}</span>;
}
