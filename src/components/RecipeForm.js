import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';

const FormContainer = styled.form`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 24px;
`;

const FormTitle = styled.h2`
  margin-bottom: 20px;
  color: #333;
  font-size: 24px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.columns || '1fr'};
  gap: 16px;
  margin-bottom: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-weight: 500;
  color: #333;
  font-size: 14px;
`;

const Input = styled.input`
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const TextArea = styled.textarea`
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const Select = styled.select`
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const DropzoneArea = styled.div`
  border: 2px dashed ${props => props.isDragActive ? '#007bff' : '#e1e5e9'};
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.isDragActive ? '#f8f9ff' : '#fafafa'};

  &:hover {
    border-color: #007bff;
    background: #f8f9ff;
  }
`;

const ImagePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
`;

const PreviewImage = styled.img`
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #ddd;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.primary ? `
    background: #007bff;
    color: white;
    &:hover {
      background: #0056b3;
    }
  ` : `
    background: #6c757d;
    color: white;
    &:hover {
      background: #545b62;
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

function RecipeForm({ onAdd, onUpdate, editing, cancelEdit, categories = [], token }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ingredients: '',
    instructions: '',
    categoryId: '',
    cookingTime: '',
    prepTime: '',
    servings: '',
    difficulty: 'medium',
    isPublic: false,
    sourceUrl: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setFormData({
        title: editing.title || '',
        description: editing.description || '',
        ingredients: editing.ingredients || '',
        instructions: editing.instructions || '',
        categoryId: editing.category_id || '',
        cookingTime: editing.cooking_time || '',
        prepTime: editing.prep_time || '',
        servings: editing.servings || '',
        difficulty: editing.difficulty || 'medium',
        isPublic: editing.is_public || false,
        sourceUrl: editing.source_url || ''
      });
      if (editing.image_path) {
        setPreviewUrl(`http://localhost:4000/uploads/${editing.image_path}`);
      }
    } else {
      setFormData({
        title: '',
        description: '',
        ingredients: '',
        instructions: '',
        categoryId: '',
        cookingTime: '',
        prepTime: '',
        servings: '',
        difficulty: 'medium',
        isPublic: false,
        sourceUrl: ''
      });
      setPreviewUrl('');
      setSelectedFile(null);
    }
  }, [editing]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setLoading(true);
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null) {
          submitData.append(key, formData[key]);
        }
      });

      if (selectedFile) {
        submitData.append('image', selectedFile);
      }

      if (editing) {
        await onUpdate(editing.id, submitData);
      } else {
        await onAdd(submitData);
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        ingredients: '',
        instructions: '',
        categoryId: '',
        cookingTime: '',
        prepTime: '',
        servings: '',
        difficulty: 'medium',
        isPublic: false,
        sourceUrl: ''
      });
      setSelectedFile(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <FormTitle>{editing ? 'Edit Recipe' : 'Add New Recipe'}</FormTitle>
      
      <FormRow>
        <FormGroup>
          <Label>Recipe Title *</Label>
          <Input
            placeholder="Enter recipe title"
            value={formData.title}
            onChange={e => handleInputChange('title', e.target.value)}
            required
          />
        </FormGroup>
      </FormRow>

      <FormRow columns="1fr 1fr">
        <FormGroup>
          <Label>Category</Label>
          <Select
            value={formData.categoryId}
            onChange={e => handleInputChange('categoryId', e.target.value)}
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label>Difficulty</Label>
          <Select
            value={formData.difficulty}
            onChange={e => handleInputChange('difficulty', e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        </FormGroup>
      </FormRow>

      <FormRow columns="1fr 1fr 1fr">
        <FormGroup>
          <Label>Prep Time (minutes)</Label>
          <Input
            type="number"
            placeholder="0"
            value={formData.prepTime}
            onChange={e => handleInputChange('prepTime', e.target.value)}
            min="0"
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Cooking Time (minutes)</Label>
          <Input
            type="number"
            placeholder="0"
            value={formData.cookingTime}
            onChange={e => handleInputChange('cookingTime', e.target.value)}
            min="0"
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Servings</Label>
          <Input
            type="number"
            placeholder="1"
            value={formData.servings}
            onChange={e => handleInputChange('servings', e.target.value)}
            min="1"
          />
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup>
          <Label>Description</Label>
          <TextArea
            placeholder="Brief description of your recipe"
            value={formData.description}
            onChange={e => handleInputChange('description', e.target.value)}
            rows="3"
          />
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup>
          <Label>Ingredients</Label>
          <TextArea
            placeholder="List ingredients, one per line"
            value={formData.ingredients}
            onChange={e => handleInputChange('ingredients', e.target.value)}
            rows="5"
          />
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup>
          <Label>Instructions</Label>
          <TextArea
            placeholder="Step-by-step cooking instructions"
            value={formData.instructions}
            onChange={e => handleInputChange('instructions', e.target.value)}
            rows="6"
          />
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup>
          <Label>Recipe Image</Label>
          <DropzoneArea {...getRootProps()} isDragActive={isDragActive}>
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the image here...</p>
            ) : (
              <p>Drag & drop an image here, or click to select</p>
            )}
          </DropzoneArea>
          
          {previewUrl && (
            <ImagePreview>
              <PreviewImage src={previewUrl} alt="Recipe preview" />
              <span>Image selected</span>
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl('');
                  setSelectedFile(null);
                }}
                style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}
              >
                Remove
              </button>
            </ImagePreview>
          )}
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup>
          <Label>Source URL (optional)</Label>
          <Input
            type="url"
            placeholder="https://example.com/recipe"
            value={formData.sourceUrl}
            onChange={e => handleInputChange('sourceUrl', e.target.value)}
          />
        </FormGroup>
      </FormRow>

      <FormRow>
        <CheckboxGroup>
          <Checkbox
            checked={formData.isPublic}
            onChange={e => handleInputChange('isPublic', e.target.checked)}
          />
          <Label>Make this recipe public (others can view and copy)</Label>
        </CheckboxGroup>
      </FormRow>

      <ButtonGroup>
        <Button type="submit" primary disabled={loading || !formData.title.trim()}>
          {loading ? 'Saving...' : (editing ? 'Update Recipe' : 'Save Recipe')}
        </Button>
        {editing && (
          <Button type="button" onClick={cancelEdit}>
            Cancel
          </Button>
        )}
      </ButtonGroup>
    </FormContainer>
  );
}

export default RecipeForm;