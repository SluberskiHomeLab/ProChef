import React from 'react';
import styled from 'styled-components';

const RecipeCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
  margin-bottom: 20px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
`;

const RecipeImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  background: #f8f9fa;
`;

const ImagePlaceholder = styled.div`
  width: 100%;
  height: 200px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 48px;
`;

const RecipeContent = styled.div`
  padding: 20px;
`;

const RecipeHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
`;

const RecipeTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  color: #333;
  flex: 1;
`;

const CategoryBadge = styled.span`
  background: ${props => props.color}20;
  color: ${props => props.color || '#666'};
  border: 1px solid ${props => props.color}40;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
`;

const RecipeMetadata = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #666;
`;

const DifficultyBadge = styled.span`
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    switch (props.difficulty) {
      case 'easy': return '#d4edda';
      case 'medium': return '#fff3cd';
      case 'hard': return '#f8d7da';
      default: return '#e9ecef';
    }
  }};
  color: ${props => {
    switch (props.difficulty) {
      case 'easy': return '#155724';
      case 'medium': return '#856404';
      case 'hard': return '#721c24';
      default: return '#495057';
    }
  }};
`;

const PublicBadge = styled.span`
  background: #e3f2fd;
  color: #1976d2;
  border: 1px solid #bbdefb;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

const RecipeDescription = styled.p`
  color: #666;
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const IngredientsList = styled.div`
  margin: 12px 0;
  font-size: 14px;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
`;

const Button = styled.button`
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    background: #f8f9fa;
    border-color: #007bff;
  }

  &.primary {
    background: #007bff;
    color: white;
    border-color: #007bff;

    &:hover {
      background: #0056b3;
    }
  }

  &.danger {
    background: #dc3545;
    color: white;
    border-color: #dc3545;

    &:hover {
      background: #c82333;
    }
  }
`;

const ViewCount = styled.span`
  font-size: 12px;
  color: #999;
  margin-left: auto;
`;

function RecipeItem({ recipe, onEdit, onDelete, onView, viewMode = 'grid' }) {
  const formatTime = (minutes) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const totalTime = (recipe.prep_time || 0) + (recipe.cooking_time || 0);

  return (
    <RecipeCard>
      {recipe.image_path ? (
        <RecipeImage 
          src={`http://localhost:4000/uploads/${recipe.image_path}`}
          alt={recipe.title}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : (
        <ImagePlaceholder>
          🍳
        </ImagePlaceholder>
      )}
      
      <RecipeContent>
        <RecipeHeader>
          <RecipeTitle>{recipe.title}</RecipeTitle>
          {recipe.category_name && (
            <CategoryBadge color="#007bff">
              {recipe.category_name}
            </CategoryBadge>
          )}
        </RecipeHeader>

        {recipe.description && (
          <RecipeDescription>{recipe.description}</RecipeDescription>
        )}

        <RecipeMetadata>
          {recipe.difficulty && (
            <MetaItem>
              <DifficultyBadge difficulty={recipe.difficulty}>
                {recipe.difficulty}
              </DifficultyBadge>
            </MetaItem>
          )}
          
          {totalTime > 0 && (
            <MetaItem>
              ⏱️ {formatTime(totalTime)}
            </MetaItem>
          )}
          
          {recipe.servings && (
            <MetaItem>
              👥 {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
            </MetaItem>
          )}

          {recipe.is_public && (
            <MetaItem>
              <PublicBadge>Public</PublicBadge>
            </MetaItem>
          )}

          {recipe.view_count > 0 && (
            <ViewCount>👁️ {recipe.view_count} views</ViewCount>
          )}
        </RecipeMetadata>

        {recipe.ingredients && (
          <div>
            <strong style={{ fontSize: '14px', color: '#333' }}>Ingredients:</strong>
            <IngredientsList>{recipe.ingredients}</IngredientsList>
          </div>
        )}

        <ActionButtons>
          <Button className="primary" onClick={() => onView ? onView(recipe) : onEdit(recipe)}>
            {onView ? 'View Recipe' : 'View'}
          </Button>
          <Button onClick={() => onEdit(recipe)}>
            Edit
          </Button>
          {onDelete && (
            <Button 
              className="danger" 
              onClick={() => onDelete(recipe.id)}
            >
              Delete
            </Button>
          )}
          {recipe.source_url && (
            <Button 
              onClick={() => window.open(recipe.source_url, '_blank')}
            >
              Source
            </Button>
          )}
        </ActionButtons>
      </RecipeContent>
    </RecipeCard>
  );
}

export default RecipeItem;