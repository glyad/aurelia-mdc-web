import { MdcComponent } from '@aurelia-mdc-web/base';
import { cssClasses, MDCSelectFoundationMap, MDCSelectEventDetail, strings } from '@material/select';
import { inject, useView, customElement, child, processContent, ViewCompiler, ViewResources, BehaviorInstruction, children } from 'aurelia-framework';
import { PLATFORM } from 'aurelia-pal';
import { MdcSelectIcon, IMdcSelectIconElement, mdcIconStrings } from './mdc-select-icon';
import { MdcSelectHelperText, mdcHelperTextCssClasses, IMdcSelectHelperTextElement } from './mdc-select-helper-text/mdc-select-helper-text';
import { MdcLineRipple } from '@aurelia-mdc-web/line-ripple';
import { MdcFloatingLabel } from '@aurelia-mdc-web/floating-label';
import { MDCNotchedOutline } from '@material/notched-outline';
import { MdcMenu } from '@aurelia-mdc-web/menu';
import { MDCMenuItemEvent, Corner } from '@material/menu';
import { bindable } from 'aurelia-typed-observable-plugin';
import { MdcListItem, IMdcListItemElement } from '@aurelia-mdc-web/list';
import { MDCSelectFoundationAurelia } from './mdc-select-fundation-aurelia';
import { MDCSelectAdapterAurelia } from './mdc-select-adapter-aurelia';

strings.CHANGE_EVENT = strings.CHANGE_EVENT.toLowerCase();

let selectId = 0;

@inject(Element)
@useView(PLATFORM.moduleName('./mdc-select.html'))
@customElement(cssClasses.ROOT)
@processContent(MdcSelect.processContent)
export class MdcSelect extends MdcComponent<MDCSelectFoundationAurelia>{

  static processContent(_viewCompiler: ViewCompiler, _resources: ViewResources, element: Element, _instruction: BehaviorInstruction) {
    // move icon to the slot - this allows omitting slot specification
    const leadingIcon = element.querySelector(`[${mdcIconStrings.ATTRIBUTE}]`);
    leadingIcon?.setAttribute('slot', 'leading-icon');
    return true;
  }

  constructor(root: HTMLElement) {
    super(root);
    defineMdcSelectElementApis(this.root);
  }

  id: string = `mdc-select-${++selectId}`;
  private menu: MdcMenu;
  private selectAnchor: HTMLElement;
  private selectedText: HTMLElement;

  private menuElement: Element;

  @child(`[${mdcIconStrings.ATTRIBUTE}]`)
  leadingIconEl: IMdcSelectIconElement;

  @children('mdc-list-items')
  items: MdcListItem;

  private leadingIcon?: MdcSelectIcon;

  private helperText?: MdcSelectHelperText;
  private lineRipple?: MdcLineRipple;
  private mdcLabel: MdcFloatingLabel;
  private outline?: MDCNotchedOutline;

  @bindable
  label: string;

  @bindable.booleanAttr
  outlined: boolean;

  @bindable.booleanAttr
  required: boolean;
  async requiredChanged() {
    await this.initialised;
    if (this.required) {
      this.selectAnchor.setAttribute('aria-required', 'true');
    } else {
      this.selectAnchor.removeAttribute('aria-required');
    }
  }

  private initialValue: unknown;
  get value(): unknown {
    if (this.foundation) {
      return this.foundation.getValue();
    } else {
      return this.initialValue;
    }
  }

  set value(value: unknown) {
    if (this.foundation) {
      this.foundation.setValue(value);
      this.foundation.layout();
    } else {
      this.initialValue = value;
    }
  }

  get selectedIndex(): number {
    return this.foundation!.getSelectedIndex();
  }

  set selectedIndex(selectedIndex: number) {
    this.foundation?.setSelectedIndex(selectedIndex, /** closeMenu */ true);
  }

  async initialise() {
    this.leadingIcon = this.leadingIconEl?.au['mdc-select-icon'].viewModel;
    const nextSibling = this.root.nextElementSibling;
    if (nextSibling?.tagName === mdcHelperTextCssClasses.ROOT.toUpperCase()) {
      this.helperText = (nextSibling as IMdcSelectHelperTextElement).au.controller.viewModel;
    }
    await Promise.all([this.helperText?.initialised, this.menu.initialised].filter(x => x));
  }

  initialSyncWithDOM() {
    this.value = this.initialValue;
  }

  getDefaultFoundation() {
    // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
    // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
    const adapter: MDCSelectAdapterAurelia = {
      ...this.getSelectAdapterMethods(),
      ...this.getCommonAdapterMethods(),
      ...this.getOutlineAdapterMethods(),
      ...this.getLabelAdapterMethods(),
    };
    return new MDCSelectFoundationAurelia(adapter, this.getFoundationMap());
  }

  private getSelectAdapterMethods() {
    return {
      getSelectedMenuItem: () => this.menuElement.querySelector(strings.SELECTED_ITEM_SELECTOR),
      getMenuItemAttr: (menuItem: Element, attr: string) => menuItem.getAttribute(attr),
      setSelectedText: (text: string) => {
        this.selectedText.textContent = text;
      },
      isSelectAnchorFocused: () => document.activeElement === this.selectAnchor,
      getSelectAnchorAttr: (attr: string) => this.selectAnchor.getAttribute(attr),
      setSelectAnchorAttr: (attr: string, value: string) => {
        this.selectAnchor.setAttribute(attr, value);
      },
      removeSelectAnchorAttr: (attr: string) => {
        this.selectAnchor.removeAttribute(attr);
      },
      addMenuClass: (className: string) => {
        this.menuElement.classList.add(className);
      },
      removeMenuClass: (className: string) => {
        this.menuElement.classList.remove(className);
      },
      openMenu: () => { this.menu.open = true; },
      closeMenu: () => { this.menu.open = false; },
      getAnchorElement: () => this.root.querySelector(strings.SELECT_ANCHOR_SELECTOR)!,
      setMenuAnchorElement: (anchorEl: HTMLElement) => {
        this.menu.anchor = anchorEl;
      },
      setMenuAnchorCorner: (anchorCorner: Corner) => {
        this.menu.setAnchorCorner(anchorCorner);
      },
      setMenuWrapFocus: (wrapFocus: boolean) => {
        this.menu.wrapFocus = wrapFocus;
      },
      getSelectedIndex: () => {
        const index = this.menu.selectedIndex;
        return index instanceof Array ? index[0] : index;
      },
      setSelectedIndex: (index: number) => {
        this.menu.selectedIndex = index;
      },
      setAttributeAtIndex: (index: number, attributeName: string, attributeValue: string) => {
        this.menu.items[index].setAttribute(attributeName, attributeValue);
      },
      removeAttributeAtIndex: (index: number, attributeName: string) => {
        this.menu.items[index].removeAttribute(attributeName);
      },
      focusMenuItemAtIndex: (index: number) => {
        (this.menu.items[index] as HTMLElement).focus();
      },
      getMenuItemCount: () => this.menu.items.length,
      getMenuItemValues: () => this.menu.items.map(x => (x as IMdcListItemElement).au.controller.viewModel.value),
      getMenuItemTextAtIndex: (index: number) => this.menu.getPrimaryTextAtIndex(index),
      addClassAtIndex: (index: number, className: string) => {
        this.menu.items[index].classList.add(className);
      },
      removeClassAtIndex: (index: number, className: string) => {
        this.menu.items[index].classList.remove(className);
      },
      isTypeaheadInProgress: () => this.menu.typeaheadInProgress,
      typeaheadMatchItem: (nextChar: string, startingIndex: number) => this.menu.typeaheadMatchItem(nextChar, startingIndex),
    };
  }

  private getCommonAdapterMethods() {
    return {
      addClass: (className: string) => {
        this.root.classList.add(className);
      },
      removeClass: (className: string) => {
        this.root.classList.remove(className);
      },
      hasClass: (className: string) => this.root.classList.contains(className),
      setRippleCenter: (normalizedX: number) => {
        this.lineRipple && this.lineRipple.setRippleCenter(normalizedX)
      },
      activateBottomLine: () => {
        this.lineRipple && this.lineRipple.activate();
      },
      deactivateBottomLine: () => {
        this.lineRipple && this.lineRipple.deactivate();
      },
      notifyChange: (value: string) => {
        const index = this.selectedIndex;
        this.emit<MDCSelectEventDetail>(strings.CHANGE_EVENT, { value, index }, true /* shouldBubble  */);
      },
    };
  }

  private getOutlineAdapterMethods() {
    return {
      hasOutline: () => Boolean(this.outline),
      notchOutline: (labelWidth: number) => {
        this.outline && this.outline.notch(labelWidth);
      },
      closeOutline: () => {
        this.outline && this.outline.closeNotch();
      },
    };
  }

  private getLabelAdapterMethods() {
    return {
      hasLabel: () => !!this.mdcLabel,
      floatLabel: (shouldFloat: boolean) => {
        this.mdcLabel && this.mdcLabel.float(shouldFloat);
      },
      getLabelWidth: () => this.mdcLabel ? this.mdcLabel.getWidth() : 0,
      setLabelRequired: (isRequired: boolean) => {
        this.mdcLabel && this.mdcLabel.setRequired(isRequired);
      },
    };
  }

  handleChange() {
    this.foundation?.handleChange();
  };

  handleFocus() {
    this.foundation?.handleFocus();
  }

  handleBlur() {
    this.foundation?.handleBlur();
  }

  handleClick(evt: MouseEvent) {
    this.selectAnchor.focus();
    this.foundation?.handleClick(this.getNormalizedXCoordinate(evt));
  }

  handleKeydown(evt: KeyboardEvent) {
    this.foundation?.handleKeydown(evt);
    return true;
  }

  handleMenuItemAction(evt: MDCMenuItemEvent) {
    this.foundation?.handleMenuItemAction(evt.detail.index);
  }

  handleMenuOpened() {
    this.foundation?.handleMenuOpened();
  }

  handleMenuClosed() {
    this.foundation?.handleMenuClosed();
  }

  handleItemsChanged() {
    this.foundation?.layoutOptions();
    this.foundation?.layout();
  }

  focus() {
    this.selectAnchor.focus();
  }

  blur() {
    this.selectAnchor.blur();
  }

  /**
   * Calculates where the line ripple should start based on the x coordinate within the component.
   */
  private getNormalizedXCoordinate(evt: MouseEvent | TouchEvent): number {
    const targetClientRect = (evt.target as Element).getBoundingClientRect();
    const xCoordinate =
      this.isTouchEvent(evt) ? evt.touches[0].clientX : evt.clientX;
    return xCoordinate - targetClientRect.left;
  }

  private isTouchEvent(evt: MouseEvent | TouchEvent): evt is TouchEvent {
    return Boolean((evt as TouchEvent).touches);
  }

  /**
   * Returns a map of all subcomponents to subfoundations.
   */
  private getFoundationMap(): Partial<MDCSelectFoundationMap> {
    return {
      helperText: this.helperText?.foundation,
      leadingIcon: this.leadingIcon?.foundation
    };
  }
}

export interface IMdcSelectElement extends HTMLElement {
  au: {
    controller: {
      viewModel: MdcSelect;
    }
  }
}

function defineMdcSelectElementApis(element: HTMLElement) {
  Object.defineProperties(element, {
    value: {
      get(this: IMdcSelectElement) {
        return this.au.controller.viewModel.value;
      },
      set(this: IMdcSelectElement, value: any) {
        // aurelia binding converts "undefined" and "null" into empty string
        // this does not translate well into "empty" menu items when several selects are bound to the same field
        this.au.controller.viewModel.value = value === "" ? undefined : value;
      },
      configurable: true
    },
    focus: {
      value(this: IMdcSelectElement) {
        this.au.controller.viewModel.focus();
      },
      configurable: true
    },
    blur: {
      value(this: IMdcSelectElement) {
        this.au.controller.viewModel.blur();
      },
      configurable: true
    }
  });
};
