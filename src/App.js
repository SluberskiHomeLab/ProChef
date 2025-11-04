import React, { useState, useContext, useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import RecipeForm from './components/RecipeForm';
import RecipeList from './components/RecipeList';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import SearchBar from './components/SearchBar';
import CategorySelector from './components/CategorySelector';
import RecipeImporter from './components/RecipeImporter';
import { AuthProvider, AuthContext } from './AuthContext';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
  }
`;

const AppContainer = styled.div`
  min-height: 100vh;
  padding: 20px;
  background: rgba(255,255,255,0.1);
`;

const Header = styled.header`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 24px;
  display: flex;
  justify-content: between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
`;

const Logo = styled.h1`
  color: #333;
  font-size: 28px;
  font-weight: 700;
  margin: 0;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  color: #666;
`;

const LogoutButton = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;

  &:hover {
    background: #c82333;
  }
`;

const MainContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-width: 100%;
  }
`;

const Sidebar = styled.aside`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  height: fit-content;
  position: sticky;
  top: 20px;

  @media (max-width: 768px) {
    position: static;
  }
`;

const MainPanel = styled.main`
  min-height: 400px;
`;

const AuthContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
`;

const ViewButton = styled.button`
  padding: 8px 16px;
  border: 2px solid ${props => props.active ? '#007bff' : '#ddd'};
  background: ${props => props.active ? '#007bff' : 'white'};
  color: ${props => props.active ? 'white' : '#666'};
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #007bff;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
`;

function MainApp() {
  const { token, logout, user } = useContext(AuthContext);
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'list', 'grid'

  // Fetch data on login
  useEffect(() => {
    if (token) {
      fetchRecipes();
      fetchCategories();
    } else {
      setRecipes([]);
      setCategories([]);
    }
  }, [token]);

  // Fetch recipes with search and filters
  useEffect(() => {
    if (token) {
      fetchRecipes();
    }
  }, [token, searchTerm, filters, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:4000/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchRecipes = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      if (filters.isPublic) params.append('isPublic', filters.isPublic);
      
      const response = await fetch(`http://localhost:4000/recipes?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecipes(data);
      } else {
        throw new Error('Failed to fetch recipes');
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const addRecipe = async (formData) => {
    try {
      const response = await fetch('http://localhost:4000/recipes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData // FormData for file upload
      });

      if (response.ok) {
        toast.success('Recipe added successfully!');
        await fetchRecipes();
      } else {
        throw new Error('Failed to add recipe');
      }
    } catch (error) {
      console.error('Failed to add recipe:', error);
      toast.error('Failed to add recipe');
    }
  };

  const updateRecipe = async (id, formData) => {
    try {
      const response = await fetch(`http://localhost:4000/recipes/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData // FormData for file upload
      });

      if (response.ok) {
        toast.success('Recipe updated successfully!');
        await fetchRecipes();
        setEditing(null);
      } else {
        throw new Error('Failed to update recipe');
      }
    } catch (error) {
      console.error('Failed to update recipe:', error);
      toast.error('Failed to update recipe');
    }
  };

  const deleteRecipe = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/recipes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Recipe deleted successfully!');
        await fetchRecipes();
      } else {
        throw new Error('Failed to delete recipe');
      }
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      toast.error('Failed to delete recipe');
    }
  };

  const startEdit = (recipe) => setEditing(recipe);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  if (!token) {
    return (
      <>
        <GlobalStyle />
        <AuthContainer>
          {showRegister ? (
            <RegisterForm onSwitch={() => setShowRegister(false)} />
          ) : (
            <LoginForm onSwitch={() => setShowRegister(true)} />
          )}
        </AuthContainer>
        <ToastContainer position="top-right" />
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <AppContainer>
        <Header>
          <Logo>🍳 ProChef</Logo>
          <UserInfo>
            Welcome, {user?.email}
            <LogoutButton onClick={logout}>Logout</LogoutButton>
          </UserInfo>
        </Header>

        <MainContent>
          <Sidebar>
            <CategorySelector
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              token={token}
            />
          </Sidebar>

          <MainPanel>
            <SearchBar
              onSearch={handleSearch}
              onFiltersChange={handleFiltersChange}
              filters={filters}
              categories={categories}
            />

            <ViewToggle>
              <ViewButton 
                active={viewMode === 'grid'} 
                onClick={() => setViewMode('grid')}
              >
                Grid View
              </ViewButton>
              <ViewButton 
                active={viewMode === 'list'} 
                onClick={() => setViewMode('list')}
              >
                List View
              </ViewButton>
            </ViewToggle>

            <RecipeImporter
              onImportSuccess={() => fetchRecipes()}
              token={token}
            />

            <RecipeForm
              onAdd={addRecipe}
              onUpdate={updateRecipe}
              editing={editing}
              cancelEdit={() => setEditing(null)}
              categories={categories}
              token={token}
            />

            {loading ? (
              <LoadingSpinner>Loading recipes...</LoadingSpinner>
            ) : (
              <RecipeList 
                recipes={recipes} 
                onEdit={startEdit}
                onDelete={deleteRecipe}
                viewMode={viewMode}
              />
            )}
          </MainPanel>
        </MainContent>

        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </AppContainer>
    </>
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