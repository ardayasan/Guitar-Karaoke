/**
 * AudioPipeline (iOS Swift-Compatible Final Version)
 * --------------------------------------------------
 * Listens to "AudioSamples" events emitted by the native AudioInputModule
 * and forwards raw PCM frames to the PitchDetectionService.
 *
 * The PitchDetectionService handles the DSP (YIN, smoothing, gating, etc.)
 * and reports back detections via its own callback.
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
    private listener: any = null;
    private running: boolean = false;

    /**
     * Starts the audio → pitch detection pipeline.
     * Subscribes to native audio events and forwards samples to the pitch engine.
     */
    start(callback: AudioPipelineCallback) {
        if (this.running) return;

        console.log("[AudioPipeline] Starting...");

        this.running = true;
        this.callback = callback;

        // Start pitch detection service so `isActive` becomes true
        // and forward detections to the UI callback.
        this.pitchService.start((detection) => {
        if (!this.running) return;
        if (this.callback) {
            this.callback(detection);
        }
        });

        // Reset smoothing / internal state
        this.pitchService.reset();

        const emitter = new NativeEventEmitter(AudioInputModule);

        // Listen for audio sample events emitted from Swift
        this.listener = emitter.addListener("AudioSamples", (event) => {
        if (!this.running) return;

        try {
            const { samples, sampleRate, timestamp } = event;

            if (!samples || !Array.isArray(samples)) {
            console.warn("[AudioPipeline] Invalid sample payload:", event);
            return;
            }

            // Convert raw JS array to Float32Array
            const floatBuffer = new Float32Array(samples);

            // Update pitch engine sample rate (important for correct detection)
            this.pitchService.setSampleRate(sampleRate);

            // Convert timestamp (seconds → milliseconds)
            const tsMs = timestamp * 1000;

            // Run pitch detection (PitchDetectionService will call its callback)
            this.pitchService.processSamples(floatBuffer, tsMs);
        } catch (err) {
            console.error("[AudioPipeline] Error processing audio event:", err);
        }
        });

        // Start recording stream on the native side
        AudioInputModule.start();
    }

    /**
     * Stops the pipeline and removes listeners.
     * Also stops the native audio engine and pitch service.
     */
    stop() {
        if (!this.running) return;

        console.log("[AudioPipeline] Stopping...");

        this.running = false;

        // Remove native event listener
        if (this.listener) {
        this.listener.remove();
        this.listener = null;
        }

        // Stop Swift audio engine
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
