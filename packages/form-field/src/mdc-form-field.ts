import { inject, useView, customElement, PLATFORM } from 'aurelia-framework';
import { cssClasses, MDCFormFieldFoundation, MDCFormFieldAdapter } from '@material/form-field';
import { bindable } from 'aurelia-typed-observable-plugin';
import { MdcComponent } from "@aurelia-mdc-web/base";
import { MdcRipple, IMdcRippleElement } from "@aurelia-mdc-web/ripple";

@inject(Element)
@useView(PLATFORM.moduleName('./mdc-form-field.html'))
@customElement(cssClasses.ROOT)
export class MdcFormField extends MdcComponent<MDCFormFieldFoundation> {
  cssClasses = cssClasses;

  ripple?: MdcRipple;

  label?: HTMLLabelElement | null;

  @bindable.booleanAttr
  nowrap: boolean;

  @bindable.booleanAttr
  alignEnd: boolean;

  @bindable.booleanAttr
  spaceBetween: boolean;

  async initialise() {
    let rippleUpgraded = this.root.querySelector<IMdcRippleElement>('mdc-checkbox');
    if (!rippleUpgraded) {
      rippleUpgraded = this.root.querySelector<IMdcRippleElement>('mdc-radio');
    }
    this.ripple = rippleUpgraded?.au['mdc-ripple'].viewModel;

    const input = this.root.querySelector('input');
    if (input?.hasAttribute('id')) {
      this.label = this.root.querySelector('label');
      if (this.label) {
        this.label.setAttribute('for', input.getAttribute('id')!);
      }
    }
  }

  getDefaultFoundation() {
    // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
    // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
    const adapter: MDCFormFieldAdapter = {
      activateInputRipple: () => this.ripple?.activate(),
      deactivateInputRipple: () => this.ripple?.deactivate(),
      deregisterInteractionHandler: (evtType, handler) => this.label?.removeEventListener(evtType, handler),
      registerInteractionHandler: (evtType, handler) => this.label?.addEventListener(evtType, handler),
    };
    return new MDCFormFieldFoundation(adapter);
  }

}
