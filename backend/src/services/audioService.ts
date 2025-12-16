import { config } from '../config/env';
import { logger } from '../utils/logger';
import { query } from '../config/database';
import crypto from 'crypto';

interface AudioGenerationOptions {
  text: string;
  voiceId?: string;
  language?: 'en' | 'es';
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

interface AudioCacheEntry {
  id: string;
  text_hash: string;
  voice_id: string;
  language: string;
  audio_url: string;
  duration_seconds: number;
}

// ElevenLabs API configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Voice IDs for different languages/styles
const VOICE_IDS = {
  en: {
    default: '21m00Tcm4TlvDq8ikWAM', // Rachel - warm, professional
    alternate: 'AZnzlk1XvdvUeBnXmlld', // Domi - friendly
  },
  es: {
    default: 'GBv7mTt0atIp3Br8iCZE', // Spanish voice
    alternate: 'TX3LPaxmHKxFdv7VOQHJ', // Spanish alternate
  },
};

export class AudioService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = config.elevenLabs.apiKey;
    if (!this.apiKey) {
      logger.warn('ElevenLabs API key not configured - audio features disabled');
    }
  }

  /**
   * Generate a hash for caching audio
   */
  private generateTextHash(text: string, voiceId: string, language: string): string {
    return crypto
      .createHash('sha256')
      .update(`${text}:${voiceId}:${language}`)
      .digest('hex');
  }

  /**
   * Check if audio is cached
   */
  private async getCachedAudio(textHash: string): Promise<AudioCacheEntry | null> {
    const result = await query<AudioCacheEntry>(
      `SELECT * FROM audio_cache WHERE text_hash = $1 AND expires_at > NOW()`,
      [textHash]
    );
    return result.rows[0] || null;
  }

  /**
   * Store audio in cache
   */
  private async cacheAudio(
    textHash: string,
    voiceId: string,
    language: string,
    audioUrl: string,
    durationSeconds: number
  ): Promise<void> {
    await query(
      `INSERT INTO audio_cache (text_hash, voice_id, language, audio_url, duration_seconds)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (text_hash) DO UPDATE SET
         audio_url = EXCLUDED.audio_url,
         duration_seconds = EXCLUDED.duration_seconds,
         expires_at = NOW() + INTERVAL '30 days'`,
      [textHash, voiceId, language, audioUrl, durationSeconds]
    );
  }

  /**
   * Generate speech using ElevenLabs API
   */
  async generateSpeech(options: AudioGenerationOptions): Promise<{
    audioUrl: string;
    durationSeconds: number;
    cached: boolean;
  }> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const {
      text,
      voiceId = config.elevenLabs.voiceId,
      language = 'en',
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0.3,
    } = options;

    // Use language-appropriate voice if not specified
    const finalVoiceId = voiceId || VOICE_IDS[language]?.default || VOICE_IDS.en.default;

    // Check cache first
    const textHash = this.generateTextHash(text, finalVoiceId, language);
    const cached = await this.getCachedAudio(textHash);

    if (cached) {
      logger.debug('Audio cache hit', { textHash: textHash.substring(0, 8) });
      return {
        audioUrl: cached.audio_url,
        durationSeconds: cached.duration_seconds,
        cached: true,
      };
    }

    logger.info('Generating audio with ElevenLabs', {
      textLength: text.length,
      voiceId: finalVoiceId,
      language,
    });

    try {
      const response = await fetch(
        `${ELEVENLABS_API_URL}/text-to-speech/${finalVoiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability,
              similarity_boost: similarityBoost,
              style,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        logger.error('ElevenLabs API error', { status: response.status, error });
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      // Get audio buffer
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

      // Estimate duration (rough: ~150 words per minute, ~5 chars per word)
      const estimatedDuration = (text.length / 5 / 150) * 60;

      // Cache the result
      await this.cacheAudio(textHash, finalVoiceId, language, audioUrl, estimatedDuration);

      return {
        audioUrl,
        durationSeconds: estimatedDuration,
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate audio', { error });
      throw error;
    }
  }

  /**
   * Generate audio for a counselor step
   */
  async generateStepAudio(
    step: number,
    language: 'en' | 'es' = 'en'
  ): Promise<{
    narration: { audioUrl: string; durationSeconds: number };
    question?: { audioUrl: string; durationSeconds: number };
  }> {
    const scripts = COUNSELOR_SCRIPTS[language] || COUNSELOR_SCRIPTS.en;
    const stepScript = scripts[step];

    if (!stepScript) {
      throw new Error(`No script found for step ${step}`);
    }

    const narration = await this.generateSpeech({
      text: stepScript.narration,
      language,
    });

    let question;
    if (stepScript.question) {
      question = await this.generateSpeech({
        text: stepScript.question,
        language,
      });
    }

    return { narration, question };
  }

  /**
   * Pre-generate audio for all steps (for caching)
   */
  async preGenerateAllAudio(language: 'en' | 'es' = 'en'): Promise<void> {
    const scripts = COUNSELOR_SCRIPTS[language] || COUNSELOR_SCRIPTS.en;

    logger.info('Pre-generating audio for all steps', { language, stepCount: Object.keys(scripts).length });

    for (const [step, script] of Object.entries(scripts)) {
      try {
        await this.generateStepAudio(parseInt(step), language);
        logger.debug(`Generated audio for step ${step}`);
      } catch (error) {
        logger.error(`Failed to generate audio for step ${step}`, { error });
      }
    }

    logger.info('Pre-generation complete');
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<any[]> {
    if (!this.apiKey) {
      return [];
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json() as { voices: unknown[] };
    return data.voices;
  }
}

// Counselor mode narration scripts
export const COUNSELOR_SCRIPTS: Record<string, Record<number, { narration: string; question?: string; transition?: string }>> = {
  en: {
    0: {
      narration: "Hi there! I'm your benefits guide, and I'm here to help you find the best health plan for you and your family. This might seem overwhelming, but don't worry – we'll take it step by step, and I'll explain everything along the way.",
      question: "First, let me ask: who will be covered under your plan?",
    },
    1: {
      narration: "Great choice! Now, let's talk about your overall health. This helps us estimate your potential medical needs.",
      question: "How would you describe your general health status?",
    },
    2: {
      narration: "Now, let's talk about how often you typically see doctors. This helps us understand which plan features matter most for you.",
      question: "How often do you usually visit your primary care doctor in a typical year?",
    },
    3: {
      narration: "Now, do you have any major medical events planned? This could include things like having a baby, a scheduled surgery, or other significant procedures.",
      question: "Are any major procedures planned for next year?",
    },
    4: {
      narration: "Let's talk about prescriptions. The medications you take regularly can significantly affect which plan is most cost-effective for you.",
      question: "What prescription medications do you or your family members take regularly?",
    },
    5: {
      narration: "Now for a quick financial check. This helps us determine if a high-deductible plan is safe for you.",
      question: "If you had a $500 medical bill today, could you pay it comfortably?",
    },
    6: {
      narration: "Some plans offer tax-free savings accounts like HSAs, but they require a bit more management.",
      question: "Do you want to manage a tax-free savings account to save money, or do you prefer to keep things simple?",
    },
    7: {
      narration: "Now for something really important – your comfort level with financial risk. Some people prefer paying more each month to avoid surprise bills, while others are willing to take on more risk to save on premiums.",
      question: "Which best describes your approach to healthcare costs?",
    },
    8: {
      narration: "Almost there! One more question about your financial comfort zone.",
      question: "What's the maximum unexpected medical bill you could handle comfortably?",
    },
    9: {
      narration: "Last question – this helps us calculate your potential tax savings if you choose a plan with a Health Savings Account.",
      question: "What's your approximate household income range?",
    },
    10: {
      narration: "Wonderful! I've analyzed all the available plans based on your answers. Let me walk you through my recommendations. Remember, the 'best' plan is different for everyone – it depends on your unique situation.",
    },
  },
  es: {
    0: {
      narration: "¡Hola! Soy tu guía de beneficios y estoy aquí para ayudarte a encontrar el mejor plan de salud para ti y tu familia. Esto puede parecer abrumador, pero no te preocupes – lo haremos paso a paso y te explicaré todo en el camino.",
      question: "Primero, déjame preguntarte: ¿quién estará cubierto bajo tu plan?",
    },
    1: {
      narration: "¡Excelente elección! Ahora, hablemos de tu salud general. Esto nos ayuda a estimar tus necesidades médicas potenciales.",
      question: "¿Cómo describirías tu estado de salud general?",
    },
    2: {
      narration: "Ahora, hablemos de con qué frecuencia visitas a los médicos normalmente. Esto nos ayuda a entender qué características del plan son más importantes para ti.",
      question: "¿Con qué frecuencia visitas a tu médico de atención primaria en un año típico?",
    },
    3: {
      narration: "Ahora, ¿tienes algún evento médico importante planeado? Esto podría incluir cosas como tener un bebé, una cirugía programada u otros procedimientos significativos.",
      question: "¿Hay algún procedimiento importante planeado para el próximo año?",
    },
    4: {
      narration: "Hablemos de recetas médicas. Los medicamentos que tomas regularmente pueden afectar significativamente qué plan es más económico para ti.",
      question: "¿Qué medicamentos recetados tomas tú o los miembros de tu familia regularmente?",
    },
    5: {
      narration: "Ahora una rápida verificación financiera. Esto nos ayuda a determinar si un plan con deducible alto es seguro para ti.",
      question: "Si tuvieras una factura médica de $500 hoy, ¿podrías pagarla cómodamente?",
    },
    6: {
      narration: "Algunos planes ofrecen cuentas de ahorro libres de impuestos como las HSA, pero requieren un poco más de gestión.",
      question: "¿Quieres gestionar una cuenta de ahorros libre de impuestos para ahorrar dinero, o prefieres mantener las cosas simples?",
    },
    7: {
      narration: "Ahora algo muy importante – tu nivel de comodidad con el riesgo financiero. Algunas personas prefieren pagar más cada mes para evitar facturas sorpresa, mientras que otras están dispuestas a asumir más riesgo para ahorrar en primas.",
      question: "¿Cuál describe mejor tu enfoque hacia los costos de atención médica?",
    },
    8: {
      narration: "¡Ya casi terminamos! Una pregunta más sobre tu zona de confort financiero.",
      question: "¿Cuál es la factura médica inesperada máxima que podrías manejar cómodamente?",
    },
    9: {
      narration: "Última pregunta – esto nos ayuda a calcular tus posibles ahorros de impuestos si eliges un plan con una Cuenta de Ahorros para la Salud.",
      question: "¿Cuál es tu rango aproximado de ingresos del hogar?",
    },
    10: {
      narration: "¡Maravilloso! He analizado todos los planes disponibles basándome en tus respuestas. Déjame explicarte mis recomendaciones. Recuerda, el 'mejor' plan es diferente para cada persona – depende de tu situación única.",
    },
  },
};

// Response scripts based on user selections
export const RESPONSE_SCRIPTS: Record<string, Record<string, Record<string, string>>> = {
  en: {
    coverageType: {
      employee: "Just yourself – got it! That keeps things simple.",
      employee_spouse: "You and your spouse – that's great for coordinating care together.",
      employee_children: "You and your children – family coverage is so important.",
      family: "Full family coverage – we'll make sure everyone is protected.",
    },
    riskTolerance: {
      avoid_surprises: "I completely understand wanting predictable costs. We'll focus on plans with lower deductibles and out-of-pocket maximums.",
      balanced: "A balanced approach is smart. We'll find plans that offer good protection without the highest premiums.",
      minimize_premium: "If you're generally healthy and want to save on monthly costs, we can definitely find options that work.",
    },
  },
  es: {
    coverageType: {
      employee: "Solo tú – ¡entendido! Eso mantiene las cosas simples.",
      employee_spouse: "Tú y tu cónyuge – eso es genial para coordinar la atención juntos.",
      employee_children: "Tú y tus hijos – la cobertura familiar es muy importante.",
      family: "Cobertura familiar completa – nos aseguraremos de que todos estén protegidos.",
    },
    riskTolerance: {
      avoid_surprises: "Entiendo completamente que quieras costos predecibles. Nos enfocaremos en planes con deducibles y máximos de gastos de bolsillo más bajos.",
      balanced: "Un enfoque equilibrado es inteligente. Encontraremos planes que ofrezcan buena protección sin las primas más altas.",
      minimize_premium: "Si generalmente estás saludable y quieres ahorrar en costos mensuales, definitivamente podemos encontrar opciones que funcionen.",
    },
  },
};

export const audioService = new AudioService();
