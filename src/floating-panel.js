const SNAP_THRESHOLD = 20;

export class FloatingPanel {
  constructor({ id, title, initialPosition = { top: 20, left: 20 }, width = 320 }) {
    this._id = id;
    this._storageKey = `fp-pos-${id}`;
    this._isDragging = false;
    this._dragOffsetX = 0;
    this._dragOffsetY = 0;

    this._buildDOM(title, width);
    this._setupMinimize();
    this._setupDrag();
    this._restoreState(initialPosition);
  }

  _buildDOM(title, width) {
    this._el = document.createElement('dialog');
    this._el.className = 'floating-panel';
    this._el.style.width = `${width}px`;

    this._titlebar = document.createElement('div');
    this._titlebar.className = 'fp-titlebar';

    const titleEl = document.createElement('span');
    titleEl.className = 'fp-title';
    titleEl.textContent = title;

    this._minimizeBtn = document.createElement('button');
    this._minimizeBtn.className = 'fp-btn';
    this._minimizeBtn.type = 'button';
    this._minimizeBtn.textContent = '−';
    this._minimizeBtn.setAttribute('aria-label', 'Minimize panel');
    this._minimizeBtn.title = 'Minimize';

    this._titlebar.appendChild(titleEl);
    this._titlebar.appendChild(this._minimizeBtn);

    this._contentEl = document.createElement('div');
    this._contentEl.className = 'fp-content';

    this._el.appendChild(this._titlebar);
    this._el.appendChild(this._contentEl);

    // Prevent Escape from triggering cancel/close on the dialog
    this._el.addEventListener('cancel', (e) => e.preventDefault());
  }

  get contentEl() {
    return this._contentEl;
  }

  get element() {
    return this._el;
  }

  get isMinimized() {
    return this._el.classList.contains('fp-minimized');
  }

  appendTo(parent = document.body) {
    parent.appendChild(this._el);
    this._el.show();
  }

  minimize() {
    const rect = this._el.getBoundingClientRect();
    const nearBottom = window.innerHeight - rect.bottom < SNAP_THRESHOLD;

    this._el.classList.add('fp-minimized');
    this._minimizeBtn.textContent = '+';
    this._minimizeBtn.title = 'Expand';
    this._minimizeBtn.setAttribute('aria-label', 'Expand panel');

    if (nearBottom) {
      // Re-anchor so the collapsed title bar stays flush at the bottom
      requestAnimationFrame(() => {
        this._el.style.top = `${window.innerHeight - this._titlebar.offsetHeight}px`;
        this._saveState();
      });
    } else {
      this._saveState();
    }
  }

  expand() {
    this._el.classList.remove('fp-minimized');
    this._minimizeBtn.textContent = '−';
    this._minimizeBtn.title = 'Minimize';
    this._minimizeBtn.setAttribute('aria-label', 'Minimize panel');
    this._clampToViewport();
    this._saveState();
  }

  _setupMinimize() {
    this._minimizeBtn.addEventListener('click', () => {
      if (this.isMinimized) {
        this.expand();
      } else {
        this.minimize();
      }
    });
  }

  _setupDrag() {
    this._titlebar.addEventListener('mousedown', (e) => {
      if (e.target === this._minimizeBtn) return;
      e.preventDefault();
      this._isDragging = true;

      const rect = this._el.getBoundingClientRect();
      this._dragOffsetX = e.clientX - rect.left;
      this._dragOffsetY = e.clientY - rect.top;
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this._isDragging) return;

      const rect = this._el.getBoundingClientRect();
      const panelW = rect.width;
      const titlebarH = this._titlebar.offsetHeight;

      let newLeft = e.clientX - this._dragOffsetX;
      let newTop = e.clientY - this._dragOffsetY;

      // Keep panel within viewport; always show at least the titlebar
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - panelW));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - titlebarH));

      this._el.style.left = `${newLeft}px`;
      this._el.style.top = `${newTop}px`;
    });

    document.addEventListener('mouseup', () => {
      if (!this._isDragging) return;
      this._isDragging = false;
      document.body.style.userSelect = '';
      this._snap();
      this._saveState();
    });
  }

  _snap() {
    const rect = this._el.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;

    if (left < SNAP_THRESHOLD) left = 0;
    if (window.innerWidth - rect.right < SNAP_THRESHOLD) left = window.innerWidth - rect.width;
    if (top < SNAP_THRESHOLD) top = 0;
    if (window.innerHeight - rect.bottom < SNAP_THRESHOLD) top = window.innerHeight - rect.height;

    this._el.style.left = `${left}px`;
    this._el.style.top = `${top}px`;
  }

  _clampToViewport() {
    const rect = this._el.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;

    left = Math.max(0, Math.min(left, window.innerWidth - rect.width));
    top = Math.max(0, Math.min(top, window.innerHeight - this._titlebar.offsetHeight));

    this._el.style.left = `${left}px`;
    this._el.style.top = `${top}px`;
  }

  _saveState() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify({
        top: parseFloat(this._el.style.top) || 0,
        left: parseFloat(this._el.style.left) || 0,
        minimized: this.isMinimized,
      }));
    } catch (_) { /* storage may be unavailable */ }
  }

  _restoreState(initialPosition) {
    let position = { ...initialPosition };
    let minimized = false;

    try {
      const raw = localStorage.getItem(this._storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data.top === 'number' && typeof data.left === 'number') {
          position = { top: data.top, left: data.left };
        }
        minimized = Boolean(data.minimized);
      }
    } catch (_) { /* use defaults */ }

    this._el.style.top = `${position.top}px`;
    this._el.style.left = `${position.left}px`;

    if (minimized) {
      this._el.classList.add('fp-minimized');
      this._minimizeBtn.textContent = '+';
      this._minimizeBtn.title = 'Expand';
      this._minimizeBtn.setAttribute('aria-label', 'Expand panel');
    }
  }
}
