"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SearchBar({ defaultValue }: { defaultValue: string }) {
  const { push } = useRouter();
  const [show_loading, setShowLoading] = useState(false);

  useEffect(() => {
    setShowLoading(false);
  }, [defaultValue]);

  return (
    <form
      onSubmit={async (e: any) => {
        e.preventDefault();
        const new_slug = encodeURIComponent(e.target[0]?.value);
        setShowLoading(true);
        push(`/${new_slug}`);
      }}
      className="w-full px-4 py-2 max-w-[420px] gap-2 row-fs-c"
    >
      <div className="flex-1 relative">
        <input
          defaultValue={defaultValue}
          className="w-full px-2 text-md font-medium bg-gray-100 h-9 rounded-lg text-gray-800"
        />
        <button
          type="submit"
          className="absolute row-c-c top-0 opacity-50 fill-gray-500 right-0 h-9 w-9 [&_svg]:h-4 [&_svg]:w-4"
        >
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12C0 18.627 5.373 24 12 24C18.627 24 24 18.627 24 12C24 5.373 18.627 0 12 0ZM13.414 12C13.414 12 16.553 15.139 16.707 15.293C17.098 15.684 17.098 16.317 16.707 16.707C16.316 17.098 15.683 17.098 15.293 16.707C15.139 16.554 12 13.414 12 13.414C12 13.414 8.861 16.553 8.707 16.707C8.316 17.098 7.683 17.098 7.293 16.707C6.902 16.316 6.902 15.683 7.293 15.293C7.446 15.139 10.586 12 10.586 12C10.586 12 7.447 8.861 7.293 8.707C6.902 8.316 6.902 7.683 7.293 7.293C7.684 6.902 8.317 6.902 8.707 7.293C8.861 7.446 12 10.586 12 10.586C12 10.586 15.139 7.447 15.293 7.293C15.684 6.902 16.317 6.902 16.707 7.293C17.098 7.684 17.098 8.317 16.707 8.707C16.554 8.861 13.414 12 13.414 12Z" />
          </svg>
        </button>
      </div>
      <button
        type="submit"
        className="px-3 h-9 rounded-lg font-semibold text-md bg-[#179ADE] text-white"
      >
        {show_loading ? "Loading..." : "Search"}
      </button>
    </form>
  );
}
