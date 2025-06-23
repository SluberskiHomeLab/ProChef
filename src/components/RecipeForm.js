import React, { useState, useEffect } from 'react';

function RecipeForm({ onAdd, onUpdate, editing, cancelEdit }) {
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setIngredients(editing.ingredients);
      setInstructions(editing.instructions);
    } else {
      setTitle('');
      setIngredients('');
      setInstructions('');
    }
  }, [editing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) return;
    if (editing) {
      onUpdate(editing.id, { title, ingredients, instructions });
    } else {
      onAdd({ title, ingredients, instructions });
    }
    setTitle('');
    setIngredients('');
    setInstructions('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
      <input
        placeholder="Recipe Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
        style={{ width: '100%', marginBottom: 8, padding: 8 }}
      />
      <textarea
        placeholder="Ingredients"
        value={ingredients}
        onChange={e => setIngredients(e.target.value)}
        rows="3"
        style={{ width: '100%', marginBottom: 8, padding: 8 }}
      />
      <textarea
        placeholder="Instructions"
        value={instructions}
        onChange={e => setInstructions(e.target.value)}
        rows="5"
        style={{ width: '100%', marginBottom: 8, padding: 8 }}
      />
      <button type="submit">{editing ? 'Update Recipe' : 'Add Recipe'}</button>
      {editing && <button type="button" onClick={cancelEdit} style={{ marginLeft: 10 }}>Cancel</button>}
    </form>
  );
}

export default RecipeForm;