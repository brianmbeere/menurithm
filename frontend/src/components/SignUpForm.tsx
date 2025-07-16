import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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
import { getFirestore, setDoc, doc } from 'firebase/firestore';
import { BASE_URL } from "../utils";

const SignUpForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [title, setTitle] = useState('');
  const [country, setCountry] = useState('');
  const [useCase, setUseCase] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      const db = getFirestore();

      await setDoc(doc(db, 'users', user.uid), {
        fullName,
        organization,
        title,
        country,
        useCase,
        linkedin,
        email,
        createdAt: new Date().toISOString(),
      });

      const userDetails = {
        fullName,
        organization,
        title,
        country,
        useCase,
        linkedin,
        email,
        firebase_uid: user.uid,
      };
      
      const response = await fetch(`${BASE_URL}/users/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`  // 🔐 Pass token
        },
        body: JSON.stringify(userDetails),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save user in backend");
      }

    navigate('/dashboard');
    } catch (err) {
        if (err instanceof Error) {
          if ((err as any).code === 'auth/email-already-in-use') {
            setError("Email already in use. Try signing in or use a different email.");
          } else {
            setError(err.message);
          }
        } else {
          setError('Unexpected error occurred.');
        }
      }
  };

  return (
    <Container maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          Sign Up
        </Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Organization/Company"
            value={organization}
            onChange={e => setOrganization(e.target.value)}
            fullWidth
          />
          <TextField
            label="Professional Title/Role"
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
          />
          <TextField
            label="Country"
            value={country}
            onChange={e => setCountry(e.target.value)}
            fullWidth
          />
          <TextField
            label="Intended Use Case / Reason for Using"
            value={useCase}
            onChange={e => setUseCase(e.target.value)}
            fullWidth
          />
          <TextField
            label="LinkedIn or Professional Profile URL (optional)"
            value={linkedin}
            onChange={e => setLinkedin(e.target.value)}
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            fullWidth
          />
          {error && <Typography color="error">{error}</Typography>}
          <Button variant="contained" onClick={handleSignUp} fullWidth>
            Sign Up
          </Button>
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            Already have an account? <a href="/signin">Sign In</a>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default SignUpForm;
