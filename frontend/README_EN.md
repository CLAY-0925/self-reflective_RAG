# MedicalChatbot Frontend

This is an intelligent medical conversation frontend application built with React, TypeScript, and Material UI. It allows users to converse with an AI assistant, get medical advice, and manage case information.

## Key Features

* Real-time chat interface
* Session management (create, select, delete)
* Support for WebSocket and HTTP API communication
* Medical case information display (treatment progress, patient information, information to be confirmed)
* Related question suggestions
* Configurable feature toggles (e.g., case summary, web search)
* Light/dark theme switching

## Requirements

* [Node.js](https://nodejs.org/) (v18.x or higher recommended)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/medical_chatbot.git
   cd medical_chatbot
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps # Ignore dependency conflicts from packages that haven't been updated
   # or
   yarn install
   ```

## Configuration

The application needs to connect to a backend API. Make sure the backend service is running.

By default, the frontend will try to connect to `http://localhost:8000/api`. If your backend API address is different, you need to modify the configuration file:

* Open the `src/utils/config.ts` file.
* Find the `config.apiBaseUrl` variable.
* Change its value to your actual backend API address.

```typescript
// src/utils/config.ts
export const config = {
  // ... other configurations
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://your-backend-api-url', // Modify this
  // ... other configurations
};
```

Alternatively, you can configure the API address by setting the environment variable `REACT_APP_API_BASE_URL`, which is more commonly used in deployments.

## Starting the Project

1. **Make sure the backend service is started and running at the configured address.**

2. **Start the frontend development server:**
   ```bash
   npm start
   # or
   yarn start
   ```

3. Open `http://localhost:3000` in your browser (or another address as indicated by your terminal).

## Project Structure

```
frontend/
├── public/                    # Static files
├── src/                       # Source code
│   ├── components/            # UI components
│   │   ├── Chat/              # Chat-related components
│   │   ├── Layout/            # Layout components
│   │   ├── MedicalRecord/     # Medical record components
│   │   └── UI/                # General UI components
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom React hooks
│   ├── models/                # TypeScript interfaces/types
│   ├── services/              # API services
│   ├── stores/                # State management
│   ├── utils/                 # Utility functions
│   ├── App.tsx                # Main App component
│   └── index.tsx              # Application entry point
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript configuration
```

## Features in Detail

### Real-time Chat

The chat interface supports:
- WebSocket connection for real-time communication
- Streaming responses from the backend
- Markdown rendering for formatted responses
- Code syntax highlighting
- Message status indicators

### Medical Record Management

The application automatically:
- Extracts and displays patient information from conversations
- Shows treatment progress
- Highlights information that needs confirmation
- Updates the medical record in real-time as the conversation progresses

### Session Management

Users can:
- Create new chat sessions
- Switch between existing sessions
- Delete sessions
- View session history

### UI/UX Features

- Responsive design for desktop and mobile
- Accessibility features
- Light and dark theme support
- Progress indicators during API calls
- Error handling with user-friendly messages

## Technologies Used

- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Material UI**: Component library
- **React Query**: Data fetching and caching
- **WebSocket**: Real-time communication
- **Marked**: Markdown parsing
- **Highlight.js**: Code syntax highlighting

## Development

For development purposes:

1. **Running in development mode:**
   ```bash
   npm start
   ```

2. **Building for production:**
   ```bash
   npm run build
   ```

3. **Running tests:**
   ```bash
   npm test
   ```

## Contributing

Pull requests and issues are welcome!

## License

(Optional) Add your project license information here, such as MIT, Apache 2.0, etc. 