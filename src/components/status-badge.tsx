const statusStyles: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  RUNNING: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  PAUSED: "bg-yellow-50 text-yellow-700",
  SENT: "bg-green-50 text-green-700",
  DELIVERED: "bg-green-50 text-green-700",
  READ: "bg-emerald-50 text-emerald-700",
  RECEIVED: "bg-blue-50 text-blue-700",
  FAILED: "bg-red-50 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}
