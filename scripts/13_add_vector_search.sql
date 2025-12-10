-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Add embedding column to t_missions1
alter table t_missions1 
add column if not exists embedding vector(768);

-- Add embedding column to t_missions2
alter table t_missions2 
add column if not exists embedding vector(768);

-- Create a function to search for similar missions
create or replace function match_missions (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  similarity float,
  source_table text
)
language plpgsql
as $$
begin
  return query
  select
    id,
    f_title::text as title,
    1 - (embedding <=> query_embedding) as similarity,
    't_missions1' as source_table
  from t_missions1
  where 1 - (embedding <=> query_embedding) > match_threshold
  union all
  select
    id,
    f_title::text as title,
    1 - (embedding <=> query_embedding) as similarity,
    't_missions2' as source_table
  from t_missions2
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;
