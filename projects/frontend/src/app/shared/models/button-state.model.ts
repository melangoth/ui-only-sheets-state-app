export type ButtonStateLabel = 'Passive' | 'Active';
export type ColorKey = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export interface ColorButtonState {
  colorKey: ColorKey;
  labelState: ButtonStateLabel;
}
