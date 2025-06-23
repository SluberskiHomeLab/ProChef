import React, { useState, useContext } from 'react';
import { AuthContext } from '../AuthContext';

function LoginForm({ onSwitch }) {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await fetch('http://localhost:4000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      login(data.token, { email });
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ marginBottom: 16 }}>
      <h2>Login</h2>
      <input type="email" placeholder="Email" value={email}
        onChange={e => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: 8, padding: 8 }} />
      <input type="password" placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)} required style={{ width: '100%', marginBottom: 8, padding: 8 }} />
      <button type="submit">Login</button>
      <button type="button" onClick={onSwitch} style={{ marginLeft: 10 }}>Register</button>
      {err && <div style={{ color: 'red' }}>{err}</div>}
    </form>
  );
}

export default LoginForm;