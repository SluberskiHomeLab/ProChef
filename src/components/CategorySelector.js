import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const CategoryContainer = styled.div`
  margin-bottom: 20px;
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
`;

const CategoryCard = styled.div`
  padding: 12px;
  border-radius: 8px;
  border: 2px solid ${props => props.selected ? props.color : 'transparent'};
  background: ${props => props.color}20;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
`;

const CategoryIcon = styled.div`
  font-size: 24px;
  margin-bottom: 4px;
`;

const CategoryName = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #333;
`;

const AllCategoriesButton = styled.button`
  padding: 12px 16px;
  border: 2px solid ${props => props.selected ? '#007bff' : '#ddd'};
  background: ${props => props.selected ? '#007bff' : 'white'};
  color: ${props => props.selected ? 'white' : '#333'};
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  margin-right: 10px;
  margin-bottom: 10px;

  &:hover {
    border-color: #007bff;
  }
`;

const iconMap = {
  sunrise: '🌅',
  sun: '☀️', 
  moon: '🌙',
  cake: '🎂',
  cookie: '🍪',
  glass: '🥤',
  default: '📄'
};

function CategorySelector({ categories, selectedCategory, onCategorySelect, token }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCategorySelect = (categoryId) => {
    onCategorySelect(categoryId === selectedCategory ? null : categoryId);
  };

  if (error) {
    return <div style={{ color: 'red', padding: '10px' }}>Error loading categories: {error}</div>;
  }

  return (
    <CategoryContainer>
      <h3 style={{ marginBottom: '15px', color: '#333' }}>Categories</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <AllCategoriesButton
          selected={selectedCategory === null}
          onClick={() => handleCategorySelect(null)}
        >
          All Recipes
        </AllCategoriesButton>
      </div>

      <CategoryGrid>
        {categories.map(category => (
          <CategoryCard
            key={category.id}
            color={category.color || '#007bff'}
            selected={selectedCategory === category.id}
            onClick={() => handleCategorySelect(category.id)}
          >
            <CategoryIcon>
              {iconMap[category.icon] || iconMap.default}
            </CategoryIcon>
            <CategoryName>{category.name}</CategoryName>
          </CategoryCard>
        ))}
      </CategoryGrid>
    </CategoryContainer>
  );
}

export default CategorySelector;