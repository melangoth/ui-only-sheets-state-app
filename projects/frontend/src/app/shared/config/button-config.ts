import { ColorKey } from '../models/button-state.model';

export interface ButtonDefinition {
  colorKey: ColorKey;
  displayName: string;
  backgroundColor: string;
  textColor: string;
}

export const BUTTON_CONFIG: ButtonDefinition[] = [
  { colorKey: 'red',    displayName: 'Red',    backgroundColor: '#dc3545', textColor: '#ffffff' },
  { colorKey: 'blue',   displayName: 'Blue',   backgroundColor: '#0d6efd', textColor: '#ffffff' },
  { colorKey: 'green',  displayName: 'Green',  backgroundColor: '#198754', textColor: '#ffffff' },
  { colorKey: 'yellow', displayName: 'Yellow', backgroundColor: '#ffc107', textColor: '#000000' },
  { colorKey: 'purple', displayName: 'Purple', backgroundColor: '#6f42c1', textColor: '#ffffff' },
  { colorKey: 'orange', displayName: 'Orange', backgroundColor: '#fd7e14', textColor: '#ffffff' },
];
