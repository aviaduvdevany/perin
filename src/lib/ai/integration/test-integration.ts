import { understandingOrchestrator } from "../understanding";
import { integrationOrchestrator } from "./index";
import {
  UserPreferences,
  ConversationTurn,
} from "../../../types/understanding";
import { IntegrationType } from "./smart-detector";

// Test data
const mockUserPreferences: UserPreferences = {
  language: "en",
  timezone: "America/New_York",
  communicationStyle: "informal",
  responseLength: "balanced",
  notificationPreferences: {
    email: true,
    push: true,
  },
};

const mockConversationHistory: ConversationTurn[] = [
  {
    role: "user",
    content: "Hello Perin, how are you today?",
    timestamp: new Date(Date.now() - 60000),
    intent: {
      type: "general",
      confidence: 0.9,
      parameters: {},
      urgency: "low",
    },
  },
  {
    role: "assistant",
    content:
      "Hello! I'm doing well, thank you for asking. How can I help you today?",
    timestamp: new Date(Date.now() - 30000),
  },
];

const availableIntegrations: IntegrationType[] = ["calendar", "gmail", "slack"];

// Test scenarios
const testScenarios = [
  {
    name: "Scheduling Intent",
    input: "Can you schedule a meeting with John tomorrow at 3pm?",
    expectedIntent: "scheduling",
    expectedIntegrations: ["calendar"],
  },
  {
    name: "Email Intent",
    input: "Send an email to the team about the project update",
    expectedIntent: "information",
    expectedIntegrations: ["gmail"],
  },
  {
    name: "Multi-language Intent",
    input: "¿Puedes programar una reunión para mañana?",
    expectedIntent: "scheduling",
    expectedIntegrations: ["calendar"],
  },
  {
    name: "Complex Delegation",
    input:
      "I need to delegate the quarterly report preparation to Sarah, she should have access to the financial data",
    expectedIntent: "delegation",
    expectedIntegrations: [],
  },
  {
    name: "Urgent Request",
    input: "URGENT: I need to reschedule my 2pm meeting with the client ASAP",
    expectedIntent: "scheduling",
    expectedIntegrations: ["calendar"],
  },
];

export async function runIntegrationTests() {
  console.log("🧪 Starting AI Integration Refactor Tests\n");

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Understanding Orchestrator
  console.log("📋 Testing Understanding Orchestrator...");
  for (const scenario of testScenarios) {
    totalTests++;
    try {
      const understandingRequest = {
        input: scenario.input,
        userId: "test-user-123",
        conversationHistory: mockConversationHistory,
        userPreferences: mockUserPreferences,
        context: { testScenario: scenario.name },
      };

      const understandingResponse = await understandingOrchestrator.understand(
        understandingRequest
      );

      const intentMatch =
        understandingResponse.intent.type === scenario.expectedIntent;
      const confidenceGood = understandingResponse.confidence > 0.7;

      if (intentMatch && confidenceGood) {
        console.log(
          `✅ ${scenario.name}: Intent detected correctly (${
            understandingResponse.intent.type
          }, ${Math.round(understandingResponse.confidence * 100)}% confidence)`
        );
        passedTests++;
      } else {
        console.log(
          `❌ ${scenario.name}: Intent mismatch (expected: ${
            scenario.expectedIntent
          }, got: ${
            understandingResponse.intent.type
          }, confidence: ${Math.round(
            understandingResponse.confidence * 100
          )}%)`
        );
      }

      // Test language detection
      if (scenario.input.includes("¿") || scenario.input.includes("á")) {
        const languageCorrect = understandingResponse.language === "es";
        if (languageCorrect) {
          console.log(
            `  ✅ Language detected correctly: ${understandingResponse.language}`
          );
        } else {
          console.log(
            `  ⚠️  Language detection issue: expected 'es', got '${understandingResponse.language}'`
          );
        }
      }

      // Test entity extraction
      if (understandingResponse.entities.length > 0) {
        console.log(
          `  ✅ Entities extracted: ${understandingResponse.entities
            .map((e) => `${e.type}:${e.value}`)
            .join(", ")}`
        );
      }
    } catch (error) {
      console.log(`❌ ${scenario.name}: Test failed with error: ${error}`);
    }
  }

  // Test 2: Integration Orchestrator
  console.log("\n🔗 Testing Integration Orchestrator...");
  for (const scenario of testScenarios) {
    totalTests++;
    try {
      // First get understanding
      const understandingRequest = {
        input: scenario.input,
        userId: "test-user-123",
        conversationHistory: mockConversationHistory,
        userPreferences: mockUserPreferences,
      };

      const understandingResponse = await understandingOrchestrator.understand(
        understandingRequest
      );

      // Then test integration detection
      const integrationRequest = {
        userIntent: understandingResponse.intent,
        conversationContext: understandingResponse.context,
        userInput: scenario.input,
        userId: "test-user-123",
        availableIntegrations,
      };

      const integrationResponse =
        await integrationOrchestrator.orchestrateIntegrations(
          integrationRequest
        );

      const relevantIntegrations = integrationResponse.relevantIntegrations.map(
        (i) => i.integrationType
      );
      const expectedIntegrations = scenario.expectedIntegrations;

      const integrationMatch = expectedIntegrations.every((expected) =>
        relevantIntegrations.includes(expected as IntegrationType)
      );

      if (integrationMatch) {
        console.log(
          `✅ ${
            scenario.name
          }: Integrations detected correctly (${relevantIntegrations.join(
            ", "
          )})`
        );
        passedTests++;
      } else {
        console.log(
          `❌ ${
            scenario.name
          }: Integration mismatch (expected: ${expectedIntegrations.join(
            ", "
          )}, got: ${relevantIntegrations.join(", ")})`
        );
      }

      // Test workflow suggestions
      if (integrationResponse.suggestedWorkflow.length > 0) {
        console.log(
          `  ✅ Workflow suggested: ${integrationResponse.suggestedWorkflow.join(
            " → "
          )}`
        );
      }
    } catch (error) {
      console.log(
        `❌ ${scenario.name}: Integration test failed with error: ${error}`
      );
    }
  }

  // Test 3: Performance and Batch Processing
  console.log("\n⚡ Testing Performance and Batch Processing...");
  totalTests++;
  try {
    const batchRequests = testScenarios.map((scenario) => ({
      input: scenario.input,
      userId: "test-user-123",
      conversationHistory: mockConversationHistory,
      userPreferences: mockUserPreferences,
    }));

    const startTime = Date.now();
    const batchResponses = await understandingOrchestrator.batchUnderstand({
      requests: batchRequests,
    });
    const totalTime = Date.now() - startTime;

    const avgTime = totalTime / batchRequests.length;
    console.log(
      `✅ Batch processing: ${
        batchRequests.length
      } requests in ${totalTime}ms (avg: ${Math.round(avgTime)}ms per request)`
    );

    if (avgTime < 2000) {
      // Less than 2 seconds per request
      console.log(`  ✅ Performance acceptable (${Math.round(avgTime)}ms avg)`);
      passedTests++;
    } else {
      console.log(`  ⚠️  Performance slow (${Math.round(avgTime)}ms avg)`);
    }
  } catch (error) {
    console.log(`❌ Batch processing test failed: ${error}`);
  }

  // Test 4: Error Handling and Fallbacks
  console.log("\n🛡️ Testing Error Handling and Fallbacks...");
  totalTests++;
  try {
    // Test with invalid input
    const invalidRequest = {
      input: "", // Empty input
      userId: "test-user-123",
      conversationHistory: [],
      userPreferences: mockUserPreferences,
    };

    const fallbackResponse = await understandingOrchestrator.understand(
      invalidRequest
    );

    if (
      fallbackResponse.intent.type === "general" &&
      fallbackResponse.confidence <= 0.5
    ) {
      console.log("✅ Fallback handling works correctly for invalid input");
      passedTests++;
    } else {
      console.log("❌ Fallback handling not working as expected");
    }
  } catch (error) {
    console.log(`❌ Error handling test failed: ${error}`);
  }

  // Test 5: Language Processing
  console.log("\n🌍 Testing Language Processing...");
  totalTests++;
  try {
    const multiLanguageInputs = [
      "Schedule a meeting tomorrow",
      "Programar una reunión mañana",
      "Planifier une réunion demain",
      "Termin morgen planen",
    ];

    const languageResults = await Promise.all(
      multiLanguageInputs.map(async (input) => {
        const request = {
          input,
          userId: "test-user-123",
          conversationHistory: [],
          userPreferences: mockUserPreferences,
        };
        return await understandingOrchestrator.understand(request);
      })
    );

    const allProcessed = languageResults.every(
      (result) => result.language && result.confidence > 0.5
    );
    if (allProcessed) {
      console.log("✅ Multi-language processing works correctly");
      console.log(
        `  Languages detected: ${languageResults
          .map((r) => r.language)
          .join(", ")}`
      );
      passedTests++;
    } else {
      console.log("❌ Multi-language processing has issues");
    }
  } catch (error) {
    console.log(`❌ Language processing test failed: ${error}`);
  }

  // Summary
  console.log("\n📊 Test Summary");
  console.log(
    `Passed: ${passedTests}/${totalTests} tests (${Math.round(
      (passedTests / totalTests) * 100
    )}%)`
  );

  if (passedTests === totalTests) {
    console.log(
      "🎉 All tests passed! The AI Integration Refactor is working correctly."
    );
  } else {
    console.log("⚠️  Some tests failed. Please review the implementation.");
  }

  return {
    passed: passedTests,
    total: totalTests,
    successRate: passedTests / totalTests,
  };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}
