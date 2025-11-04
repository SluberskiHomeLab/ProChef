import React, { useState, useEffect } from 'react';
import debounce from 'lodash.debounce';
import styled from 'styled-components';

const SearchContainer = styled.div`
  margin-bottom: 20px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #007bff;
  }

  &::placeholder {
    color: #999;
  }
`;

const SearchFilters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const FilterLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #666;
`;

const ClearButton = styled.button`
  padding: 8px 12px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s ease;

  &:hover {
    background: #e9ecef;
    border-color: #adb5bd;
  }
`;

function SearchBar({ 
  onSearch, 
  onFiltersChange, 
  filters = {}, 
  categories = [],
  placeholder = "Search recipes by title, ingredients, or instructions..." 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilters, setLocalFilters] = useState({
    difficulty: '',
    cookingTimeMax: '',
    category: '',
    isPublic: '',
    ...filters
  });

  // Debounced search function
  const debouncedSearch = debounce((term) => {
    onSearch(term);
  }, 300);

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);

  useEffect(() => {
    onFiltersChange(localFilters);
  }, [localFilters, onFiltersChange]);

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (filterName, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearAll = () => {
    setSearchTerm('');
    setLocalFilters({
      difficulty: '',
      cookingTimeMax: '',
      category: '',
      isPublic: ''
    });
    onSearch('');
    onFiltersChange({});
  };

  const hasActiveFilters = searchTerm || Object.values(localFilters).some(val => val !== '');

  return (
    <SearchContainer>
      <SearchInput
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleInputChange}
      />
      
      <SearchFilters>
        <FilterLabel>
          Difficulty
          <FilterSelect
            value={localFilters.difficulty}
            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
          >
            <option value="">Any</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </FilterSelect>
        </FilterLabel>

        <FilterLabel>
          Max Cooking Time
          <FilterSelect
            value={localFilters.cookingTimeMax}
            onChange={(e) => handleFilterChange('cookingTimeMax', e.target.value)}
          >
            <option value="">Any</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
          </FilterSelect>
        </FilterLabel>

        {categories.length > 0 && (
          <FilterLabel>
            Category
            <FilterSelect
              value={localFilters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </FilterSelect>
          </FilterLabel>
        )}

        <FilterLabel>
          Visibility
          <FilterSelect
            value={localFilters.isPublic}
            onChange={(e) => handleFilterChange('isPublic', e.target.value)}
          >
            <option value="">All Recipes</option>
            <option value="true">Public Only</option>
            <option value="false">Private Only</option>
          </FilterSelect>
        </FilterLabel>

        {hasActiveFilters && (
          <FilterLabel>
            <span>&nbsp;</span>
            <ClearButton onClick={clearAll}>
              Clear All
            </ClearButton>
          </FilterLabel>
        )}
      </SearchFilters>
    </SearchContainer>
  );
}

export default SearchBar;