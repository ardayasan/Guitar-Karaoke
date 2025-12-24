// services/audio/chord/matching.ts

/**
 * Utilities for matching chroma vectors
 * against resolved chord templates.
 * 
 * IMPORTANT!!! ----> This matching algorithm uses COSINE SIMILARITY
 * Sadece cosine similarity bakar. Akor çıkarmaz
 */
export function matchTemplateToChroma(
        chroma: number[],
        templatePitchClasses: number[]
    ): number {
    const templateVector = new Array(12).fill(0);

    for (const pc of templatePitchClasses) {
        templateVector[pc] = 1;
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < 12; i++) {
        dot += chroma[i] * templateVector[i];
        normA += chroma[i] * chroma[i];
        normB += templateVector[i] * templateVector[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
