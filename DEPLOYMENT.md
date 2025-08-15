# 🚀 Deployment Guide for Menurithm

## 🐳 Render Deployment with PyAudio Support

### **Option 1: Using Buildpacks (Recommended)**

1. **Configure buildpacks** in your Render service:
   - Go to your service settings
   - Set Build Command: `pip install -r requirements.txt`
   - Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Add Environment Variables as needed

2. **Files included for deployment:**
   - `.render-buildpacks` - Specifies apt and Python buildpacks
   - `Aptfile` - Lists system packages needed for PyAudio
   - `render-prebuild.sh` - Pre-build script (if needed)

### **Option 2: Alternative without PyAudio**

If PyAudio continues to fail, voice features will gracefully disable themselves.
The application will continue to work without voice recognition.

### **Option 3: Manual System Dependencies**

If using a custom Docker setup, install these packages:
```bash
apt-get update
apt-get install -y portaudio19-dev python3-pyaudio libasound2-dev
```

## 📦 Requirements Files

- `requirements.txt` - Main dependencies (includes PyAudio)
- `requirements-voice.txt` - Optional voice-only dependencies
- `requirements-deploy.txt` - Alternative deployment requirements

## 🔧 Environment Variables

Set these in your Render service:
```
DATABASE_URL=your_postgres_url
FIREBASE_PROJECT_ID=your_project_id
OPENAI_API_KEY=your_openai_key
```

## 🎯 Deployment Steps

1. **Connect your GitHub repository to Render**
2. **Set the buildpacks** (if using Option 1)
3. **Configure environment variables**
4. **Deploy and monitor logs**

The voice features will automatically detect if PyAudio is available and disable gracefully if not.
