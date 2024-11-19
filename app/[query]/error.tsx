"use client"; // Error boundaries must be Client Components

export default function Error() {
  return (
    <div className="max-w-[420px] w-full px-4">
      <div className="w-full col-c-c bg-gray-50 text-sm font-medium p-4 rounded-xl gap-2 col">
        <span className="text-gray-500">No casts found</span>
      </div>
    </div>
  );
}
