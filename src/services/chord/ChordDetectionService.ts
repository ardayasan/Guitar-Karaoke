/**
 * ChordDetectionService
 * --------------------------------------------------
 * Real-time chord detection service (v1).
 *
 * Pipeline:
 *   Audio samples
 *     → Chroma vector
 *     → Template matching
 *     → Best chord decision
 *     → ChordCandidate | null
 *
 * NOTE:
 * This service DOES NOT decide whether a chord is
 * musically meaningful. It only produces raw analysis
 * results. Semantic decisions are handled by AudioPipeline.
 */

import {
    ChordDetectionService as IChordDetectionService,
    ChordDetectionResult,
} from './ChordDetectionTypes';

import { computeChromaVector } from './Chroma';
import { generateAllResolvedTemplates } from './ChordTemplates';
import { findBestChordCandidate } from './utils/decision';

/* -------------------------------------------------- */
/* Constants                                          */
/* -------------------------------------------------- */

const DEFAULT_SAMPLE_RATE = 44100;

/* -------------------------------------------------- */
/* Service Implementation                             */
/* -------------------------------------------------- */

export class ChordDetectionService
    implements IChordDetectionService
{
    /* ---------------------------------------------- */
    /* Internal State                                 */
    /* ---------------------------------------------- */

    private sampleRate: number = DEFAULT_SAMPLE_RATE;
    private running: boolean = false;

    private callback:
        | ((result: ChordDetectionResult | null) => void)
        | null = null;

    /**
     * Pre-generated chord templates (C major, C minor, ... B minor)
     * Generated once and reused for performance.
     */
    private readonly templates = generateAllResolvedTemplates();

    /* ---------------------------------------------- */
    /* Lifecycle                                      */
    /* ---------------------------------------------- */

    start(
        callback: (result: ChordDetectionResult | null) => void
    ): void {
        if (this.running) return;

        this.running = true;
        this.callback = callback;
    }

    stop(): void {
        if (!this.running) return;

        this.running = false;
        this.callback = null;
    }

    setSampleRate(sampleRate: number): void {
        this.sampleRate = sampleRate;
    }

    /* ---------------------------------------------- */
    /* Main Processing                                */
    /* ---------------------------------------------- */

    processSamples(
        samples: Float32Array,
        timestamp: number
    ): void {
        if (!this.running || !this.callback) return;
        if (!samples || samples.length === 0) return;

        /* FFT → Chroma (chroma vector oluşturuluyor) */
        const chroma = computeChromaVector(
            samples,
            this.sampleRate
        );

        /* Total chroma energy (used by pipeline for gating) */
        const chromaEnergy = chroma.reduce(
            (sum, v) => sum + v,
            0
        );

        /* Template matching → Best chord (cosine sim. + decision.ts) */
        const candidate = findBestChordCandidate(
            chroma,
            this.templates
        );

        /* Emit raw analysis result */
        const result: ChordDetectionResult = {
            timestamp,
            candidate,
            chroma,
            chromaEnergy,
        };

        this.callback(result);
    }
}
