import { Injectable } from '@angular/core';
import { GoogleApiService } from '../google-api/google-api.service';
import { APP_CONFIG } from '../../shared/config/app-config';

const SPREADSHEET_ID_KEY = 'colorToggleAppSpreadsheetId';

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

interface DriveFileListResponse {
  files: DriveFile[];
}

interface SpreadsheetCreateResponse {
  spreadsheetId: string;
}

interface SheetsValuesResponse {
  values?: string[][];
}

@Injectable({ providedIn: 'root' })
export class StorageFileService {
  private spreadsheetId: string | null = null;

  constructor(private api: GoogleApiService) {}

  async resolveSpreadsheet(): Promise<string> {
    // Try cached ID first, but always revalidate
    const cached = sessionStorage.getItem(SPREADSHEET_ID_KEY);
    if (cached) {
      const valid = await this.validateSpreadsheet(cached);
      if (valid) {
        this.spreadsheetId = cached;
        return cached;
      }
    }

    // Search Drive for existing file
    const found = await this.searchForSpreadsheet();
    if (found) {
      sessionStorage.setItem(SPREADSHEET_ID_KEY, found);
      this.spreadsheetId = found;
      return found;
    }

    // Create new spreadsheet
    const created = await this.createSpreadsheet();
    sessionStorage.setItem(SPREADSHEET_ID_KEY, created);
    this.spreadsheetId = created;
    return created;
  }

  getSpreadsheetId(): string | null {
    return this.spreadsheetId;
  }

  private async validateSpreadsheet(id: string): Promise<boolean> {
    try {
      const response = await this.api.call<SheetsValuesResponse>({
        method: 'GET',
        url: `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${APP_CONFIG.headerRange}`,
      });
      const values = response.values;
      if (!values || values.length === 0) return false;
      const header = values[0];
      return header[0] === 'colorKey' && header[1] === 'labelState';
    } catch {
      return false;
    }
  }

  private async searchForSpreadsheet(): Promise<string | null> {
    const query = encodeURIComponent(
      `name='${APP_CONFIG.spreadsheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    );
    const response = await this.api.call<DriveFileListResponse>({
      method: 'GET',
      url: `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime)&orderBy=createdTime desc`,
    });

    const files = response.files || [];
    if (files.length === 0) return null;

    if (files.length > 1) {
      console.warn(`[StorageFileService] Multiple matching spreadsheets found. Using most recent: ${files[0].id}`);
    }

    // Validate the most recent file has correct schema
    for (const file of files) {
      const valid = await this.validateSpreadsheet(file.id);
      if (valid) return file.id;
    }

    return null;
  }

  private async createSpreadsheet(): Promise<string> {
    const createBody = {
      properties: { title: APP_CONFIG.spreadsheetName },
      sheets: [
        {
          properties: { title: APP_CONFIG.sheetName },
        },
      ],
    };

    const created = await this.api.call<SpreadsheetCreateResponse>({
      method: 'POST',
      url: 'https://sheets.googleapis.com/v4/spreadsheets',
      body: createBody,
    });

    const id = created.spreadsheetId;

    // Write header + default rows
    await this.api.call({
      method: 'PUT',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${APP_CONFIG.sheetName}!A1:B7?valueInputOption=RAW`,
      body: {
        values: [
          ['colorKey', 'labelState'],
          ['red', 'Passive'],
          ['blue', 'Passive'],
          ['green', 'Passive'],
          ['yellow', 'Passive'],
          ['purple', 'Passive'],
          ['orange', 'Passive'],
        ],
      },
    });

    return id;
  }
}
