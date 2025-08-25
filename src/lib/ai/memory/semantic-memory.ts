// Enhanced Semantic Memory Management System
import { query } from "@/lib/db";
import { withRetry } from "@/lib/ai/resilience/error-handler";
import type { MemoryEntry } from "@/types/understanding";

export interface SemanticMemoryRequest {
  userId: string;
  query: string;
  limit?: number;
  minRelevance?: number;
}

export interface SemanticMemoryResponse {
  memories: MemoryEntry[];
  totalFound: number;
  averageRelevance: number;
  processingTime: number;
}

export interface StoreMemoryRequest {
  userId: string;
  key: string;
  content: string;
  context?: Record<string, unknown>;
  importance?: number;
  relevance?: number;
}

export interface StoreMemoryResponse {
  success: boolean;
  memoryId: string;
  processingTime: number;
}

export class SemanticMemoryManager {
  private static instance: SemanticMemoryManager;

  private constructor() {}

  public static getInstance(): SemanticMemoryManager {
    if (!SemanticMemoryManager.instance) {
      SemanticMemoryManager.instance = new SemanticMemoryManager();
    }
    return SemanticMemoryManager.instance;
  }

  /**
   * Store a new semantic memory entry
   */
  public async storeMemory(
    request: StoreMemoryRequest
  ): Promise<StoreMemoryResponse> {
    const startTime = Date.now();

    try {
      const result = await withRetry(
        async () => {
          const sql = `
            INSERT INTO semantic_memories (
              user_id, key, content, context, importance, relevance
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `;

          const values = [
            request.userId,
            request.key,
            request.content,
            JSON.stringify(request.context || {}),
            request.importance || 0.5,
            request.relevance || 0.5,
          ];

          return await query(sql, values);
        },
        "store-semantic-memory",
        { maxRetries: 3, baseDelayMs: 500, circuitBreaker: false }
      );

      const memoryId = result.rows[0]?.id;
      if (!memoryId) {
        throw new Error("Failed to store memory - no ID returned");
      }

      console.log(
        `✅ Semantic memory stored: ${memoryId} for user ${request.userId}`
      );

      return {
        success: true,
        memoryId,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("❌ Failed to store semantic memory:", error);
      return {
        success: false,
        memoryId: "",
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Retrieve relevant memories using AI-powered semantic search
   */
  public async retrieveRelevantMemories(
    request: SemanticMemoryRequest
  ): Promise<SemanticMemoryResponse> {
    const startTime = Date.now();

    try {
      // Use the database function for semantic memory retrieval
      const result = await withRetry(
        async () => {
          const sql = `
            SELECT * FROM get_relevant_memories($1, $2)
          `;

          const values = [request.userId, request.limit || 10];

          return await query(sql, values);
        },
        "retrieve-semantic-memories",
        { maxRetries: 3, baseDelayMs: 500, circuitBreaker: false }
      );

      const memories: MemoryEntry[] = result.rows.map((row) => ({
        id: row.id,
        key: row.key,
        content: row.content,
        relevance: row.relevance,
        importance: row.importance,
        context: {},
        accessCount: 0,
        lastAccessed: new Date(),
      }));

      // Filter by minimum relevance if specified
      const filteredMemories = request.minRelevance
        ? memories.filter((memory) => memory.relevance >= request.minRelevance!)
        : memories;

      const averageRelevance =
        filteredMemories.length > 0
          ? filteredMemories.reduce(
              (sum, memory) => sum + memory.relevance,
              0
            ) / filteredMemories.length
          : 0;

      console.log(
        `✅ Retrieved ${filteredMemories.length} relevant memories for user ${request.userId}`
      );

      return {
        memories: filteredMemories,
        totalFound: filteredMemories.length,
        averageRelevance,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("❌ Failed to retrieve semantic memories:", error);
      return {
        memories: [],
        totalFound: 0,
        averageRelevance: 0,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Update memory access count and relevance
   */
  public async updateMemoryAccess(memoryId: string): Promise<boolean> {
    try {
      await withRetry(
        async () => {
          const sql = `
            SELECT update_memory_access($1)
          `;
          return await query(sql, [memoryId]);
        },
        "update-memory-access",
        { maxRetries: 2, baseDelayMs: 300, circuitBreaker: false }
      );

      return true;
    } catch (error) {
      console.error("❌ Failed to update memory access:", error);
      return false;
    }
  }

  /**
   * Get user's average satisfaction from learning interactions
   */
  public async getUserSatisfaction(
    userId: string,
    daysBack: number = 30
  ): Promise<number> {
    try {
      const result = await withRetry(
        async () => {
          const sql = `
            SELECT get_user_satisfaction_avg($1, $2) as satisfaction
          `;
          return await query(sql, [userId, daysBack]);
        },
        "get-user-satisfaction",
        { maxRetries: 2, baseDelayMs: 300, circuitBreaker: false }
      );

      return result.rows[0]?.satisfaction || 0;
    } catch (error) {
      console.error("❌ Failed to get user satisfaction:", error);
      return 0;
    }
  }

  /**
   * Clean up expired cache entries
   */
  public async cleanupExpiredCache(): Promise<void> {
    try {
      await withRetry(
        async () => {
          const sql = `SELECT cleanup_expired_cache()`;
          return await query(sql);
        },
        "cleanup-expired-cache",
        { maxRetries: 2, baseDelayMs: 300, circuitBreaker: false }
      );

      console.log("✅ Cleaned up expired cache entries");
    } catch (error) {
      console.error("❌ Failed to cleanup expired cache:", error);
    }
  }

  /**
   * Get memory statistics for a user
   */
  public async getMemoryStats(userId: string): Promise<{
    totalMemories: number;
    averageRelevance: number;
    averageImportance: number;
    mostAccessedKey: string | null;
  }> {
    try {
      const result = await withRetry(
        async () => {
          const sql = `
            SELECT 
              COUNT(*) as total_memories,
              AVG(relevance) as avg_relevance,
              AVG(importance) as avg_importance,
              (SELECT key FROM semantic_memories 
               WHERE user_id = $1 
               ORDER BY access_count DESC, last_accessed DESC 
               LIMIT 1) as most_accessed_key
            FROM semantic_memories 
            WHERE user_id = $1
          `;
          return await query(sql, [userId]);
        },
        "get-memory-stats",
        { maxRetries: 2, baseDelayMs: 300, circuitBreaker: false }
      );

      const row = result.rows[0];
      return {
        totalMemories: parseInt(row.total_memories) || 0,
        averageRelevance: parseFloat(row.avg_relevance) || 0,
        averageImportance: parseFloat(row.avg_importance) || 0,
        mostAccessedKey: row.most_accessed_key || null,
      };
    } catch (error) {
      console.error("❌ Failed to get memory stats:", error);
      return {
        totalMemories: 0,
        averageRelevance: 0,
        averageImportance: 0,
        mostAccessedKey: null,
      };
    }
  }
}

// Export singleton instance
export const semanticMemoryManager = SemanticMemoryManager.getInstance();
