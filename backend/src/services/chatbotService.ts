import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env';
import { query } from '../config/database';
import { logger } from '../utils/logger';

interface ChatContext {
  sessionId: string;
  currentStep?: number;
  selectedPlanId?: string;
  comparisonPlanIds?: string[];
  profileData?: any;
  companyId?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatResponse {
  message: string;
  suggestedQuestions?: string[];
  needsEscalation?: boolean;
  escalationReason?: string;
  sources?: { title: string; excerpt: string }[];
}

// Knowledge base for RAG
const BENEFITS_KNOWLEDGE_BASE = {
  hsa: {
    title: 'Health Savings Account (HSA)',
    content: `A Health Savings Account (HSA) is a tax-advantaged savings account for medical expenses. Key features:
    - Triple tax advantage: contributions are pre-tax, growth is tax-free, withdrawals for medical expenses are tax-free
    - Requires enrollment in a High Deductible Health Plan (HDHP)
    - 2025 contribution limits: $4,300 individual, $8,550 family
    - Funds roll over year to year (no "use it or lose it")
    - After age 65, can be used for any purpose without penalty
    - Can be invested for long-term growth`,
  },
  hdhp: {
    title: 'High Deductible Health Plan (HDHP)',
    content: `An HDHP has higher deductibles than traditional plans but lower premiums. Key features:
    - Minimum deductible (2025): $1,650 individual, $3,300 family
    - Maximum out-of-pocket: $8,300 individual, $16,600 family
    - Preventive care is covered at 100% before deductible
    - HSA eligible - employer may contribute to your HSA
    - Best for: healthy individuals, those with emergency savings, people who want to maximize tax savings`,
  },
  ppo: {
    title: 'Preferred Provider Organization (PPO)',
    content: `A PPO offers flexibility in choosing healthcare providers. Key features:
    - Can see any doctor without referral
    - Lower costs when using in-network providers
    - Out-of-network coverage available (at higher cost)
    - Higher premiums than HMO or HDHP
    - Best for: people who want flexibility, those with established doctor relationships, frequent healthcare users`,
  },
  hmo: {
    title: 'Health Maintenance Organization (HMO)',
    content: `An HMO provides care through a network of providers. Key features:
    - Must choose a primary care physician (PCP)
    - Referrals required for specialists
    - Generally no out-of-network coverage (except emergencies)
    - Lower premiums and copays
    - Coordinated care model
    - Best for: people who prefer coordinated care, those who don't mind referrals, budget-conscious individuals`,
  },
  deductible: {
    title: 'Deductible',
    content: `The deductible is the amount you pay before insurance starts covering costs. Key points:
    - Preventive care is usually covered at 100% before deductible
    - Family plans have both individual and family deductibles
    - Once you meet the deductible, you pay coinsurance
    - Deductible resets each plan year (usually January 1)`,
  },
  coinsurance: {
    title: 'Coinsurance',
    content: `Coinsurance is the percentage you pay after meeting your deductible. Example:
    - If coinsurance is 20%, insurance pays 80%, you pay 20%
    - Applies until you reach your out-of-pocket maximum
    - Different from copays, which are fixed amounts`,
  },
  oop_max: {
    title: 'Out-of-Pocket Maximum',
    content: `The out-of-pocket maximum is the most you'll pay in a year. Key points:
    - Includes deductibles, copays, and coinsurance
    - After reaching this limit, insurance pays 100%
    - Does NOT include premiums or out-of-network costs
    - Provides financial protection against catastrophic costs`,
  },
  life_event: {
    title: 'Qualifying Life Events',
    content: `A qualifying life event allows you to change coverage outside open enrollment. Examples:
    - Marriage or divorce
    - Birth or adoption of a child
    - Loss of other coverage
    - Moving to a new area
    - Change in employment status
    You typically have 30-60 days after the event to make changes.`,
  },
  fsa: {
    title: 'Flexible Spending Account (FSA)',
    content: `An FSA lets you set aside pre-tax money for medical expenses. Key features:
    - "Use it or lose it" - funds expire at year end (some plans allow small rollover)
    - 2025 contribution limit: $3,300
    - Can be used alongside any health plan
    - Covers medical, dental, and vision expenses
    - Cannot have both HSA and healthcare FSA`,
  },
};

// Suggested questions based on context
const CONTEXTUAL_SUGGESTIONS: Record<string, string[]> = {
  landing: [
    "What's the difference between Counselor and Go mode?",
    "How long does this process take?",
    "Can I change my selection later?",
  ],
  coverage: [
    "Should I add my spouse to my plan or keep them on their own?",
    "What's the difference between Employee+Spouse and Family coverage?",
    "Can I add a domestic partner?",
  ],
  usage: [
    "How do I estimate my doctor visits?",
    "What counts as a specialist visit?",
    "Should I include telehealth visits?",
  ],
  prescriptions: [
    "How do I find out what tier my medication is?",
    "Is there a generic alternative to my brand medication?",
    "What if my medication requires prior authorization?",
  ],
  recommendations: [
    "Why is this plan recommended for me?",
    "What would change if I had a baby next year?",
    "How accurate are these cost estimates?",
  ],
  hsa: [
    "How much should I contribute to my HSA?",
    "Can I use HSA funds for my spouse?",
    "What happens to my HSA if I leave the company?",
  ],
};

export class ChatbotService {
  private anthropic: Anthropic | null = null;

  constructor() {
    if (config.anthropic.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.anthropic.apiKey,
      });
    } else {
      logger.warn('Anthropic API key not configured - chatbot features limited');
    }
  }

  /**
   * Process a chat message and generate response
   */
  async processMessage(
    message: string,
    context: ChatContext
  ): Promise<ChatResponse> {
    // Get conversation history
    const history = await this.getConversationHistory(context.sessionId);
    
    // Add new message to history
    history.push({ role: 'user', content: message, timestamp: new Date() });

    // Check for escalation triggers
    const escalation = this.checkEscalationTriggers(message);
    if (escalation.needsEscalation) {
      return {
        message: escalation.message,
        needsEscalation: true,
        escalationReason: escalation.reason,
        suggestedQuestions: this.getSuggestedQuestions(context),
      };
    }

    // Get relevant knowledge
    const relevantKnowledge = this.retrieveRelevantKnowledge(message);
    
    // Get plan-specific context if available
    const planContext = await this.getPlanContext(context);

    // Generate response
    let response: string;
    let sources: { title: string; excerpt: string }[] = [];

    if (this.anthropic) {
      const result = await this.generateAIResponse(message, history, relevantKnowledge, planContext, context);
      response = result.response;
      sources = result.sources;
    } else {
      // Fallback to rule-based responses
      const result = this.generateFallbackResponse(message, relevantKnowledge);
      response = result.response;
      sources = result.sources;
    }

    // Save to conversation history
    await this.saveMessage(context.sessionId, 'user', message);
    await this.saveMessage(context.sessionId, 'assistant', response);

    return {
      message: response,
      suggestedQuestions: this.getSuggestedQuestions(context),
      sources: sources.length > 0 ? sources : undefined,
    };
  }

  /**
   * Generate AI response using Claude
   */
  private async generateAIResponse(
    message: string,
    history: ChatMessage[],
    knowledge: typeof BENEFITS_KNOWLEDGE_BASE[keyof typeof BENEFITS_KNOWLEDGE_BASE][],
    planContext: string,
    context: ChatContext
  ): Promise<{ response: string; sources: { title: string; excerpt: string }[] }> {
    const systemPrompt = `You are a helpful benefits counselor assistant for TouchCare. Your role is to help employees understand their health insurance options and make informed decisions.

Guidelines:
- Be warm, friendly, and conversational
- Explain complex insurance terms in simple language
- Be accurate - if you're not sure, say so
- Don't provide medical advice
- Encourage users to consult HR for company-specific questions
- Keep responses concise but thorough

Current context:
${planContext}

Relevant knowledge base information:
${knowledge.map(k => `[${k.title}]: ${k.content}`).join('\n\n')}

If the user's question cannot be answered with the available information, politely explain that and suggest they contact HR or a benefits counselor.`;

    const messages = history.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    try {
      const response = await this.anthropic!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages,
      });

      const textContent = response.content.find(c => c.type === 'text');
      const responseText = textContent ? textContent.text : "I'm sorry, I couldn't generate a response. Please try again.";

      // Extract sources that were used
      const sources = knowledge
        .filter(k => responseText.toLowerCase().includes(k.title.toLowerCase().split(' ')[0]))
        .map(k => ({ title: k.title, excerpt: k.content.substring(0, 150) + '...' }));

      return { response: responseText, sources };
    } catch (error) {
      logger.error('AI response generation failed', { error });
      return this.generateFallbackResponse(message, knowledge);
    }
  }

  /**
   * Fallback rule-based response
   */
  private generateFallbackResponse(
    message: string,
    knowledge: typeof BENEFITS_KNOWLEDGE_BASE[keyof typeof BENEFITS_KNOWLEDGE_BASE][]
  ): { response: string; sources: { title: string; excerpt: string }[] } {
    const lowerMessage = message.toLowerCase();

    // Check for specific topics
    if (lowerMessage.includes('hsa') || lowerMessage.includes('health savings')) {
      const hsa = BENEFITS_KNOWLEDGE_BASE.hsa;
      return {
        response: `Great question about HSAs! ${hsa.content.split('.').slice(0, 3).join('.')}. Would you like to know more about the tax benefits or contribution limits?`,
        sources: [{ title: hsa.title, excerpt: hsa.content.substring(0, 150) + '...' }],
      };
    }

    if (lowerMessage.includes('deductible')) {
      const ded = BENEFITS_KNOWLEDGE_BASE.deductible;
      return {
        response: `The deductible is an important concept! ${ded.content.split('.').slice(0, 3).join('.')}. Is there a specific aspect of deductibles you'd like me to explain further?`,
        sources: [{ title: ded.title, excerpt: ded.content.substring(0, 150) + '...' }],
      };
    }

    if (lowerMessage.includes('ppo') || lowerMessage.includes('hmo')) {
      const planType = lowerMessage.includes('ppo') ? BENEFITS_KNOWLEDGE_BASE.ppo : BENEFITS_KNOWLEDGE_BASE.hmo;
      return {
        response: `${planType.content.split('.').slice(0, 4).join('.')}. Would you like me to compare this with other plan types?`,
        sources: [{ title: planType.title, excerpt: planType.content.substring(0, 150) + '...' }],
      };
    }

    if (lowerMessage.includes('life event') || lowerMessage.includes('qualify')) {
      const le = BENEFITS_KNOWLEDGE_BASE.life_event;
      return {
        response: le.content,
        sources: [{ title: le.title, excerpt: le.content.substring(0, 150) + '...' }],
      };
    }

    // Default response
    return {
      response: "I'd be happy to help you understand your benefits options! I can explain topics like HSAs, deductibles, different plan types (PPO, HMO, HDHP), and help you understand what factors to consider when choosing a plan. What would you like to know more about?",
      sources: [],
    };
  }

  /**
   * Retrieve relevant knowledge based on query
   */
  private retrieveRelevantKnowledge(query: string): typeof BENEFITS_KNOWLEDGE_BASE[keyof typeof BENEFITS_KNOWLEDGE_BASE][] {
    const lowerQuery = query.toLowerCase();
    const relevant: typeof BENEFITS_KNOWLEDGE_BASE[keyof typeof BENEFITS_KNOWLEDGE_BASE][] = [];

    const keywords: Record<string, (keyof typeof BENEFITS_KNOWLEDGE_BASE)[]> = {
      'hsa': ['hsa', 'hdhp'],
      'health savings': ['hsa', 'hdhp'],
      'high deductible': ['hdhp', 'hsa'],
      'hdhp': ['hdhp', 'hsa'],
      'ppo': ['ppo'],
      'hmo': ['hmo'],
      'deductible': ['deductible', 'coinsurance', 'oop_max'],
      'copay': ['coinsurance', 'deductible'],
      'coinsurance': ['coinsurance', 'deductible'],
      'out of pocket': ['oop_max', 'deductible'],
      'maximum': ['oop_max'],
      'life event': ['life_event'],
      'qualifying': ['life_event'],
      'fsa': ['fsa'],
      'flexible spending': ['fsa'],
    };

    for (const [keyword, topics] of Object.entries(keywords)) {
      if (lowerQuery.includes(keyword)) {
        for (const topic of topics) {
          if (!relevant.find(r => r.title === BENEFITS_KNOWLEDGE_BASE[topic].title)) {
            relevant.push(BENEFITS_KNOWLEDGE_BASE[topic]);
          }
        }
      }
    }

    return relevant.slice(0, 3); // Limit to 3 most relevant
  }

  /**
   * Get plan-specific context
   */
  private async getPlanContext(context: ChatContext): Promise<string> {
    if (!context.selectedPlanId && !context.comparisonPlanIds?.length) {
      return 'User has not selected any plans yet.';
    }

    const planIds = [
      context.selectedPlanId,
      ...(context.comparisonPlanIds || []),
    ].filter(Boolean);

    if (planIds.length === 0) return '';

    const result = await query<any>(
      `SELECT name, type, hsa_eligible, deductibles, oop_max FROM plans WHERE id = ANY($1)`,
      [planIds]
    );

    if (result.rows.length === 0) return '';

    return `User is considering these plans:\n${result.rows.map((p: any) => 
      `- ${p.name} (${p.type}): Deductible $${p.deductibles.individual}, OOP Max $${p.oop_max.individual}${p.hsa_eligible ? ', HSA Eligible' : ''}`
    ).join('\n')}`;
  }

  /**
   * Check for escalation triggers
   */
  private checkEscalationTriggers(message: string): { needsEscalation: boolean; message: string; reason: string } {
    const lowerMessage = message.toLowerCase();

    // Urgent/frustrated language
    if (
      lowerMessage.includes('speak to someone') ||
      lowerMessage.includes('talk to a person') ||
      lowerMessage.includes('human') ||
      lowerMessage.includes('representative')
    ) {
      return {
        needsEscalation: true,
        message: "I understand you'd like to speak with someone directly. I can help connect you with a benefits counselor. Would you like me to schedule a callback, or would you prefer to use the live chat option?",
        reason: 'User requested human assistance',
      };
    }

    // Complex/specific questions
    if (
      lowerMessage.includes('my specific') ||
      lowerMessage.includes('my exact') ||
      lowerMessage.includes('my particular')
    ) {
      return {
        needsEscalation: true,
        message: "For questions specific to your individual situation, I'd recommend speaking with a benefits counselor who can review your details. Would you like me to help arrange that?",
        reason: 'Question requires personalized review',
      };
    }

    // Claims/billing issues
    if (
      lowerMessage.includes('claim denied') ||
      lowerMessage.includes('billing issue') ||
      lowerMessage.includes('wrong charge')
    ) {
      return {
        needsEscalation: true,
        message: "I'm sorry you're dealing with a billing or claims issue. These situations are best handled by speaking directly with a benefits representative who can look into your specific case. Would you like me to connect you?",
        reason: 'Claims/billing issue requires human review',
      };
    }

    return { needsEscalation: false, message: '', reason: '' };
  }

  /**
   * Get contextual suggested questions
   */
  private getSuggestedQuestions(context: ChatContext): string[] {
    const step = context.currentStep;

    if (step === undefined || step === 0) {
      return CONTEXTUAL_SUGGESTIONS.landing;
    } else if (step === 1) {
      return CONTEXTUAL_SUGGESTIONS.coverage;
    } else if (step >= 2 && step <= 4) {
      return CONTEXTUAL_SUGGESTIONS.usage;
    } else if (step === 5) {
      return CONTEXTUAL_SUGGESTIONS.prescriptions;
    } else if (context.selectedPlanId) {
      if (context.profileData?.selectedPlan?.hsaEligible) {
        return CONTEXTUAL_SUGGESTIONS.hsa;
      }
      return CONTEXTUAL_SUGGESTIONS.recommendations;
    }

    return [
      "What's the difference between an HSA and FSA?",
      "How do I know if I need a PPO or HMO?",
      "What is coinsurance?",
    ];
  }

  /**
   * Get conversation history from database
   */
  private async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    const result = await query<any>(
      `SELECT messages FROM chat_conversations WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [sessionId]
    );

    if (result.rows.length === 0) return [];

    return (result.rows[0].messages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
    }));
  }

  /**
   * Save message to conversation history
   */
  private async saveMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    await query(
      `INSERT INTO chat_conversations (session_id, messages)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (session_id) DO UPDATE SET
         messages = chat_conversations.messages || $2::jsonb,
         updated_at = NOW()`,
      [sessionId, JSON.stringify([{ role, content, timestamp: new Date().toISOString() }])]
    );
  }

  /**
   * Summarize conversation for context
   */
  async summarizeConversation(sessionId: string): Promise<string> {
    const history = await this.getConversationHistory(sessionId);
    
    if (history.length === 0) return '';
    if (history.length < 5) {
      return history.map(m => `${m.role}: ${m.content}`).join('\n');
    }

    // For longer conversations, summarize with AI
    if (this.anthropic) {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `Summarize this benefits conversation in 2-3 sentences:\n\n${history.map(m => `${m.role}: ${m.content}`).join('\n')}`,
          }],
        });

        const textContent = response.content.find(c => c.type === 'text');
        return textContent ? textContent.text : '';
      } catch (error) {
        logger.error('Failed to summarize conversation', { error });
      }
    }

    // Fallback: return last few messages
    return history.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n');
  }
}

export const chatbotService = new ChatbotService();
