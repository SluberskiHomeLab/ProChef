import React from 'react';
import RecipeItem from './RecipeItem';

function RecipeList({ recipes, onEdit }) {
  if (recipes.length === 0) {
    return <p>No recipes yet. Add your first recipe!</p>;
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {recipes.map((recipe, idx) => (
        <RecipeItem key={recipe.id || idx} recipe={recipe} onEdit={onEdit} />
      ))}
    </ul>
  );
}

export default RecipeList;