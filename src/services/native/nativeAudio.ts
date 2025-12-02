import { NativeModules, NativeEventEmitter } from 'react-native';

const { AudioInputModule } = NativeModules;

const emitter = new NativeEventEmitter(AudioInputModule);

export function startNativeAudio(onSamples: (samples: Float32Array, ts: number) => void) {
    // Listener: Native → JS
    const subscription = emitter.addListener("AudioSamples", (event) => {
        try {
        const floatSamples = new Float32Array(event.samples);
        onSamples(floatSamples, event.timestamp);
        } catch (err) {
        console.warn("[NativeAudio] Error converting samples:", err);
        }
    });

    // Start native engine
    AudioInputModule.start();

    // Return cleanup function
    return () => {
        subscription.remove();
        AudioInputModule.stop();
    };
}
