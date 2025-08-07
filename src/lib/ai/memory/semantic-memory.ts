// Enhanced Semantic Memory Management System
import { getUserMemory, updateUserMemory } from "@/lib/ai/memory";
import type { MemoryEntry } from "@/types/ai";

export interface SemanticMemoryEntry extends MemoryEntry {
  importance: number; // 0-1 scale
  lastAccessed: string;
  accessCount: number;
  embedding?: number[]; // For future vector search
  categories: string[];
  relatedEntries: string[];
}

export interface MemoryImportanceFactors {
  recency: number;
  frequency: number;
  emotional: number;
  context: number;
}

export class SemanticMemoryManager {
  private static readonly MAX_MEMORIES = 1000;
  private static readonly PRUNING_THRESHOLD = 0.3;

  /**
   * Store memory with automatic importance calculation
   */
  static async storeMemory(
    userId: string,
    key: string,
    value: unknown,
    context?: string,
    categories: string[] = []
  ): Promise<void> {
    const importance = this.calculateImportance(value, context, categories);

    const memoryEntry: SemanticMemoryEntry = {
      key,
      value,
      timestamp: new Date().toISOString(),
      context,
      importance,
      lastAccessed: new Date().toISOString(),
      accessCount: 1,
      categories,
      relatedEntries: [],
    };

    // Get existing memories
    const existingMemory = await getUserMemory(userId);
    const memories = existingMemory?.memory || {};

    // Add new memory
    memories[key] = memoryEntry;

    // Prune if necessary
    const prunedMemories = await this.pruneMemories(memories);

    // Update database
    await updateUserMemory(userId, prunedMemories);
  }

  /**
   * Retrieve relevant memories with semantic understanding
   */
  static async getRelevantMemories(
    userId: string,
    context: string,
    limit: number = 5
  ): Promise<Record<string, SemanticMemoryEntry>> {
    const userMemory = await getUserMemory(userId);
    if (!userMemory) return {};

    const memories = userMemory.memory as Record<string, SemanticMemoryEntry>;

    // Score memories for relevance
    const scoredMemories = Object.entries(memories)
      .map(([key, memory]) => ({
        key,
        memory,
        relevanceScore: this.calculateRelevanceScore(memory, context),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    // Update access counts
    const updatedMemories: Record<string, SemanticMemoryEntry> = {};
    scoredMemories.forEach(({ key, memory }) => {
      const updated = { ...memory };
      updated.lastAccessed = new Date().toISOString();
      updated.accessCount = (updated.accessCount || 0) + 1;
      updatedMemories[key] = updated;
      memories[key] = updated; // Update in original object
    });

    // Save updated access patterns
    if (scoredMemories.length > 0) {
      await updateUserMemory(userId, memories);
    }

    return updatedMemories;
  }

  /**
   * Calculate memory importance based on multiple factors
   */
  private static calculateImportance(
    value: unknown,
    context?: string,
    categories: string[] = []
  ): number {
    let importance = 0.5; // Base importance

    // Content-based importance
    const valueStr = String(value).toLowerCase();

    // High importance keywords
    const highImportanceKeywords = [
      "password",
      "important",
      "urgent",
      "deadline",
      "meeting",
      "appointment",
      "birthday",
      "anniversary",
      "address",
      "phone",
    ];

    const hasHighImportanceKeyword = highImportanceKeywords.some((keyword) =>
      valueStr.includes(keyword)
    );

    if (hasHighImportanceKeyword) importance += 0.3;

    // Category-based importance
    const importantCategories = ["personal", "work", "health", "finance"];
    const hasImportantCategory = categories.some((cat) =>
      importantCategories.includes(cat.toLowerCase())
    );

    if (hasImportantCategory) importance += 0.2;

    // Context-based importance
    if (context && context.length > 50) {
      importance += 0.1; // Rich context suggests importance
    }

    // Emotional content detection
    const emotionalKeywords = [
      "love",
      "hate",
      "excited",
      "worried",
      "happy",
      "sad",
      "frustrated",
      "proud",
      "grateful",
      "anxious",
    ];

    const hasEmotionalContent = emotionalKeywords.some((keyword) =>
      valueStr.includes(keyword)
    );

    if (hasEmotionalContent) importance += 0.2;

    return Math.min(importance, 1.0);
  }

  /**
   * Calculate relevance score for memory retrieval
   */
  private static calculateRelevanceScore(
    memory: SemanticMemoryEntry,
    context: string
  ): number {
    const contextLower = context.toLowerCase();
    const memoryText = `${memory.key} ${String(memory.value)} ${
      memory.context || ""
    }`.toLowerCase();

    let score = 0;

    // Keyword matching
    const contextWords = contextLower
      .split(/\s+/)
      .filter((word) => word.length > 2);
    const memoryWords = memoryText
      .split(/\s+/)
      .filter((word) => word.length > 2);

    const matchingWords = contextWords.filter((word) =>
      memoryWords.some(
        (memoryWord) => memoryWord.includes(word) || word.includes(memoryWord)
      )
    );

    const keywordScore =
      matchingWords.length / Math.max(contextWords.length, 1);
    score += keywordScore * 0.4;

    // Recency bonus
    const daysSinceCreated =
      (Date.now() - new Date(memory.timestamp).getTime()) /
      (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceCreated / 30); // 30-day decay
    score += recencyScore * 0.2;

    // Importance bonus
    score += memory.importance * 0.3;

    // Access frequency bonus
    const accessScore = Math.min(memory.accessCount / 10, 1); // Normalize to 0-1
    score += accessScore * 0.1;

    return score;
  }

  /**
   * Prune old and low-importance memories
   */
  private static async pruneMemories(
    memories: Record<string, MemoryEntry>
  ): Promise<Record<string, MemoryEntry>> {
    const memoryEntries = Object.entries(memories) as [
      string,
      SemanticMemoryEntry
    ][];

    if (memoryEntries.length <= this.MAX_MEMORIES) {
      return memories;
    }

    // Calculate composite scores for pruning
    const scoredMemories = memoryEntries.map(([key, memory]) => {
      const daysSinceAccessed =
        (Date.now() -
          new Date(memory.lastAccessed || memory.timestamp).getTime()) /
        (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - daysSinceAccessed / 90); // 90-day decay
      const accessScore = Math.min((memory.accessCount || 1) / 20, 1);

      const compositeScore =
        memory.importance * 0.4 + recencyScore * 0.3 + accessScore * 0.3;

      return { key, memory, compositeScore };
    });

    // Keep the top memories
    const keptMemories = scoredMemories
      .filter((item) => item.compositeScore >= this.PRUNING_THRESHOLD)
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, this.MAX_MEMORIES)
      .reduce((acc, item) => {
        acc[item.key] = item.memory;
        return acc;
      }, {} as Record<string, MemoryEntry>);

    console.log(
      `Pruned memories: ${memoryEntries.length} -> ${
        Object.keys(keptMemories).length
      }`
    );

    return keptMemories;
  }

  /**
   * Analyze memory patterns for insights
   */
  static async analyzeMemoryPatterns(userId: string): Promise<{
    totalMemories: number;
    categories: Record<string, number>;
    importanceDistribution: { high: number; medium: number; low: number };
    oldestMemory: string;
    mostAccessed: string;
  }> {
    const userMemory = await getUserMemory(userId);
    if (!userMemory) {
      return {
        totalMemories: 0,
        categories: {},
        importanceDistribution: { high: 0, medium: 0, low: 0 },
        oldestMemory: "",
        mostAccessed: "",
      };
    }

    const memories = Object.values(userMemory.memory) as SemanticMemoryEntry[];

    // Category analysis
    const categories: Record<string, number> = {};
    memories.forEach((memory) => {
      memory.categories?.forEach((cat) => {
        categories[cat] = (categories[cat] || 0) + 1;
      });
    });

    // Importance distribution
    const importanceDistribution = memories.reduce(
      (dist, memory) => {
        if (memory.importance >= 0.7) dist.high++;
        else if (memory.importance >= 0.4) dist.medium++;
        else dist.low++;
        return dist;
      },
      { high: 0, medium: 0, low: 0 }
    );

    // Oldest and most accessed
    const sortedByAge = [...memories].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const sortedByAccess = [...memories].sort(
      (a, b) => (b.accessCount || 0) - (a.accessCount || 0)
    );

    return {
      totalMemories: memories.length,
      categories,
      importanceDistribution,
      oldestMemory: sortedByAge[0]?.key || "",
      mostAccessed: sortedByAccess[0]?.key || "",
    };
  }
}
