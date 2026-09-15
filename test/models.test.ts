import { describe, expect, it } from 'vitest';
import { AVAILABLE_MODELS, DEFAULT_SETTINGS } from '../src/messaging/types';

describe('Model Catalog & Defaults', () => {
  it('default model is gemini-3.8-flash for ultra-fast latency', () => {
    expect(DEFAULT_SETTINGS.model).toBe('gemini-3.8-flash');
    expect(DEFAULT_SETTINGS.model).not.toBe('gemini-2.5-pro');
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

  it('includes latest Gemini Flash models (3.8, 3.7, 3.6, 3.5, 2.0)', () => {
    const geminiModels = AVAILABLE_MODELS.gemini;
    expect(geminiModels).toBeDefined();

    const g38 = geminiModels.find((m) => m.id === 'gemini-3.8-flash');
    expect(g38).toBeDefined();
    expect(g38?.badge).toBe('Latest');

    const g37 = geminiModels.find((m) => m.id === 'gemini-3.7-flash');
    expect(g37).toBeDefined();

    const g36 = geminiModels.find((m) => m.id === 'gemini-3.6-flash');
    expect(g36).toBeDefined();

    const g35 = geminiModels.find((m) => m.id === 'gemini-3.5-flash');
    expect(g35).toBeDefined();

    const g20Flash = geminiModels.find((m) => m.id === 'gemini-2.0-flash');
    expect(g20Flash).toBeDefined();
    expect(g20Flash?.badge).toBe('Efficient');

    // Ensure deprecated gemini-2.5-pro is excluded
    const deprecated = geminiModels.find((m) => m.id === 'gemini-2.5-pro');
    expect(deprecated).toBeUndefined();
  });

  it('supports all 4 major AI providers', () => {
    const providers = Object.keys(AVAILABLE_MODELS);
    expect(providers).toContain('meta');
    expect(providers).toContain('gemini');
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
  });
});
