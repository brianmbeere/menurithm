# Voice API Usage Guide

## Overview
The Menurithm Voice API allows users to update inventory using voice commands through audio file uploads.

## Endpoints

### 1. Check Voice System Status
```bash
GET /api/advanced-inventory/voice-status
```
**Purpose**: Check if voice recognition is available and get usage instructions.

**Response**:
```json
{
  "success": true,
  "voice_available": true,
  "speech_recognition_module": true,
  "message": "Voice recognition is ready",
  "instructions": {
    "usage": "Upload an audio file to /voice-update endpoint",
    "supported_formats": ["WAV", "MP3", "M4A"],
    "max_duration": "30 seconds recommended"
  }
}
```

### 2. Process Voice Command
```bash
POST /api/advanced-inventory/voice-update
```
**Purpose**: Process voice inventory updates from uploaded audio files.

**Content-Type**: `multipart/form-data`

**Parameters**:
- `audio_file` (required): Audio file containing voice command

**Supported Audio Formats**:
- WAV (recommended)
- MP3
- M4A
- MPEG

**Example Voice Commands**:
- "Add 5 pounds of tomatoes"
- "Used 2 cups of flour"
- "How much milk do we have"
- "Check chicken stock"

### 3. Get Voice Command Examples
```bash
GET /api/advanced-inventory/voice-commands
```
**Purpose**: Get available voice command patterns and examples.

## Common Errors

### 422 Unprocessable Entity
**Cause**: Missing or invalid audio file in request.

**Solution**: Ensure you're sending a proper multipart/form-data request with an `audio_file` field.

**Correct cURL Example**:
```bash
curl -X POST "http://localhost:8000/api/advanced-inventory/voice-update" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio_file=@path/to/your/audio.wav"
```

**Incorrect Examples**:
```bash
# ❌ Missing file
curl -X POST "http://localhost:8000/api/advanced-inventory/voice-update"

# ❌ Wrong content type
curl -X POST "http://localhost:8000/api/advanced-inventory/voice-update" \
  -H "Content-Type: application/json" \
  -d '{"audio_file": "base64data"}'
```

### 403 Forbidden
**Cause**: Missing or invalid authentication token.

**Solution**: Include valid Bearer token in Authorization header.

**Frontend Fix**: Use `authFetch()` instead of manual `fetch()` calls.

**Before (Causes 403)**:
```javascript
// ❌ Manual fetch with wrong auth
const response = await fetch('/api/advanced-inventory/voice-update', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer empty-token'  // Wrong!
  },
  body: formData
});
```

**After (Works)**:
```javascript
// ✅ Use authFetch for proper Firebase JWT authentication
import { authFetch } from '../hooks/authFetch';

const response = await authFetch('/api/advanced-inventory/voice-update', {
  method: 'POST',
  body: formData  // No manual headers needed
});
```

### 500 Internal Server Error
**Cause**: 
- PyAudio/SpeechRecognition dependencies missing
- Audio file processing error
- Database connection issues

**Solution**: Check system dependencies and audio file format.

## Audio File Requirements

### Format Guidelines
- **Duration**: 5-30 seconds recommended
- **Quality**: Clear speech, minimal background noise
- **Language**: English
- **Content**: Single inventory command per file

### Supported Formats Details
- **WAV**: Uncompressed, best quality (recommended)
- **MP3**: Compressed, good for smaller files
- **M4A**: Apple format, good quality
- **Sample Rate**: 16kHz or higher recommended

## Voice Command Patterns

### Adding Inventory
- "Add [quantity] [unit] of [item]"
- "Received [quantity] [unit] [item]"
- "Got [quantity] [unit] of [item]"
- "Stock [quantity] [unit] [item]"

### Using Inventory
- "Used [quantity] [unit] of [item]"
- "Consumed [quantity] [unit] [item]"
- "Took [quantity] [unit] of [item]"

### Checking Inventory
- "How much [item] do we have"
- "Check [item] stock"
- "[item] inventory level"

## Integration Examples

### JavaScript/Fetch
```javascript
import { authFetch } from '../hooks/authFetch';

const formData = new FormData();
formData.append('audio_file', audioFile);

// Use authFetch for proper Firebase JWT authentication
const response = await authFetch('/api/advanced-inventory/voice-update', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log(data);
```

### Python/Requests
```python
import requests

files = {'audio_file': open('voice_command.wav', 'rb')}
headers = {'Authorization': 'Bearer YOUR_TOKEN'}

response = requests.post(
    'http://localhost:8000/api/advanced-inventory/voice-update',
    files=files,
    headers=headers
)
print(response.json())
```

## Troubleshooting

### Voice Recognition Unavailable
If voice recognition is unavailable, the system will return:
```json
{
  "success": false,
  "message": "Voice recognition is not available. PyAudio/SpeechRecognition dependencies are missing.",
  "fallback_message": "Please use text-based inventory updates instead.",
  "status": "unavailable"
}
```

**Solution**: Use text-based inventory endpoints as fallback.

### Audio Processing Failed
Common causes:
1. **Unsupported format**: Use WAV, MP3, or M4A
2. **Corrupted file**: Re-record the audio
3. **Too long**: Keep under 30 seconds
4. **Poor quality**: Ensure clear speech

### No Speech Detected
If no speech is detected in the audio:
- Speak clearly and loudly
- Reduce background noise
- Use a better microphone
- Check audio levels

## Performance Tips

1. **Use WAV format** for best recognition accuracy
2. **Keep commands short** (5-15 seconds)
3. **Speak clearly** with normal pace
4. **Use standard units** (pounds, cups, ounces, etc.)
5. **One command per file** for better accuracy

## Security Notes

- All endpoints require authentication
- Audio files are processed and immediately deleted
- No audio data is stored permanently
- Voice data is processed locally (when PyAudio is available)
