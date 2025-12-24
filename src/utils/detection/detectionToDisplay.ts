import type { AudioDetection } from "@/types";
import { getNoteString } from "@/utils/music";

/* -------------------------------------------------- */
/* Types                                              */
/* -------------------------------------------------- */

export type AccidentalPreference = "flat" | "sharp";

export type DetectionKind = "chord" | "note" | "none";

export type DetectionDisplay = {
    /** Primary display value (e.g. "E4", "Bb", "Am") */
    primary: string | null;

    /**
     * Optional enharmonic aliases.
     * Example: primary = "Bb", aliases = ["A#"]
     */
    aliases?: string[];

    /** Semantic detection type */
    kind: DetectionKind;
};

/* -------------------------------------------------- */
/* Enharmonic Mapping                                 */
/* -------------------------------------------------- */

const ENHARMONIC_MAP: Record<string, string> = {
    "C#": "Db",
    "D#": "Eb",
    "F#": "Gb",
    "G#": "Ab",
    "A#": "Bb",
};

/* -------------------------------------------------- */
/* Main Converter                                     */
/* -------------------------------------------------- */

/**
 * Converts an AudioDetection into a display-friendly structure.
 *
 * Rules:
 * - This function NEVER returns null
 * - "No detection" is represented as:
 *   { primary: null, kind: "none" }
 *
 * Accidental rules:
 * - If preference is NOT provided → primary is FLAT
 * - If preference === "sharp" → primary is SHARP
 * - Aliases are added only if enharmonic equivalent exists
 *
 * This output is safe to use in:
 * - UI rendering
 * - Validation
 * - Statistics
 */
export function detectionToDisplay(
    detection: AudioDetection | null,
    preference: AccidentalPreference = "flat"
): DetectionDisplay {
    if (!detection) {
        return {
            primary: null,
            kind: "none",
        };
    }

    /* -------- CHORD -------- */
    if (detection.chord) {
        const root = detection.chord.root; // e.g. "A#" or "Bb"
        const isMinor = detection.chord.type === "minor";

        const display = buildDisplay(
            root,
            isMinor ? "m" : "",
            preference
        );

        return {
            ...display,
            kind: "chord",
        };
    }

    /* -------- NOTE (PITCH) -------- */
    if (detection.note) {
        // Example output: "A#4", "Bb3", "E2"
        const noteStr = getNoteString(detection.note);
        const match = noteStr.match(/^([A-G][#b]?)(\d)$/);

        // Fallback: unexpected format, but still display something
        if (!match) {
            return {
                primary: noteStr,
                kind: "note",
            };
        }

        const [, pitchClass, octave] = match;

        const display = buildDisplay(
            pitchClass,
            octave,
            preference
        );

        return {
            ...display,
            kind: "note",
        };
    }

    /* -------- NO DETECTION -------- */
    return {
        primary: null,
        kind: "none",
    };
}

/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */

/**
 * Builds primary + alias display values
 * while respecting accidental preference.
 */
function buildDisplay(
    base: string,
    suffix: string,
    preference: AccidentalPreference
): { primary: string; aliases?: string[] } {
    const sharp = base.includes("b")
        ? getSharp(base)
        : base;

    const flat = base.includes("#")
        ? getFlat(base)
        : base;

    const primaryBase =
        preference === "sharp" ? sharp : flat;

    const aliasBase =
        preference === "sharp" ? flat : sharp;

    const primary = `${primaryBase}${suffix}`;

    if (primaryBase === aliasBase) {
        return { primary };
    }

    return {
        primary,
        aliases: [`${aliasBase}${suffix}`],
    };
}

/**
 * Converts sharp to flat (if possible)
 */
function getFlat(sharp: string): string {
    return ENHARMONIC_MAP[sharp] ?? sharp;
}

/**
 * Converts flat to sharp (if possible)
 */
function getSharp(flat: string): string {
    const entry = Object.entries(ENHARMONIC_MAP).find(
        ([, v]) => v === flat
    );
    return entry ? entry[0] : flat;
}
