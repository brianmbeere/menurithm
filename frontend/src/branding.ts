import { createTheme } from "@mui/material/styles";

 // Brand palette
export const brandPalette = {
  primary: {
    main: "#03D069",
    dark: "#08783F",
    contrastText: "#123D2B",
  },
  secondary: {
    main: "#47644E",
    contrastText: "#FFFFFF",
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
    default: "#F5F6F1",
    paper: "#FFFFFF",
  },
  text: {
    primary: "#2F2F2F", // Charcoal
    secondary: "#596459",
    disabled: "#B2B2B2",
  },
  error: {
    main: "#B42318",
    contrastText: "#FFFFFF",
  },
  warning: {
    main: "#925C13",
    contrastText: "#2F2F2F",
  },
  success: {
    main: "#246345",
    contrastText: "#FAFAFA",
  },
};

const baseTheme = createTheme({
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

export const theme = createTheme(baseTheme, {
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    h1: { color: '#123D2B', fontSize: 'clamp(2.4rem, 6vw, 4.6rem)', fontWeight: 750, lineHeight: 1.08, letterSpacing: '-0.045em' },
    h2: { color: '#123D2B', fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 700, letterSpacing: '-0.035em' },
    h3: { color: '#123D2B', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 700 },
    h4: { color: '#123D2B', fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 700, letterSpacing: '-0.025em' },
    h5: { color: '#123D2B', fontSize: '1.35rem', fontWeight: 700 },
    h6: { color: '#123D2B', fontSize: '1.1rem', fontWeight: 650 },
    body1: { lineHeight: 1.65, color: 'inherit' }, body2: { lineHeight: 1.6, color: 'inherit' },
  },
  components: {
    MuiCssBaseline: { styleOverrides: {
      '*': { boxSizing: 'border-box' },
      'a, button, input, [tabindex]': { '&:focus-visible': { outline: '3px solid #925C13', outlineOffset: 3 } },
      '@media (prefers-reduced-motion: reduce)': { '*': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' } },
    } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: {
      root: { minHeight: 44, borderRadius: 10, padding: '10px 18px', letterSpacing: 0 },
      containedPrimary: { color: '#123D2B', '&:hover': { backgroundColor: '#02BE60' } },
      outlinedPrimary: { color: '#08783F', '&:hover': { backgroundColor: '#E8EFE5' } },
      textPrimary: { color: '#08783F' },
    } },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' }, elevation1: { boxShadow: '0 2px 12px #173D2D08', border: '1px solid #DFE6DC' } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 16, boxShadow: '0 2px 12px #173D2D08', border: '1px solid #DFE6DC' } } },
    MuiCardContent: { styleOverrides: { root: { padding: 24 } } },
    MuiAppBar: { styleOverrides: { root: { backgroundColor: '#FFFFFF', color: '#243C2D', boxShadow: 'none', borderRadius: 0, borderBottom: '1px solid #DFE6DC' } } },
    MuiDrawer: { styleOverrides: { paper: { backgroundColor: '#FFFFFF', color: '#243C2D', borderRadius: 0, borderRight: '1px solid #DFE6DC' } } },
    MuiListItemButton: { styleOverrides: { root: { '&.Mui-selected': { backgroundColor: '#03D069', color: '#123D2B', '& .MuiListItemIcon-root': { color: '#123D2B' } } } } },
    MuiFormLabel: { styleOverrides: { root: { '&.Mui-focused': { color: '#08783F' } } } },
    MuiCheckbox: { styleOverrides: { root: { '&.Mui-checked': { color: '#08783F' } } } },
    MuiAlert: { styleOverrides: { standardError: { backgroundColor: '#FEF3F2', color: '#912018' }, standardWarning: { backgroundColor: '#FFFAEB', color: '#794C10' } } },
    MuiTableContainer: { styleOverrides: { root: { overflowX: 'auto' } } },
    MuiTableCell: { styleOverrides: { head: { backgroundColor: '#F5F6F1', color: '#596459', fontWeight: 650 }, root: { borderColor: '#E5EAE0' } } },
    MuiTabs: { defaultProps: { variant: 'scrollable', scrollButtons: 'auto' } },
  },
});