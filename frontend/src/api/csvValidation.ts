import { BASE_URL } from "../utils";
import { authFetch } from "../hooks/authFetch";

export interface ValidationResult {
  valid: boolean;
  upload_type: string;
  file_name: string;
  structure_validation: {
    valid_structure: boolean;
    expected_columns: string[];
    actual_columns: string[];
    missing_columns: string[];
    extra_columns: string[];
    row_count: number;
    sample_row?: Record<string, any>;
  };
  data_validation?: {
    valid_data: boolean;
    valid_rows: number;
    total_rows: number;
    errors: string[];
    warnings: string[];
  };
  message?: string;
  recommendation?: string;
  ready_for_upload?: boolean;
}

export const validateCSV = async (file: File, uploadType: string): Promise<ValidationResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await authFetch(`${BASE_URL}/csv/validate-csv/${uploadType}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Validation failed: ${response.status}`);
  }

  return response.json();
};

// Test validation without authentication (for development/testing)
export const testValidateCSV = async (file: File, uploadType: string): Promise<ValidationResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/csv/test-validate-csv/${uploadType}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Validation failed: ${response.status}`);
  }

  return response.json();
};
