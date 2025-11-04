import React, { useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';

const ImportContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 24px;
`;

const ImportTitle = styled.h3`
  margin-bottom: 16px;
  color: #333;
`;

const ImportForm = styled.form`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const UrlInput = styled.input`
  flex: 1;
  min-width: 300px;
  padding: 12px;
  border: 2px solid #e1e5e9;
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

const ImportButton = styled.button`
  padding: 12px 24px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: #218838;
  }

  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const SupportedSites = styled.div`
  margin-top: 12px;
  font-size: 12px;
  color: #666;
`;

const SiteList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
`;

const SiteTag = styled.span`
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: #495057;
`;

const LoadingMessage = styled.div`
  color: #007bff;
  font-size: 14px;
  margin-top: 8px;
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  font-size: 14px;
  margin-top: 8px;
`;

function RecipeImporter({ onImportSuccess, token }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supportedSites = [
    'AllRecipes', 'Food Network', 'Epicurious', 'Bon Appétit', 
    'Serious Eats', 'Taste of Home', 'Delish', 'Food.com'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a recipe URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:4000/recipes/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Recipe imported successfully!');
        setUrl('');
        if (onImportSuccess) {
          onImportSuccess(data.recipe);
        }
      } else {
        throw new Error(data.details || data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error.message || 'Failed to import recipe. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImportContainer>
      <ImportTitle>📖 Import Recipe from URL</ImportTitle>
      
      <ImportForm onSubmit={handleSubmit}>
        <UrlInput
          type="url"
          placeholder="Paste recipe URL here (e.g., https://www.allrecipes.com/recipe/...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
        <ImportButton type="submit" disabled={loading || !url.trim()}>
          {loading ? 'Importing...' : 'Import Recipe'}
        </ImportButton>
      </ImportForm>

      {loading && (
        <LoadingMessage>
          Extracting recipe data from the webpage... This may take a few seconds.
        </LoadingMessage>
      )}

      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}

      <SupportedSites>
        Works best with popular recipe sites:
        <SiteList>
          {supportedSites.map(site => (
            <SiteTag key={site}>{site}</SiteTag>
          ))}
        </SiteList>
      </SupportedSites>
    </ImportContainer>
  );
}

export default RecipeImporter;