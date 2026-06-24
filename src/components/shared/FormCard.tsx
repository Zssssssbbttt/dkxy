export default function FormCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card mb-1" style={{ backgroundColor: "#fdfdfd" }}>
      <h2
        className="text-lg font-semibold px-4 py-3 border-b flex items-center"
        style={{
          color: "#333",
          borderColor: "#d6e0ff",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        <span
          className="inline-block w-[3px] h-[14px] mr-2 rounded"
          style={{ backgroundColor: "#2853e0" }}
        />
        {title}
      </h2>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}