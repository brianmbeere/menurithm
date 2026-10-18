import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../hooks/initializeFirebase';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper
} from '@mui/material';

const SignInForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async () => {
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally { setLoading(false); }
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 4 }}>
      <Paper elevation={1} sx={{ p: { xs: 3, md: 5 }, width: '100%' }}>
        <Typography variant="overline" color="primary">Menurithm workspace</Typography>
        <Typography variant="h5" gutterBottom>
          Welcome back
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>A clearer day in the kitchen starts here.</Typography>
        <Box component="form" onSubmit={event => { event.preventDefault(); void handleSignIn(); }} display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
          {error && <Typography color="error">{error}</Typography>}
          <Button variant="contained" type="submit" disabled={loading} fullWidth>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            Do not have an account? <a href="/signup">Sign Up</a>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default SignInForm;