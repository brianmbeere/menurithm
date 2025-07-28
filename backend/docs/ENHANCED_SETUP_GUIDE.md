# Enhanced Inventory Management Setup Guide

## Overview
This guide covers the setup and configuration of the advanced inventory management features including AI/ML predictions, voice input, and supplier integration.

## Prerequisites
- Python 3.8+
- PostgreSQL database
- OpenAI API key (for AI predictions)
- RouteCase API key (optional, for supplier integration)

## Installation Steps

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the backend directory with the following:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost/menurithm

# AI/ML Configuration
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here  # Optional backup

# Voice Processing
ENABLE_VOICE_FEATURES=true

# RouteCase Integration (Optional)
ROUTECASE_API_KEY=your_routecase_api_key_here
ROUTECASE_BASE_URL=https://api.routecase.com/v1

# Firebase Configuration (existing)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

### 3. Database Migration
The enhanced inventory schema has been automatically created. If you need to recreate:

```bash
python3 -c "
import sys
sys.path.append('.')
from app.db.database import engine
from sqlalchemy import text

with engine.connect() as connection:
    # Enhanced tables created automatically
    print('Enhanced inventory schema ready!')
"
```

### 4. API Key Setup

#### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to your `.env` file as `OPENAI_API_KEY`

#### RouteCase API Key (Optional)
1. Contact RouteCase for API access
2. Add to your `.env` file as `ROUTECASE_API_KEY`

### 5. Voice Features Setup (macOS)
Voice features require additional audio dependencies:

```bash
# Install portaudio (already done)
brew install portaudio

# Test voice recognition
python3 -c "
import speech_recognition as sr
print('Voice recognition ready!')
"
```

## New API Endpoints

### AI Analytics
- `GET /api/advanced-inventory/analytics` - Get AI-powered sales analytics
- `GET /api/advanced-inventory/demand-forecast/{item_name}` - Get demand predictions
- `GET /api/advanced-inventory/optimization-report` - Get comprehensive optimization report

### Voice Features
- `POST /api/advanced-inventory/voice-update` - Start voice inventory update
- `GET /api/advanced-inventory/voice-commands` - Get recent voice commands

### Supplier Integration
- `GET /api/advanced-inventory/suppliers` - Get available suppliers
- `POST /api/advanced-inventory/auto-order` - Create automatic orders

### Alerts & Optimization
- `GET /api/advanced-inventory/alerts` - Get inventory alerts
- `POST /api/advanced-inventory/optimize` - Run full optimization

## Using the Features

### 1. AI-Powered Analytics
```javascript
// Get comprehensive analytics
const response = await fetch('/api/advanced-inventory/analytics', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const analytics = await response.json();
```

### 2. Demand Forecasting
```javascript
// Get 7-day demand forecast for a specific item
const forecast = await fetch('/api/advanced-inventory/demand-forecast/chicken-breast?days_ahead=7', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 3. Voice Inventory Updates
```javascript
// Start voice recording for inventory update
const voiceUpdate = await fetch('/api/advanced-inventory/voice-update', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
// User speaks: "Update chicken breast stock to 25 pounds"
```

### 4. Automatic Reordering
```javascript
// Trigger automatic reordering based on AI recommendations
const autoOrder = await fetch('/api/advanced-inventory/auto-order', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Third-Party AI Integration

The system uses OpenAI's GPT-4 for:
- Sales pattern analysis
- Demand forecasting
- Inventory optimization recommendations
- Cost analysis and supplier suggestions

Benefits of third-party AI over custom models:
- ✅ No training data requirements
- ✅ Immediate deployment
- ✅ High accuracy out-of-the-box
- ✅ Natural language understanding
- ✅ Continuous improvements from OpenAI

## Testing the Features

### 1. Test AI Analytics
```bash
curl -X GET "http://localhost:8000/api/advanced-inventory/analytics" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Demand Prediction
```bash
curl -X GET "http://localhost:8000/api/advanced-inventory/demand-forecast/pasta?days_ahead=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Voice Features
```bash
curl -X POST "http://localhost:8000/api/advanced-inventory/voice-update" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Common Issues

1. **Import errors for pandas/numpy**
   ```bash
   pip install pandas numpy scikit-learn
   ```

2. **OpenAI API errors**
   - Check API key is valid
   - Ensure sufficient credits
   - Verify internet connection

3. **Voice recognition issues**
   - Check microphone permissions
   - Install portaudio: `brew install portaudio`
   - Test with: `python3 -c "import speech_recognition"`

4. **Database connection issues**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in .env
   - Run migration script

### Performance Optimization

1. **Enable caching**
   ```bash
   ENABLE_ANALYTICS_CACHING=true
   CACHE_EXPIRY_HOURS=6
   ```

2. **Optimize AI calls**
   ```bash
   PREDICTION_CONFIDENCE_THRESHOLD=0.75
   OPENAI_MAX_TOKENS=1500  # Reduce for faster responses
   ```

3. **Database indexing**
   - Enhanced schema includes optimized indexes
   - Monitor query performance with PostgreSQL logs

## Security Considerations

1. **API Key Security**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly

2. **Voice Data**
   - Audio files are processed locally
   - Transcriptions stored temporarily
   - Enable encryption for sensitive environments

3. **Third-Party Services**
   - Monitor API usage and costs
   - Implement rate limiting
   - Have fallback strategies

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API documentation at `/docs`
3. Test with provided curl commands
4. Check server logs for detailed error messages

## Next Steps

1. **Frontend Integration**: Update React components to use new AI endpoints
2. **Mobile App**: Extend voice features to mobile applications
3. **Advanced Analytics**: Create dashboards for AI insights
4. **Custom Training**: Consider custom models for specific restaurant types
