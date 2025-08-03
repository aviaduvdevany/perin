import { query } from "../db";
import { USERS_TABLE } from "../tables";
import type { MemoryEntry, UserMemory } from "../../types";
import type { User as DatabaseUser } from "../../types/database";

/**
 * Smart query function to get user memory from database
 */
export const getUserMemory = async (
  userId: string
): Promise<UserMemory | null> => {
  const sql = `
    SELECT memory, updated_at 
    FROM ${USERS_TABLE}
    WHERE id = $1
  `;

  try {
    const result = await query(sql, [userId]);
    const user = result.rows[0] as DatabaseUser | undefined;

    if (!user) {
      return null;
    }

    return {
      userId,
      memory: (user.memory as Record<string, MemoryEntry>) || {},
      lastUpdated: user.updated_at,
    };
  } catch (error) {
    console.error("Error getting user memory:", error);
    throw error;
  }
};

/**
 * Smart query function to update user memory in database
 */
export const updateUserMemory = async (
  userId: string,
  memoryUpdates: Record<string, MemoryEntry>
): Promise<boolean> => {
  const sql = `
    UPDATE ${USERS_TABLE}
    SET memory = COALESCE(memory, '{}'::jsonb) || $1::jsonb,
        updated_at = now()
    WHERE id = $2
  `;

  try {
    const result = await query(sql, [JSON.stringify(memoryUpdates), userId]);
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error("Error updating user memory:", error);
    throw error;
  }
};

/**
 * Smart query function to add a single memory entry
 */
export const addMemoryEntry = async (
  userId: string,
  key: string,
  value: unknown,
  context?: string
): Promise<boolean> => {
  const entry: MemoryEntry = {
    key,
    value,
    timestamp: new Date().toISOString(),
    context,
  };

  const memoryUpdate = { [key]: entry };
  return await updateUserMemory(userId, memoryUpdate);
};

/**
 * Smart query function to get specific memory entries by keys
 */
export const getMemoryEntries = async (
  userId: string,
  keys: string[]
): Promise<Record<string, MemoryEntry>> => {
  const memory = await getUserMemory(userId);

  if (!memory) {
    return {};
  }

  const entries: Record<string, MemoryEntry> = {};
  keys.forEach((key) => {
    if (memory.memory[key]) {
      entries[key] = memory.memory[key];
    }
  });

  return entries;
};

/**
 * Smart query function to clear specific memory entries
 */
export const clearMemoryEntries = async (
  userId: string,
  keys: string[]
): Promise<boolean> => {
  const memory = await getUserMemory(userId);

  if (!memory) {
    return false;
  }

  const updatedMemory = { ...memory.memory };
  keys.forEach((key) => {
    delete updatedMemory[key];
  });

  const sql = `
    UPDATE ${USERS_TABLE}
    SET memory = $1::jsonb,
        updated_at = now()
    WHERE id = $2
  `;

  try {
    const result = await query(sql, [JSON.stringify(updatedMemory), userId]);
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error("Error clearing memory entries:", error);
    throw error;
  }
};

/**
 * Helper function to get relevant memory context for AI conversation
 */
export const getRelevantMemoryContext = async (
  userId: string,
  conversationContext: string,
  maxEntries: number = 5
): Promise<Record<string, unknown>> => {
  const memory = await getUserMemory(userId);

  if (!memory) {
    return {};
  }

  // Simple relevance scoring based on key matching
  // In Phase 3, this could use vector embeddings for semantic search
  const relevantEntries: Record<string, unknown> = {};
  const memoryKeys = Object.keys(memory.memory);

  // Filter entries that might be relevant to the conversation
  const relevantKeys = memoryKeys.filter(
    (key) =>
      conversationContext.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(conversationContext.toLowerCase())
  );

  // Take the most recent relevant entries
  const sortedKeys = relevantKeys
    .sort((a, b) => {
      const timeA = new Date(memory.memory[a].timestamp).getTime();
      const timeB = new Date(memory.memory[b].timestamp).getTime();
      return timeB - timeA; // Most recent first
    })
    .slice(0, maxEntries);

  sortedKeys.forEach((key) => {
    relevantEntries[key] = memory.memory[key].value;
  });

  return relevantEntries;
};
