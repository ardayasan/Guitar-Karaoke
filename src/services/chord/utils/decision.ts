// services/audio/chord/utils/decision.ts


/*
 * Akor kararı burada verilir
 */

import {
    ChordCandidate,
    ResolvedChordTemplate,
} from '../ChordDetectionTypes';
import { matchTemplateToChroma } from './matching';

const MIN_CONFIDENCE = 0.65;

export function findBestChordCandidate(
    chroma: number[],
    templates: ResolvedChordTemplate[]
): ChordCandidate | null {
    let bestScore = 0;
    let bestTemplate: ResolvedChordTemplate | null = null;

    for (const template of templates) {
        const score = matchTemplateToChroma(
        chroma,
        template.pitchClasses
        );

        if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
        }
    }

    if (!bestTemplate || bestScore < MIN_CONFIDENCE) {
        return null;
    }

    return {
        root: bestTemplate.root,
        quality: bestTemplate.quality,
        confidence: bestScore,
    };
}
