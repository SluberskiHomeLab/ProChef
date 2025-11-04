# 🍳 ProChef - Advanced Recipe Manager

ProChef is a modern, full-featured recipe management system built with React and Node.js. It combines the best features of existing recipe managers with powerful new capabilities like multi-database support, recipe importing, and advanced search.

## ✨ Features

### ✅ Currently Implemented
- **🔐 User Authentication** - Secure login/registration with JWT
- **👥 Role-Based Access Control** - Admin, User, and Viewer roles with permissions
- **🗃️ Multi-Database Support** - MySQL, PostgreSQL, SQLite, and MSSQL
- **📁 Recipe Categories** - Organize recipes with colorful, icon-based categories
- **📖 Recipe Import** - Extract recipes from popular cooking websites
- **🔍 Advanced Search** - Full-text search with filters for difficulty, time, and category
- **📱 Multiple View Modes** - Grid and list views with responsive design
- **🖼️ Image Upload** - Add photos to your recipes with drag-and-drop
- **🌐 Public/Private Recipes** - Share recipes publicly or keep them private
- **⚡ Fast Performance** - Optimized database queries and responsive UI

### 🚧 Coming Soon
- **🥗 Ingredient Tracking** - Manage your pantry and get recipe suggestions
- **📚 Public Cookbooks** - Collaborative recipe collections
- **🎨 Theme Customization** - Dark mode and custom color schemes  
- **🔒 Multi-Factor Authentication** - Enhanced security with TOTP
- **⚡ Performance Optimization** - Caching, pagination, and lazy loading

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ProChef
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:4000

### Manual Setup

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database configuration
npm start
```

#### Frontend Setup
```bash
cd ../
npm install
npm start
```

## 🗄️ Database Configuration

ProChef supports multiple database systems. Configure via environment variables:

### MySQL/MariaDB (Default)
```env
DATABASE_TYPE=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=cookbook
```

### PostgreSQL
```env
DATABASE_TYPE=postgresql
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=cookbook
```

### SQLite
```env
DATABASE_TYPE=sqlite
DATABASE_FILE=./cookbook.db
```

### Microsoft SQL Server
```env
DATABASE_TYPE=mssql
DATABASE_HOST=localhost
DATABASE_PORT=1433
DATABASE_USER=sa
DATABASE_PASSWORD=your_password
DATABASE_NAME=cookbook
```

## 📖 Recipe Import

Import recipes from popular cooking websites by pasting the URL:

- **AllRecipes** - allrecipes.com
- **Food Network** - foodnetwork.com  
- **Epicurious** - epicurious.com
- **Bon Appétit** - bonappetit.com
- **Serious Eats** - seriouseats.com
- **And many more!**

The system automatically extracts:
- Recipe title and description
- Ingredients and instructions
- Cooking time, prep time, and servings
- Recipe images
- Difficulty level

## 🏗️ Architecture

```
ProChef/
├── backend/                 # Node.js API server
│   ├── database/           # Database abstraction layer
│   │   └── adapters/       # Database-specific implementations
│   ├── services/           # Business logic services
│   └── server.js          # Express server
├── src/                    # React frontend
│   └── components/         # UI components
├── docker/                 # Database initialization
└── docker-compose.yml     # Multi-container setup
```

## 🎨 UI Features

- **Modern Design** - Clean, responsive interface with smooth animations
- **Category System** - Visual categories with custom colors and icons
- **Advanced Search** - Filter by ingredients, cooking time, difficulty
- **Multiple Views** - Switch between grid and list layouts
- **Recipe Cards** - Rich recipe display with images and metadata
- **Drag & Drop** - Easy image uploading for recipes

## 🔧 API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User login

### Recipes  
- `GET /recipes` - List recipes with search and filters
- `POST /recipes` - Create new recipe
- `PUT /recipes/:id` - Update recipe
- `DELETE /recipes/:id` - Delete recipe
- `POST /recipes/import` - Import recipe from URL

### Categories
- `GET /categories` - List all categories
- `POST /categories` - Create category (admin only)

### Admin
- `GET /users` - List users (admin only)
- `PUT /users/:id/role` - Update user role (admin only)

## 🤝 Contributing

ProChef is open source and contributions are welcome! Areas where help is needed:

- **Frontend Development** - React components and UI improvements
- **Backend Features** - API endpoints and business logic
- **Database Support** - Additional database adapters
- **Recipe Import** - Support for more cooking websites
- **Testing** - Unit tests and integration tests
- **Documentation** - Setup guides and API documentation

## 📄 License

ProChef is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

ProChef was inspired by existing recipe management tools like Mealie, Tandoor, and Recipya. Thanks to the creators of those projects for showing what's possible in recipe management software.

---

**Made with ❤️ for home cooks and food enthusiasts everywhere!**  