-- AI Integration Refactor Database Migration
-- This migration adds new tables for enhanced AI system

-- New table for intent analyses
CREATE TABLE IF NOT EXISTS intent_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  input_text TEXT NOT NULL,
  detected_intent JSONB NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  language VARCHAR(10),
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries by user and time
CREATE INDEX IF NOT EXISTS idx_intent_analyses_user_time ON intent_analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_analyses_confidence ON intent_analyses(confidence DESC);

-- New table for semantic memories
CREATE TABLE IF NOT EXISTS semantic_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  key TEXT NOT NULL,
  content TEXT NOT NULL,
  context JSONB,
  importance DECIMAL(3,2) DEFAULT 0.5,
  relevance DECIMAL(3,2) DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  semantic_embedding JSONB, 
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for semantic memories
CREATE INDEX IF NOT EXISTS idx_semantic_memories_user ON semantic_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_key ON semantic_memories(key);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_relevance ON semantic_memories(relevance DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_memories_importance ON semantic_memories(importance DESC);

-- Optional: Add index for semantic similarity search (if using pgvector extension)
-- CREATE INDEX IF NOT EXISTS semantic_memories_embedding_idx ON semantic_memories USING ivfflat (semantic_embedding vector_cosine_ops);

-- New table for learning interactions
CREATE TABLE IF NOT EXISTS learning_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  intent JSONB NOT NULL,
  response TEXT NOT NULL,
  satisfaction INTEGER CHECK (satisfaction >= 1 AND satisfaction <= 5),
  outcome JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for learning interactions
CREATE INDEX IF NOT EXISTS idx_learning_interactions_user ON learning_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_satisfaction ON learning_interactions(satisfaction);
CREATE INDEX IF NOT EXISTS idx_learning_interactions_time ON learning_interactions(created_at DESC);

-- New table for integration context cache
CREATE TABLE IF NOT EXISTS integration_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  integration_type TEXT NOT NULL,
  context_data JSONB NOT NULL,
  relevance_score DECIMAL(3,2) DEFAULT 0.5,
  last_accessed TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for integration context cache
CREATE INDEX IF NOT EXISTS idx_integration_context_user_type ON integration_context_cache(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_context_expires ON integration_context_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_integration_context_relevance ON integration_context_cache(relevance_score DESC);

-- New table for AI performance metrics
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  operation_type TEXT NOT NULL, -- 'intent_analysis', 'entity_extraction', 'integration_detection', etc.
  latency_ms INTEGER NOT NULL,
  token_usage INTEGER,
  cost_usd DECIMAL(10,6),
  accuracy DECIMAL(3,2),
  user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for AI performance metrics
CREATE INDEX IF NOT EXISTS idx_ai_performance_user ON ai_performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_performance_type ON ai_performance_metrics(operation_type);
CREATE INDEX IF NOT EXISTS idx_ai_performance_time ON ai_performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_performance_latency ON ai_performance_metrics(latency_ms);

-- New table for language processing cache
CREATE TABLE IF NOT EXISTS language_processing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_hash TEXT UNIQUE NOT NULL, -- Hash of the input text
  input_text TEXT NOT NULL,
  language_info JSONB NOT NULL,
  time_expressions JSONB,
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for language processing cache
CREATE INDEX IF NOT EXISTS idx_language_cache_hash ON language_processing_cache(input_hash);
CREATE INDEX IF NOT EXISTS idx_language_cache_time ON language_processing_cache(created_at DESC);

-- New table for context understanding insights
CREATE TABLE IF NOT EXISTS context_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  conversation_id TEXT,
  insight_type TEXT NOT NULL, -- 'preference', 'pattern', 'intent', 'emotion', 'urgency'
  insight_value TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  reasoning TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for context insights
CREATE INDEX IF NOT EXISTS idx_context_insights_user ON context_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_context_insights_type ON context_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_context_insights_confidence ON context_insights(confidence DESC);

-- Add comments for documentation
COMMENT ON TABLE intent_analyses IS 'Stores AI-powered intent analysis results for user inputs';
COMMENT ON TABLE semantic_memories IS 'Stores semantic memories with embeddings for intelligent retrieval';
COMMENT ON TABLE learning_interactions IS 'Stores user interactions for learning and adaptation';
COMMENT ON TABLE integration_context_cache IS 'Caches integration context data for performance optimization';
COMMENT ON TABLE ai_performance_metrics IS 'Tracks AI system performance and costs';
COMMENT ON TABLE language_processing_cache IS 'Caches language processing results for repeated inputs';
COMMENT ON TABLE context_insights IS 'Stores insights derived from conversation context analysis';

-- Create a function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM integration_context_cache WHERE expires_at < NOW();
  DELETE FROM language_processing_cache WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create a function to update semantic memory access count
CREATE OR REPLACE FUNCTION update_memory_access(memory_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE semantic_memories 
  SET access_count = access_count + 1, 
      last_accessed = NOW(),
      updated_at = NOW()
  WHERE id = memory_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate average user satisfaction
CREATE OR REPLACE FUNCTION get_user_satisfaction_avg(user_id_param TEXT, days_back INTEGER DEFAULT 30)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  avg_satisfaction DECIMAL(3,2);
BEGIN
  SELECT AVG(user_satisfaction) INTO avg_satisfaction
  FROM learning_interactions
  WHERE user_id = user_id_param 
    AND created_at > NOW() - (days_back || ' days')::INTERVAL
    AND user_satisfaction IS NOT NULL;
  
  RETURN COALESCE(avg_satisfaction, 0.0);
END;
$$ LANGUAGE plpgsql;

-- Create a function to get relevant memories for a user
CREATE OR REPLACE FUNCTION get_relevant_memories(user_id_param TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  key TEXT,
  content TEXT,
  relevance DECIMAL(3,2),
  importance DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT sm.id, sm.key, sm.content, sm.relevance, sm.importance
  FROM semantic_memories sm
  WHERE sm.user_id = user_id_param
  ORDER BY (sm.relevance + sm.importance) / 2 DESC, sm.access_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
