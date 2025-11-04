const { ConnectionPool, Request } = require('tedious');

class MSSQLAdapter {
  constructor(config) {
    this.config = {
      server: config.host,
      database: config.database,
      authentication: {
        type: 'default',
        options: {
          userName: config.user,
          password: config.password
        }
      },
      options: {
        port: config.port || 1433,
        encrypt: process.env.NODE_ENV === 'production',
        trustServerCertificate: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
      }
    };
    this.pool = null;
  }

  async connect() {
    try {
      this.pool = new ConnectionPool(this.config);
      
      return new Promise((resolve, reject) => {
        this.pool.on('connect', async () => {
          console.log('MSSQL connected successfully');
          try {
            await this.initializeSchema();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        
        this.pool.on('error', (err) => {
          console.error('MSSQL connection error:', err);
          reject(err);
        });
        
        this.pool.connect();
      });
    } catch (error) {
      console.error('MSSQL connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  isConnected() {
    return this.pool !== null && this.pool.connected;
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.pool || !this.pool.connected) {
        reject(new Error('Database not connected'));
        return;
      }

      const request = this.pool.request();
      
      // Add parameters
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });

      // Replace ? placeholders with @param0, @param1, etc.
      let paramIndex = 0;
      const processedSql = sql.replace(/\?/g, () => `@param${paramIndex++}`);

      const rows = [];
      let insertId = null;
      let affectedRows = 0;

      request.on('row', (columns) => {
        const row = {};
        columns.forEach((column) => {
          row[column.metadata.colName] = column.value;
        });
        rows.push(row);
      });

      request.on('returnValue', (parameterName, value, metadata) => {
        if (parameterName === 'insertId') {
          insertId = value;
        }
      });

      request.on('done', (rowCount, more) => {
        affectedRows = rowCount;
      });

      request.on('requestCompleted', () => {
        resolve({
          rows,
          insertId,
          affectedRows,
          length: affectedRows // For compatibility
        });
      });

      request.on('error', (err) => {
        console.error('MSSQL query error:', err);
        reject(err);
      });

      request.query(processedSql);
    });
  }

  async initializeSchema() {
    const queries = [
      // Roles table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='roles' AND xtype='U')
       CREATE TABLE roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(32) UNIQUE NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
       )`,
      
      // Insert default roles
      `IF NOT EXISTS (SELECT * FROM roles WHERE name = 'admin')
       INSERT INTO roles (name) VALUES ('admin'), ('user'), ('viewer')`,
      
      // Users table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
       CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(255) UNIQUE NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        role_id INT NOT NULL DEFAULT 2,
        mfa_enabled BIT DEFAULT 0,
        mfa_secret NVARCHAR(32),
        theme_preferences NVARCHAR(MAX),
        view_preferences NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (role_id) REFERENCES roles(id)
       )`,
      
      // Categories table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='categories' AND xtype='U')
       CREATE TABLE categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(MAX),
        color NVARCHAR(7),
        icon NVARCHAR(50),
        created_at DATETIME2 DEFAULT GETDATE()
       )`,
      
      // Insert default categories
      `IF NOT EXISTS (SELECT * FROM categories WHERE name = 'Breakfast')
       INSERT INTO categories (name, description, color, icon) VALUES 
        ('Breakfast', 'Morning meals', '#FF6B6B', 'sunrise'),
        ('Lunch', 'Midday meals', '#4ECDC4', 'sun'),
        ('Dinner', 'Evening meals', '#45B7D1', 'moon'),
        ('Dessert', 'Sweet treats', '#96CEB4', 'cake'),
        ('Snack', 'Light bites', '#FFEAA7', 'cookie'),
        ('Beverage', 'Drinks and cocktails', '#DDA0DD', 'glass')`,
      
      // Recipes table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='recipes' AND xtype='U')
       CREATE TABLE recipes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        ingredients NVARCHAR(MAX),
        instructions NVARCHAR(MAX),
        category_id INT,
        cooking_time INT,
        prep_time INT,
        servings INT,
        difficulty NVARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
        nutrition_info NVARCHAR(MAX),
        image_path NVARCHAR(500),
        is_public BIT DEFAULT 0,
        source_url NVARCHAR(1000),
        rating DECIMAL(3,2),
        view_count INT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id)
       )`,
      
      // Create full-text catalog and index (simplified for this example)
      `IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'recipe_catalog')
       CREATE FULLTEXT CATALOG recipe_catalog`,
       
      // Ingredients table
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ingredients' AND xtype='U')
       CREATE TABLE ingredients (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        category NVARCHAR(100),
        unit NVARCHAR(50),
        created_at DATETIME2 DEFAULT GETDATE()
       )`
    ];

    for (const query of queries) {
      try {
        await this.query(query);
      } catch (error) {
        // Some queries might fail if objects already exist, which is OK
        if (!error.message.includes('already exists')) {
          console.warn('Schema initialization warning:', error.message);
        }
      }
    }
    
    console.log('MSSQL schema initialized successfully');
  }

  // User methods (simplified - would need full implementation like other adapters)
  async getUserById(id) {
    const result = await this.query(
      'SELECT id, email, role_id, mfa_enabled, theme_preferences, view_preferences, created_at FROM users WHERE id = ?',
      [id]
    );
    return result.rows[0] || null;
  }

  async getUserByEmail(email) {
    const result = await this.query(
      'SELECT id, email, password_hash, role_id, mfa_enabled, mfa_secret FROM users WHERE email = ?',
      [email]
    );
    return result.rows[0] || null;
  }

  async createUser(email, passwordHash, roleId = 2) {
    const result = await this.query(
      'INSERT INTO users (email, password_hash, role_id) OUTPUT INSERTED.id VALUES (?, ?, ?)',
      [email, passwordHash, roleId]
    );
    return result.rows[0]?.id;
  }

  async updateUserRole(userId, roleId) {
    const result = await this.query(
      'UPDATE users SET role_id = ? WHERE id = ?',
      [roleId, userId]
    );
    return result.affectedRows > 0;
  }

  async getUsers() {
    const result = await this.query(`
      SELECT u.id, u.email, u.created_at, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      ORDER BY u.created_at DESC
    `);
    return result.rows;
  }

  async getUserRole(userId) {
    const result = await this.query(
      'SELECT r.id, r.name FROM roles r JOIN users u ON r.id = u.role_id WHERE u.id = ?',
      [userId]
    );
    return result.rows[0] || null;
  }

  // Recipe methods (simplified - would need full implementation)
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
      query += ` AND (r.title LIKE ? OR r.ingredients LIKE ? OR r.instructions LIKE ?)`;
      const searchParam = `%${filters.search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (filters.category) {
      query += ` AND r.category_id = ?`;
      params.push(filters.category);
    }

    query += ` ORDER BY r.updated_at DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`;
    params.push(filters.offset, filters.limit);

    const result = await this.query(query, params);
    return result.rows;
  }

  async getRecipeById(id, userId) {
    const result = await this.query(`
      SELECT r.*, c.name as category_name, u.email as author_email 
      FROM recipes r 
      LEFT JOIN categories c ON r.category_id = c.id 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE r.id = ? AND (r.is_public = 1 OR r.user_id = ?)
    `, [id, userId]);

    if (result.rows.length === 0) return null;

    // Update view count
    await this.query('UPDATE recipes SET view_count = view_count + 1 WHERE id = ?', [id]);

    return result.rows[0];
  }

  // Placeholder implementations for remaining methods
  async createRecipe(recipeData) { 
    // Implementation would follow MSSQL patterns
    throw new Error('Method not implemented for MSSQL adapter'); 
  }
  
  async updateRecipe(id, userId, recipeData) { 
    throw new Error('Method not implemented for MSSQL adapter'); 
  }
  
  async deleteRecipe(id, userId) { 
    throw new Error('Method not implemented for MSSQL adapter'); 
  }
  
  async getCategories() { 
    const result = await this.query('SELECT * FROM categories ORDER BY name');
    return result.rows;
  }
  
  async createCategory(categoryData) { 
    throw new Error('Method not implemented for MSSQL adapter'); 
  }
  
  async getIngredients() { 
    const result = await this.query('SELECT * FROM ingredients ORDER BY name');
    return result.rows;
  }
  
  async createIngredient(ingredientData) { 
    throw new Error('Method not implemented for MSSQL adapter'); 
  }
  
  async getUserIngredients(userId) { 
    throw new Error('Method not implemented for MSSQL adapter'); 
  }
  
  async updateUserIngredients(userId, ingredients) { 
    throw new Error('Method not implemented for MSSQL adapter'); 
  }
  
  async searchRecipes(query, filters) { 
    throw new Error('Method not implemented for MSSQL adapter'); 
  }
  
  async getRecipesByIngredients(ingredients, userId) { 
    throw new Error('Method not implemented for MSSQL adapter'); 
  }
}

module.exports = MSSQLAdapter;