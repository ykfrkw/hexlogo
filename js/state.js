// state.js
// A single plain state object holding every sticker parameter, plus a tiny
// pub/sub so UI changes trigger a re-render of the preview.

export function defaultState() {
  return {
    // --- subplot (image) -----------------------------------------------
    subplotImage: null, // data URL of uploaded image, or null
    subplotImageName: '', // original file name, for reference only
    s_x: 0.8,
    s_y: 0.75,
    s_width: 0.4,
    s_height: 0.5,
    s_clip: 'hex', // 'hex' | 'circle' | 'none'
    s_opacity: 1,

    // --- package text -----------------------------------------------------
    package: 'mypackage',
    p_x: 1,
    p_y: 1.4,
    p_size: 8,
    p_color: '#FFFFFF',
    p_family: 'poppins',
    p_fontface: 'plain',

    // --- hexagon ------------------------------------------------------
    h_size: 1.2,
    h_fill: '#0B3D5C',
    h_color: '#4FC3F7',

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
    u_family: 'poppins',
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
