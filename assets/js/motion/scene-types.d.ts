/**
 * Symblix motion scene authoring types (SYM-MOT-002 API v1).
 *
 * These types are the single source of truth for ctx/assets/ready/palette/signals.
 * Import or copy for type-checking in your scene modules.
 */

export type SceneState =
  | "idle"
  | "loading"
  | "live"
  | "paused"
  | "recovering"
  | "error"
  | "disposed";

export type SceneStage = "module" | "create" | "ready" | "first-frame" | null;

export interface Color {
  readonly css: string;
  readonly r: number | null;
  readonly g: number | null;
  readonly b: number | null;
}

export interface Palette {
  readonly preset: string;
  readonly mode: "light" | "dark";
  readonly accent: Color;
  readonly bg: Color;
  readonly surface: Color;
  readonly surface2: Color;
  readonly text: Color;
  readonly muted: Color;
  readonly border: Color;
}

export interface Signals {
  readonly scroll: Readonly<{ progress: number; velocity: number }>;
  readonly pointer: Readonly<{ x: number; y: number; active: boolean }>;
}

export interface SceneContext {
  readonly api: 1;
  readonly THREE: unknown;
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext | WebGLRenderingContext;
  readonly mount: HTMLElement;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
  readonly palette: Palette;
  /** AbortSignal tied to the current scene generation. */
  readonly signal: AbortSignal;
  /** Register cleanup to run exactly once at retirement of this generation. */
  onDispose(cleanup: () => void): void;
  /** Frozen allowlisted asset map from data-scene-assets (empty without assets=). */
  readonly assets: Readonly<Record<string, string>>;
  /** Fetch an allowlisted asset with same-origin credentials and the generation signal. */
  fetchAsset(name: string): Promise<Response>;
}

export interface SceneInstance {
  /** Optional readiness gate; resolved before first frame. Timeout 10s. */
  readonly ready?: Promise<void>;
  frame(t: number, dt: number, signals: Signals): void;
  onResize?(width: number, height: number, dpr: number): void;
  onPaletteChange?(palette: Palette): void;
  dispose?(): void;
}

export interface SceneModule {
  default: ((ctx: SceneContext) => SceneInstance) & { api?: number };
}

export interface MotionDiagnosticsHost {
  readonly id: string;
  readonly state: SceneState;
  readonly stage: SceneStage;
  readonly errorCode: string | null;
  readonly frameCount: number;
  readonly pointerArmed: boolean;
  readonly dimensions: Readonly<{ width: number; height: number; dpr: number }>;
  readonly palette: Palette;
  readonly signals: Signals;
  readonly recoveryCount: number;
  readonly timings: Readonly<Record<string, number | null>>;
}

export interface MotionDiagnostics {
  readonly size: number;
  get(idOrMount: string | HTMLElement): MotionDiagnosticsHost | undefined;
  values(): IterableIterator<MotionDiagnosticsHost>;
  entries(): IterableIterator<[string | HTMLElement, MotionDiagnosticsHost]>;
  [Symbol.iterator](): IterableIterator<[string | HTMLElement, MotionDiagnosticsHost]>;
}
