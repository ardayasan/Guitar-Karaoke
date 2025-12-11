import { NativeModules, NativeEventEmitter } from 'react-native';

const { AudioInputModule } = NativeModules;
const emitter = new NativeEventEmitter(AudioInputModule);

export function startNativeAudio(
    onSamples: (samples: Float32Array, ts: number, sampleRate: number) => void
) {
    const subscription = emitter.addListener("AudioSamples", (event) => {
        try {
        const floatSamples = new Float32Array(event.samples);
        onSamples(
            floatSamples,
            event.timestamp,
            event.sampleRate
        );
        } catch (err) {
        console.warn("[NativeAudio] Error converting samples:", err);
        }
    });

    AudioInputModule.start();

    return () => {
        subscription.remove();
        AudioInputModule.stop();
    };
}
