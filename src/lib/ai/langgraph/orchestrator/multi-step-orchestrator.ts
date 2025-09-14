import type {
  StepDefinition,
  StepResult,
  MultiStepContext,
  LangGraphChatState,
} from "@/types/ai";
import { v4 as uuidv4 } from "uuid";

// Control tokens for multi-step messaging
export const MULTI_STEP_CONTROL_TOKENS = {
  STEP_START: (stepId: string, stepName: string) =>
    `[[PERIN_STEP:start:${stepId}:${stepName}]]`,
  STEP_PROGRESS: (message: string) => `[[PERIN_PROGRESS:${message}]]`,
  STEP_RESULT: (stepId: string, status: string, result?: string) =>
    `[[PERIN_STEP_RESULT:${stepId}:${status}${result ? `:${result}` : ""}]]`,
  STEP_END: (stepId: string) => `[[PERIN_STEP:end:${stepId}]]`,
  MULTI_STEP_COMPLETE: () => `[[PERIN_MULTI_STEP:complete]]`,
  MULTI_STEP_INITIATED: (reasoning: string, confidence: number) =>
    `[[PERIN_MULTI_STEP:initiated:${reasoning}:${confidence}]]`,
  SEPARATE_MESSAGE: (message: string) =>
    `[[PERIN_SEPARATE_MESSAGE:${message}]]`,
} as const;

export type StepExecutor = (
  state: LangGraphChatState,
  step: StepDefinition,
  context: MultiStepContext,
  onProgress: (message: string) => void
) => Promise<StepResult>;

export interface MultiStepOrchestratorOptions {
  onStepStart?: (step: StepDefinition, context: MultiStepContext) => void;
  onStepProgress?: (
    step: StepDefinition,
    message: string,
    context: MultiStepContext
  ) => void;
  onStepComplete?: (
    step: StepDefinition,
    result: StepResult,
    context: MultiStepContext
  ) => void;
  onStepError?: (
    step: StepDefinition,
    error: Error,
    context: MultiStepContext
  ) => void;
  onComplete?: (context: MultiStepContext) => void;
  allowSkipping?: boolean;
  allowPausing?: boolean;
}

export class MultiStepOrchestrator {
  private options: MultiStepOrchestratorOptions;
  private stepExecutors: Map<string, StepExecutor> = new Map();

  constructor(options: MultiStepOrchestratorOptions = {}) {
    this.options = {
      allowSkipping: true,
      allowPausing: true,
      ...options,
    };
  }

  /**
   * Register a step executor for a specific step type
   */
  registerStepExecutor(stepType: string, executor: StepExecutor): void {
    this.stepExecutors.set(stepType, executor);
  }

  /**
   * Create a new multi-step context
   */
  createMultiStepContext(
    steps: StepDefinition[],
    sessionId?: string
  ): MultiStepContext {
    return {
      sessionId: sessionId || uuidv4(),
      currentStepIndex: 0,
      totalSteps: steps.length,
      steps,
      stepResults: steps.map((step) => ({
        stepId: step.id,
        status: "pending" as const,
      })),
      progressMessages: [],
      status: "running",
      startTime: new Date(),
      lastUpdateTime: new Date(),
      canPause: this.options.allowPausing,
      canSkip: this.options.allowSkipping,
    };
  }

  /**
   * Execute all steps in sequence with streaming progress updates
   */
  async executeSteps(
    state: LangGraphChatState,
    steps: StepDefinition[],
    streamController: ReadableStreamDefaultController<Uint8Array>,
    sessionId?: string
  ): Promise<MultiStepContext> {
    const context = this.createMultiStepContext(steps, sessionId);

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        context.currentStepIndex = i;
        context.lastUpdateTime = new Date();

        // Emit step definition ONLY when it's about to start (real-time)
        this.emitToStream(
          streamController,
          MULTI_STEP_CONTROL_TOKENS.STEP_START(step.id, step.name)
        );

        // Update step status to running
        context.stepResults[i] = {
          ...context.stepResults[i],
          status: "running",
          startTime: new Date(),
        };

        // Call step start callback
        this.options.onStepStart?.(step, context);

        try {
          // Create progress callback for this step
          const onProgress = (message: string) => {
            context.progressMessages.push(message);
            context.lastUpdateTime = new Date();
            this.emitToStream(
              streamController,
              MULTI_STEP_CONTROL_TOKENS.STEP_PROGRESS(message)
            );
            // Don't emit raw progress messages to avoid cluttering the UI
            this.options.onStepProgress?.(step, message, context);
          };

          // Execute the step
          const stepExecutor =
            this.stepExecutors.get(step.id) || this.defaultStepExecutor;
          const result = await stepExecutor(state, step, context, onProgress);

          // Update step result
          context.stepResults[i] = {
            ...result,
            endTime: new Date(),
            status: result.status === "failed" ? "failed" : "completed",
          };

          // Emit step result
          this.emitToStream(
            streamController,
            MULTI_STEP_CONTROL_TOKENS.STEP_RESULT(
              step.id,
              context.stepResults[i].status,
              context.stepResults[i].progressMessage
            )
          );

          // Emit step end
          this.emitToStream(
            streamController,
            MULTI_STEP_CONTROL_TOKENS.STEP_END(step.id)
          );

          // Call step complete callback
          this.options.onStepComplete?.(step, context.stepResults[i], context);

          // Check if step failed and is required - STOP execution here
          if (context.stepResults[i].status === "failed" && step.required) {
            context.status = "failed";

            // Provide user-friendly failure message based on step type
            let failureMessage = "";
            if (step.id === "check_availability") {
              failureMessage =
                "There are conflicts in the time you suggested. Would you like to try a different time for that day?";
            } else {
              failureMessage = `❌ Required step failed: ${step.name}. Process stopped.`;
            }

            // Emit completion token to signal end
            this.emitToStream(
              streamController,
              MULTI_STEP_CONTROL_TOKENS.MULTI_STEP_COMPLETE()
            );

            // Emit user-friendly message as a separate chat message
            this.emitToStream(
              streamController,
              MULTI_STEP_CONTROL_TOKENS.SEPARATE_MESSAGE(failureMessage)
            );

            // Don't throw error to avoid additional error handling messages
            return context;
          }
        } catch (error) {
          // Handle step error
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          context.stepResults[i] = {
            ...context.stepResults[i],
            status: "failed",
            error: errorMessage,
            endTime: new Date(),
          };

          this.emitToStream(
            streamController,
            MULTI_STEP_CONTROL_TOKENS.STEP_RESULT(
              step.id,
              "failed",
              errorMessage
            )
          );
          this.emitToStream(
            streamController,
            MULTI_STEP_CONTROL_TOKENS.STEP_END(step.id)
          );

          this.options.onStepError?.(step, error as Error, context);

          // If step is required, fail the entire process and stop
          if (step.required) {
            context.status = "failed";

            // Provide user-friendly failure message based on step type
            let failureMessage = "";
            if (step.id === "check_availability") {
              failureMessage =
                "There are conflicts in the time you suggested. Would you like to try a different time for that day?";
            } else {
              failureMessage = `❌ Required step failed: ${step.name}. Process stopped.`;
            }

            // Emit completion token to signal end
            this.emitToStream(
              streamController,
              MULTI_STEP_CONTROL_TOKENS.MULTI_STEP_COMPLETE()
            );

            // Emit user-friendly message as a separate chat message
            this.emitToStream(
              streamController,
              MULTI_STEP_CONTROL_TOKENS.SEPARATE_MESSAGE(failureMessage)
            );

            // Don't throw error to avoid additional error handling messages
            return context;
          }

          // For non-required steps, log and continue
          console.warn(`Non-required step failed: ${step.name}`, error);
        }
      }

      // All steps completed successfully
      context.status = "completed";
      context.lastUpdateTime = new Date();

      // Emit completion
      this.emitToStream(
        streamController,
        MULTI_STEP_CONTROL_TOKENS.MULTI_STEP_COMPLETE()
      );

      // Emit a concluding message to make the conversation feel natural
      const concludingMessage = this.generateConcludingMessage(context, state);
      if (concludingMessage) {
        this.emitToStream(
          streamController,
          MULTI_STEP_CONTROL_TOKENS.SEPARATE_MESSAGE(concludingMessage)
        );
      }

      this.options.onComplete?.(context);
    } catch (error) {
      context.status = "failed";
      context.lastUpdateTime = new Date();

      // Don't emit debug error messages to the user
      // The user-friendly message was already emitted in the step failure handling

      throw error;
    }

    return context;
  }

  /**
   * Default step executor (fallback)
   */
  private defaultStepExecutor: StepExecutor = async (
    state,
    step,
    context,
    onProgress
  ) => {
    onProgress(`Executing ${step.name}...`);

    // Simulate step execution
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      stepId: step.id,
      status: "completed",
      result: `Step ${step.name} completed`,
      progressMessage: `✅ ${step.name} completed successfully`,
    };
  };

  /**
   * Generate a concluding message based on the context and completed steps
   */
  private generateConcludingMessage(
    context: MultiStepContext,
    state: LangGraphChatState
  ): string | null {
    // Only generate concluding messages for delegation contexts
    if (!state.delegationContext?.isDelegation) {
      return null;
    }

    // Check if this was a meeting scheduling context
    const hasMeetingSteps = context.stepResults.some(
      (result) =>
        result?.stepId?.includes("check_availability") ||
        result?.stepId?.includes("schedule_meeting")
    );

    if (hasMeetingSteps) {
      // Determine the user's language from the delegation context or default to English
      const userLanguage = this.detectUserLanguage(state);

      // Generate appropriate concluding message based on language
      const messages: Record<string, string> = {
        en: "Perfect! The meeting is set. Is there anything else I can help you with?",
        es: "¡Perfecto! La reunión está programada. ¿Hay algo más en lo que pueda ayudarte?",
        fr: "Parfait ! La réunion est programmée. Y a-t-il autre chose avec lequel je peux vous aider ?",
        de: "Perfekt! Das Meeting ist terminiert. Kann ich Ihnen sonst noch bei etwas helfen?",
        it: "Perfetto! La riunione è stata programmata. C'è qualcos'altro con cui posso aiutarti?",
        pt: "Perfeito! A reunião está agendada. Há mais alguma coisa em que posso ajudá-lo?",
        nl: "Perfect! De vergadering is ingepland. Is er nog iets anders waarmee ik je kan helpen?",
        ru: "Отлично! Встреча назначена. Могу ли я помочь вам с чем-то еще?",
        ja: "完璧です！会議が設定されました。他にお手伝いできることはありますか？",
        ko: "완벽합니다! 회의가 예약되었습니다. 다른 도움이 필요한 것이 있나요?",
        zh: "完美！会议已安排。还有什么其他我可以帮助您的吗？",
        ar: "ممتاز! تم تحديد الاجتماع. هل هناك أي شيء آخر يمكنني مساعدتك فيه؟",
        hi: "बिल्कुल सही! मीटिंग निर्धारित हो गई है। क्या मैं आपकी कोई और मदद कर सकता हूं?",
        he: "מושלם! הפגישה נקבעה. יש עוד משהו שאני יכול לעזור לך בו?",
      };

      return messages[userLanguage] || messages.en;
    }

    // Generic concluding message for other types of multi-step processes
    const userLanguage = this.detectUserLanguage(state);
    const genericMessages: Record<string, string> = {
      en: "All done! Is there anything else I can help you with?",
      es: "¡Todo listo! ¿Hay algo más en lo que pueda ayudarte?",
      fr: "Terminé ! Y a-t-il autre chose avec lequel je peux vous aider ?",
      de: "Alles erledigt! Kann ich Ihnen sonst noch bei etwas helfen?",
      it: "Tutto fatto! C'è qualcos'altro con cui posso aiutarti?",
      pt: "Tudo pronto! Há mais alguma coisa em que posso ajudá-lo?",
      nl: "Alles klaar! Is er nog iets anders waarmee ik je kan helpen?",
      ru: "Готово! Могу ли я помочь вам с чем-то еще?",
      ja: "完了しました！他にお手伝いできることはありますか？",
      ko: "모든 작업이 완료되었습니다! 다른 도움이 필요한 것이 있나요?",
      zh: "全部完成！还有什么其他我可以帮助您的吗？",
      ar: "تم الانتهاء! هل هناك أي شيء آخر يمكنني مساعدتك فيه؟",
      hi: "सब कुछ हो गया! क्या मैं आपकी कोई और मदद कर सकता हूं?",
      he: "הכל הושלם! יש עוד משהו שאני יכול לעזור לך בו?",
    };

    return genericMessages[userLanguage] || genericMessages.en;
  }

  /**
   * Detect user language from the actual message content
   */
  private detectUserLanguage(state: LangGraphChatState): string {
    // Get the last user message to detect language
    const lastUserMessage = state.messages.findLast(
      (msg) => msg.role === "user"
    );

    if (!lastUserMessage?.content) {
      console.log("🌍 Language detected: English (en) - no user message found");
      return "en";
    }

    const messageContent = lastUserMessage.content.toLowerCase().trim();

    // Debug logging for message-based language detection
    console.log("🌍 Message-based language detection:", {
      messageContent:
        messageContent.substring(0, 100) +
        (messageContent.length > 100 ? "..." : ""),
      delegationId: state.delegationContext?.delegationId,
      externalUserName: state.delegationContext?.externalUserName,
    });

    // Simple but effective language detection based on common words/phrases
    // Spanish
    if (
      messageContent.includes("hola") ||
      messageContent.includes("buenos días") ||
      messageContent.includes("buenas tardes") ||
      messageContent.includes("gracias") ||
      messageContent.includes("por favor") ||
      messageContent.includes("reunión") ||
      messageContent.includes("cita") ||
      messageContent.includes("agenda") ||
      messageContent.includes("mañana") ||
      messageContent.includes("tarde") ||
      messageContent.includes("hora")
    ) {
      console.log("🌍 Language detected: Spanish (es)");
      return "es";
    }

    // French
    if (
      messageContent.includes("bonjour") ||
      messageContent.includes("bonsoir") ||
      messageContent.includes("merci") ||
      messageContent.includes("s'il vous plaît") ||
      messageContent.includes("rendez-vous") ||
      messageContent.includes("réunion") ||
      messageContent.includes("demain") ||
      messageContent.includes("après-midi") ||
      messageContent.includes("heure")
    ) {
      console.log("🌍 Language detected: French (fr)");
      return "fr";
    }

    // German
    if (
      messageContent.includes("hallo") ||
      messageContent.includes("guten tag") ||
      messageContent.includes("danke") ||
      messageContent.includes("bitte") ||
      messageContent.includes("termin") ||
      messageContent.includes("besprechung") ||
      messageContent.includes("morgen") ||
      messageContent.includes("nachmittag") ||
      messageContent.includes("uhr")
    ) {
      console.log("🌍 Language detected: German (de)");
      return "de";
    }

    // Italian
    if (
      messageContent.includes("ciao") ||
      messageContent.includes("buongiorno") ||
      messageContent.includes("grazie") ||
      messageContent.includes("per favore") ||
      messageContent.includes("riunione") ||
      messageContent.includes("appuntamento") ||
      messageContent.includes("domani") ||
      messageContent.includes("pomeriggio") ||
      messageContent.includes("ora")
    ) {
      console.log("🌍 Language detected: Italian (it)");
      return "it";
    }

    // Portuguese
    if (
      messageContent.includes("olá") ||
      messageContent.includes("bom dia") ||
      messageContent.includes("obrigado") ||
      messageContent.includes("por favor") ||
      messageContent.includes("reunião") ||
      messageContent.includes("encontro") ||
      messageContent.includes("amanhã") ||
      messageContent.includes("tarde") ||
      messageContent.includes("hora")
    ) {
      console.log("🌍 Language detected: Portuguese (pt)");
      return "pt";
    }

    // Dutch
    if (
      messageContent.includes("hallo") ||
      messageContent.includes("goedemorgen") ||
      messageContent.includes("dank je") ||
      messageContent.includes("alsjeblieft") ||
      messageContent.includes("vergadering") ||
      messageContent.includes("afspraak") ||
      messageContent.includes("morgen") ||
      messageContent.includes("middag") ||
      messageContent.includes("uur")
    ) {
      console.log("🌍 Language detected: Dutch (nl)");
      return "nl";
    }

    // Russian (Cyrillic script)
    if (
      /[а-яё]/i.test(messageContent) ||
      messageContent.includes("привет") ||
      messageContent.includes("спасибо") ||
      messageContent.includes("пожалуйста") ||
      messageContent.includes("встреча") ||
      messageContent.includes("завтра") ||
      messageContent.includes("час")
    ) {
      console.log("🌍 Language detected: Russian (ru)");
      return "ru";
    }

    // Japanese (Hiragana/Katakana/Kanji)
    if (
      /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(messageContent) ||
      messageContent.includes("こんにちは") ||
      messageContent.includes("ありがとう") ||
      messageContent.includes("お願いします") ||
      messageContent.includes("会議") ||
      messageContent.includes("明日") ||
      messageContent.includes("時")
    ) {
      console.log("🌍 Language detected: Japanese (ja)");
      return "ja";
    }

    // Korean (Hangul)
    if (
      /[\uAC00-\uD7AF]/.test(messageContent) ||
      messageContent.includes("안녕하세요") ||
      messageContent.includes("감사합니다") ||
      messageContent.includes("부탁드립니다") ||
      messageContent.includes("회의") ||
      messageContent.includes("내일") ||
      messageContent.includes("시")
    ) {
      console.log("🌍 Language detected: Korean (ko)");
      return "ko";
    }

    // Chinese (Simplified/Traditional)
    if (
      /[\u4E00-\u9FFF]/.test(messageContent) ||
      messageContent.includes("你好") ||
      messageContent.includes("谢谢") ||
      messageContent.includes("请") ||
      messageContent.includes("会议") ||
      messageContent.includes("明天") ||
      messageContent.includes("时间")
    ) {
      console.log("🌍 Language detected: Chinese (zh)");
      return "zh";
    }

    // Arabic (Arabic script)
    if (
      /[\u0600-\u06FF]/.test(messageContent) ||
      messageContent.includes("مرحبا") ||
      messageContent.includes("شكرا") ||
      messageContent.includes("من فضلك") ||
      messageContent.includes("اجتماع") ||
      messageContent.includes("غدا") ||
      messageContent.includes("ساعة")
    ) {
      console.log("🌍 Language detected: Arabic (ar)");
      return "ar";
    }

    // Hindi (Devanagari script)
    if (
      /[\u0900-\u097F]/.test(messageContent) ||
      messageContent.includes("नमस्ते") ||
      messageContent.includes("धन्यवाद") ||
      messageContent.includes("कृपया") ||
      messageContent.includes("बैठक") ||
      messageContent.includes("कल") ||
      messageContent.includes("समय")
    ) {
      console.log("🌍 Language detected: Hindi (hi)");
      return "hi";
    }

    // Hebrew (Hebrew script)
    if (
      /[\u0590-\u05FF]/.test(messageContent) ||
      messageContent.includes("שלום") ||
      messageContent.includes("תודה") ||
      messageContent.includes("בבקשה") ||
      messageContent.includes("פגישה") ||
      messageContent.includes("מחר") ||
      messageContent.includes("שעה")
    ) {
      console.log("🌍 Language detected: Hebrew (he)");
      return "he";
    }

    // Default to English
    console.log(
      "🌍 Language detected: English (en) - no non-English patterns found"
    );
    return "en";
  }

  /**
   * Helper to emit content to stream
   */
  private emitToStream(
    controller: ReadableStreamDefaultController<Uint8Array>,
    content: string
  ): void {
    try {
      controller.enqueue(new TextEncoder().encode(content));
    } catch (error) {
      console.error("Error emitting to stream:", error);
    }
  }

  /**
   * Get step progress summary
   */
  getProgressSummary(context: MultiStepContext): string {
    const completed = context.stepResults.filter(
      (r) => r.status === "completed"
    ).length;
    const failed = context.stepResults.filter(
      (r) => r.status === "failed"
    ).length;
    const running = context.stepResults.filter(
      (r) => r.status === "running"
    ).length;

    return `Progress: ${completed}/${context.totalSteps} completed, ${failed} failed, ${running} running`;
  }

  /**
   * Check if execution can continue
   */
  canContinue(context: MultiStepContext): boolean {
    return (
      context.status === "running" &&
      context.currentStepIndex < context.totalSteps
    );
  }

  /**
   * Pause execution (if supported)
   */
  pause(context: MultiStepContext): void {
    if (context.canPause) {
      context.status = "paused";
      context.lastUpdateTime = new Date();
    }
  }

  /**
   * Resume execution (if paused)
   */
  resume(context: MultiStepContext): void {
    if (context.status === "paused") {
      context.status = "running";
      context.lastUpdateTime = new Date();
    }
  }
}

// Export singleton instance
export const multiStepOrchestrator = new MultiStepOrchestrator();
