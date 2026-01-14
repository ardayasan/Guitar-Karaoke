/**
 * LandscapePracticeScreen
 * 
 * Horizontal (landscape) layout for practice mode with:
 * - Scrolling timeline (past → current → upcoming)
 * - Real-time BPM-driven progression
 * - Color-coded feedback visualization
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    StyleSheet,
    Dimensions,
    StatusBar,
    TouchableOpacity,
    Animated,
    Modal,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { RootStackParamList } from "@/navigation/types";
import { usePracticeStore } from "@/store";
import colors from "@/theme/colors";
import { AudioPipeline } from "@/services/audio/AudioPipeline";
import { HydratedStep } from "@/utils/practice/hydrateStepTiming";

/* ================================================= */

type LandscapePracticeRouteProp = RouteProp<RootStackParamList, "Practice">;
type LandscapePracticeNavigationProp = StackNavigationProp<RootStackParamList, "Practice">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STEP_WIDTH = 80;
const VISIBLE_STEPS = 9; // Past 3 + Current + Upcoming 5
const CENTER_INDEX = 3; // Where current step appears

/* ================================================= */

/**
 * Renders a single step in the timeline
 */
function TimelineStep({
    step,
    isActive,
    isPast
}: {
    step: HydratedStep | null;
    isActive: boolean;
    isPast: boolean;
}) {
    if (!step) {
        return <View style={[styles.stepSlot, styles.emptyStep]} />;
    }

    const getStepColor = () => {
        if (isActive) {
            return colors.brand.primary;
        }

        switch (step.result) {
            case 'correct':
                return colors.feedback.correct;
            case 'incorrect':
                return colors.feedback.incorrect;
            case 'missed':
                return colors.feedback.missed;
            default:
                return isPast ? 'rgba(100,100,100,0.3)' : 'rgba(122,60,255,0.4)';
        }
    };

    const getBorderColor = () => {
        if (isActive) {
            return colors.utility.accent;
        }
        switch (step.result) {
            case 'correct':
                return colors.feedback.correct;
            case 'incorrect':
                return colors.feedback.incorrect;
            case 'missed':
                return colors.feedback.missed;
            default:
                return 'rgba(199,125,255,0.3)';
        }
    };

    const renderContent = () => {
        if (step.type === 'note') {
            return (
                <View style={styles.noteContent}>
                    <Text style={styles.fretText}>{step.position.fret}</Text>
                    <Text style={styles.stringLabel}>S{step.position.string}</Text>
                    <Text style={styles.noteLabel}>
                        {step.note.name}{step.note.octave}
                    </Text>
                </View>
            );
        }

        if (step.type === 'chord') {
            return (
                <View style={styles.chordContent}>
                    <Text style={styles.chordName}>{step.chordName}</Text>
                    <Text style={styles.strumLabel}>{step.strum}</Text>
                </View>
            );
        }

        // Rest step
        return (
            <View style={styles.restContent}>
                <Text style={styles.restText}>—</Text>
            </View>
        );
    };

    return (
        <View
            style={[
                styles.stepSlot,
                isActive && styles.activeStep,
                { opacity: isPast ? 0.5 : 1 },
            ]}
        >
            <View
                style={[
                    styles.stepCard,
                    {
                        backgroundColor: getStepColor(),
                        borderColor: getBorderColor(),
                    },
                    isActive && styles.activeStepCard,
                ]}
            >
                {renderContent()}
            </View>

            {/* Result indicator */}
            {step.result && step.result !== 'pending' && (
                <View style={[
                    styles.resultBadge,
                    { backgroundColor: getStepColor() }
                ]}>
                    <Text style={styles.resultText}>
                        {step.result === 'correct' ? '✓' :
                            step.result === 'incorrect' ? '✗' : '○'}
                    </Text>
                </View>
            )}
        </View>
    );
}

/* ================================================= */

export default function LandscapePracticeScreen() {
    const route = useRoute<LandscapePracticeRouteProp>();
    const navigation = useNavigation<LandscapePracticeNavigationProp>();
    const tab = route.params.tab;

    /* ---------- Audio pipeline ---------- */
    const pipelineRef = useRef<AudioPipeline | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const pausedTimeRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const {
        currentStepIndex,
        hydratedSteps,
        lastDetectedNote,
        lastDetectedChord,
        isPaused,
        isActive,
        stats,
        startPractice,
        pausePractice,
        resumePractice,
        stopPractice,
        setDetectedNote,
        setDetectedChord,
        // setCurrentStepByTime, // TODO: Implement time-based step advancement
        setStepResult,
        resetPractice,
        completePractice,
    } = usePracticeStore();

    const [isListening, setIsListening] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);

    const evaluatedStepsRef = useRef<Set<number>>(new Set());
    const translateX = useRef(new Animated.Value(0)).current;

    /* ================================================= */
    /* INIT + CLEANUP                                   */
    /* ================================================= */
    useEffect(() => {
        startPractice(tab);
        pipelineRef.current = new AudioPipeline();
        evaluatedStepsRef.current = new Set();

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            pipelineRef.current?.stop();
            pipelineRef.current = null;
            resetPractice();
        };
    }, [tab, startPractice, resetPractice]);

    /* ================================================= */
    /* COMPLETION DETECTION                              */
    /* ================================================= */
    useEffect(() => {
        // Check if practice is completed (all steps evaluated)
        if (isListening && hydratedSteps.length > 0 && currentStepIndex >= hydratedSteps.length) {
            // All steps done!
            pipelineRef.current?.stop();
            setIsListening(false);
            completePractice();
            setIsCompleted(true);
        }
    }, [currentStepIndex, hydratedSteps.length, isListening, completePractice]);

    /* ================================================= */
    /* ANIMATE TIMELINE ON STEP CHANGE                  */
    /* ================================================= */
    useEffect(() => {
        Animated.spring(translateX, {
            toValue: -(currentStepIndex * STEP_WIDTH),
            useNativeDriver: true,
            tension: 100,
            friction: 15,
        }).start();
    }, [currentStepIndex, translateX]);

    /* ================================================= */
    /* BPM-DRIVEN TIMER LOOP                            */
    /* ================================================= */
    useEffect(() => {
        if (!isListening || isPaused || !isActive) {
            return;
        }

        if (!startTimeRef.current) {
            startTimeRef.current = Date.now() - pausedTimeRef.current;
        }

        timerRef.current = setInterval(() => {
            if (!startTimeRef.current) return;

            const now = Date.now();
            const elapsed = now - startTimeRef.current;
            setElapsedMs(elapsed);
            // TODO: Implement time-based step advancement
            // setCurrentStepByTime(elapsed);
        }, 50);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isListening, isPaused, isActive]);

    /* ================================================= */
    /* STEP EVALUATION                                  */
    /* ================================================= */
    useEffect(() => {
        const prevIndex = currentStepIndex - 1;

        if (prevIndex >= 0 && !evaluatedStepsRef.current.has(prevIndex)) {
            const prevStep = hydratedSteps[prevIndex];

            if (prevStep && prevStep.result === 'pending') {
                setStepResult(prevIndex, 'missed');
            }

            evaluatedStepsRef.current.add(prevIndex);
        }
    }, [currentStepIndex, hydratedSteps, setStepResult]);

    /* ================================================= */
    /* DETECTION HANDLER                                */
    /* ================================================= */
    const handleDetection = useCallback((detection: any) => {
        if (!detection || isPaused || !isActive) return;

        const currentStep = hydratedSteps[currentStepIndex];

        if (detection.note) {
            const note = { name: detection.note.name, octave: Number(detection.note.octave) };
            setDetectedNote(note);

            if (currentStep && currentStep.type === 'note' && currentStep.result === 'pending') {
                // Ensure both name and octave match - use Number() to prevent type mismatch
                const expectedOctave = Number(currentStep.note.octave);
                const detectedOctave = Number(note.octave);

                const isCorrect =
                    currentStep.note.name === note.name &&
                    expectedOctave === detectedOctave;

                setStepResult(currentStepIndex, isCorrect ? 'correct' : 'incorrect');
                evaluatedStepsRef.current.add(currentStepIndex);
            }
        }

        if (detection.chord) {
            const chord = { root: detection.chord.root, type: detection.chord.type };
            setDetectedChord(chord);

            if (currentStep && currentStep.type === 'chord' && currentStep.result === 'pending') {
                const expected = currentStep.chordName.toLowerCase();

                // Build detected chord name: root + type suffix
                // major = just root (e.g., "D", "G")
                // minor = root + "m" (e.g., "Em", "Am")
                const typeLower = (chord.type || '').toLowerCase();
                const suffix = typeLower === 'minor' ? 'm' : '';
                const detected = `${chord.root}${suffix}`.toLowerCase();

                const isCorrect = expected === detected;

                setStepResult(currentStepIndex, isCorrect ? 'correct' : 'incorrect');
                evaluatedStepsRef.current.add(currentStepIndex);
            }
        }
    }, [isPaused, isActive, currentStepIndex, hydratedSteps, setDetectedNote, setDetectedChord, setStepResult]);

    /* ================================================= */
    /* CONTROLS                                         */
    /* ================================================= */
    const handleStart = () => {
        if (!pipelineRef.current) return;
        pipelineRef.current.start(handleDetection);
        startTimeRef.current = Date.now() - pausedTimeRef.current;
        setIsListening(true);
    };

    const handlePause = () => {
        pausePractice();
        pipelineRef.current?.stop();
        if (startTimeRef.current) {
            pausedTimeRef.current = Date.now() - startTimeRef.current;
        }
        setIsListening(false);
    };

    const handleQuit = () => {
        pipelineRef.current?.stop();
        stopPractice();
        navigation.goBack();
    };

    /* ================================================= */
    /* DISPLAY HELPERS                                  */
    /* ================================================= */
    const formatTime = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getDetectedDisplay = () => {
        if (lastDetectedChord) {
            const type = lastDetectedChord.type;
            return `${lastDetectedChord.root}${type === 'minor' ? 'm' : type === 'major' ? '' : type}`;
        }
        if (lastDetectedNote) {
            return `${lastDetectedNote.name}${lastDetectedNote.octave}`;
        }
        return '—';
    };

    /* ================================================= */
    /* BUILD VISIBLE STEPS                              */
    /* ================================================= */
    const buildVisibleSteps = () => {
        const result: (HydratedStep | null)[] = [];

        // Past steps (left side)
        for (let i = CENTER_INDEX - 1; i >= 0; i--) {
            const stepIndex = currentStepIndex - (CENTER_INDEX - i);
            result.push(stepIndex >= 0 ? hydratedSteps[stepIndex] : null);
        }

        // Current step (center)
        result.push(hydratedSteps[currentStepIndex] || null);

        // Upcoming steps (right side)
        for (let i = 1; i < VISIBLE_STEPS - CENTER_INDEX; i++) {
            const stepIndex = currentStepIndex + i;
            result.push(stepIndex < hydratedSteps.length ? hydratedSteps[stepIndex] : null);
        }

        return result;
    };

    /* ================================================= */
    /* RENDER                                           */
    /* ================================================= */
    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.songTitle}>{tab.metadata.title}</Text>
                    <Text style={styles.songInfo}>
                        {tab.metadata.artist} • {tab.metadata.bpm} BPM
                    </Text>
                </View>

                <View style={styles.headerCenter}>
                    <Text style={styles.timerText}>{formatTime(elapsedMs)}</Text>
                    <Text style={styles.progressText}>
                        {currentStepIndex + 1} / {hydratedSteps.length}
                    </Text>
                </View>

                <View style={styles.headerRight}>
                    <Text style={styles.detectedLabel}>Detected</Text>
                    <Text style={styles.detectedValue}>{getDetectedDisplay()}</Text>
                </View>
            </View>

            {/* Timeline */}
            <View style={styles.timelineContainer}>
                {/* Center marker */}
                <View style={styles.centerMarker} />

                {/* Steps */}
                <View style={styles.stepsRow}>
                    {buildVisibleSteps().map((step, idx) => (
                        <TimelineStep
                            key={idx}
                            step={step}
                            isActive={idx === CENTER_INDEX}
                            isPast={idx < CENTER_INDEX}
                        />
                    ))}
                </View>
            </View>

            {/* Stats bar */}
            <View style={styles.statsBar}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.feedback.correct }]}>
                        {stats.correct}
                    </Text>
                    <Text style={styles.statLabel}>Correct</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.feedback.incorrect }]}>
                        {stats.incorrect}
                    </Text>
                    <Text style={styles.statLabel}>Wrong</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.feedback.missed }]}>
                        {stats.missed}
                    </Text>
                    <Text style={styles.statLabel}>Missed</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.accuracy.toFixed(0)}%</Text>
                    <Text style={styles.statLabel}>Accuracy</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.currentStreak}</Text>
                    <Text style={styles.statLabel}>Streak</Text>
                </View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={handleQuit}
                >
                    <Text style={styles.controlButtonText}>Quit</Text>
                </TouchableOpacity>

                {isListening ? (
                    <TouchableOpacity
                        style={[styles.controlButton, styles.pauseButton]}
                        onPress={handlePause}
                    >
                        <Text style={styles.controlButtonTextPrimary}>Pause</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.controlButton, styles.startButton]}
                        onPress={handleStart}
                    >
                        <Text style={styles.controlButtonTextPrimary}>
                            {pausedTimeRef.current > 0 ? 'Resume' : 'Start'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Completion Modal */}
            <Modal
                visible={isCompleted}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>🎉 Practice Complete!</Text>
                        <Text style={styles.modalSubtitle}>
                            Great job practicing "{tab.metadata.title}"
                        </Text>

                        <View style={styles.modalStats}>
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Accuracy</Text>
                                <Text style={[styles.modalStatValue, { color: colors.brand.primary }]}>
                                    {stats.accuracy.toFixed(0)}%
                                </Text>
                            </View>
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Correct</Text>
                                <Text style={[styles.modalStatValue, { color: colors.feedback.correct }]}>
                                    {stats.correct}
                                </Text>
                            </View>
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Incorrect</Text>
                                <Text style={[styles.modalStatValue, { color: colors.feedback.incorrect }]}>
                                    {stats.incorrect}
                                </Text>
                            </View>
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Missed</Text>
                                <Text style={[styles.modalStatValue, { color: colors.feedback.missed }]}>
                                    {stats.missed}
                                </Text>
                            </View>
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Best Streak</Text>
                                <Text style={styles.modalStatValue}>
                                    {stats.longestStreak}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => {
                                setIsCompleted(false);
                                stopPractice();
                                navigation.goBack();
                            }}
                        >
                            <Text style={styles.modalButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

/* ================================================= */
/* STYLES                                            */
/* ================================================= */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg.main,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(199,125,255,0.2)',
    },

    headerLeft: {
        flex: 1,
    },

    headerCenter: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },

    headerRight: {
        flex: 1,
        alignItems: 'flex-end',
    },

    songTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text.primary,
    },

    songInfo: {
        fontSize: 12,
        color: colors.text.subtle,
        marginTop: 2,
    },

    timerText: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text.primary,
        fontVariant: ['tabular-nums'],
    },

    progressText: {
        fontSize: 11,
        color: colors.text.subtle,
    },

    detectedLabel: {
        fontSize: 10,
        color: colors.text.subtle,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    detectedValue: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.utility.accent,
    },

    // Timeline
    timelineContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },

    centerMarker: {
        position: 'absolute',
        width: STEP_WIDTH + 10,
        height: '100%',
        backgroundColor: 'rgba(199,125,255,0.1)',
        borderWidth: 2,
        borderColor: 'rgba(199,125,255,0.4)',
        borderRadius: 12,
        left: '50%',
        marginLeft: -(STEP_WIDTH + 10) / 2,
    },

    stepsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    stepSlot: {
        width: STEP_WIDTH,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
    },

    emptyStep: {
        opacity: 0.3,
    },

    activeStep: {
        transform: [{ scale: 1.1 }],
    },

    stepCard: {
        width: STEP_WIDTH - 12,
        height: 100,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#C77DFF',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
    },

    activeStepCard: {
        shadowOpacity: 0.8,
        shadowRadius: 16,
    },

    noteContent: {
        alignItems: 'center',
    },

    fretText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
    },

    stringLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },

    noteLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
    },

    chordContent: {
        alignItems: 'center',
    },

    chordName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
    },

    strumLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
        textTransform: 'uppercase',
    },

    restContent: {
        alignItems: 'center',
    },

    restText: {
        fontSize: 24,
        color: 'rgba(255,255,255,0.5)',
    },

    resultBadge: {
        position: 'absolute',
        bottom: 0,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    resultText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },

    // Stats bar
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(199,125,255,0.2)',
    },

    statItem: {
        alignItems: 'center',
    },

    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text.primary,
    },

    statLabel: {
        fontSize: 9,
        color: colors.text.subtle,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 2,
    },

    // Controls
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        paddingVertical: 12,
        paddingBottom: 20,
    },

    controlButton: {
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },

    startButton: {
        backgroundColor: colors.brand.primary,
        borderColor: colors.utility.accent,
    },

    pauseButton: {
        backgroundColor: 'rgba(255,92,92,0.8)',
        borderColor: colors.feedback.incorrect,
    },

    controlButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text.subtle,
    },

    controlButtonTextPrimary: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },

    // Completion Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalContent: {
        backgroundColor: colors.bg.main,
        borderRadius: 20,
        padding: 30,
        width: '80%',
        maxWidth: 400,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.brand.primary,
    },

    modalTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
    },

    modalSubtitle: {
        fontSize: 14,
        color: colors.text.secondary,
        marginBottom: 24,
        textAlign: 'center',
    },

    modalStats: {
        width: '100%',
        marginBottom: 24,
    },

    modalStatRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },

    modalStatLabel: {
        fontSize: 14,
        color: colors.text.subtle,
    },

    modalStatValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text.primary,
    },

    modalButton: {
        backgroundColor: colors.brand.primary,
        paddingVertical: 14,
        paddingHorizontal: 50,
        borderRadius: 25,
    },

    modalButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
