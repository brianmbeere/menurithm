import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  CloudUpload,
  GetApp,
  CheckCircle,
  ErrorIcon,
} from './SVGIcons';
import { downloadCSVTemplate, fetchCSVFormatForType } from '../api/csvFormats';
import { testValidateCSV, type ValidationResult } from '../api/csvValidation';

interface CSVUploadHelperProps {
  open: boolean;
  onClose: () => void;
  uploadType: 'inventory' | 'dishes' | 'sales';
  onValidFileSelected: (file: File, validationResult: ValidationResult) => void;
}

const CSVUploadHelper: React.FC<CSVUploadHelperProps> = ({
  open,
  onClose,
  uploadType,
  onValidFileSelected,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [formatInfo, setFormatInfo] = useState<any>(null);
  const [isLoadingFormat, setIsLoadingFormat] = useState(false);

  React.useEffect(() => {
    if (open && !formatInfo) {
      loadFormatInfo();
    }
  }, [open, uploadType]);

  const loadFormatInfo = async () => {
    setIsLoadingFormat(true);
    try {
      const info = await fetchCSVFormatForType(uploadType);
      setFormatInfo(info[uploadType]);
    } catch (error) {
      console.error('Failed to load format info:', error);
    } finally {
      setIsLoadingFormat(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationResult(null);
    setIsValidating(true);

    try {
      const result = await testValidateCSV(file, uploadType);
      setValidationResult(result);
    } catch (error) {
      console.error('Validation failed:', error);
      setValidationResult({
        valid: false,
        upload_type: uploadType,
        file_name: file.name,
        structure_validation: {
          valid_structure: false,
          expected_columns: [],
          actual_columns: [],
          missing_columns: [],
          extra_columns: [],
          row_count: 0,
        },
        message: `Validation error: ${error}`,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const csvContent = await downloadCSVTemplate(uploadType);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${uploadType}_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  const handleProceedWithUpload = () => {
    if (selectedFile && validationResult?.valid) {
      onValidFileSelected(selectedFile, validationResult);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setFormatInfo(null);
    onClose();
  };

  const getValidationIcon = (result: ValidationResult) => {
    if (result.valid) return <CheckCircle />;
    return <ErrorIcon />;
  };

  const getValidationColor = (result: ValidationResult) => {
    return result.valid ? 'success' : 'error';
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <CloudUpload />
          <Typography variant="h6">
            Upload {uploadType.charAt(0).toUpperCase() + uploadType.slice(1)} CSV
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            Follow these steps to ensure your CSV upload is successful:
          </Typography>
        </Box>

        {/* Step 1: Download Template */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" gutterBottom>
                Step 1: Download Template
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Get the correct CSV format with sample data
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={handleDownloadTemplate}
            >
              Download Template
            </Button>
          </Box>
        </Paper>

        {/* Step 2: Required Columns */}
        {isLoadingFormat ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        ) : formatInfo ? (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Step 2: Required Columns
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              {formatInfo.required_columns?.map((column: string) => (
                <Chip key={column} label={column} size="small" />
              ))}
            </Box>
            {formatInfo.notes && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <List dense>
                  {formatInfo.notes.slice(0, 3).map((note: string, index: number) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemText primary={note} />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}
          </Paper>
        ) : null}

        {/* Step 3: Upload and Validate */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Step 3: Upload and Validate Your File
          </Typography>
          <Box sx={{ mb: 2 }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input">
              <Button
                variant="contained"
                component="span"
                startIcon={<CloudUpload />}
                disabled={isValidating}
              >
                Choose CSV File
              </Button>
            </label>
          </Box>

          {selectedFile && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Selected: {selectedFile.name}
              </Typography>
            </Box>
          )}

          {isValidating && (
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={20} />
              <Typography variant="body2">Validating your CSV...</Typography>
            </Box>
          )}

          {validationResult && (
            <Alert
              severity={getValidationColor(validationResult)}
              icon={getValidationIcon(validationResult)}
            >
              <Typography variant="subtitle2" gutterBottom>
                {validationResult.message || 
                 (validationResult.valid ? 'File is valid!' : 'File has validation errors')}
              </Typography>
              
              {/* Structure Validation Details */}
              {!validationResult.structure_validation.valid_structure && (
                <Box sx={{ mt: 1 }}>
                  {validationResult.structure_validation.missing_columns?.length > 0 && (
                    <Typography variant="body2">
                      Missing columns: {validationResult.structure_validation.missing_columns.join(', ')}
                    </Typography>
                  )}
                  {validationResult.structure_validation.extra_columns?.length > 0 && (
                    <Typography variant="body2">
                      Extra columns: {validationResult.structure_validation.extra_columns.join(', ')}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Data Validation Details */}
              {validationResult.data_validation && !validationResult.data_validation.valid_data && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Valid rows: {validationResult.data_validation.valid_rows} / {validationResult.data_validation.total_rows}
                  </Typography>
                  {validationResult.data_validation.errors.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" fontWeight="bold">Errors:</Typography>
                      {validationResult.data_validation.errors.slice(0, 3).map((error, index) => (
                        <Typography key={index} variant="body2" color="error">
                          • {error}
                        </Typography>
                      ))}
                      {validationResult.data_validation.errors.length > 3 && (
                        <Typography variant="body2" color="text.secondary">
                          ... and {validationResult.data_validation.errors.length - 3} more errors
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}

              {validationResult.recommendation && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  💡 {validationResult.recommendation}
                </Typography>
              )}
            </Alert>
          )}
        </Paper>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {validationResult?.valid && selectedFile && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleProceedWithUpload}
            startIcon={<CheckCircle />}
          >
            Proceed with Upload
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CSVUploadHelper;
