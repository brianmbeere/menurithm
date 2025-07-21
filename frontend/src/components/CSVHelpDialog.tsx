import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
  Alert,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { CloudUpload, GetApp } from './SVGIcons';
import { downloadCSVTemplate, fetchCSVFormatForType } from '../api/csvFormats';

interface CSVHelpDialogProps {
  open: boolean;
  onClose: () => void;
  uploadType: 'inventory' | 'dishes' | 'sales';
}

const CSVHelpDialog: React.FC<CSVHelpDialogProps> = ({
  open,
  onClose,
  uploadType,
}) => {
  const [formatInfo, setFormatInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (open && !formatInfo) {
      loadFormatInfo();
    }
  }, [open, uploadType]);

  const loadFormatInfo = async () => {
    setIsLoading(true);
    try {
      const info = await fetchCSVFormatForType(uploadType);
      setFormatInfo(info[uploadType]);
    } catch (error) {
      console.error('Failed to load format info:', error);
    } finally {
      setIsLoading(false);
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

  const handleClose = () => {
    setFormatInfo(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <CloudUpload />
          <Typography variant="h6">
            {uploadType.charAt(0).toUpperCase() + uploadType.slice(1)} CSV Format Guide
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {isLoading ? (
          <Box textAlign="center" py={4}>
            <Typography>Loading format information...</Typography>
          </Box>
        ) : formatInfo ? (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                {formatInfo.description}
              </Typography>
            </Box>

            {/* Download Template Section */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Download Template
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Get a pre-formatted CSV file with sample data
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<GetApp />}
                  onClick={handleDownloadTemplate}
                >
                  Download
                </Button>
              </Box>
            </Paper>

            {/* Required Columns */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Required Columns
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Your CSV must contain these exact column headers:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                {formatInfo.required_columns?.map((column: string) => (
                  <Chip key={column} label={column} size="small" variant="outlined" />
                ))}
              </Box>
            </Paper>

            {/* Column Descriptions */}
            {formatInfo.column_descriptions && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Column Descriptions
                </Typography>
                <List dense>
                  {Object.entries(formatInfo.column_descriptions).map(([column, description]) => (
                    <ListItem key={column} sx={{ px: 0 }}>
                      <ListItemText
                        primary={column}
                        secondary={description as string}
                        primaryTypographyProps={{ fontWeight: 'medium' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            {/* Important Notes */}
            {formatInfo.notes && formatInfo.notes.length > 0 && (
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  Important Notes:
                </Typography>
                <List dense>
                  {formatInfo.notes.map((note: string, index: number) => (
                    <ListItem key={index} sx={{ py: 0, pl: 2 }}>
                      <ListItemText primary={`• ${note}`} />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}
          </>
        ) : (
          <Typography>Failed to load format information.</Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          variant="contained"
          onClick={handleDownloadTemplate}
          startIcon={<GetApp />}
          disabled={!formatInfo}
        >
          Download Template
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CSVHelpDialog;
