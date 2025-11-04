const { Pool } = require('pg');

class PostgreSQLAdapter {
  constructor(config) {
    this.config = {
      host: config.host,
      port: config.port || 5432,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
    this.pool = null;
  }

  async connect() {
    try {
      this.pool = new Pool(this.config);
      
      // Test connection
      const client = await this.pool.connect();
      client.release();
      
      console.log('PostgreSQL connected successfully');
      await this.initializeSchema();
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  isConnected() {
    return this.pool !== null;
  }

  async query(sql, params = []) {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    
    try {
      const result = await this.pool.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async initializeSchema() {
    const queries = [
      // Create extensions
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
      
      // Roles table
      `CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(32) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Insert default roles
      `INSERT INTO roles (name) VALUES ('admin'), ('user'), ('viewer') 
       ON CONFLICT (name) DO NOTHING`,
      
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role_id INTEGER NOT NULL DEFAULT 2,
        mfa_enabled BOOLEAN DEFAULT FALSE,
        mfa_secret VARCHAR(32),
        theme_preferences JSONB,
        view_preferences JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id)
      )`,
      
      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(7),
        icon VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Insert default categories
      `INSERT INTO categories (name, description, color, icon) VALUES 
        ('Breakfast', 'Morning meals', '#FF6B6B', 'sunrise'),
        ('Lunch', 'Midday meals', '#4ECDC4', 'sun'),
        ('Dinner', 'Evening meals', '#45B7D1', 'moon'),
        ('Dessert', 'Sweet treats', '#96CEB4', 'cake'),
        ('Snack', 'Light bites', '#FFEAA7', 'cookie'),
        ('Beverage', 'Drinks and cocktails', '#DDA0DD', 'glass')
       ON CONFLICT (name) DO NOTHING`,
      
      // Create difficulty enum type
      `DO $$ BEGIN
        CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
       EXCEPTION
        WHEN duplicate_object THEN null;
       END $$`,
      
      // Recipes table
      `CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        ingredients TEXT,
        instructions TEXT,
        category_id INTEGER,
        cooking_time INTEGER,
        prep_time INTEGER,
        servings INTEGER,
        difficulty difficulty_level DEFAULT 'medium',
        nutrition_info JSONB,
        image_path VARCHAR(500),
        is_public BOOLEAN DEFAULT FALSE,
        source_url VARCHAR(1000),
        rating DECIMAL(3,2),
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`,
      
      // Create full-text search index
      `CREATE INDEX IF NOT EXISTS idx_recipe_search ON recipes 
       USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(ingredients, '') || ' ' || COALESCE(instructions, '')))`,
      
      // Ingredients table
      `CREATE TABLE IF NOT EXISTS ingredients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        unit VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Recipe ingredients junction table
      `CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER NOT NULL,
        ingredient_id INTEGER NOT NULL,
        quantity DECIMAL(10,3),
        unit VARCHAR(50),
        notes VARCHAR(255),
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
        UNIQUE (recipe_id, ingredient_id)
      )`,
      
      // User ingredients inventory
      `CREATE TABLE IF NOT EXISTS user_ingredients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        ingredient_id INTEGER NOT NULL,
        quantity DECIMAL(10,3),
        unit VARCHAR(50),
        expiry_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
        UNIQUE (user_id, ingredient_id)
      )`,
      
      // Create updated_at trigger function
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = CURRENT_TIMESTAMP;
         RETURN NEW;
       END;
       $$ language 'plpgsql'`,
      
      // Apply trigger to users and user_ingredients tables
      `DROP TRIGGER IF EXISTS update_users_updated_at ON users`,
      `CREATE TRIGGER update_users_updated_at
       BEFORE UPDATE ON users
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
      
      `DROP TRIGGER IF EXISTS update_user_ingredients_updated_at ON user_ingredients`,
      `CREATE TRIGGER update_user_ingredients_updated_at
       BEFORE UPDATE ON user_ingredients
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
      
      `DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes`,
      `CREATE TRIGGER update_recipes_updated_at
       BEFORE UPDATE ON recipes
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
    ];

    for (const query of queries) {
      await this.query(query);
    }
    
    console.log('PostgreSQL schema initialized successfully');
  }

  // User methods
  async getUserById(id) {
    const users = await this.query(
      'SELECT id, email, role_id, mfa_enabled, theme_preferences, view_preferences, created_at FROM users WHERE id = $1',
      [id]
    );
    return users[0] || null;
  }

  async getUserByEmail(email) {
    const users = await this.query(
      'SELECT id, email, password_hash, role_id, mfa_enabled, mfa_secret FROM users WHERE email = $1',
      [email]
    );
    return users[0] || null;
  }

  async createUser(email, passwordHash, roleId = 2) {
    const result = await this.query(
      'INSERT INTO users (email, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id',
      [email, passwordHash, roleId]
    );
    return result[0].id;
  }

  async updateUserRole(userId, roleId) {
    const result = await this.query(
      'UPDATE users SET role_id = $1 WHERE id = $2',
      [roleId, userId]
    );
    return result.length > 0;
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
      'SELECT r.id, r.name FROM roles r JOIN users u ON r.id = u.role_id WHERE u.id = $1',
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
      WHERE (r.is_public = TRUE OR r.user_id = $1)
    `;
    let params = [filters.userId];
    let paramIndex = 2;

    if (filters.search) {
      query += ` AND to_tsvector('english', r.title || ' ' || COALESCE(r.description, '') || ' ' || COALESCE(r.ingredients, '') || ' ' || COALESCE(r.instructions, '')) @@ plainto_tsquery('english', $${paramIndex})`;
      params.push(filters.search);
      paramIndex++;
    }

    if (filters.category) {
      query += ` AND r.category_id = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters.isPublic !== undefined) {
      query += ` AND r.is_public = $${paramIndex}`;
      params.push(filters.isPublic);
      paramIndex++;
    }

    query += ` ORDER BY r.updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(filters.limit, filters.offset);

    return await this.query(query, params);
  }

  async getRecipeById(id, userId) {
    const recipes = await this.query(`
      SELECT r.*, c.name as category_name, u.email as author_email 
      FROM recipes r 
      LEFT JOIN categories c ON r.category_id = c.id 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE r.id = $1 AND (r.is_public = TRUE OR r.user_id = $2)
    `, [id, userId]);

    if (recipes.length === 0) return null;

    // Update view count
    await this.query('UPDATE recipes SET view_count = view_count + 1 WHERE id = $1', [id]);

    return recipes[0];
  }

  async createRecipe(recipeData) {
    const result = await this.query(`
      INSERT INTO recipes (
        user_id, title, description, ingredients, instructions, 
        category_id, cooking_time, prep_time, servings, difficulty, 
        image_path, is_public, source_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id
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
      recipeData.isPublic || false,
      recipeData.sourceUrl || null
    ]);
    return result[0].id;
  }

  async updateRecipe(id, userId, recipeData) {
    const setParts = [];
    const params = [id, userId];
    let paramIndex = 3;

    Object.keys(recipeData).forEach(key => {
      if (recipeData[key] !== undefined && key !== 'userId') {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        setParts.push(`${dbKey} = $${paramIndex}`);
        params.push(recipeData[key]);
        paramIndex++;
      }
    });

    if (setParts.length === 0) return false;

    const result = await this.query(
      `UPDATE recipes SET ${setParts.join(', ')} WHERE id = $1 AND user_id = $2`,
      params
    );
    
    return result.length > 0;
  }

  async deleteRecipe(id, userId) {
    const result = await this.query(
      'DELETE FROM recipes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.length > 0;
  }

  // Category methods
  async getCategories() {
    return await this.query('SELECT * FROM categories ORDER BY name');
  }

  async createCategory(categoryData) {
    const result = await this.query(
      'INSERT INTO categories (name, description, color, icon) VALUES ($1, $2, $3, $4) RETURNING id',
      [categoryData.name, categoryData.description, categoryData.color, categoryData.icon]
    );
    return result[0].id;
  }

  // Additional methods would follow the same pattern as MySQL but with PostgreSQL-specific syntax
  async getIngredients() {
    return await this.query('SELECT * FROM ingredients ORDER BY name');
  }

  async createIngredient(ingredientData) {
    const result = await this.query(
      'INSERT INTO ingredients (name, category, unit) VALUES ($1, $2, $3) RETURNING id',
      [ingredientData.name, ingredientData.category, ingredientData.unit]
    );
    return result[0].id;
  }

  async getUserIngredients(userId) {
    return await this.query(`
      SELECT ui.*, i.name, i.category, i.unit as default_unit
      FROM user_ingredients ui
      JOIN ingredients i ON ui.ingredient_id = i.id
      WHERE ui.user_id = $1
      ORDER BY i.name
    `, [userId]);
  }

  async updateUserIngredients(userId, ingredients) {
    // Using a transaction for this operation
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query('DELETE FROM user_ingredients WHERE user_id = $1', [userId]);
      
      for (const ingredient of ingredients) {
        await client.query(`
          INSERT INTO user_ingredients (user_id, ingredient_id, quantity, unit, expiry_date)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          userId,
          ingredient.ingredientId,
          ingredient.quantity,
          ingredient.unit,
          ingredient.expiryDate
        ]);
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async searchRecipes(query, filters) {
    let sql = `
      SELECT r.*, c.name as category_name, u.email as author_email,
        ts_rank(to_tsvector('english', r.title || ' ' || COALESCE(r.description, '') || ' ' || COALESCE(r.ingredients, '') || ' ' || COALESCE(r.instructions, '')), plainto_tsquery('english', $1)) as relevance
      FROM recipes r 
      LEFT JOIN categories c ON r.category_id = c.id 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE (r.is_public = TRUE OR r.user_id = $2)
        AND to_tsvector('english', r.title || ' ' || COALESCE(r.description, '') || ' ' || COALESCE(r.ingredients, '') || ' ' || COALESCE(r.instructions, '')) @@ plainto_tsquery('english', $1)
    `;
    
    let params = [query, filters.userId];
    let paramIndex = 3;

    if (filters.category) {
      sql += ` AND r.category_id = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters.difficulty) {
      sql += ` AND r.difficulty = $${paramIndex}`;
      params.push(filters.difficulty);
      paramIndex++;
    }

    sql += ` ORDER BY relevance DESC, r.updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(filters.limit || 20, filters.offset || 0);

    return await this.query(sql, params);
  }

  async getRecipesByIngredients(ingredients, userId) {
    const placeholders = ingredients.map((_, index) => `$${index + 2}`).join(',');
    return await this.query(`
      SELECT r.*, c.name as category_name, u.email as author_email,
        COUNT(ri.ingredient_id) as matched_ingredients
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE (r.is_public = TRUE OR r.user_id = $1)
        AND i.name = ANY($2::text[])
      GROUP BY r.id, c.name, u.email
      ORDER BY matched_ingredients DESC, r.updated_at DESC
    `, [userId, ingredients]);
  }
}

module.exports = PostgreSQLAdapter;