import { describe, expect, it } from 'vitest';
import { AVAILABLE_MODELS, DEFAULT_SETTINGS } from '../src/messaging/types';

describe('Model Catalog & Defaults', () => {
  it('default model is gemini-3.1-pro-preview, avoiding deprecated gemini-2.5-pro', () => {
    expect(DEFAULT_SETTINGS.model).toBe('gemini-3.1-pro-preview');
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

  it('includes latest and efficient Gemini models', () => {
    const geminiModels = AVAILABLE_MODELS.gemini;
    expect(geminiModels).toBeDefined();

    const g31 = geminiModels.find((m) => m.id === 'gemini-3.1-pro-preview');
    expect(g31).toBeDefined();
    expect(g31?.badge).toBe('Latest');

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
