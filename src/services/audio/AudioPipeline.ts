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

const { AudioInputModule } = NativeModules;

export type AudioPipelineCallback = (result: AudioDetection | null) => void;

export class AudioPipeline {
    private pitchService = getPitchDetectionService();

    private callback: AudioPipelineCallback | null = null;
    private listeners: any[] = [];
    private running: boolean = false;

    /**
     * Starts the native audio → analysis pipeline.
     * Subscribes to native audio events and routes them
     * to the correct processing services.
     */
    start(callback: AudioPipelineCallback) {
        if (this.running) return;

        console.log("[AudioPipeline] Starting...");

        this.running = true;
        this.callback = callback;

        // Start pitch detection service (NOTE detection only)
        this.pitchService.start((detection) => {
            if (!this.running) return;
            if (this.callback) {
                this.callback(detection);
            }
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

                // Currently we only forward note detections to UI,
                // but this hook is intentionally kept for future use
                // (e.g. timing, scoring reset, visual feedback).
                console.log("[AudioPipeline] Onset detected", event);
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
                console.warn("[AudioPipeline] Invalid NoteSamples payload:", event);
                return;
            }

            // Convert raw JS array to Float32Array
            const floatBuffer = new Float32Array(samples);

            // Update pitch engine sample rate (critical for accuracy)
            this.pitchService.setSampleRate(sampleRate);

            // Convert timestamp (seconds → milliseconds)
            const tsMs = timestamp * 1000;

            // Run NOTE pitch detection
            this.pitchService.processSamples(floatBuffer, tsMs);
            } catch (err) {
            console.error("[AudioPipeline] Error processing NoteSamples:", err);
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
        emitter.addListener("ChordSamples", (_event) => {
            if (!this.running) return;

            // Intentionally left blank.
            // This is where ChordDetectionService will be plugged in later.
        })
        );

        // Start native audio engine
        AudioInputModule.start();
    }

    /**
     * Stops the pipeline and removes all listeners.
     * Also stops the native audio engine and pitch service.
     */
    stop() {
        if (!this.running) return;

        console.log("[AudioPipeline] Stopping...");

        this.running = false;

        // Remove all native listeners
        this.listeners.forEach((l) => l.remove());
        this.listeners = [];

        // Stop native audio engine
        AudioInputModule.stop();

        // Stop pitch detection
        this.pitchService.stop();
        this.callback = null;
    }

    /**
     * Returns whether the pipeline is currently active.
     */
    isRunning() {
        return this.running;
    }
}
