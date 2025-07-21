import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
} from '@mui/material';
import { CloudUpload, GetApp } from './SVGIcons';
import CSVUploadHelper from './CSVUploadHelper';
import CSVHelpDialog from './CSVHelpDialog';
import { type ValidationResult } from '../api/csvValidation';

const CSVDemoPage: React.FC = () => {
  const [showInventoryUpload, setShowInventoryUpload] = useState(false);
  const [showDishesUpload, setShowDishesUpload] = useState(false);
  const [showSalesUpload, setShowSalesUpload] = useState(false);
  const [showInventoryHelp, setShowInventoryHelp] = useState(false);
  const [showDishesHelp, setShowDishesHelp] = useState(false);
  const [showSalesHelp, setShowSalesHelp] = useState(false);
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null);

  const handleValidFileSelected = (file: File, validationResult: ValidationResult) => {
    setLastValidation(validationResult);
    // In a real app, you would upload the file here
    console.log('File ready for upload:', file.name);
    console.log('Validation result:', validationResult);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom textAlign="center">
        📊 CSV Upload Validation System Demo
      </Typography>
      
      <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
        Test the smart CSV validation system for Menurithm
      </Typography>

      {lastValidation && (
        <Alert severity={lastValidation.valid ? 'success' : 'error'} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Last Validation Result:
          </Typography>
          <Typography variant="body2">
            📄 File: {lastValidation.file_name}
          </Typography>
          <Typography variant="body2">
            ✅ Valid: {lastValidation.valid ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="body2">
            📊 Rows: {lastValidation.structure_validation?.row_count || 0}
          </Typography>
          {lastValidation.message && (
            <Typography variant="body2">
              💬 {lastValidation.message}
            </Typography>
          )}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
        {/* Inventory Section */}
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h5" gutterBottom>
            🥕 Inventory CSV
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload ingredient inventory data with quantities, units, categories, and expiry dates.
          </Typography>
          
          <Box display="flex" flexDirection="column" gap={1}>
            <Button
              variant="outlined"
              onClick={() => setShowInventoryHelp(true)}
              startIcon={<GetApp />}
              fullWidth
            >
              View Format & Download Template
            </Button>
            <Button
              variant="contained"
              onClick={() => setShowInventoryUpload(true)}
              startIcon={<CloudUpload />}
              fullWidth
            >
              Smart Upload with Validation
            </Button>
          </Box>
        </Paper>

        {/* Dishes Section */}
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h5" gutterBottom>
            🍽️ Dishes CSV
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload dish recipes with ingredient requirements and descriptions.
          </Typography>
          
          <Box display="flex" flexDirection="column" gap={1}>
            <Button
              variant="outlined"
              onClick={() => setShowDishesHelp(true)}
              startIcon={<GetApp />}
              fullWidth
            >
              View Format & Download Template
            </Button>
            <Button
              variant="contained"
              onClick={() => setShowDishesUpload(true)}
              startIcon={<CloudUpload />}
              fullWidth
            >
              Smart Upload with Validation
            </Button>
          </Box>
        </Paper>

        {/* Sales Section */}
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h5" gutterBottom>
            📈 Sales CSV
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload sales records with dates, quantities, and pricing information.
          </Typography>
          
          <Box display="flex" flexDirection="column" gap={1}>
            <Button
              variant="outlined"
              onClick={() => setShowSalesHelp(true)}
              startIcon={<GetApp />}
              fullWidth
            >
              View Format & Download Template
            </Button>
            <Button
              variant="contained"
              onClick={() => setShowSalesUpload(true)}
              startIcon={<CloudUpload />}
              fullWidth
            >
              Smart Upload with Validation
            </Button>
          </Box>
        </Paper>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          🔍 How It Works
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>Step 1: Learn</Typography>
            <Typography variant="body2">
              Click "View Format" to see required columns and download a template with sample data.
            </Typography>
          </Alert>
          <Alert severity="warning">
            <Typography variant="subtitle2" gutterBottom>Step 2: Validate</Typography>
            <Typography variant="body2">
              Use "Smart Upload" to check your CSV structure and data before uploading.
            </Typography>
          </Alert>
          <Alert severity="success">
            <Typography variant="subtitle2" gutterBottom>Step 3: Upload</Typography>
            <Typography variant="body2">
              Once validated, your file is guaranteed to upload successfully!
            </Typography>
          </Alert>
        </Box>
      </Box>

      {/* Upload Helper Dialogs */}
      <CSVUploadHelper
        open={showInventoryUpload}
        onClose={() => setShowInventoryUpload(false)}
        uploadType="inventory"
        onValidFileSelected={handleValidFileSelected}
      />
      
      <CSVUploadHelper
        open={showDishesUpload}
        onClose={() => setShowDishesUpload(false)}
        uploadType="dishes"
        onValidFileSelected={handleValidFileSelected}
      />
      
      <CSVUploadHelper
        open={showSalesUpload}
        onClose={() => setShowSalesUpload(false)}
        uploadType="sales"
        onValidFileSelected={handleValidFileSelected}
      />

      {/* Help Dialogs */}
      <CSVHelpDialog
        open={showInventoryHelp}
        onClose={() => setShowInventoryHelp(false)}
        uploadType="inventory"
      />
      
      <CSVHelpDialog
        open={showDishesHelp}
        onClose={() => setShowDishesHelp(false)}
        uploadType="dishes"
      />
      
      <CSVHelpDialog
        open={showSalesHelp}
        onClose={() => setShowSalesHelp(false)}
        uploadType="sales"
      />
    </Container>
  );
};

export default CSVDemoPage;
