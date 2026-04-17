import { Injectable } from '@angular/core';
import { GoogleApiService } from '../google-api/google-api.service';
import { StorageFileService } from './storage-file.service';
import { APP_CONFIG } from '../../shared/config/app-config';
import { ColorButtonState, ColorKey, ButtonStateLabel } from '../../shared/models/button-state.model';
import { BUTTON_CONFIG } from '../../shared/config/button-config';

const VALID_COLOR_KEYS: ColorKey[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const VALID_LABELS: ButtonStateLabel[] = ['Passive', 'Active'];

interface SheetsValuesResponse {
  values?: string[][];
}

@Injectable({ providedIn: 'root' })
export class ButtonStateRepository {
  constructor(
    private api: GoogleApiService,
    private storageFile: StorageFileService
  ) {}

  async loadStates(): Promise<ColorButtonState[]> {
    const id = this.storageFile.getSpreadsheetId();
    if (!id) throw new Error('Spreadsheet ID not available');

    const response = await this.api.call<SheetsValuesResponse>({
      method: 'GET',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${APP_CONFIG.statesRange}`,
    });

    const rows = response.values || [];
    return this.parseAndFillDefaults(rows);
  }

  async saveState(state: ColorButtonState): Promise<void> {
    const id = this.storageFile.getSpreadsheetId();
    if (!id) throw new Error('Spreadsheet ID not available');

    const rowIndex = BUTTON_CONFIG.findIndex(b => b.colorKey === state.colorKey);
    if (rowIndex === -1) throw new Error(`Unknown colorKey: ${state.colorKey}`);

    // Row 1 = header, Row 2 = first data row, so data row i is at row (i + 2)
    const sheetRow = rowIndex + 2;
    const range = `${APP_CONFIG.sheetName}!A${sheetRow}:B${sheetRow}`;

    await this.api.call({
      method: 'PUT',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?valueInputOption=RAW`,
      body: {
        values: [[state.colorKey, state.labelState]],
      },
    });
  }

  private parseAndFillDefaults(rows: string[][]): ColorButtonState[] {
    const stateMap = new Map<ColorKey, ButtonStateLabel>();

    for (const row of rows) {
      const colorKey = row[0] as ColorKey;
      const labelRaw = row[1];
      if (!VALID_COLOR_KEYS.includes(colorKey)) continue;
      const label: ButtonStateLabel = VALID_LABELS.includes(labelRaw as ButtonStateLabel)
        ? (labelRaw as ButtonStateLabel)
        : 'Passive';
      stateMap.set(colorKey, label);
    }

    // Fill missing keys with defaults
    return BUTTON_CONFIG.map(btn => ({
      colorKey: btn.colorKey,
      labelState: stateMap.get(btn.colorKey) ?? 'Passive',
    }));
  }
}
