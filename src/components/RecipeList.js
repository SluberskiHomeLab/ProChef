import React from 'react';
import styled from 'styled-components';
import RecipeItem from './RecipeItem';

const Container = styled.div`
  margin-top: 20px;
`;

const GridView = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
`;

const ListView = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #666;
  font-size: 18px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const EmptyTitle = styled.h3`
  margin-bottom: 8px;
  color: #333;
`;

const EmptyDescription = styled.p`
  color: #666;
  margin: 0;
`;

function RecipeList({ recipes, onEdit, onDelete, viewMode = 'grid' }) {
  if (recipes.length === 0) {
    return (
      <Container>
        <EmptyState>
          <EmptyIcon>🍳</EmptyIcon>
          <EmptyTitle>No recipes found</EmptyTitle>
          <EmptyDescription>
            Start by adding your first recipe or adjust your search filters
          </EmptyDescription>
        </EmptyState>
      </Container>
    );
  }

  const RecipeContainer = viewMode === 'grid' ? GridView : ListView;

  return (
    <Container>
      <RecipeContainer>
        {recipes.map((recipe) => (
          <RecipeItem 
            key={recipe.id} 
            recipe={recipe} 
            onEdit={onEdit}
            onDelete={onDelete}
            viewMode={viewMode}
          />
        ))}
      </RecipeContainer>
    </Container>
  );
}

export default RecipeList;