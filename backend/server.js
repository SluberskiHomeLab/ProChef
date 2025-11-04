require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DatabaseManager = require('./database/DatabaseManager');
const RecipeImportService = require('./services/RecipeImportService');

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET = process.env.SECRET || 'YOUR_SECRET_KEY';

// Initialize services
const db = new DatabaseManager();
const importService = new RecipeImportService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts'
});

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    const user = await db.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = await db.getUserRole(req.user.id);
    if (!userRole || !roles.includes(userRole.name)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// Auth routes
app.post('/register', 
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check if user exists
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userId = await db.createUser(email, passwordHash);
      
      res.status(201).json({ 
        message: 'User created successfully',
        userId 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

app.post('/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Get user
      const user = await db.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          roleId: user.role_id 
        },
        SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email,
          roleId: user.role_id
        } 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Recipe routes
app.get('/recipes', authenticateToken, async (req, res) => {
  try {
    const { search, category, isPublic, limit = 50, offset = 0 } = req.query;
    const recipes = await db.getRecipes({
      userId: req.user.id,
      search,
      category,
      isPublic: isPublic === 'true',
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json(recipes);
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

app.get('/recipes/:id', authenticateToken, async (req, res) => {
  try {
    const recipe = await db.getRecipeById(req.params.id, req.user.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

app.post('/recipes',
  authenticateToken,
  upload.single('image'),
  [
    body('title').trim().isLength({ min: 1, max: 255 }),
    body('ingredients').optional().isString(),
    body('instructions').optional().isString(),
    body('categoryId').optional().isInt(),
    body('cookingTime').optional().isInt({ min: 0 }),
    body('servings').optional().isInt({ min: 1 }),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
    body('isPublic').optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const recipeData = {
        ...req.body,
        userId: req.user.id,
        imagePath: req.file ? req.file.filename : null
      };

      const recipeId = await db.createRecipe(recipeData);
      res.status(201).json({ id: recipeId, message: 'Recipe created successfully' });
    } catch (error) {
      console.error('Create recipe error:', error);
      res.status(500).json({ error: 'Failed to create recipe' });
    }
  }
);

app.put('/recipes/:id',
  authenticateToken,
  upload.single('image'),
  [
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
    body('ingredients').optional().isString(),
    body('instructions').optional().isString(),
    body('categoryId').optional().isInt(),
    body('cookingTime').optional().isInt({ min: 0 }),
    body('servings').optional().isInt({ min: 1 }),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
    body('isPublic').optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const recipeData = {
        ...req.body,
        imagePath: req.file ? req.file.filename : undefined
      };

      const updated = await db.updateRecipe(req.params.id, req.user.id, recipeData);
      if (!updated) {
        return res.status(404).json({ error: 'Recipe not found or access denied' });
      }
      
      res.json({ message: 'Recipe updated successfully' });
    } catch (error) {
      console.error('Update recipe error:', error);
      res.status(500).json({ error: 'Failed to update recipe' });
    }
  }
);

app.delete('/recipes/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await db.deleteRecipe(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Recipe not found or access denied' });
    }
    
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// Recipe import route
app.post('/recipes/import',
  authenticateToken,
  [
    body('url').isURL().withMessage('Valid URL required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { url } = req.body;
      
      // Import recipe data from URL
      const importedData = await importService.importFromUrl(url);
      
      // Create recipe in database
      const recipeData = {
        ...importedData,
        userId: req.user.id,
        isPublic: false // Imported recipes are private by default
      };

      const recipeId = await db.createRecipe(recipeData);
      
      res.status(201).json({ 
        id: recipeId, 
        message: 'Recipe imported successfully',
        recipe: { id: recipeId, ...importedData }
      });
    } catch (error) {
      console.error('Recipe import error:', error);
      res.status(400).json({ 
        error: 'Recipe import failed', 
        details: error.message 
      });
    }
  }
);

// Categories routes
app.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await db.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/categories',
  authenticateToken,
  requireRole(['admin']),
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('description').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const categoryId = await db.createCategory(req.body);
      res.status(201).json({ id: categoryId, message: 'Category created successfully' });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
);

// User management routes (admin only)
app.get('/users', 
  authenticateToken, 
  requireRole(['admin']), 
  async (req, res) => {
    try {
      const users = await db.getUsers();
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
);

app.put('/users/:id/role',
  authenticateToken,
  requireRole(['admin']),
  [
    body('roleId').isInt({ min: 1 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const updated = await db.updateUserRole(req.params.id, req.body.roleId);
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ message: 'User role updated successfully' });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: db.isConnected() ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  try {
    await db.connect();
    console.log('Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`ProChef backend server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await db.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await db.disconnect();
  process.exit(0);
});

startServer();