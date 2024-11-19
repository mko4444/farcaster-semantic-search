import { Cast } from "@neynar/nodejs-sdk/build/neynar-api/v2";
import supabase from "@/lib/supabase";
import client from "@/lib/neynar";
import openai from "@/lib/openai";
import dayjs from "@/lib/dayjs";
import Image from "next/image";
import { uniq } from "lodash";
import Link from "next/link";
import { abbreviateDate } from "@/utils/abbreviate_date";

export default async function Page({
  params,
}: {
  params: Promise<{ query: string }>;
}) {
  /** Embed the query */
  const query_embedding = await _embedQuery((await params).query);

  /** Call the search_casts function in supabase */
  const { data = [] } = await supabase.rpc("search_casts", {
    query_embedding,
    match_threshold: 0.4,
    match_count: 100,
  });

  if (!data?.length) {
    throw new Error("No casts found");
  }

  if (data?.length === 0) {
    return (
      <div className="w-full h-full max-w-[420px] px-4 gap-2 col">
        <span className="text-gray-700">No casts found</span>
      </div>
    );
  } else {
    /** Get the array of hashes */
    const hashes: string[] = data?.map(({ hash }: Cast) => hash) ?? [];

    /** Hydrate all casts */
    const { result } = await client.fetchBulkCasts(hashes, {});

    /** get the parent author */
    const parent_fids = uniq(
      result.casts.map((cast) => cast.parent_author.fid)
    );

    const parents = await client.fetchBulkUsers(parent_fids.filter(Boolean));

    function _parent(fid: number) {
      return parents.users.find((p) => p.fid === fid);
    }

    return (
      <div className="w-full h-full max-w-[420px] px-4 gap-2 col">
        {result.casts
          .sort((a: Cast, b: Cast) =>
            dayjs(b.timestamp).isBefore(a.timestamp) ? -1 : 1
          )
          .map(({ text, author, hash, timestamp, parent_author }: Cast) => (
            <Link
              key={hash}
              href={`https://warpcast.com/${author.username}/${hash.slice(
                0,
                10
              )}`}
              target="_blank"
              className="w-full grid grid-cols-[36px_1fr] leading-5 rounded-xl p-2 gap-2 text-gray-700 border-2 hover:border-gray-200 transition-all border-gray-100"
            >
              <div className="h-9 w-9 relative overflow-hidden rounded-full">
                <Image
                  alt={author.username}
                  src={author.pfp_url ?? "/logo.png"}
                  fill
                  sizes="36"
                />
              </div>
              <div className="flex-1 col">
                <div className="text-sm fill-gray-700 [&_svg]:h-3 [&_svg]:w-3 row-fs-c">
                  <span className="font-bold">{author.display_name}</span>
                  <div className="w-[3px]" />
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <path d="M14 7C14 3.13401 10.866 0 7 0C3.13401 0 0 3.13401 0 7C0 10.866 3.13401 14 7 14C10.866 14 14 10.866 14 7ZM2.95312 7.875L7.875 2.51562L7.21875 6.125H10.9375L6.01562 11.7031L6.78125 7.875H2.95312Z" />
                  </svg>
                  <span className="font-regular text-gray-500 ml-1">
                    @{author.username} • {abbreviateDate(timestamp)}
                  </span>
                </div>
                {parent_author?.fid && (
                  <span className="text-xs text-gray-500">
                    Replying to{" "}
                    <span className="font-semibold text-[#179ADE]">
                      {_parent(parent_author.fid)
                        ? `@${_parent(parent_author.fid)?.username}`
                        : `!${parent_author.fid}`}
                    </span>
                    &apos;s cast
                  </span>
                )}
                <p className="text-sm w-full text-gray-700 break-words">
                  {text}
                </p>
              </div>
            </Link>
          ))}
      </div>
    );
  }
}

function _embedQuery(input: string) {
  /** Grab the text and embed it */
  return openai.embeddings
    .create({ input, model: "text-embedding-3-small" })
    .then((res) => res.data[0].embedding);
}
