import React, { useState, useContext, useEffect } from 'react';
import RecipeForm from './components/RecipeForm';
import RecipeList from './components/RecipeList';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import { AuthProvider, AuthContext } from './AuthContext';

function MainApp() {
  const { token, logout, user } = useContext(AuthContext);
  const [recipes, setRecipes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  // Fetch recipes from backend
  useEffect(() => {
    if (token) {
      fetch('http://localhost:4000/recipes', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(setRecipes);
    } else {
      setRecipes([]);
    }
  }, [token]);

  const addRecipe = (recipe) => {
    fetch('http://localhost:4000/recipes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recipe)
    })
      .then(() => fetch('http://localhost:4000/recipes', {
        headers: { Authorization: `Bearer ${token}` }
      }))
      .then(res => res.json())
      .then(setRecipes);
  };

  const updateRecipe = (id, updated) => {
    fetch(`http://localhost:4000/recipes/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updated)
    })
      .then(() => fetch('http://localhost:4000/recipes', {
        headers: { Authorization: `Bearer ${token}` }
      }))
      .then(res => res.json())
      .then(r => {
        setRecipes(r);
        setEditing(null);
      });
  };

  const startEdit = (recipe) => setEditing(recipe);

  if (!token) {
    return showRegister
      ? <RegisterForm onSwitch={() => setShowRegister(false)} />
      : <LoginForm onSwitch={() => setShowRegister(true)} />;
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>Cookbook</h1>
      <div style={{ marginBottom: 12 }}>
        {user?.email} | <button onClick={logout}>Logout</button>
      </div>
      <RecipeForm
        onAdd={addRecipe}
        onUpdate={updateRecipe}
        editing={editing}
        cancelEdit={() => setEditing(null)}
      />
      <RecipeList recipes={recipes} onEdit={startEdit} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;