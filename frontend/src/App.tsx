import { useEffect } from 'react';
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignUpForm from "./components/SignUpForm";
import SignInForm from "./components/SignInForm";
import AccountSettings from "./components/AccountSettings";
import PageFrame from "./pages/PageFrame";
import CSVDemoPage from "./components/CSVDemoPage";
import { theme } from "./branding";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ProtectedRoute from './components/ProtectedRoute';


function App() {

  useEffect(() => {
  const auth = getAuth();
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      const token = await user.getIdToken(); // fetch current token
      localStorage.setItem("authToken", token); // or use memory if preferred
    } else {
      localStorage.removeItem("authToken");
    }
  });

  return () => unsubscribe(); // cleanup listener
}, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/csv-demo" element={<CSVDemoPage />} />
           <Route path="/dashboard/*" 
            element={
              <ProtectedRoute>
                <PageFrame />
              </ProtectedRoute>
            } />
          <Route path="/signup" element={<SignUpForm />} />
          <Route path="/signin" element={<SignInForm />} />
          <Route path="/account" element={
            <ProtectedRoute> 
              <AccountSettings /> 
            </ProtectedRoute>} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
