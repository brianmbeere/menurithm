import React from 'react';
import { Box, Typography, Button, Container, Grid, Paper, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const features = [
  {
    title: '📦 Track Ingredients & Inventory',
    content: 'Know exactly what you can prepare with your current stock — instantly.'
  },
  {
    title: '📊 Analyze Sales & Reduce Waste',
    content: 'Use your past sales to optimize what you cook and cut down on food waste.'
  },
  {
    title: '🍽️ Auto-Generate Smart Menus',
    content: 'Let AI generate your daily menu based on real-time data and trends.'
  },
  {
    title: '🔮 Predict What to Cook',
    content: 'Leverage your best-sellers to guide future dishes and reduce decision fatigue.'
  }
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.2, duration: 0.6 }
  })
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <>
      <Container
        maxWidth="lg"
        sx={{
          backgroundColor: theme.palette.background.default,
          minHeight: '100vh',
          fontFamily: theme.typography.fontFamily,
        }}
      >
        <Box py={{ xs: 6, md: 10 }} textAlign="center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Typography
              variant="h2"
              fontWeight={700}
              gutterBottom
              sx={{
                color: theme.palette.primary.main,
                fontFamily: theme.typography.h2?.fontFamily || theme.typography.fontFamily,
              }}
            >
              Menurithm
            </Typography>
            <Typography
              variant="h5"
              color="text.primary"
              paragraph
              sx={{
                color: theme.palette.text.primary,
                fontFamily: theme.typography.fontFamily,
              }}
            >
              AI-powered menus that make your kitchen smarter.
            </Typography>
            <Box mt={4}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  mx: 2,
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  fontWeight: 600,
                  fontFamily: theme.typography.fontFamily,
                  '&:hover': { backgroundColor: theme.palette.primary.dark || theme.palette.primary.main },
                }}
                onClick={() => navigate('/signin')}
              >
                Try Menurithm Now
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  mx: 2,
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  fontFamily: theme.typography.fontFamily,
                  '&:hover': { backgroundColor: theme.palette.secondary.main, borderColor: theme.palette.primary.main },
                }}
                onClick={() =>
                  window.open('https://calendly.com/briannjenga413/30min', '_blank')
                }
              >
                Book a Demo
              </Button>
            </Box>
          </motion.div>
        </Box>

        <Box textAlign="center" mb={2}>
          <motion.img
            src="/Coffee shop-bro.svg"
            alt="Coffee shop illustration"
            width="80%"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{ maxWidth: '400px' }}
          />
          <Typography
            variant="caption"
            color="textSecondary"
            mt={1}
            sx={{ color: theme.palette.text.secondary }}
          >
            <a
              href="https://storyset.com/worker"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#999', textDecoration: 'none' }}
            >
              Worker illustrations by Storyset
            </a>
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, i) => (
            <Grid columns={{ xs: 12, md: 6 }} key={i}>
              <motion.div
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 4,
                    borderRadius: '20px',
                    minHeight: '180px',
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: '0 2px 8px rgba(46,204,113,0.08)',
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    gutterBottom
                    sx={{
                      color: theme.palette.primary.main,
                      fontFamily: theme.typography.h6?.fontFamily || theme.typography.fontFamily,
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: theme.palette.text.primary,
                      fontFamily: theme.typography.fontFamily,
                    }}
                  >
                    {feature.content}
                  </Typography>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Floating CTA */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          display: { xs: 'flex', md: 'flex' },
        }}
      >
        <Button
          variant="contained"
          size="large"
          sx={{
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            fontWeight: 600,
            fontFamily: theme.typography.fontFamily,
            boxShadow: '0 2px 8px rgba(46,204,113,0.18)',
            '&:hover': { backgroundColor: theme.palette.primary.dark || theme.palette.primary.main },
          }}
          onClick={() => navigate('/signin')}
        >
          🚀 Try Menurithm
        </Button>
      </Box>
    </>
  );
};

export default LandingPage;