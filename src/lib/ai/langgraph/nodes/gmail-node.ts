import type { LangGraphChatState } from '../../../../types';
import { fetchRecentEmails } from '../../../../lib/integrations/gmail/client';
import * as integrationQueries from '../../../../lib/queries/integrations';

export const gmailNode = async (
  state: LangGraphChatState
): Promise<Partial<LangGraphChatState>> => {
  try {
    // Check if user has Gmail connected
    const gmailIntegration = await integrationQueries.getUserIntegration(
      state.userId,
      'gmail'
    );

    if (!gmailIntegration || !gmailIntegration.is_active) {
      return {
        emailContext: {},
        currentStep: 'gmail_not_connected',
      };
    }

    // Check if conversation mentions email-related keywords
    const conversationText = state.conversationContext.toLowerCase();
    const emailKeywords = ['email', 'message', 'inbox', 'sent', 'reply', 'mail'];
    const mentionsEmail = emailKeywords.some(keyword => 
      conversationText.includes(keyword)
    );

    // Smart context loading - only load emails if contextually relevant
    let emailContext = {};
    
    if (mentionsEmail || state.messages.some(msg => 
      ['email', 'message', 'inbox'].some(keyword => 
        msg.content.toLowerCase().includes(keyword)
      )
    )) {
      // Fetch recent emails for context
      const recentEmails = await fetchRecentEmails(state.userId, 5);
      
      emailContext = {
        recentEmails: recentEmails.map(email => ({
          from: email.from,
          subject: email.subject,
          snippet: email.snippet,
          date: email.date,
          unread: email.unread,
        })),
        emailCount: recentEmails.length,
        hasUnread: recentEmails.some(email => email.unread),
      };
    }

    return {
      emailContext,
      currentStep: 'gmail_context_loaded',
    };
  } catch (error) {
    console.error('Error in Gmail node:', error);
    return {
      emailContext: {},
      currentStep: 'gmail_error',
      error: error instanceof Error ? error.message : 'Gmail integration error',
    };
  }
};