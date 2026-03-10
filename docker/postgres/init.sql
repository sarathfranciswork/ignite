-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS vector;       -- pgvector for semantic similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- Trigram indexing for fuzzy search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
