import React from 'react';

function RecipeItem({ recipe, onEdit }) {
  return (
    <li style={{ border: '1px solid #ccc', padding: 12, marginBottom: 10, borderRadius: 6 }}>
      <h2>{recipe.title}</h2>
      <strong>Ingredients:</strong>
      <div style={{ whiteSpace: 'pre-wrap' }}>{recipe.ingredients}</div>
      <strong>Instructions:</strong>
      <div style={{ whiteSpace: 'pre-wrap' }}>{recipe.instructions}</div>
      <button onClick={() => onEdit(recipe)} style={{ marginTop: 10 }}>Edit</button>
    </li>
  );
}

export default RecipeItem;