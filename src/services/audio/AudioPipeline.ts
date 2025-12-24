/**
 * AudioPipeline (iOS Swift-Compatible Final Version)
 * --------------------------------------------------
 * Listens to native audio events emitted by the AudioInputModule
 * and dispatches them to the appropriate analysis services.
 *
 * Native events:
 *   - Onset        → signal start marker (state reset, UI sync)
 *   - NoteSamples  → small window, low-latency pitch detection
 *   - ChordSamples → large window, stable harmonic analysis (future)
 *
 * The PitchDetectionService handles NOTE-level DSP only.
 *
 * The UI layer should only use:
 *    pipeline.start(onDetection)
 *    pipeline.stop()
 */

import { NativeEventEmitter, NativeModules } from "react-native";
import { getPitchDetectionService } from "../pitch";
import type { AudioDetection } from "@/types";

// Chord Detetction Imports
import { ChordDetectionService } from "../chord/ChordDetectionService";
import { chordCandidateToChord } from "@/utils/music/chordUtils";

const { AudioInputModule } = NativeModules;

export type AudioPipelineCallback = (result: AudioDetection | null) => void;

// Debug configuration
const AUDIO_PIPELINE_DEBUG = false;

/**
 * Debug wrappers
 * --------------
 * Keep logs behind a single flag to avoid console spam and performance noise.
 * IMPORTANT: Do not call the wrapper itself inside the wrapper (no recursion).
 */
function log(...args: any[]) {
    if (!AUDIO_PIPELINE_DEBUG) return;
    console.log("[AudioPipeline]", ...args);
}

function warn(...args: any[]) {
    if (!AUDIO_PIPELINE_DEBUG) return;
    console.warn("[AudioPipeline]", ...args);
}

function error(...args: any[]) {
    if (!AUDIO_PIPELINE_DEBUG) return;
    console.error("[AudioPipeline]", ...args);
}

export class AudioPipeline {
    private pitchService = getPitchDetectionService();
    private chordService = new ChordDetectionService();

    private callback: AudioPipelineCallback | null = null;
    private listeners: any[] = [];
    private running: boolean = false;

    private currentDetection: AudioDetection | null = null;

    // ---- Silence handling ----
    private readonly SILENCE_TIMEOUT_MS = 400;

    // Timestamp of last valid NOTE or CHORD emission
    private lastValidDetectionTs: number | null = null;

    // Whether pipeline is currently considered silent
    private isSilent: boolean = true;

    // Interval id for silence watchdog
    private silenceIntervalId: any = null;

    // ---- Chord rate limiting (tunable) ----
    private chordRateConfig = {
        /** Multiplier applied to the chord window duration (in ms). */
        factor: 1.1,
        /** Lower bound for processing interval (ms). */
        minMs: 120,
        /** Upper bound for processing interval (ms). */
        maxMs: 250,
    };

    // Cached interval derived from windowSize + sampleRate
    private chordIntervalMs: number | null = null;

    // Cache key to detect when we must recompute interval
    private chordIntervalKey: string | null = null;

    // Timestamp of last processed chord frame (ms)
    private lastChordProcessTs: number = 0;

    // ---- RMS Gate ----
    private readonly RMS_NOTE_THRESHOLD = 0.0008;
    private readonly RMS_CHORD_THRESHOLD = 0.01;
    private lastRmsAboveThresholdTs: number | null = null;

    // --- To Counting Valid Chord Pitch Classes ---
    private readonly PITCH_CLASS_ENERGY_THRESHOLD = 0.1;
    private readonly MINIMUM_ACTIVE_PITCH_CLASS_THRESHOLD = 2;

    // ---- Confidence thresholds ----
    private readonly NOTE_CONFIDENCE_THRESHOLD = 0.8;
    private readonly CHORD_CONFIDENCE_THRESHOLD = 0.7;

    /**
     * Starts the native audio → analysis pipeline.
     * Subscribes to native audio events and routes them
     * to the correct processing services.
     */
    start(callback: AudioPipelineCallback) {
        if (this.running) return;

        log("Starting...");

        this.running = true;
        this.callback = callback;

        // Reset silence state for a clean session start
        this.lastValidDetectionTs = null;
        this.isSilent = true;

        // Start pitch detection service
        this.pitchService.start((detection) => {
            if (!this.running || !detection) return;

            this.emitDetection({
                timestamp: detection.timestamp,
                frequency: detection.frequency,
                amplitude: detection.amplitude,
                confidence: detection.confidence,
                note: detection.note,
            });
        });

        // Start chord detection service
        this.chordService.start((result) => {

            if (!this.running || !result?.candidate) return;

            const activeCount = this.countActivePitchClasses(result.chroma);

            // Minimum 3 pitch-class yoksa → chord olarak kabul etme
            if (activeCount < this.MINIMUM_ACTIVE_PITCH_CLASS_THRESHOLD) {
                log(
                    "Chord candidate rejected (not enough pitch-classes)",
                    `active=${activeCount}`
                );
                return;
            }

            
            if (!this.running || !result?.candidate) return;

            const chord = chordCandidateToChord(result.candidate);

            this.emitDetection({
                timestamp: result.timestamp,
                chord,
                confidence: result.candidate.confidence,
            });
        });

        const emitter = new NativeEventEmitter(AudioInputModule);

        /**
         * ONSET EVENT
         * -----------
         * Emitted once when a new signal starts.
         * Used for UI sync, scoring reset, etc.
         */
        this.listeners.push(
            emitter.addListener("Onset", (event) => {
                if (!this.running) return;

                this.currentDetection = null;

                // Reset chord scheduler cache (window rate may change between runs)
                this.lastChordProcessTs = 0;
                this.chordIntervalMs = null;
                this.chordIntervalKey = null;

                // Reset silence state at onset boundary
                this.lastValidDetectionTs = null;
                this.isSilent = true;

                log("Onset detected", event);
            })
        );

        /**
         * NOTE SAMPLES
         * ------------
         * Small window (e.g. 2048 samples).
         * Routed directly to PitchDetectionService (YIN).
         */
        this.listeners.push(
            emitter.addListener("NoteSamples", (event) => {
                if (!this.running) return;

                try {
                    const { samples, sampleRate, timestamp } = event;

                    if (!samples || !Array.isArray(samples)) {
                        warn("Invalid NoteSamples payload:", event);
                        return;
                    }

                    // Convert raw JS array to Float32Array
                    const floatBuffer = new Float32Array(samples);

                    // ---- RMS gate (NOTE) ----
                    const rms = this.computeRms(floatBuffer);
                    if (rms < this.RMS_NOTE_THRESHOLD) {
                        return;
                    }

                    // Update pitch engine sample rate (critical for accuracy)
                    this.pitchService.setSampleRate(sampleRate);

                    // Convert timestamp (seconds → milliseconds)
                    const tsMs = timestamp * 1000;

                    // Run NOTE pitch detection
                    this.pitchService.processSamples(floatBuffer, tsMs);
                } catch (err) {
                    error("Error processing NoteSamples:", err);
                }
            })
        );

        /**
         * CHORD SAMPLES
         * -------------
         * Large window (e.g. 8192 samples).
         * Reserved for future chord / harmonic analysis.
         */
        this.listeners.push(
            emitter.addListener("ChordSamples", (event) => {
                if (!this.running) return;

                try {
                    const { samples, sampleRate, timestamp } = event;

                    if (!samples || !Array.isArray(samples)) {
                        warn("Invalid ChordSamples payload:", event);
                        return;
                    }

                    const floatBuffer = new Float32Array(samples);

                    // ---- RMS gate (CHORD) ----
                    const rms = this.computeRms(floatBuffer);
                    if (rms < this.RMS_CHORD_THRESHOLD) {
                        return;
                    }

                    // CHORD DETECTION THREAD TUKETME PROBLEMINI COZDUGUMUZ YER (çözememişiz xd)
                    const now = Date.now();
                    const intervalMs = this.getChordIntervalMs(
                        floatBuffer.length,
                        sampleRate
                    );

                    // If we processed a chord too recently, drop this frame to keep JS thread responsive.
                    if (now - this.lastChordProcessTs < intervalMs) {
                        return;
                    }
                    this.lastChordProcessTs = now;

                    // set SR
                    this.chordService.setSampleRate(sampleRate);

                    const tsMs = timestamp * 1000;

                    this.chordService.processSamples(floatBuffer, tsMs);
                } catch (err) {
                    error("Error processing ChordSamples:", err);
                }
            })
        );


        // ---- Silence watchdog ----
        // Emits `null` once after a period of no valid NOTE/CHORD emissions.
        this.silenceIntervalId = setInterval(() => {
            if (!this.running) return;
            if (this.lastValidDetectionTs === null) return;

            const now = Date.now();
            const elapsed = now - this.lastValidDetectionTs;

            if (elapsed > this.SILENCE_TIMEOUT_MS && !this.isSilent) {
                log("silence timeout reached", `${elapsed}ms since last detection`);

                this.isSilent = true;
                this.currentDetection = null;
                this.lastValidDetectionTs = null;

                // Emit silence to UI
                this.callback?.(null);
            }
        }, 50);

        // Start native audio engine
        AudioInputModule.start();
    }

    /**
     * Stops the pipeline and removes all listeners.
     * Also stops the native audio engine and pitch service.
     */
    stop() {
        if (!this.running) return;

        log("Stopping...");

        this.running = false;

        this.currentDetection = null;
        this.lastValidDetectionTs = null;
        this.isSilent = true;

        // Remove all native listeners
        this.listeners.forEach((l) => l.remove());
        this.listeners = [];

        // Stop native audio engine
        AudioInputModule.stop();

        // stop chord detection
        this.chordService.stop();

        // Stop pitch detection
        this.pitchService.stop();
        this.callback = null;

        // Stop silence watchdog
        if (this.silenceIntervalId) {
            clearInterval(this.silenceIntervalId);
            this.silenceIntervalId = null;
        }

        // Reset chord scheduler cache
        this.lastChordProcessTs = 0;
        this.chordIntervalMs = null;
        this.chordIntervalKey = null;
    }

    /**
     * Returns whether the pipeline is currently active.
     */
    isRunning() {
        return this.running;
    }

    /**
     * emitDetection
     * --------------------------------------------------
     * Central decision point for audio detections.
     *
     * Purpose:
     * - Decide whether NOTE or CHORD should be emitted to UI
     * - Enforce semantic priority (CHORD > NOTE)
     * - Filter out low-confidence detections
     * - Prevent unstable UI updates (flicker / overrides)
     *
     * Rules:
     * - Low confidence detections are ignored
     * - If a chord is detected → it always overrides note
     * - If a chord is active → incoming notes are ignored
     * - Only one semantic detection is emitted at a time
     */
    private emitDetection(partial: Partial<AudioDetection>) {
        if (!this.running || !this.callback) {
            log("emitDetection skipped (inactive)");
            return;
        }

        // ---------- CHORD ----------
        if (partial.chord) {
            const conf = partial.confidence ?? 0;

            if (conf < this.CHORD_CONFIDENCE_THRESHOLD) {
                log(
                    "chord ignored (low confidence)",
                    partial.chord.root,
                    partial.chord.type,
                    `conf=${conf.toFixed(2)}`
                );
                return;
            }

            this.lastValidDetectionTs = Date.now();
            this.isSilent = false;

            log(
                "emit CHORD",
                partial.chord.root,
                partial.chord.type,
                `conf=${conf.toFixed(2)}`
            );

            const next: AudioDetection = {
                timestamp: partial.timestamp ?? Date.now(),
                chord: partial.chord,
                confidence: conf,
                frequency: 0,
                amplitude: 0,
                note: undefined,
            };

            this.currentDetection = next;
            this.callback(next);
            return;
        }

        // ---------- NOTE ----------
        if (partial.note) {
            const conf = partial.confidence ?? 0;

            if (conf < this.NOTE_CONFIDENCE_THRESHOLD) {
                log(
                    "note ignored (low confidence)",
                    partial.note.name,
                    partial.note.octave,
                    `conf=${conf.toFixed(2)}`
                );
                return;
            }

            if (this.currentDetection?.chord) {
                log(
                    "note ignored (chord active)",
                    partial.note.name,
                    partial.note.octave
                );
                return;
            }

            this.lastValidDetectionTs = Date.now();
            this.isSilent = false;

            log(
                "emit NOTE",
                partial.note.name,
                partial.note.octave,
                `freq=${partial.frequency?.toFixed(1)}`,
                `conf=${conf.toFixed(2)}`
            );

            const next: AudioDetection = {
                timestamp: partial.timestamp ?? Date.now(),
                note: partial.note,
                frequency: partial.frequency ?? 0,
                amplitude: partial.amplitude ?? 0,
                confidence: conf,
                chord: undefined,
            };

            this.currentDetection = next;
            this.callback(next);
            return;
        }

        log("emitDetection called with empty payload");
    }

    /**
     * Computes (and caches) a safe chord processing interval based on:
     * - current chord window size (samples.length)
     * - current sample rate
     *
     * The interval is derived from the physical duration of the analysis window.
     */
    private getChordIntervalMs(windowSize: number, sampleRate: number): number {
        const key = `${windowSize}@${sampleRate}`;

        // Recompute only if window/sampleRate changed
        if (this.chordIntervalMs !== null && this.chordIntervalKey === key) {
        return this.chordIntervalMs;
        }

        const windowDurationMs = (windowSize / sampleRate) * 1000;

        // Apply factor and clamp to safe bounds
        const raw = windowDurationMs * this.chordRateConfig.factor;
        const clamped = Math.max(
        this.chordRateConfig.minMs,
        Math.min(raw, this.chordRateConfig.maxMs)
        );

        this.chordIntervalKey = key;
        this.chordIntervalMs = Math.round(clamped);

        log(
        `Chord interval set to ${this.chordIntervalMs}ms (window=${windowSize}, sr=${sampleRate}, windowMs=${windowDurationMs.toFixed(
            1
        )})`
        );

        return this.chordIntervalMs;
    }

    private computeRms(buffer: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
        }
        return Math.sqrt(sum / buffer.length);
    }

    /**
     * Counts how many pitch-classes carry meaningful energy.
     * Used to distinguish single-note vs chord intent.
     */
    private countActivePitchClasses(chroma: number[]): number {
        if (!chroma || chroma.length !== 12) return 0;

        const totalEnergy = chroma.reduce((s, v) => s + v, 0);
        if (totalEnergy === 0) return 0;

        let activeCount = 0;

        for (let i = 0; i < 12; i++) {
            const normalized = chroma[i] / totalEnergy;
            if (normalized >= this.PITCH_CLASS_ENERGY_THRESHOLD) {
                activeCount++;
            }
        }

        return activeCount;
    }
}
