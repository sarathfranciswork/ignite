import { logger } from "@/server/lib/logger";

const childLogger = logger.child({ service: "translation-provider" });

export interface TranslationProviderAdapter {
  translate(text: string, targetLocale: string, sourceLocale?: string): Promise<string>;
  batchTranslate(texts: string[], targetLocale: string, sourceLocale?: string): Promise<string[]>;
}

export class DeepLAdapter implements TranslationProviderAdapter {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api-free.deepl.com/v2/translate";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async translate(text: string, targetLocale: string, sourceLocale?: string): Promise<string> {
    const results = await this.batchTranslate([text], targetLocale, sourceLocale);
    return results[0];
  }

  async batchTranslate(
    texts: string[],
    targetLocale: string,
    sourceLocale?: string,
  ): Promise<string[]> {
    const body: Record<string, unknown> = {
      text: texts,
      target_lang: targetLocale.toUpperCase().replace("-", "-"),
    };

    if (sourceLocale) {
      body.source_lang = sourceLocale.toUpperCase().split("-")[0];
    }

    childLogger.info(
      { targetLocale, textCount: texts.length },
      "Sending batch translation request to DeepL",
    );

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      childLogger.error({ status: response.status, errorText }, "DeepL API request failed");
      throw new Error(`DeepL API error: ${String(response.status)} ${errorText}`);
    }

    const data = (await response.json()) as {
      translations: Array<{ text: string }>;
    };

    return data.translations.map((t) => t.text);
  }
}

export class GoogleTranslateAdapter implements TranslationProviderAdapter {
  private readonly apiKey: string;
  private readonly baseUrl = "https://translation.googleapis.com/language/translate/v2";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async translate(text: string, targetLocale: string, sourceLocale?: string): Promise<string> {
    const results = await this.batchTranslate([text], targetLocale, sourceLocale);
    return results[0];
  }

  async batchTranslate(
    texts: string[],
    targetLocale: string,
    sourceLocale?: string,
  ): Promise<string[]> {
    const body: Record<string, unknown> = {
      q: texts,
      target: targetLocale.split("-")[0],
      format: "text",
    };

    if (sourceLocale) {
      body.source = sourceLocale.split("-")[0];
    }

    childLogger.info(
      { targetLocale, textCount: texts.length },
      "Sending batch translation request to Google Translate",
    );

    const url = `${this.baseUrl}?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      childLogger.error(
        { status: response.status, errorText },
        "Google Translate API request failed",
      );
      throw new Error(`Google Translate API error: ${String(response.status)} ${errorText}`);
    }

    const data = (await response.json()) as {
      data: { translations: Array<{ translatedText: string }> };
    };

    return data.data.translations.map((t) => t.translatedText);
  }
}

export function createProvider(
  provider: "DEEPL" | "GOOGLE",
  apiKey: string,
): TranslationProviderAdapter {
  switch (provider) {
    case "DEEPL":
      return new DeepLAdapter(apiKey);
    case "GOOGLE":
      return new GoogleTranslateAdapter(apiKey);
  }
}
