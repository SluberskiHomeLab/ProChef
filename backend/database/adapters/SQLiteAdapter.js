const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

class SQLiteAdapter {
  constructor(config) {
    this.config = config;
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.config.filename, async (err) => {
        if (err) {
          console.error('SQLite connection failed:', err);
          reject(err);
        } else {
          console.log('SQLite connected successfully');
          
          // Enable foreign keys
          await this.query('PRAGMA foreign_keys = ON');
          await this.initializeSchema();
          resolve();
        }
      });
    });
  }

  async disconnect() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) console.error('SQLite disconnect error:', err);
          this.db = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  isConnected() {
    return this.db !== null;
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('SQLite query error:', err);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) {
            console.error('SQLite query error:', err);
            reject(err);
          } else {
            resolve({ 
              insertId: this.lastID, 
              affectedRows: this.changes,
              length: this.changes // For compatibility with other adapters
            });
          }
        });
      }
    });
  }

  async initializeSchema() {
    const queries = [
      // Roles table
      `CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Insert default roles
      `INSERT OR IGNORE INTO roles (name) VALUES ('admin'), ('user'), ('viewer')`,
      
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role_id INTEGER NOT NULL DEFAULT 2,
        mfa_enabled BOOLEAN DEFAULT 0,
        mfa_secret TEXT,
        theme_preferences TEXT,
        view_preferences TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id)
      )`,
      
      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Insert default categories
      `INSERT OR IGNORE INTO categories (name, description, color, icon) VALUES 
        ('Breakfast', 'Morning meals', '#FF6B6B', 'sunrise'),
        ('Lunch', 'Midday meals', '#4ECDC4', 'sun'),
        ('Dinner', 'Evening meals', '#45B7D1', 'moon'),
        ('Dessert', 'Sweet treats', '#96CEB4', 'cake'),
        ('Snack', 'Light bites', '#FFEAA7', 'cookie'),
        ('Beverage', 'Drinks and cocktails', '#DDA0DD', 'glass')`,
      
      // Recipes table
      `CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        ingredients TEXT,
        instructions TEXT,
        category_id INTEGER,
        cooking_time INTEGER,
        prep_time INTEGER,
        servings INTEGER,
        difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
        nutrition_info TEXT,
        image_path TEXT,
        is_public BOOLEAN DEFAULT 0,
        source_url TEXT,
        rating REAL,
        view_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`,
      
      // Create FTS virtual table for search
      `CREATE VIRTUAL TABLE IF NOT EXISTS recipes_fts USING fts5(
        title, description, ingredients, instructions, content='recipes', content_rowid='id'
      )`,
      
      // Ingredients table
      `CREATE TABLE IF NOT EXISTS ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        unit TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Recipe ingredients junction table
      `CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER NOT NULL,
        ingredient_id INTEGER NOT NULL,
        quantity REAL,
        unit TEXT,
        notes TEXT,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
        UNIQUE (recipe_id, ingredient_id)
      )`,
      
      // User ingredients inventory
      `CREATE TABLE IF NOT EXISTS user_ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ingredient_id INTEGER NOT NULL,
        quantity REAL,
        unit TEXT,
        expiry_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
        UNIQUE (user_id, ingredient_id)
      )`
    ];

    for (const query of queries) {
      await this.query(query);
    }
    
    console.log('SQLite schema initialized successfully');
  }

  // User methods (similar to MySQL but with SQLite-specific syntax)
  async getUserById(id) {
    const users = await this.query(
      'SELECT id, email, role_id, mfa_enabled, theme_preferences, view_preferences, created_at FROM users WHERE id = ?',
      [id]
    );
    return users[0] || null;
  }

  async getUserByEmail(email) {
    const users = await this.query(
      'SELECT id, email, password_hash, role_id, mfa_enabled, mfa_secret FROM users WHERE email = ?',
      [email]
    );
    return users[0] || null;
  }

  async createUser(email, passwordHash, roleId = 2) {
    const result = await this.query(
      'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)',
      [email, passwordHash, roleId]
    );
    return result.insertId;
  }

  async updateUserRole(userId, roleId) {
    const result = await this.query(
      'UPDATE users SET role_id = ? WHERE id = ?',
      [roleId, userId]
    );
    return result.affectedRows > 0;
  }

  async getUsers() {
    return await this.query(`
      SELECT u.id, u.email, u.created_at, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      ORDER BY u.created_at DESC
    `);
  }

  async getUserRole(userId) {
    const roles = await this.query(
      'SELECT r.id, r.name FROM roles r JOIN users u ON r.id = u.role_id WHERE u.id = ?',
      [userId]
    );
    return roles[0] || null;
  }

  // Recipe methods
  async getRecipes(filters) {
    let query = `
      SELECT r.*, c.name as category_name, u.email as author_email 
      FROM recipes r 
      LEFT JOIN categories c ON r.category_id = c.id 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE (r.is_public = 1 OR r.user_id = ?)
    `;
    let params = [filters.userId];

    if (filters.search) {
      query += ` AND r.id IN (SELECT rowid FROM recipes_fts WHERE recipes_fts MATCH ?)`;
      params.push(filters.search);
    }

    if (filters.category) {
      query += ` AND r.category_id = ?`;
      params.push(filters.category);
    }

    if (filters.isPublic !== undefined) {
      query += ` AND r.is_public = ?`;
      params.push(filters.isPublic ? 1 : 0);
    }

    query += ` ORDER BY r.updated_at DESC LIMIT ? OFFSET ?`;
    params.push(filters.limit, filters.offset);

    return await this.query(query, params);
  }

  async getRecipeById(id, userId) {
    const recipes = await this.query(`
      SELECT r.*, c.name as category_name, u.email as author_email 
      FROM recipes r 
      LEFT JOIN categories c ON r.category_id = c.id 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE r.id = ? AND (r.is_public = 1 OR r.user_id = ?)
    `, [id, userId]);

    if (recipes.length === 0) return null;

    // Update view count
    await this.query('UPDATE recipes SET view_count = view_count + 1 WHERE id = ?', [id]);

    return recipes[0];
  }

  async createRecipe(recipeData) {
    const result = await this.query(`
      INSERT INTO recipes (
        user_id, title, description, ingredients, instructions, 
        category_id, cooking_time, prep_time, servings, difficulty, 
        image_path, is_public, source_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      recipeData.userId,
      recipeData.title,
      recipeData.description || null,
      recipeData.ingredients || null,
      recipeData.instructions || null,
      recipeData.categoryId || null,
      recipeData.cookingTime || null,
      recipeData.prepTime || null,
      recipeData.servings || null,
      recipeData.difficulty || 'medium',
      recipeData.imagePath || null,
      recipeData.isPublic ? 1 : 0,
      recipeData.sourceUrl || null
    ]);

    // Update FTS index
    await this.query(`
      INSERT INTO recipes_fts(rowid, title, description, ingredients, instructions)
      VALUES (?, ?, ?, ?, ?)
    `, [
      result.insertId,
      recipeData.title,
      recipeData.description || '',
      recipeData.ingredients || '',
      recipeData.instructions || ''
    ]);

    return result.insertId;
  }

  async updateRecipe(id, userId, recipeData) {
    const setParts = [];
    const params = [];

    Object.keys(recipeData).forEach(key => {
      if (recipeData[key] !== undefined && key !== 'userId') {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        setParts.push(`${dbKey} = ?`);
        params.push(key === 'isPublic' ? (recipeData[key] ? 1 : 0) : recipeData[key]);
      }
    });

    if (setParts.length === 0) return false;

    params.push(id, userId);
    const result = await this.query(
      `UPDATE recipes SET ${setParts.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );
    
    return result.affectedRows > 0;
  }

  async deleteRecipe(id, userId) {
    const result = await this.query(
      'DELETE FROM recipes WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    // Remove from FTS index
    await this.query('DELETE FROM recipes_fts WHERE rowid = ?', [id]);
    
    return result.affectedRows > 0;
  }

  // Category methods
  async getCategories() {
    return await this.query('SELECT * FROM categories ORDER BY name');
  }

  async createCategory(categoryData) {
    const result = await this.query(
      'INSERT INTO categories (name, description, color, icon) VALUES (?, ?, ?, ?)',
      [categoryData.name, categoryData.description, categoryData.color, categoryData.icon]
    );
    return result.insertId;
  }

  // Ingredient methods
  async getIngredients() {
    return await this.query('SELECT * FROM ingredients ORDER BY name');
  }

  async createIngredient(ingredientData) {
    const result = await this.query(
      'INSERT INTO ingredients (name, category, unit) VALUES (?, ?, ?)',
      [ingredientData.name, ingredientData.category, ingredientData.unit]
    );
    return result.insertId;
  }

  async getUserIngredients(userId) {
    return await this.query(`
      SELECT ui.*, i.name, i.category, i.unit as default_unit
      FROM user_ingredients ui
      JOIN ingredients i ON ui.ingredient_id = i.id
      WHERE ui.user_id = ?
      ORDER BY i.name
    `, [userId]);
  }

  async updateUserIngredients(userId, ingredients) {
    await this.query('DELETE FROM user_ingredients WHERE user_id = ?', [userId]);
    
    for (const ingredient of ingredients) {
      await this.query(`
        INSERT INTO user_ingredients (user_id, ingredient_id, quantity, unit, expiry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [
        userId,
        ingredient.ingredientId,
        ingredient.quantity,
        ingredient.unit,
        ingredient.expiryDate
      ]);
    }
    
    return true;
  }

  async searchRecipes(query, filters) {
    let sql = `
      SELECT r.*, c.name as category_name, u.email as author_email
      FROM recipes r 
      LEFT JOIN categories c ON r.category_id = c.id 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE (r.is_public = 1 OR r.user_id = ?)
        AND r.id IN (SELECT rowid FROM recipes_fts WHERE recipes_fts MATCH ?)
    `;
    
    let params = [filters.userId, query];

    if (filters.category) {
      sql += ` AND r.category_id = ?`;
      params.push(filters.category);
    }

    if (filters.difficulty) {
      sql += ` AND r.difficulty = ?`;
      params.push(filters.difficulty);
    }

    sql += ` ORDER BY r.updated_at DESC LIMIT ? OFFSET ?`;
    params.push(filters.limit || 20, filters.offset || 0);

    return await this.query(sql, params);
  }

  async getRecipesByIngredients(ingredients, userId) {
    const placeholders = ingredients.map(() => '?').join(',');
    return await this.query(`
      SELECT r.*, c.name as category_name, u.email as author_email,
        COUNT(ri.ingredient_id) as matched_ingredients
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE (r.is_public = 1 OR r.user_id = ?)
        AND i.name IN (${placeholders})
      GROUP BY r.id
      ORDER BY matched_ingredients DESC, r.updated_at DESC
    `, [userId, ...ingredients]);
  }
}

module.exports = SQLiteAdapter;