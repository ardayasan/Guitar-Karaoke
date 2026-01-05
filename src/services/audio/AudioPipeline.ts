import { NativeEventEmitter, NativeModules } from "react-native";
import type { AudioDetection } from "@/types";

const { AudioInputModule } = NativeModules;

export type AudioPipelineCallback = (result: AudioDetection | null) => void;

export class AudioPipeline {
    private callback: AudioPipelineCallback | null = null;
    private listeners: any[] = [];
    private running = false;

    start(callback: AudioPipelineCallback) {
    if (this.running) return;

    this.running = true;
    this.callback = callback;

    const emitter = new NativeEventEmitter(AudioInputModule);

    this.listeners.push(
        emitter.addListener("AudioDetection", (event) => {
            if (!this.running) return;

            // event already conforms to AudioDetection | null
            this.callback?.(event ?? null);
        })
        );

        AudioInputModule.start();
    }

    stop() {
        if (!this.running) return;

        this.running = false;

        this.listeners.forEach((l) => l.remove());
        this.listeners = [];

        AudioInputModule.stop();

        this.callback = null;
    }

    isRunning() {
        return this.running;
    }
}
