import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../hooks/initializeFirebase';
import PublicHeader from './PublicHeader';
import { PageHeading } from './WorkspaceUI';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const next = new URLSearchParams(useLocation().search).get('next');

  const handleSignIn = async () => {
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(next && (/^\/dashboard(?:\/|$)/.test(next) || next === '/account') ? next : '/dashboard');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally { setLoading(false); }
  };

  return (
    <Container maxWidth="sm" sx={{ pb: 4 }}>
      <PublicHeader action="Create account" to="/signup" />
      <Paper component="main" variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, mt: 4 }}>
        <PageHeading icon="account" title="Sign in" description="Open your Menurithm kitchen workspace." />
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
          {error && <Typography role="alert" color="error">{error}</Typography>}
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