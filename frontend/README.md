# Medical Chatbot Frontend Application

## Project Introduction

The Medical Chatbot is a web application based on React and TypeScript, providing functionality for users to engage in medical-related conversations with an AI assistant. The application features a modern interface design and supports multiple session management, medical record maintenance, user focus point marking, and more.

## Technology Stack

- **Frontend Framework**: React 18, TypeScript
- **UI Component Library**: Ant Design (antd)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **WebSocket**: For real-time communication
- **Routing**: React Router
- **Markdown Rendering**: React Markdown

## Project Features

- Multiple session management
- Medical record creation and updates
- Real-time AI conversation
- User focus point marking and navigation
- Medical progress tracking
- Dark/light theme support

## Installation and Running

### Environment Requirements

- Node.js 14.0+
- npm 6.0+ or yarn 1.22+

### Installing Dependencies

```bash
# Using npm
cd frontend
npm install

# Or using yarn
yarn
```

### Backend Address Configuration

The backend API address configuration is located in the `src/config/apiConfig.ts` file. The default configuration points to a local development server:

```typescript
// Base URL
export const BASE_URL = 'http://localhost:8000/api';
```

To modify the backend address, please edit the `BASE_URL` constant in this file. For example, to point to a production backend service:

```typescript
// Base URL
export const BASE_URL = 'https://your-production-backend.com/api';
```

### Development Mode

Run the application in development mode, with hot reload support:

```bash
# Using npm
npm run dev

# Or using yarn
yarn dev
```

The development server will start at `http://localhost:5173`

### Production Mode

#### Building the Application

```bash
# Using npm
npm run build

# Or using yarn
yarn build
```

The built files will be generated in the `dist` directory.

#### Previewing the Production Build

```bash
# Using npm
npm run preview

# Or using yarn
yarn preview
```

### Environment Variables

You can customize configurations for different environments by creating the following files:

- `.env`: Default environment variables
- `.env.development`: Development environment variables
- `.env.production`: Production environment variables

For example, you can create a `.env.production` file with the following content:

```
VITE_API_BASE_URL=https://your-production-backend.com/api
```

Then use it in `apiConfig.ts`:

```typescript
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
```

## Project Structure

```
src/
├── api/          # API services and communication
├── assets/       # Static resources
├── components/   # Reusable components
│   ├── chat/     # Chat-related components
│   ├── layout/   # Layout components
│   └── medical/  # Medical record-related components
├── config/       # Configuration files
├── context/      # React contexts
├── hooks/        # Custom Hooks
├── pages/        # Page components
├── types/        # TypeScript type definitions
└── utils/        # Utility functions
```

## Development Notes

- Ensure the backend service is started and accessible
- WebSocket connection requires backend support

## License

[MIT License](LICENSE)
