import { BASE_URL } from "../utils";

export interface CSVFormat {
  description: string;
  required_columns: string[];
  column_descriptions: Record<string, string>;
  data_types: Record<string, string>;
  sample_data: Record<string, any>[];
  notes: string[];
}

export interface CSVFormats {
  inventory: CSVFormat;
  dishes: CSVFormat;
  sales: CSVFormat;
  general_guidelines: {
    file_format: string;
    encoding: string;
    upload_order: string[];
    common_issues: string[];
    tips: string[];
  };
}

export const fetchCSVFormats = async (): Promise<CSVFormats> => {
  const response = await fetch(`${BASE_URL}/csv/csv-formats`);
  if (!response.ok) {
    throw new Error("Failed to fetch CSV formats");
  }
  return response.json();
};

export const fetchCSVFormatForType = async (uploadType: string): Promise<any> => {
  const response = await fetch(`${BASE_URL}/csv/csv-formats/${uploadType}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV format for ${uploadType}`);
  }
  return response.json();
};

export const downloadCSVTemplate = async (uploadType: string): Promise<string> => {
  const response = await fetch(`${BASE_URL}/csv/csv-template/${uploadType}`);
  if (!response.ok) {
    throw new Error(`Failed to download CSV template for ${uploadType}`);
  }
  return response.text();
};
