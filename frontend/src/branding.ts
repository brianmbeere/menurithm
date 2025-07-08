import { createTheme } from "@mui/material/styles";

 // Brand palette
export const brandPalette = {
  primary: {
    main: "#2ECC71", // Fresh Basil
    contrastText: "#FAFAFA",
  },
  secondary: {
    main: "#B2F2BB", // Organic Mint
    contrastText: "#2F2F2F",
  },
  accent: {
    main: "#FFA552", // Carrot Orange
    contrastText: "#2F2F2F",
  },
  neutral: {
    main: "#2F2F2F", // Charcoal
    contrastText: "#FAFAFA",
  },
  background: {
    default: "#FAFAFA", // Surface
    paper: "#FFFFFF",
  },
  text: {
    primary: "#2F2F2F", // Charcoal
    secondary: "#2ECC71", // Fresh Basil for highlights
    disabled: "#B2B2B2",
  },
  error: {
    main: "#FFA552", // Carrot Orange for alerts
    contrastText: "#2F2F2F",
  },
  warning: {
    main: "#FFA552",
    contrastText: "#2F2F2F",
  },
  success: {
    main: "#2ECC71",
    contrastText: "#FAFAFA",
  },
};

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: brandPalette.primary,
    secondary: brandPalette.secondary,
    background: brandPalette.background,
    text: brandPalette.text,
    error: brandPalette.error,
    warning: brandPalette.warning,
    success: brandPalette.success,
    // Custom accent color for highlights
    // accent: brandPalette.accent, // Removed because 'accent' is not a valid PaletteOptions property
  },
  typography: {
    fontFamily: [
      'Inter',
      'Poppins',
      'system-ui',
      'sans-serif'
    ].join(','),
    h1: { color: brandPalette.primary.main, fontFamily: 'Poppins, Inter, sans-serif' },
    h2: { color: brandPalette.primary.main, fontFamily: 'Poppins, Inter, sans-serif' },
    h3: { color: brandPalette.primary.main, fontFamily: 'Poppins, Inter, sans-serif' },
    h4: { color: brandPalette.primary.main, fontFamily: 'Poppins, Inter, sans-serif' },
    h5: { color: brandPalette.primary.main, fontFamily: 'Poppins, Inter, sans-serif' },
    h6: { color: brandPalette.primary.main, fontFamily: 'Poppins, Inter, sans-serif' },
    body1: { color: brandPalette.text.primary, fontFamily: 'Inter, Poppins, sans-serif' },
    body2: { color: brandPalette.text.primary, fontFamily: 'Inter, Poppins, sans-serif' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          textTransform: "none",
          fontFamily: 'Inter, Poppins, sans-serif',
        },
        containedPrimary: {
          backgroundColor: brandPalette.primary.main,
          color: brandPalette.primary.contrastText,
          '&:hover': {
            backgroundColor: "#27ae60",
          },
        },
        outlinedPrimary: {
          borderColor: brandPalette.primary.main,
          color: brandPalette.primary.main,
          '&:hover': {
            backgroundColor: brandPalette.secondary.main,
            borderColor: brandPalette.primary.main,
          },
        },
        containedSecondary: {
          backgroundColor: brandPalette.secondary.main,
          color: brandPalette.secondary.contrastText,
        },
        outlinedSecondary: {
          borderColor: brandPalette.secondary.main,
          color: brandPalette.secondary.main,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: brandPalette.primary.main,
          color: brandPalette.primary.contrastText,
          fontFamily: 'Poppins, Inter, sans-serif',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: brandPalette.primary.main,
          color: brandPalette.neutral.main,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundColor: "#FFFFFF",
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: 'Inter, Poppins, sans-serif',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: brandPalette.primary.main,
            color: brandPalette.primary.contrastText,
            '& .MuiListItemIcon-root': {
              color: brandPalette.primary.contrastText,
            },
          },
          '&:hover': {
            backgroundColor: "#eafaf1",
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: brandPalette.neutral.main,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardError: {
          backgroundColor: brandPalette.accent.main,
          color: brandPalette.accent.contrastText,
        },
        standardWarning: {
          backgroundColor: brandPalette.accent.main,
          color: brandPalette.accent.contrastText,
        },
      },
    },
  },
});