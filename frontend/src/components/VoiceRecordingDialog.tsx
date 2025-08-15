import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Alert,
  Chip,
  Stack
} from '@mui/material';
import { advancedInventoryAPI } from '../api/advancedInventory';

interface VoiceRecordingDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

export const VoiceRecordingDialog: React.FC<VoiceRecordingDialogProps> = ({
  open,
  onClose,
  onSuccess,
  onError
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingSession, setRecordingSession] = useState<{
    mediaRecorder: MediaRecorder;
    stop: () => Promise<any>;
  } | null>(null);
  const [micPermission, setMicPermission] = useState<{
    available: boolean;
    permission: PermissionState;
    message: string;
  } | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      checkSystemStatus();
    }
  }, [open]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const checkSystemStatus = async () => {
    try {
      const [voiceStatusResult, micStatusResult] = await Promise.all([
        advancedInventoryAPI.getVoiceStatus(),
        advancedInventoryAPI.checkMicrophonePermissions()
      ]);
      
      setVoiceStatus(voiceStatusResult);
      setMicPermission(micStatusResult);
    } catch (error) {
      onError(`System check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const startRecording = async () => {
    try {
      setProcessing(true);
      const session = await advancedInventoryAPI.startLiveVoiceRecording();
      setRecordingSession(session);
      setIsRecording(true);
      setProcessing(false);
    } catch (error) {
      setProcessing(false);
      onError(`Recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopRecording = async () => {
    if (recordingSession) {
      try {
        setProcessing(true);
        const result = await recordingSession.stop();
        setRecordingSession(null);
        setIsRecording(false);
        setProcessing(false);
        
        if (result.success) {
          onSuccess(result);
          onClose();
        } else {
          onError(`Processing failed: ${result.message}`);
        }
      } catch (error) {
        setProcessing(false);
        onError(`Stop recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,.wav,.mp3,.m4a';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setProcessing(true);
        const result = await advancedInventoryAPI.processVoiceCommand(file);
        setProcessing(false);
        
        if (result.success) {
          onSuccess(result);
          onClose();
        } else {
          onError(`File processing failed: ${result.message}`);
        }
      } catch (error) {
        setProcessing(false);
        onError(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canRecord = voiceStatus?.voice_available && micPermission?.available;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          🎤 Voice Command
          {isRecording && (
            <Chip 
              label={`Recording ${formatTime(recordingTime)}`}
              color="error"
              size="small"
              sx={{ animation: 'pulse 1.5s infinite' }}
            />
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          {/* System Status */}
          {voiceStatus && (
            <Alert 
              severity={voiceStatus.voice_available ? 'success' : 'warning'}
              sx={{ mb: 2 }}
            >
              {voiceStatus.message}
            </Alert>
          )}

          {micPermission && (
            <Alert 
              severity={micPermission.available ? 'success' : 'error'}
              sx={{ mb: 2 }}
            >
              Microphone: {micPermission.message}
            </Alert>
          )}

          {/* Recording Controls */}
          <Box textAlign="center">
            <Typography variant="h6" gutterBottom>
              Choose Recording Method
            </Typography>
            
            <Box display="flex" gap={2} justifyContent="center" mb={3}>
              <Button
                variant={isRecording ? "contained" : "outlined"}
                color={isRecording ? "error" : "primary"}
                size="large"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!canRecord || processing}
                sx={{ minWidth: 140 }}
              >
                {isRecording ? '🛑 Stop' : '🎤 Start Recording'}
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                onClick={handleFileUpload}
                disabled={processing || isRecording}
                sx={{ minWidth: 140 }}
              >
                📁 Upload File
              </Button>
            </Box>

            {/* Recording Progress */}
            {isRecording && (
              <Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Recording: {formatTime(recordingTime)} / 10:00 max
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(recordingTime / 600) * 100} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}

            {processing && (
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Processing audio...
                </Typography>
                <LinearProgress />
              </Box>
            )}
          </Box>

          {/* Voice Command Examples */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Example Voice Commands:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {[
                "Add 5 pounds of tomatoes",
                "Used 2 cups of flour",
                "How much milk do we have",
                "Check chicken stock"
              ].map((example, index) => (
                <Chip 
                  key={index}
                  label={example}
                  size="small"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={processing}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VoiceRecordingDialog;
