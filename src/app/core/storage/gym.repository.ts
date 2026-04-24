import { Injectable } from '@angular/core';
import { GoogleApiService } from '../google-api/google-api.service';
import { StorageFileService } from './storage-file.service';
import { APP_CONFIG } from '../../shared/config/app-config';
import { GymEntry } from '../../shared/models/gym.model';

interface SheetsValuesResponse {
  values?: string[][];
}

interface SheetsAppendResponse {
  updates?: unknown;
}

@Injectable({ providedIn: 'root' })
export class GymRepository {
  constructor(
    private api: GoogleApiService,
    private storageFile: StorageFileService
  ) {}

  async loadGyms(): Promise<GymEntry[]> {
    const id = this.requireSpreadsheetId();
    await this.storageFile.ensureGymsSheet(id);

    const response = await this.api.call<SheetsValuesResponse>({
      method: 'GET',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${APP_CONFIG.gymsRange}`,
    });

    return (response.values || []).map(row => this.rowToGym(row)).filter((g): g is GymEntry => g !== null);
  }

  async saveGym(gym: GymEntry): Promise<void> {
    const id = this.requireSpreadsheetId();
    await this.storageFile.ensureGymsSheet(id);

    await this.api.call<SheetsAppendResponse>({
      method: 'POST',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${APP_CONFIG.gymsSheetName}!A:G:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      body: { values: [this.gymToRow(gym)] },
    });
  }

  async updateGym(gym: GymEntry): Promise<void> {
    const id = this.requireSpreadsheetId();
    await this.storageFile.ensureGymsSheet(id);

    const rowIndex = await this.findRowIndex(id, gym.id);
    if (rowIndex === -1) throw new Error(`Gym not found: ${gym.id}`);

    // Data starts at row 2; rowIndex is 0-based within data rows
    const sheetRow = rowIndex + 2;
    const range = `${APP_CONFIG.gymsSheetName}!A${sheetRow}:G${sheetRow}`;

    await this.api.call({
      method: 'PUT',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?valueInputOption=RAW`,
      body: { values: [this.gymToRow(gym)] },
    });
  }

  async deleteGym(gymId: string): Promise<void> {
    const id = this.requireSpreadsheetId();
    await this.storageFile.ensureGymsSheet(id);

    const rowIndex = await this.findRowIndex(id, gymId);
    if (rowIndex === -1) throw new Error(`Gym not found: ${gymId}`);

    // Data starts at row 2; rowIndex is 0-based within data rows
    const sheetRow = rowIndex + 1; // 0-based sheet index for deleteDimension

    await this.api.call({
      method: 'POST',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${id}:batchUpdate`,
      body: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: await this.getGymsSheetId(id),
                dimension: 'ROWS',
                startIndex: sheetRow + 1, // +1 for header row
                endIndex: sheetRow + 2,
              },
            },
          },
        ],
      },
    });
  }

  private async findRowIndex(spreadsheetId: string, gymId: string): Promise<number> {
    const response = await this.api.call<SheetsValuesResponse>({
      method: 'GET',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${APP_CONFIG.gymsRange}`,
    });

    const rows = response.values || [];
    return rows.findIndex(row => row[0] === gymId);
  }

  private async getGymsSheetId(spreadsheetId: string): Promise<number> {
    const meta = await this.api.call<{ sheets: { properties: { title: string; sheetId: number } }[] }>({
      method: 'GET',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    });

    const sheet = (meta.sheets || []).find(s => s.properties.title === APP_CONFIG.gymsSheetName);
    if (!sheet) throw new Error('Gyms sheet not found');
    return sheet.properties.sheetId;
  }

  private requireSpreadsheetId(): string {
    const id = this.storageFile.getSpreadsheetId();
    if (!id) throw new Error('Spreadsheet not resolved yet');
    return id;
  }

  private gymToRow(gym: GymEntry): string[] {
    return [
      gym.id,
      gym.name,
      String(gym.lat),
      String(gym.lng),
      gym.defended ? 'true' : 'false',
      gym.defendedSince ?? '',
      gym.defenderPokemon ?? '',
    ];
  }

  private rowToGym(row: string[]): GymEntry | null {
    const id = row[0];
    const name = row[1];
    if (!id || !name) return null;

    const lat = parseFloat(row[2]);
    const lng = parseFloat(row[3]);
    if (isNaN(lat) || isNaN(lng)) return null;

    return {
      id,
      name,
      lat,
      lng,
      defended: row[4] === 'true',
      defendedSince: row[5] || undefined,
      defenderPokemon: row[6] || undefined,
    };
  }
}
