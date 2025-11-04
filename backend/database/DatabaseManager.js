const MySQL = require('./adapters/MySQLAdapter');
const PostgreSQL = require('./adapters/PostgreSQLAdapter');
const SQLite = require('./adapters/SQLiteAdapter');
const MSSQL = require('./adapters/MSSQLAdapter');

class DatabaseManager {
  constructor() {
    this.adapter = null;
    this.dbType = process.env.DATABASE_TYPE || 'mysql';
    this.initializeAdapter();
  }

  initializeAdapter() {
    const config = {
      host: process.env.DATABASE_HOST || 'localhost',
      port: process.env.DATABASE_PORT,
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || 'mysecretpassword',
      database: process.env.DATABASE_NAME || 'cookbook',
      filename: process.env.DATABASE_FILE || './cookbook.db' // For SQLite
    };

    switch (this.dbType.toLowerCase()) {
      case 'mysql':
      case 'mariadb':
        this.adapter = new MySQL(config);
        break;
      case 'postgresql':
      case 'postgres':
        this.adapter = new PostgreSQL(config);
        break;
      case 'sqlite':
        this.adapter = new SQLite(config);
        break;
      case 'mssql':
      case 'sqlserver':
        this.adapter = new MSSQL(config);
        break;
      default:
        throw new Error(`Unsupported database type: ${this.dbType}`);
    }
  }

  async connect() {
    return await this.adapter.connect();
  }

  async disconnect() {
    return await this.adapter.disconnect();
  }

  isConnected() {
    return this.adapter.isConnected();
  }

  // User methods
  async getUserById(id) {
    return await this.adapter.getUserById(id);
  }

  async getUserByEmail(email) {
    return await this.adapter.getUserByEmail(email);
  }

  async createUser(email, passwordHash, roleId = 2) {
    return await this.adapter.createUser(email, passwordHash, roleId);
  }

  async updateUserRole(userId, roleId) {
    return await this.adapter.updateUserRole(userId, roleId);
  }

  async getUsers() {
    return await this.adapter.getUsers();
  }

  async getUserRole(userId) {
    return await this.adapter.getUserRole(userId);
  }

  // Recipe methods
  async getRecipes(filters) {
    return await this.adapter.getRecipes(filters);
  }

  async getRecipeById(id, userId) {
    return await this.adapter.getRecipeById(id, userId);
  }

  async createRecipe(recipeData) {
    return await this.adapter.createRecipe(recipeData);
  }

  async updateRecipe(id, userId, recipeData) {
    return await this.adapter.updateRecipe(id, userId, recipeData);
  }

  async deleteRecipe(id, userId) {
    return await this.adapter.deleteRecipe(id, userId);
  }

  // Category methods
  async getCategories() {
    return await this.adapter.getCategories();
  }

  async createCategory(categoryData) {
    return await this.adapter.createCategory(categoryData);
  }

  // Ingredient methods
  async getIngredients() {
    return await this.adapter.getIngredients();
  }

  async createIngredient(ingredientData) {
    return await this.adapter.createIngredient(ingredientData);
  }

  async getUserIngredients(userId) {
    return await this.adapter.getUserIngredients(userId);
  }

  async updateUserIngredients(userId, ingredients) {
    return await this.adapter.updateUserIngredients(userId, ingredients);
  }

  // Search methods
  async searchRecipes(query, filters) {
    return await this.adapter.searchRecipes(query, filters);
  }

  async getRecipesByIngredients(ingredients, userId) {
    return await this.adapter.getRecipesByIngredients(ingredients, userId);
  }

  // Initialize database schema
  async initializeSchema() {
    return await this.adapter.initializeSchema();
  }
}

module.exports = DatabaseManager;