# Overview

FSS is an open-sourced semantic search engine (indexer + frontend) for Farcaster. It allows you to find casts based on *semantic meaning* rather than keywords, which is how every other farcaster-related search project works today (including Warpcast).

The repo includes an indexer that keeps a record of embeddings for all casts made by power badge users. I used the power badge as a filter to reduce spam and lower the costs of running. The database of embeddings is not public, but if there is interest I can open source that too.

## Getting started

You'll need to create a database to store the embeddings. I recommend Supabase, and all instructions are given in the context of Supabase's SDK. Once you create the databse, run the following SQL function to create the tables and index:

```
CREATE OR REPLACE FUNCTION create_tables () RETURNS void AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS public.casts (
        hash text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        text text NULL,
        fid bigint NOT NULL,
        timestamp double precision NOT NULL,
        embedding public.vector(1536) NULL,
        CONSTRAINT casts_pkey PRIMARY KEY (hash)
    ) TABLESPACE pg_default;

    CREATE INDEX IF NOT EXISTS casts_embedding_hnsw_idx ON public.casts USING hnsw (embedding vector_cosine_ops) WITH (m='8', ef_construction='40') TABLESPACE pg_default;

    CREATE TABLE IF NOT EXISTS public.indexer_counter (
        id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
        last_ran_at double precision NULL,
        init_ran_at double precision NULL,
        CONSTRAINT indexer_counter_pkey PRIMARY KEY (id)
    ) TABLESPACE pg_default;
END;
$$ LANGUAGE plpgsql;

-- Call the function to create the tables
SELECT
  create_tables ();
```

Next, you'll need to define some environment variables. Create a `.env` file in the root of your project and enter the following:
```
OPENAI_API_KEY=""
DATABASE_URL=""
DIRECT_URL=""
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
NEYNAR_KEY=""
```

You can now start the indexer locally by running `npx tsx crons/hourly.ts`. New casts will index every hour, and older casts will start backfilling as soon as you run the function. Backfilling time can vary but will likely take a day or two. You can start querying as soon as the first hourly job runs.

I recommend deploying this project to railway so you don't have to keep it running locally. Make sure to add all your environment variables to the project, and change the custom start function to `npx tsx crons/hourly.ts`. Note that railway often throws a node version error, and if you run into that you can add the following env var to fix it:
```
NIXPACKS_NODE_VERSION=20
```

