const mysql = require('mysql2/promise');

class MySQLAdapter {
  constructor(config) {
    this.config = {
      host: config.host,
      port: config.port || 3306,
      user: config.user,
      password: config.password,
      database: config.database,
      charset: 'utf8mb4',
      timezone: '+00:00',
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    };
    this.connection = null;
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection(this.config);
      console.log('MySQL connected successfully');
      await this.initializeSchema();
    } catch (error) {
      console.error('MySQL connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  isConnected() {
    return this.connection !== null;
  }

  async query(sql, params = []) {
    if (!this.connection) {
      throw new Error('Database not connected');
    }
    
    try {
      const [rows] = await this.connection.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async initializeSchema() {
    const queries = [
      // Roles table
      `CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(32) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Insert default roles
      `INSERT IGNORE INTO roles (name) VALUES ('admin'), ('user'), ('viewer')`,
      
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role_id INT NOT NULL DEFAULT 2,
        mfa_enabled BOOLEAN DEFAULT FALSE,
        mfa_secret VARCHAR(32),
        theme_preferences JSON,
        view_preferences JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id)
      )`,
      
      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(7),
        icon VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Insert default categories
      `INSERT IGNORE INTO categories (name, description, color, icon) VALUES 
        ('Breakfast', 'Morning meals', '#FF6B6B', 'sunrise'),
        ('Lunch', 'Midday meals', '#4ECDC4', 'sun'),
        ('Dinner', 'Evening meals', '#45B7D1', 'moon'),
        ('Dessert', 'Sweet treats', '#96CEB4', 'cake'),
        ('Snack', 'Light bites', '#FFEAA7', 'cookie'),
        ('Beverage', 'Drinks and cocktails', '#DDA0DD', 'glass')`,
      
      // Recipes table
      `CREATE TABLE IF NOT EXISTS recipes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        ingredients TEXT,
        instructions TEXT,
        category_id INT,
        cooking_time INT,
        prep_time INT,
        servings INT,
        difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
        nutrition_info JSON,
        image_path VARCHAR(500),
        is_public BOOLEAN DEFAULT FALSE,
        source_url VARCHAR(1000),
        rating DECIMAL(3,2),
        view_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FULLTEXT KEY idx_recipe_search (title, description, ingredients, instructions)
      )`,
      
      // Ingredients table
      `CREATE TABLE IF NOT EXISTS ingredients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        unit VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Recipe ingredients junction table
      `CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipe_id INT NOT NULL,
        ingredient_id INT NOT NULL,
        quantity DECIMAL(10,3),
        unit VARCHAR(50),
        notes VARCHAR(255),
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
        UNIQUE KEY unique_recipe_ingredient (recipe_id, ingredient_id)
      )`,
      
      // User ingredients inventory
      `CREATE TABLE IF NOT EXISTS user_ingredients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        ingredient_id INT NOT NULL,
        quantity DECIMAL(10,3),
        unit VARCHAR(50),
        expiry_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
        UNIQUE KEY unique_user_ingredient (user_id, ingredient_id)
      )`,
      
      // Recipe ratings
      `CREATE TABLE IF NOT EXISTS recipe_ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipe_id INT NOT NULL,
        user_id INT NOT NULL,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        review TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_recipe_rating (user_id, recipe_id)
      )`,
      
      // Recipe collections/cookbooks
      `CREATE TABLE IF NOT EXISTS collections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      // Collection recipes junction
      `CREATE TABLE IF NOT EXISTS collection_recipes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        collection_id INT NOT NULL,
        recipe_id INT NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
        UNIQUE KEY unique_collection_recipe (collection_id, recipe_id)
      )`
    ];

    for (const query of queries) {
      await this.query(query);
    }
    
    console.log('MySQL schema initialized successfully');
  }

  // User methods
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
      WHERE (r.is_public = TRUE OR r.user_id = ?)
    `;
    let params = [filters.userId];

    if (filters.search) {
      query += ` AND MATCH(r.title, r.description, r.ingredients, r.instructions) AGAINST (? IN NATURAL LANGUAGE MODE)`;
      params.push(filters.search);
    }

    if (filters.category) {
      query += ` AND r.category_id = ?`;
      params.push(filters.category);
    }

    if (filters.isPublic !== undefined) {
      query += ` AND r.is_public = ?`;
      params.push(filters.isPublic);
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
      WHERE r.id = ? AND (r.is_public = TRUE OR r.user_id = ?)
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
      recipeData.isPublic || false,
      recipeData.sourceUrl || null
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
        params.push(recipeData[key]);
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
    // This is a simplified version - in production you'd want to handle this more efficiently
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

  // Search methods
  async searchRecipes(query, filters) {
    let sql = `
      SELECT r.*, c.name as category_name, u.email as author_email,
        MATCH(r.title, r.description, r.ingredients, r.instructions) AGAINST (? IN NATURAL LANGUAGE MODE) as relevance
      FROM recipes r 
      LEFT JOIN categories c ON r.category_id = c.id 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE (r.is_public = TRUE OR r.user_id = ?)
        AND MATCH(r.title, r.description, r.ingredients, r.instructions) AGAINST (? IN NATURAL LANGUAGE MODE)
    `;
    
    let params = [query, filters.userId, query];

    if (filters.category) {
      sql += ` AND r.category_id = ?`;
      params.push(filters.category);
    }

    if (filters.difficulty) {
      sql += ` AND r.difficulty = ?`;
      params.push(filters.difficulty);
    }

    sql += ` ORDER BY relevance DESC, r.updated_at DESC LIMIT ? OFFSET ?`;
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
      WHERE (r.is_public = TRUE OR r.user_id = ?)
        AND i.name IN (${placeholders})
      GROUP BY r.id
      ORDER BY matched_ingredients DESC, r.updated_at DESC
    `, [userId, ...ingredients]);
  }
}

module.exports = MySQLAdapter;