# MedicalChatbot Backend

This is a Python FastAPI-based medical knowledge chatbot backend project that uses Qwen API to provide intelligent conversation capabilities and integrates multiple specialized agents to handle user medical consultations.

## Project Features

- Multi-agent collaborative architecture design
- Intelligent dialogue based on Qwen API
- Real-time medical knowledge retrieval (DXY, MSD)
- Automatic patient case summarization and updates
- Complete conversation history management
- Highly asynchronous parallel processing
- WebSocket real-time interactive communication
- Intelligent tracking of user focus points
- Real-time feedback on analysis process

## Project Structure

```
medical_bot/
├── app/                       # Main application directory
│   ├── api/                   # API layer
│   │   ├── agents/            # Various Agent implementations
│   │   │   ├── base_agent.py  # Base Agent abstract class
│   │   │   ├── intent_agent.py    # Intent recognition Agent
│   │   │   ├── medical_info_agent.py  # Medical information query Agent
│   │   │   ├── medical_record_agent.py  # Case summary Agent
│   │   │   ├── focus_agent.py    # User focus point Agent 
│   │   │   └── response_agent.py  # Response generation Agent
│   │   ├── routes/            # Route definitions
│   │   │   ├── chat.py        # Chat-related routes
│   │   │   ├── user.py        # User-related routes
│   │   │   └── message.py     # Message-related routes
│   │   └── api.py             # API route aggregation
│   ├── models/                # Database models
│   │   └── chat.py            # Chat-related models
│   ├── schemas/               # Pydantic schemas
│   │   └── chat.py            # Chat-related request/response schemas
│   ├── services/              # Service layer
│   │   ├── dashscope_service.py  # Qwen API service
│   │   ├── crawler_service.py    # Medical information crawler service
│   │   └── cache_service.py      # Shared memory cache service
│   ├── utils/                 # Utilities
│   │   └── database.py        # Database configuration
│   └── main.py                # Main application entry
├── .env                       # Environment variable configuration
└── run.py                     # Startup script
```

## Installation and Running

### Prerequisites

- Python 3.10
- MySQL 8.0

### Environment Configuration

1. Clone the project:

```bash
git clone <repository address>
cd medical_bot
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Configure environment variables:

Edit the `.env` file to set the MySQL database connection address, API key, and model name:

```
DATABASE_URL=YOUR_DATABASE_URL
DASHSCOPE_API_KEY=YOUR_DASHSCOPE_API_KEY
FAST_MODEL=qwen2.5-7b-instruct-1m
LARGE_MODEL=deepseek-v3
```

Database connection information has been configured in the code. If you need to modify it, please edit the connection parameters in the `app/utils/database.py` file.

### Initialize Database

Run the following command to create the database and table structure:

```bash
python init_db.py
```

### Start the Service

```bash
python run.py
```

The service will start at http://localhost:8000, and the API documentation can be accessed at http://localhost:8000/docs.

## API Interfaces

### Chat Related

- `POST /api/chat` - Send chat message (REST API)
- `WebSocket /api/ws/chat` - WebSocket real-time chat interface
- `POST /api/medical-record` - Update medical record
- `GET /api/medical-record/{session_id}` - Get medical record
- `GET /api/user-focus/{session_id}` - Get user focus points

### User Related

- `POST /api/users` - Create user
- `GET /api/users/{user_id}` - Get user information
- `GET /api/users` - Get user list

### Session Related

- `POST /api/sessions` - Create session
- `GET /api/users/{user_id}/sessions` - Get user session list
- `GET /api/sessions/{session_id}` - Get session information

### Message Related

- `GET /api/sessions/{session_id}/messages` - Get session message history
- `GET /api/messages/{message_id}` - Get message details
- `DELETE /api/sessions/{session_id}/messages` - Clear session messages
- `GET /api/statistics/messages/{session_id}` - Get session message statistics

## Functional Flow

1. User creates an account and creates a chat session
2. User sends a medical consultation message
3. The backend starts multiple Agents for parallel processing:
   - Intent Agent analyzes user intent and generates related questions
   - Medical Information Agent extracts keywords and retrieves relevant knowledge from medical websites
   - Case Agent extracts and updates case information from the conversation
   - Focus Agent tracks medical topics that the user is focused on
4. Finally, the Response Agent integrates the results of each Agent to generate the final reply
5. Response and suggested questions are returned to the user

## User Focus Point Tracking

The system automatically analyzes and tracks the user's focus points throughout the conversation:

- Identifies the main focus points of the user's current message (such as "headache", "allergic reaction", etc.)
- Records the message ID range for each focus point
- Distinguishes between newly appearing focus points and continuation of existing focus points
- Stores focus point data in the database and cache
- Provides dedicated API interfaces to query the session's focus point history

Example of focus point data structure:
```json
{
  "headache issue": [[1, 6], [10, 12]],
  "allergic reaction": [[7, 9]]
}
```

## WebSocket Real-time Communication

The system provides a WebSocket interface that supports:

- Real-time two-way communication
- Real-time feedback on the processing progress
- Status updates for each Agent's progress
- Streaming of final results

WebSocket processing flow:
1. Frontend establishes WebSocket connection
2. Sends user message
3. Backend responds with progress updates:
   - Processing status of various Agents ("analyzing" → "completed")
   - Intermediate results produced by various Agents
4. After all Agents complete, sends the final comprehensive response

## Technology Stack

- **FastAPI**: High-performance asynchronous API framework
- **SQLAlchemy**: ORM database operations
- **Pydantic**: Data validation and serialization
- **asyncio**: Asynchronous concurrent processing
- **WebSockets**: Real-time two-way communication
- **Qwen API**: Large model dialogue capabilities
- **beautifulsoup4**: Web page parsing
- **requests**: HTTP requests
- **Memory cache system**: High-performance data caching
- **JSON**: Structured data exchange

## Cache Management Mechanism

The system implements an efficient memory cache management mechanism to optimize performance and improve response speed:

- **Multi-level cache strategy**: Prioritizes retrieving data from memory cache, loads from database when cache misses
- **Automatic cache update**: Automatically updates cache when data changes to maintain data consistency
- **Session data caching**: Caches user session information, chat history, medical records, and user focus points
- **Agent result caching**: Caches processing results of various Agents to avoid repeated computation
- **Cache timestamps**: Records timestamps of cached data to support time-based cache strategies
- **Memory optimization**: Intelligently manages cache size to avoid memory overflow
- **Invalidation strategy**: Automatically clears related cache data when session ends

The cache system significantly improves system performance:
1. Reduces the number of database queries, lowering database load
2. Speeds up WebSocket response times, enhancing real-time experience
3. Optimizes performance for multi-user concurrent access
4. Ensures user session continuity, even after temporary connection interruptions

The system uses a custom `SharedCache` class to implement caching functionality, which acts as a singleton shared across all requests to ensure data consistency and reliability.

## Execution Order

To correctly run this project, please execute commands in the following order:

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure parameters:
Edit the `.env` file to set parameters such as `DASHSCOPE_API_KEY`

3. Initialize the database:
```bash
python init_db.py
```

4. Start the service:
```bash
python run.py
```

5. Test API interfaces using Postman

## System Requirements

- **CPU**: Dual-core processor or higher
- **Memory**: 4GB RAM or higher
- **Storage**: At least 500MB available space
- **Network**: Stable internet connection (for API calls)
- **Operating System**: Windows 10+, macOS, Linux

## Development Environment

- **Python**: 3.8+ (3.10 recommended)
- **IDE**: Visual Studio Code or PyCharm
- **Database**: MySQL 8.0
- **API Testing**: Postman or Insomnia 