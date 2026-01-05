// types/audio/AudioDetection.ts

/*
 * AudioPipeline girdileri için kontrat (Native taraf bu kontrata uymalı)
 */

/**
 * CONTRACT RULES
 * --------------
 * - Either NOTE or CHORD is present, never both
 * - confidence is always present
 * - timestamp is always present
 * - null payload represents SILENCE
 * - Native decides all semantic meaning
 */


export interface AudioDetection {
    timestamp: number;   // ms, native audio clock
    confidence: number;  // 0..1

    // NOTE detection
    note?: {
        name: string;
        octave: number;
    };
    frequency?: number;
    amplitude?: number;

    // CHORD detection
    chord?: {
        root: string;
        type: string;
    };
}
