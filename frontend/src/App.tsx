import React from 'react';
import Home from './pages/Home';
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// You can customize this theme
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2", // Your main blue
    },
    background: {
      default: "#f3f6f9", // Matches your sidebar style
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Home />
    </ThemeProvider>
  );
}

export default App;