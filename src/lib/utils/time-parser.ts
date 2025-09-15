/**
 * Dedicated Time Parser Module
 *
 * Handles all time parsing logic with multiple fallback strategies:
 * 1. Hebrew written numbers (primary for Hebrew users)
 * 2. Digital time formats (24-hour, 12-hour AM/PM)
 * 3. LLM-based parsing (intelligent fallback for complex cases)
 * 4. Graceful failure (returns null for unclear input)
 */

import { initializeOpenAI } from "../ai/langgraph/nodes/openai-node";

export interface DateTimeParseResult {
  /** Parsed date or null if parsing failed */
  date: Date | null;
  /** Confidence level of the parsing result */
  confidence: "high" | "medium" | "low";
  /** Method used for successful parsing */
  method: "regex" | "llm" | "failed";
  /** Original input for debugging */
  originalInput: string;
  /** Additional parsing metadata */
  metadata?: {
    hebrewNumber?: string;
    timeContext?: string;
    digitalPattern?: string;
    dayPattern?: string;
    llmReasoning?: string;
  };
}

/**
 * Hebrew number words to numeric values
 * Supports common time expressions in Hebrew
 */
const HEBREW_NUMBERS = {
  אחת: 1,
  שתיים: 2,
  שלוש: 3,
  ארבע: 4,
  חמש: 5,
  שש: 6,
  שבע: 7,
  שמונה: 8,
  תשע: 9,
  עשר: 10,
  "אחת עשרה": 11,
  "שתים עשרה": 12,
} as const;

/**
 * Digital time patterns for regex matching
 * Supports various time formats commonly used
 */
const DIGITAL_TIME_PATTERNS = [
  { pattern: /(\d{1,2}):(\d{2})/, name: "24-hour" }, // 14:00, 2:30
  { pattern: /(\d{1,2})\s*(am|pm)/i, name: "12-hour-simple" }, // 2pm, 3am
  { pattern: /(\d{1,2})\s*(\d{2})\s*(am|pm)/i, name: "12-hour-detailed" }, // 2 30pm
] as const;

/**
 * Hebrew time context patterns
 * Maps time-of-day expressions to hour adjustments
 */
const HEBREW_TIME_CONTEXTS = [
  { pattern: /בצהריים|אחר הצהריים/, offset: 12, name: "afternoon" },
  { pattern: /בבוקר/, offset: 0, name: "morning" },
  { pattern: /בערב/, offset: 12, name: "evening" },
] as const;

/**
 * Day patterns for date parsing (multilingual support)
 */
const DAY_PATTERNS = [
  { pattern: /sunday|sun|ראשון/i, dayOffset: 0, name: "Sunday" },
  { pattern: /monday|mon|שני/i, dayOffset: 1, name: "Monday" },
  { pattern: /tuesday|tue|שלישי/i, dayOffset: 2, name: "Tuesday" },
  { pattern: /wednesday|wed|רביעי/i, dayOffset: 3, name: "Wednesday" },
  { pattern: /thursday|thu|חמישי/i, dayOffset: 4, name: "Thursday" },
  { pattern: /friday|fri|שישי/i, dayOffset: 5, name: "Friday" },
  { pattern: /saturday|sat|שבת/i, dayOffset: 6, name: "Saturday" },
] as const;

/**
 * Try regex parsing for both date and time
 * Handles day patterns, Hebrew numbers, and digital time formats
 */
function tryRegexDateTimeParsing(
  input: string,
  conversationContext: string | undefined,
  timezone: string
): DateTimeParseResult {
  const lowerInput = input.toLowerCase();

  // Create current time in user's timezone
  const serverNow = new Date();
  const userNow = new Date(
    serverNow.toLocaleString("en-US", { timeZone: timezone })
  );
  let targetDate = new Date(userNow);

  // Parse day
  let dayOffset = 0;
  let dayFoundInMessage = false;
  let dayPatternName = "";

  // Check current message for day patterns
  for (const { pattern, dayOffset: offset, name } of DAY_PATTERNS) {
    if (pattern.test(lowerInput)) {
      dayOffset = offset;
      dayFoundInMessage = true;
      dayPatternName = name;
      break;
    }
  }

  // If no day in current message, check conversation context
  if (!dayFoundInMessage && conversationContext) {
    for (const { pattern, dayOffset: offset, name } of DAY_PATTERNS) {
      if (pattern.test(conversationContext.toLowerCase())) {
        dayOffset = offset;
        dayPatternName = name;
        console.log(`Found day in context: ${name}`);
        break;
      }
    }
  }

  // Calculate target date
  if (lowerInput.includes("today") || lowerInput.includes("היום")) {
    targetDate = new Date(userNow);
  } else if (lowerInput.includes("tomorrow") || lowerInput.includes("מחר")) {
    targetDate = new Date(userNow.getTime() + 24 * 60 * 60 * 1000);
  } else if (dayOffset > 0) {
    const currentDay = userNow.getDay();
    let daysUntilTarget = (dayOffset - currentDay + 7) % 7;
    if (daysUntilTarget === 0) daysUntilTarget = 7; // Next week
    targetDate = new Date(
      userNow.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000
    );
  }

  // Parse time
  let hour: number | null = null;
  let minute = 0;
  let timeMethod = "";

  // Try Hebrew time parsing first
  for (const [hebrewNum, hourNum] of Object.entries(HEBREW_NUMBERS)) {
    if (lowerInput.includes(hebrewNum)) {
      for (const context of HEBREW_TIME_CONTEXTS) {
        if (context.pattern.test(lowerInput)) {
          const parsedHour = hourNum + context.offset;
          if (parsedHour >= 0 && parsedHour <= 23) {
            hour = parsedHour;
            timeMethod = `hebrew-${context.name}`;
            console.log(
              `✅ Hebrew time parsed: ${hebrewNum} ${context.name} = ${hour}:00`
            );
            break;
          }
        }
      }
      if (hour !== null) break;
    }
  }

  // Try digital time parsing if Hebrew failed
  if (hour === null) {
    for (const { pattern, name } of DIGITAL_TIME_PATTERNS) {
      const match = lowerInput.match(pattern);
      if (match) {
        if (match[3]) {
          // AM/PM format
          hour = parseInt(match[1]);
          minute = match[2] ? parseInt(match[2]) : 0;
          const period = match[3].toLowerCase();
          if (period === "pm" && hour !== 12) {
            hour += 12;
          } else if (period === "am" && hour === 12) {
            hour = 0;
          }
        } else {
          // 24-hour format
          hour = parseInt(match[1]);
          minute = parseInt(match[2]);
        }

        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          timeMethod = name;
          console.log(
            `✅ Digital time parsed: ${match[0]} (${name}) = ${hour}:${minute
              .toString()
              .padStart(2, "0")}`
          );
          break;
        } else {
          hour = null; // Invalid time
        }
      }
    }
  }

  // Check if we have both date and time
  const hasValidDay =
    dayFoundInMessage ||
    lowerInput.includes("today") ||
    lowerInput.includes("היום") ||
    lowerInput.includes("tomorrow") ||
    lowerInput.includes("מחר") ||
    (conversationContext &&
      DAY_PATTERNS.some((p) =>
        p.pattern.test(conversationContext.toLowerCase())
      ));

  const hasValidTime = hour !== null;

  if (hasValidDay && hasValidTime && hour !== null) {
    targetDate.setHours(hour, minute, 0, 0);

    console.log("✅ Regex parsing successful:", {
      originalInput: input,
      day: dayPatternName || "today/tomorrow",
      time: `${hour}:${minute.toString().padStart(2, "0")}`,
      method: timeMethod,
      finalDateTime: targetDate.toISOString(),
    });

    return {
      date: targetDate,
      confidence: "high",
      method: "regex",
      originalInput: input,
      metadata: {
        dayPattern: dayPatternName,
        digitalPattern: timeMethod,
        hebrewNumber: timeMethod.startsWith("hebrew")
          ? Object.keys(HEBREW_NUMBERS).find((key) => lowerInput.includes(key))
          : undefined,
        timeContext: timeMethod.startsWith("hebrew")
          ? timeMethod.split("-")[1]
          : undefined,
      },
    };
  }

  // Regex parsing failed - missing date or time
  console.log("❌ Regex parsing failed:", {
    originalInput: input,
    hasValidDay,
    hasValidTime,
    dayFound: dayPatternName,
    hourParsed: hour,
  });

  return {
    date: null,
    confidence: "low",
    method: "failed",
    originalInput: input,
  };
}

/**
 * Try LLM-based date+time parsing for complex expressions
 * Fallback for cases regex can't handle
 */
async function tryLLMDateTimeParsing(
  input: string,
  conversationContext?: string,
  timezone?: string
): Promise<DateTimeParseResult> {
  try {
    // Import OpenAI client dynamically to avoid circular dependencies
    const openaiClient = initializeOpenAI();

    const currentTime = new Date();
    const userTime = timezone
      ? new Date(currentTime.toLocaleString("en-US", { timeZone: timezone }))
      : currentTime;

    const analysisPrompt = `You are a precise date/time parser. Extract the intended date and time from this scheduling request.

CURRENT DATE/TIME: ${userTime.toLocaleString()} (${timezone || "UTC"})
CONVERSATION CONTEXT: ${conversationContext || "None"}
USER INPUT: "${input}"

PARSING RULES:
1. Parse both date AND time from the input
2. For days: Monday/שני = next Monday, "today"/היום = today, "tomorrow"/מחר = tomorrow
3. For times: "שלוש בצהריים" = 15:00, "ארבע בבוקר" = 04:00, "14:30" = 14:30
4. If only time given and context has a day, use that day
5. If only day given and no time, this is unclear - set confident=false
6. Be confident only if you can determine BOTH date and time

Respond with JSON only:
{
  "confident": boolean,
  "date": "YYYY-MM-DD" or null,
  "time": "HH:MM" or null,
  "reasoning": "Brief explanation of parsing logic"
}`;

    const response = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No LLM response received");
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid LLM response format");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    if (!analysis.confident || !analysis.date || !analysis.time) {
      console.log(
        "🤖 LLM date/time parsing not confident:",
        analysis.reasoning
      );
      return {
        date: null,
        confidence: "low",
        method: "failed",
        originalInput: input,
        metadata: {
          llmReasoning: analysis.reasoning,
        },
      };
    }

    // Parse the LLM-provided date and time
    const [year, month, day] = analysis.date.split("-").map(Number);
    const [hour, minute] = analysis.time.split(":").map(Number);

    // Validate values
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(`Invalid time values from LLM: ${hour}:${minute}`);
    }

    const finalDate = new Date(year, month - 1, day, hour, minute, 0, 0);

    console.log(
      `✅ LLM date/time parsed: "${input}" = ${analysis.date} ${analysis.time} (${analysis.reasoning})`
    );

    return {
      date: finalDate,
      confidence: "medium",
      method: "llm",
      originalInput: input,
      metadata: {
        llmReasoning: analysis.reasoning,
      },
    };
  } catch (error) {
    console.error("❌ LLM date/time parsing failed:", error);
    return {
      date: null,
      confidence: "low",
      method: "failed",
      originalInput: input,
      metadata: {
        llmReasoning: `LLM parsing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
    };
  }
}

/**
 * Main date/time parsing function with intelligent fallback strategy
 *
 * @param input - The text input containing date/time expression
 * @param conversationContext - Optional conversation context for better parsing
 * @param timezone - Optional timezone for proper date calculations
 * @returns Promise<DateTimeParseResult> - Parsed date/time result with metadata
 */
export async function parseDateTime(
  input: string,
  conversationContext?: string,
  timezone?: string
): Promise<DateTimeParseResult> {
  if (!input || typeof input !== "string") {
    return {
      date: null,
      confidence: "low",
      method: "failed",
      originalInput: input || "",
    };
  }

  console.log(`🕐 Starting date/time parsing for: "${input}"`);

  // Strategy 1: Try regex parsing for both date and time (fast, high confidence)
  const regexResult = tryRegexDateTimeParsing(
    input,
    conversationContext,
    timezone || "UTC"
  );
  if (regexResult.date !== null) {
    return regexResult;
  }

  // Strategy 2: LLM fallback for complex cases (slower, medium confidence)
  console.log("🤖 Regex parsing failed, trying LLM fallback...");
  const llmResult = await tryLLMDateTimeParsing(
    input,
    conversationContext,
    timezone
  );
  if (llmResult.date !== null) {
    return llmResult;
  }

  // Strategy 3: Complete failure - no parsing method worked
  console.log("❌ All date/time parsing methods failed for:", input);
  return {
    date: null,
    confidence: "low",
    method: "failed",
    originalInput: input,
  };
}

/**
 * Utility function to format date/time result for display
 */
export function formatDateTimeResult(result: DateTimeParseResult): string {
  if (result.date === null) {
    return `Failed to parse: "${result.originalInput}"`;
  }

  const dateTimeStr = result.date.toLocaleString();
  return `${dateTimeStr} (${result.confidence} confidence via ${result.method})`;
}

/**
 * Type guard to check if date/time parsing was successful
 */
export function isDateTimeParseSuccessful(
  result: DateTimeParseResult
): result is DateTimeParseResult & { date: Date } {
  return result.date !== null;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use parseDateTime instead
 */
export async function parseTime(
  input: string,
  conversationContext?: string,
  timezone?: string
): Promise<{ hour: number | null; minute: number }> {
  const result = await parseDateTime(input, conversationContext, timezone);
  if (result.date) {
    return {
      hour: result.date.getHours(),
      minute: result.date.getMinutes(),
    };
  }
  return { hour: null, minute: 0 };
}
