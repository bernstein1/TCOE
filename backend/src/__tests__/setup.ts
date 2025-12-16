// Test setup file
import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/touchcare_test';

// Mock external services
jest.mock('../services/audioService', () => ({
  AudioService: {
    generateStepAudio: jest.fn().mockResolvedValue({
      narration: {
        text: 'Test narration',
        audioUrl: 'https://example.com/audio.mp3',
        duration: 10,
      },
    }),
  },
}));

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Test AI response' }],
      }),
    },
  })),
}));

// Increase timeout for async tests
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Close any open connections
});
