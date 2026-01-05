export type PracticeTokenKind = "chord" | "note" | "empty";

/**
 * A single cell/slot on the timeline. This matches your mockup:
 * - chord blocks (e.g., "B#m", "D")
 * - note markers (e.g., "1", "3" circles)
 * - empty gaps
 */
export type PracticeToken =
    | {
        id: string;
        kind: "note";
        note: string;        // "E", "F#", "G" etc.
        durationMs: number;
        }
    | {
        id: string;
        kind: "chord";
        label: string;
        durationMs: number;
        }
    | {
        id: string;
        kind: "empty";
        durationMs: number;
        };



/**
 * The moving cursor points to the "required now" token.
 * This is the big vertical bar in your mockup.
 */
export interface PracticeCursorState {
  index: number;       // which token we are on
  isMissHold: boolean; // true if we are stuck waiting user to play correctly
}
