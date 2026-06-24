export default function PageHeader({
  title,
  extra,
}: {
  title: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
        <span
          className="inline-block w-[3px] h-4 rounded"
          style={{ backgroundColor: "#2853e0" }}
        />
        {title}
      </h1>
      {extra}
    </div>
  );
}