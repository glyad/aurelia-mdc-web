import { MdcComponent } from '@aurelia-mdc-web/base';
import { MDCMenuSurfaceFoundation, MDCMenuSurfaceAdapter, cssClasses, Corner, MDCMenuDistance, util, strings } from '@material/menu-surface';
import { inject, customAttribute } from 'aurelia-framework';
import { bindable } from 'aurelia-typed-observable-plugin';

strings.OPENED_EVENT = strings.OPENED_EVENT.toLowerCase();
strings.CLOSED_EVENT = strings.CLOSED_EVENT.toLowerCase();

@inject(Element)
@customAttribute('mdc-menu-surface')
export class MdcMenuSurface extends MdcComponent<MDCMenuSurfaceFoundation> implements EventListenerObject {
  originalParent: HTMLElement | null;

  @bindable
  anchor?: Element | null;

  private previousFocus?: HTMLElement | SVGElement | null;

  handleKeydown(evt: KeyboardEvent) {
    this.foundation?.handleKeydown(evt);
  }

  handleBodyClick(evt: MouseEvent) {
    this.foundation?.handleBodyClick(evt);
  }

  async initialise() {
    this.root.classList.add(cssClasses.ROOT);
  }

  handleEvent(evt: Event): void {
    switch (evt.currentTarget) {
      case this.root:
        switch (evt.type) {
          case 'keydown': this.handleKeydown(evt as KeyboardEvent); break;
        }
        break;
      case document.body:
        switch (evt.type) {
          case 'click': this.handleBodyClick(evt as MouseEvent); break;
        }
        break;
    }
  }

  registerBodyClickListener() {
    // this is different to native implementation
    // refer to https://github.com/material-components/material-components-web/issues/6188
    // capture so that no race between handleBodyClick and quickOpen when
    // menusurface opened on button click which registers this listener
    document.body.addEventListener('click', this);
  };

  deregisterBodyClickListener() {
    document.body.removeEventListener('click', this);
  };

  initialSyncWithDOM() {
    const parentEl = this.root.parentElement;
    if (!this.anchor) {
      this.anchor = parentEl && parentEl.classList.contains(cssClasses.ANCHOR) ? parentEl : null;
    }
    this.listen('keydown', this);
  }

  destroy() {
    this.unlisten('keydown', this);
    if (this.originalParent) {
      this.originalParent.appendChild(document.body.removeChild(this.root));
    }
    super.destroy();
  }

  isOpen(): boolean {
    return this.foundation!.isOpen();
  }

  open() {
    this.foundation?.open();
  }

  close(skipRestoreFocus = false) {
    this.foundation?.close(skipRestoreFocus);
  }

  set quickOpen(quickOpen: boolean) {
    this.foundation?.setQuickOpen(quickOpen);
  }

  /** Sets the foundation to use page offsets for an positioning when the menu is hoisted to the body. */
  @bindable.booleanAttr
  hoistToBody: boolean;
  async hoistToBodyChanged() {
    await this.initialised;
    if (this.hoistToBody) {
      this.originalParent = this.root.parentElement;
      if (this.originalParent) {
        document.body.appendChild(this.originalParent.removeChild(this.root));
        this.foundation?.setIsHoisted(true);
      }
    }
  }

  @bindable.booleanAttr
  fixed: boolean;
  async fixedChanged() {
    if (this.fixed) {
      this.root.classList.add(cssClasses.FIXED);
    } else {
      this.root.classList.remove(cssClasses.FIXED);
    }
    await this.initialised;
    this.foundation?.setFixedPosition(this.fixed);
  }

  /** Sets the absolute x/y position to position based on. Requires the menu to be hoisted. */
  setAbsolutePosition(x: number, y: number) {
    this.foundation?.setAbsolutePosition(x, y);
    this.hoistToBody = true;
  }

  @bindable
  anchorCorner: keyof typeof Corner;
  async anchorCornerChanged() {
    await this.initialised;
    this.foundation?.setAnchorCorner(Corner[this.anchorCorner]);
  }

  /**
   * @param corner Default anchor corner alignment of top-left surface corner.
   */
  setAnchorCorner(corner: Corner) {
    this.foundation?.setAnchorCorner(corner);
  }

  @bindable
  anchorMargin: Partial<MDCMenuDistance>;
  async anchorMarginChanged(margin: Partial<MDCMenuDistance>) {
    await this.initialised;
    this.foundation?.setAnchorMargin(margin);
  }

  getDefaultFoundation() {
    // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
    // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
    const adapter: MDCMenuSurfaceAdapter = {
      addClass: (className) => this.root.classList.add(className),
      removeClass: (className) => this.root.classList.remove(className),
      hasClass: (className) => this.root.classList.contains(className),
      hasAnchor: () => !!this.anchor,
      notifyClose: () => {
        this.emit(MDCMenuSurfaceFoundation.strings.CLOSED_EVENT, {});
        this.deregisterBodyClickListener();
      },
      notifyOpen: () => {
        this.emit(MDCMenuSurfaceFoundation.strings.OPENED_EVENT, {});
        this.registerBodyClickListener();
      },
      isElementInContainer: (el) => this.root.contains(el),
      isRtl: () => getComputedStyle(this.root).getPropertyValue('direction') === 'rtl',
      setTransformOrigin: (origin) => {
        const propertyName = `${util.getTransformPropertyName(window)}-origin`;
        (this.root as HTMLElement).style.setProperty(propertyName, origin);
      },
      isFocused: () => document.activeElement === this.root,
      saveFocus: () => {
        this.previousFocus = document.activeElement as HTMLElement | SVGElement | null;
      },
      restoreFocus: () => {
        if (this.root.contains(document.activeElement)) {
          if (this.previousFocus && this.previousFocus.focus) {
            this.previousFocus.focus();
          }
        }
      },
      getInnerDimensions: () => {
        return {
          width: (this.root as HTMLElement).offsetWidth,
          height: (this.root as HTMLElement).offsetHeight
        };
      },
      getAnchorDimensions: () => this.anchor ? this.anchor.getBoundingClientRect() : null,
      getWindowDimensions: () => {
        return { width: window.innerWidth, height: window.innerHeight };
      },
      getBodyDimensions: () => {
        return { width: document.body.clientWidth, height: document.body.clientHeight };
      },
      getWindowScroll: () => {
        return { x: window.pageXOffset, y: window.pageYOffset };
      },
      setPosition: (position) => {
        const rootHTML = this.root as HTMLElement;
        rootHTML.style.left = 'left' in position ? `${position.left}px` : '';
        rootHTML.style.right = 'right' in position ? `${position.right}px` : '';
        rootHTML.style.top = 'top' in position ? `${position.top}px` : '';
        rootHTML.style.bottom = 'bottom' in position ? `${position.bottom}px` : '';
      },
      setMaxHeight: (height) => {
        (this.root as HTMLElement).style.maxHeight = height;
      },
    };
    return new MDCMenuSurfaceFoundation(adapter);
  }

}
