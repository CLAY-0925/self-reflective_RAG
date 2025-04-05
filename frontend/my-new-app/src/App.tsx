import { BrowserRouter as Router } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import MainLayout from './components/layout/MainLayout';
import ErrorBoundary from './components/common/ErrorBoundary';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <ErrorBoundary>
                <MainLayout />
              </ErrorBoundary>
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </ConfigProvider>
  );
}

export default App;
