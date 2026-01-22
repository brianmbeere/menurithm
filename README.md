# Menurithm 🍽️

**AI-Powered Restaurant Inventory Management & Menu Optimization Platform**

Menurithm is an advanced, full-stack restaurant management system that leverages artificial intelligence and machine learning to revolutionize how restaurants manage inventory, predict demand, optimize menus, and reduce food waste. Built with modern web technologies and designed for scalability, Menurithm demonstrates sophisticated software architecture patterns used by industry leaders.

---

## 🌟 Key Innovations

### Artificial Intelligence & Machine Learning
- **Demand Prediction Engine**: Uses time-series analysis and ML models to forecast ingredient demand based on historical sales patterns, seasonal trends, and external factors
- **Inventory Optimization**: AI-driven recommendations for optimal stock levels, reducing waste while preventing stockouts
- **Cost Savings Analysis**: Automated identification of cost-saving opportunities across supplier pricing, bulk purchasing, and ingredient substitutions

### Voice-Enabled Inventory Management
- **Natural Language Processing**: Voice command system for hands-free inventory updates ("Add 10 kg tomatoes to inventory")
- **Speech Recognition Integration**: Real-time audio processing for restaurant environments
- **Multi-command Support**: Batch operations through conversational interface

### Supply Chain Integration
- **RouteCast Integration**: Real-time synchronization with produce delivery platforms for automated ordering
- **Supplier Catalog Sync**: Automated price comparison and supplier selection
- **Delivery Window Optimization**: AI-scheduled delivery times based on kitchen preparation schedules

### Real-Time Analytics Dashboard
- **Inventory Turnover Insights**: Track ingredient usage efficiency and identify slow-moving items
- **Seasonal Trend Analysis**: Automatic detection of seasonal demand patterns
- **Waste Reduction Metrics**: Monitor and improve food waste reduction over time

---

## 🏗️ Technical Architecture

### Backend (Python/FastAPI)
```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── core/                # Configuration and security
│   ├── db/                  # Database models and migrations
│   ├── models/              # SQLAlchemy ORM models
│   ├── routes/              # RESTful API endpoints
│   ├── schemas/             # Pydantic validation schemas
│   ├── services/            # Business logic layer
│   │   ├── demand_prediction.py      # ML prediction service
│   │   ├── voice_inventory.py        # Voice command processing
│   │   └── routecast_integration.py  # External API integration
│   └── utils/               # Authentication & utilities
├── migrations/              # Database version control
└── tests/                   # Test suite
```

### Frontend (React/TypeScript)
```
frontend/
├── src/
│   ├── api/                 # Type-safe API client layer
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Page-level components
│   └── types/               # TypeScript definitions
└── public/                  # Static assets
```

---

## 🔧 Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | High-performance async REST API framework |
| **SQLAlchemy** | ORM with PostgreSQL/SQLite support |
| **Firebase Admin SDK** | Secure authentication & user management |
| **OpenAI API** | Natural language processing & AI analytics |
| **Pydantic** | Runtime data validation |
| **Uvicorn** | ASGI server with async support |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | Component-based UI framework |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Next-generation build tool |
| **Material UI (MUI)** | Enterprise-grade component library |
| **TailwindCSS** | Utility-first styling |
| **Chart.js** | Interactive data visualizations |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Production database |
| **Firebase** | Authentication & real-time features |
| **Render** | Cloud deployment platform |
| **Docker** | Containerization (optional) |

---

## 🚀 API Endpoints

### Core Inventory Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inventory` | List all inventory items |
| `POST` | `/inventory` | Add new inventory item |
| `PUT` | `/inventory/{name}` | Update inventory item |
| `DELETE` | `/inventory/{name}` | Remove inventory item |
| `POST` | `/upload-inventory` | Bulk CSV upload |

### AI-Powered Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/advanced-inventory/analytics` | AI analytics dashboard |
| `GET` | `/api/advanced-inventory/alerts` | Expiry & low-stock alerts |
| `GET` | `/predictions/demand` | Demand forecasting |
| `POST` | `/voice-commands/process` | Voice command processing |
| `POST` | `/voice/inventory-command` | Audio file processing |

### Supplier Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/routecast/available-produce` | Available produce catalog |
| `POST` | `/routecast/create-request` | Create produce order |
| `GET` | `/routecast/request-status/{id}` | Order status tracking |
| `POST` | `/suppliers/sync-catalog` | Sync supplier data |

### Menu & Dish Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dishes` | List all dishes |
| `POST` | `/dishes` | Create new dish |
| `PUT` | `/dishes/{id}` | Update dish |
| `DELETE` | `/dishes/{id}` | Remove dish |
| `POST` | `/service/dishes` | Service-to-service dish creation |
| `POST` | `/service/dishes/batch` | Batch dish creation |

### Sales Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/sales` | Sales records |
| `POST` | `/sales` | Record new sale |
| `POST` | `/upload-sales` | Bulk CSV upload |

---

## 🔐 Security Features

- **Firebase Authentication**: Industry-standard JWT token authentication
- **Role-Based Access Control**: User, Manager, and Admin permission levels
- **API Key Authentication**: Secure service-to-service communication
- **Rate Limiting**: Configurable request throttling
- **CORS Protection**: Configurable cross-origin policies
- **Input Validation**: Pydantic schema validation on all endpoints

---

## 📊 Data Models

### InventoryItem
```python
class InventoryItem:
    id: int
    ingredient_name: str
    quantity: float
    unit: str
    category: str
    expiry_date: datetime
    storage_location: str
    user_id: str  # Multi-tenant support
```

### Dish
```python
class Dish:
    id: int
    name: str
    description: str
    ingredients: List[DishIngredient]
    user_id: str
```

### Sale
```python
class Sale:
    id: int
    dish_id: int
    timestamp: datetime
    quantity_sold: int
    price_per_unit: float
    user_id: str
```

---

## 🏃 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (production) or SQLite (development)
- Firebase project with Admin SDK credentials

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configure environment variables
uvicorn app.main:app --reload --port 8001
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Starts on port 5174
```

### Environment Variables
See `.env.example` for required configuration:
- `DATABASE_URL` - PostgreSQL connection string
- `FIREBASE_*` - Firebase Admin SDK credentials
- `OPENAI_API_KEY` - AI features (optional, demo mode available)
- `ROUTECAST_BASE_URL` - Supplier integration endpoint

---

## 📈 Impact & Innovation

Menurithm addresses critical challenges in the restaurant industry:

1. **Food Waste Reduction**: The FAO estimates 1/3 of food produced globally is wasted. AI-powered demand prediction helps restaurants order precisely what they need.

2. **Operational Efficiency**: Voice commands enable kitchen staff to update inventory without touching devices, improving hygiene and speed.

3. **Supply Chain Optimization**: Real-time supplier integration eliminates manual ordering processes and ensures optimal pricing.

4. **Data-Driven Decisions**: Analytics dashboard transforms raw data into actionable insights for menu engineering.

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests
cd frontend
npm run test
```

---

## 📝 API Documentation

Interactive API documentation available at:
- **Swagger UI**: `http://localhost:8001/docs`
- **ReDoc**: `http://localhost:8001/redoc`

---

## 🤝 Integration Partners

- **RouteCast**: Produce delivery optimization platform
- **Firebase**: Google's authentication and real-time database
- **OpenAI**: Natural language processing and AI analytics

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 👤 Author

**Njenga**

Full-stack software engineer specializing in AI/ML integration, distributed systems, and restaurant technology solutions.

---

## 🔗 Links

- [API Documentation](/docs)
- [Frontend Application](http://localhost:5174)
- [Backend Health Check](http://localhost:8001/health)
