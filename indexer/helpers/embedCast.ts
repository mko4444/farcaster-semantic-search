import { Cast } from "@neynar/nodejs-sdk/build/neynar-api/v2";
import openai from "@/lib/openai";

export async function embedCast({ text }: Cast) {
  if (!text.trim()) {
    return [];
  }
  /** Grab the text and embed it */
  try {
    const res: any = await Promise.race([
      openai.embeddings.create({
        input: text,
        model: "text-embedding-3-small",
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 10000)
      ),
    ]);

    return res.data[0].embedding;
  } catch (e) {
    return [];
  }
}
