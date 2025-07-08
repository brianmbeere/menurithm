import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignUpForm from "./components/SignUpForm";
import SignInForm from "./components/SignInForm";
import AccountSettings from "./components/AccountSettings";
import PageFrame from "./pages/PageFrame";
import { theme } from "./branding";





function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<PageFrame />} />
          <Route path="/signup" element={<SignUpForm />} />
          <Route path="/signin" element={<SignInForm />} />
          <Route path="/account" element={<AccountSettings />} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
