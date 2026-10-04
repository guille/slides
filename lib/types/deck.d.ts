/** @typedef {"main" | "presenter" | "preview"} DeckMode */
/** @typedef {"forward" | "backward" | "none"} Direction */
/** @typedef {{ slide: number, step: number }} Position */
export type DeckMode = "main" | "presenter" | "preview";
export type Direction = "forward" | "backward" | "none";
export type Position = {
    slide: number;
    step: number;
};
export type TransitionFn = (update: () => void, info: {
    from: HTMLElement;
    to: HTMLElement;
    direction: Direction;
}) => void | Promise<void>;
export type DeckOptions = {
    /**
     * Stage width in px (default `data-width`, else 1920).
     */
    width?: number;
    /**
     * Stage height in px (default `data-height`, else 1080).
     */
    height?: number;
    /**
     * Default slide transition (default `data-transition`, else "none").
     */
    transition?: string | TransitionFn;
    /**
     * Clicking the stage navigates (default true).
     */
    clickNav?: boolean;
};
export type DeckChangeDetail = {
    slide: number;
    step: number;
    steps: number;
    previous: Position | null;
    direction: Direction;
    mode: DeckMode;
};
export type SlideEnterDetail = {
    step: number;
    direction: Direction;
    mode: DeckMode;
};
export type SlideLeaveDetail = {
    direction: Direction;
    mode: DeckMode;
};
export type StepChangeDetail = {
    step: number;
    steps: number;
    direction: Direction;
    mode: DeckMode;
};
export type BlackoutChangeDetail = {
    blackout: boolean;
    mode: DeckMode;
};
export type RevealChangeDetail = {
    all: boolean;
    mode: DeckMode;
};
export type DeckResizeDetail = {
    scale: number;
    mode: DeckMode;
};
export type SlideHandlers = {
    /**
     * The slide became current.
     */
    enter?: (detail: SlideEnterDetail) => void;
    /**
     * The slide stopped being current.
     */
    leave?: (detail: SlideLeaveDetail) => void;
    /**
     * The step changed (also on enter).
     */
    step?: (detail: StepChangeDetail) => void;
    /**
     * Overview or print opened (`all: true`) or closed: draw the final state while open.
     */
    reveal?: (detail: RevealChangeDetail) => void;
    /**
     * On-screen pixels per stage pixel changed.
     */
    resize?: (detail: DeckResizeDetail) => void;
};
export type Deck = ReturnType<typeof deck>;
/**
 * Start a deck on `target`, whose direct `<section>` children are the slides.
 * @param {Element | null} [target]
 * @param {DeckOptions} [options]
 */
export declare function deck(target?: Element | null, options?: DeckOptions): {
    root: HTMLElement;
    mode: DeckMode;
    width: number;
    height: number;
    readonly slides: HTMLElement[];
    readonly slide: number;
    readonly step: number;
    readonly steps: number;
    readonly scale: number;
    readonly overview: boolean;
    readonly blackout: boolean;
    next: () => void;
    prev: () => void;
    goto: (i: number, s?: number, { remote }?: {
        remote?: boolean;
    }) => void;
    stepCount: (i: number) => number;
    positionAfter: (i: number, s: number) => Position | null;
    ref: (i: number, s?: number) => string;
    /** @param {number} i The slide's speaker notes as HTML. */
    notes: (i: number) => string;
    setOverview: (on: boolean) => void;
    setBlackout: (on: boolean, { remote }?: {
        remote?: boolean;
    }) => void;
    toggleFullscreen: () => void;
    openPresenter: () => void;
    overflowing: () => HTMLElement[];
    refresh: () => void;
    destroy(): void;
};
/**
 * Subscribe a component to its slide's lifecycle. Calls `enter` and `step`
 * immediately if the slide is already current, so mount order does not matter.
 * @param {Element} el Any element inside the slide, including inside shadow roots.
 * @param {SlideHandlers} [handlers]
 * @returns {() => void} Unsubscribes.
 */
export declare function onSlide(el: Element, { enter, leave, step, reveal, resize }?: SlideHandlers): () => void;
