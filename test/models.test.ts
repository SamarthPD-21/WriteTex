import { describe, expect, it } from 'vitest';
import { AVAILABLE_MODELS, DEFAULT_SETTINGS } from '../src/messaging/types';

describe('Model Catalog & Defaults', () => {
  it('default model is gemini-3.8-flash for ultra-fast sub-second latency', () => {
    expect(DEFAULT_SETTINGS.model).toBe('gemini-3.8-flash');
  });

  it('includes Meta Spark 1.2 and 1.3 models with efficiency badges', () => {
    const metaModels = AVAILABLE_MODELS.meta;
    expect(metaModels).toBeDefined();

    const spark13 = metaModels.find((m) => m.id === 'muse-spark-1.3');
    expect(spark13).toBeDefined();
    expect(spark13?.name).toBe('Meta Spark 1.3');
    expect(spark13?.badge).toBe('Latest');

    const spark12 = metaModels.find((m) => m.id === 'muse-spark-1.2');
    expect(spark12).toBeDefined();
    expect(spark12?.name).toBe('Meta Spark 1.2');
    expect(spark12?.badge).toBe('Fast');

    const llama33 = metaModels.find((m) => m.id === 'llama-3.3-70b-instruct');
    expect(llama33).toBeDefined();
    expect(llama33?.badge).toBe('Efficient');
  });

  it('includes Gemini models (3.8, 3.6, 3.5, Gemma 31B IT, 2.0-flash, 2.5-flash)', () => {
    const geminiModels = AVAILABLE_MODELS.gemini;
    expect(geminiModels).toBeDefined();

    const g38 = geminiModels.find((m) => m.id === 'gemini-3.8-flash');
    expect(g38).toBeDefined();
    expect(g38?.badge).toBe('Latest');

    const g36 = geminiModels.find((m) => m.id === 'gemini-3.6-flash');
    expect(g36).toBeDefined();
    expect(g36?.badge).toBe('Fast');

    const g35 = geminiModels.find((m) => m.id === 'gemini-3.5-flash');
    expect(g35).toBeDefined();
    expect(g35?.badge).toBe('Efficient');

    const gemma = geminiModels.find((m) => m.id === 'gemma-31b-it');
    expect(gemma).toBeDefined();
    expect(gemma?.name).toBe('Gemma 3 31B IT');

    const g20Flash = geminiModels.find((m) => m.id === 'gemini-2.0-flash');
    expect(g20Flash).toBeDefined();

    const g25Flash = geminiModels.find((m) => m.id === 'gemini-2.5-flash');
    expect(g25Flash).toBeDefined();
  });

  it('supports all 4 major AI providers', () => {
    const providers = Object.keys(AVAILABLE_MODELS);
    expect(providers).toContain('meta');
    expect(providers).toContain('gemini');
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
  });
});
