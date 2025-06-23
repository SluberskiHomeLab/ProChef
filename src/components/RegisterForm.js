import React, { useState } from 'react';

function RegisterForm({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await fetch('http://localhost:4000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }
      setSuccess(true);
    } catch (e) {
      setErr(e.message);
    }
  };

  if (success) {
    return (
      <div>
        <p>Registered successfully! <button onClick={onSwitch}>Login</button></p>
      </div>
    );
  }

  return (
    <form onSubmit={handleRegister} style={{ marginBottom: 16 }}>
      <h2>Register</h2>
      <input type="email" placeholder="Email" value={email}
        onChange={e => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: 8, padding: 8 }} />
      <input type="password" placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)} required style={{ width: '100%', marginBottom: 8, padding: 8 }} />
      <button type="submit">Register</button>
      <button type="button" onClick={onSwitch} style={{ marginLeft: 10 }}>Login</button>
      {err && <div style={{ color: 'red' }}>{err}</div>}
    </form>
  );
}

export default RegisterForm;