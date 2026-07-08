import { useRoutes } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { router } from './router';
import { Navbar } from './components/layout/Navbar';

const theme = createTheme({
  palette: {
    primary: { main: '#1a73e8' },
    secondary: { main: '#34a853' },
    background: { default: '#f8f9fa' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Noto Sans SC", sans-serif',
  },
});

function App() {
  const routes = useRoutes(router);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1">{routes}</main>
      </div>
    </ThemeProvider>
  );
}

export default App;
