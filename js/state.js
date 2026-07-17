// state.js
// A single plain state object mirroring the argument list of
// hexSticker::sticker(), plus a tiny pub/sub so UI changes can trigger
// re-renders of the preview and the R-code panel.

export function defaultState() {
  return {
    // --- subplot (image) -----------------------------------------------
    subplotImage: null, // data URL of uploaded image, or null
    subplotImageName: '', // original file name, for reference only
    s_x: 0.8,
    s_y: 0.75,
    s_width: 0.4,
    s_height: 0.5,
    s_clip: 'hex', // 'hex' | 'circle' | 'none' -- UI extra, not a real hexSticker arg
    s_opacity: 1, // UI extra, not a real hexSticker arg

    // --- package text -----------------------------------------------------
    package: 'mypackage',
    p_x: 1,
    p_y: 1.4,
    p_size: 8,
    p_color: '#FFFFFF',
    p_family: 'Aller_Rg',
    p_fontface: 'plain',

    // --- hexagon ------------------------------------------------------
    h_size: 1.2,
    h_fill: '#1881C2',
    h_color: '#87B13F',

    // --- spotlight ------------------------------------------------------
    spotlight: false,
    l_x: 1,
    l_y: 0.5,
    l_alpha: 0.4,

    // --- url ------------------------------------------------------------
    url: '',
    u_x: 1,
    u_y: 0.08,
    u_size: 1.5,
    u_color: '#000000',
    u_family: 'Aller_Rg',
    u_angle: 30,

    // --- misc -------------------------------------------------------------
    white_around_sticker: false,
  };
}

class Store {
  constructor(initial) {
    this._state = initial;
    this._subscribers = new Set();
  }

  get state() {
    return this._state;
  }

  /** Merge a partial update into the state and notify subscribers. */
  update(partial) {
    this._state = { ...this._state, ...partial };
    this._notify();
  }

  /** Replace the whole state (e.g. loading a preset) and notify subscribers. */
  replace(newState) {
    this._state = { ...newState };
    this._notify();
  }

  subscribe(fn) {
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  }

  _notify() {
    for (const fn of this._subscribers) fn(this._state);
  }
}

export const store = new Store(defaultState());
