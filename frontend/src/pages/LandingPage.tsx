import React from 'react';
import { Box, Typography, Button, Container, Grid, Paper, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PublicHeader from '../components/PublicHeader';

const features = [
  {
    title: 'A clearer view of your kitchen',
    content: 'Know exactly what you can prepare with your current stock — instantly.'
  },
  {
    title: 'Less waste. Better decisions.',
    content: 'Use your past sales to optimize what you cook and cut down on food waste.'
  },
  {
    title: 'Menus built around your ingredients',
    content: 'Let AI generate your daily menu based on real-time data and trends.'
  },
  {
    title: 'Fresh produce, closer to the source',
    content: 'Request produce from Croprithm farmers. Choose customer pickup or farmer delivery and approve the delivery fee before fulfillment.'
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
        <PublicHeader />
        <Box py={{ xs: 6, md: 10 }} textAlign="center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
          
            <Typography variant="overline" color="primary">The thoughtful kitchen workspace</Typography>
            <Typography variant="h1" sx={{ maxWidth: 850, mx: 'auto', my: 2, fontSize: { xs: '2.35rem', sm: '3.75rem', md: '4.75rem' }, letterSpacing: '-.045em' }}>Run a fresher,<br />better-prepared kitchen.</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: '1.15rem' }}>Bring inventory, dishes, sales and local produce sourcing together. Built for the everyday rhythm of your restaurant.</Typography>
            <motion.img
              src="./menurithm-logo-transparent.png"
              alt="Menurithm Logo"
              width="45%"
              height="auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              style={{ maxWidth: '190px', marginTop: 24 }}
            />
            <Box mt={4} sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  fontWeight: 600,
                  fontFamily: theme.typography.fontFamily,
                  '&:hover': { backgroundColor: theme.palette.primary.light },
                }}
                onClick={() => navigate('/signin')}
              >
                Open your workspace
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.dark,
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
              <Button href="#product-demo" size="large">Watch the 28-second demo</Button>
            </Box>
          </motion.div>
        </Box>

        <Paper id="product-demo" component="section" aria-labelledby="product-demo-title" variant="outlined"
          sx={{ maxWidth: 920, mx: 'auto', mb: 6, p: { xs: 2, sm: 3 }, borderRadius: 3, scrollMarginTop: 16 }}>
          <Typography id="product-demo-title" component="h2" variant="h5" gutterBottom>See Menurithm in action</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            From spotting low stock to ordering farm produce for pickup. A 28-second walkthrough with sample data and no audio.
          </Typography>
          <Box component="video" controls controlsList="nodownload" playsInline preload="none" width={1280} height={720}
            poster="/demo/menurithm-walkthrough.jpg" aria-label="Menurithm product walkthrough"
            sx={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '16 / 9', borderRadius: 2, bgcolor: 'primary.dark' }}>
            <source src="/demo/menurithm-walkthrough.mp4" type="video/mp4" />
          </Box>
          <Box component="details" sx={{ mt: 2 }}>
            <Typography component="summary" sx={{ cursor: 'pointer', fontWeight: 600 }}>Read the walkthrough</Typography>
            <ol>
              <li>Check ingredient counts and see what has reached its reorder point.</li>
              <li>Link dishes to inventory ingredients and set batch quantities and yields.</li>
              <li>Compare Croprithm listings by price, unit, and available quantity.</li>
              <li>Review your cart, choose a pickup window, and pay the farmer when you collect.</li>
            </ol>
          </Box>
        </Paper>

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
            <Grid size={{ xs: 12, md: 6 }} key={i}>
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
                    component="h2"
                    variant="h6"
                    fontWeight={600}
                    gutterBottom
                    sx={{
                      color: theme.palette.primary.dark,
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

      <Box component="footer" sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
        <Typography variant="body2">Menurithm · Built for the everyday rhythm of your kitchen.</Typography>
      </Box>
    </>
  );
};

export default LandingPage;