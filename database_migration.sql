-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(32) UNIQUE NOT NULL
);

-- Populate roles
INSERT IGNORE INTO roles (name) VALUES ('admin'), ('user'), ('viewer');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL DEFAULT 2,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  ingredients TEXT,
  instructions TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- If you already have a users table and want to migrate:
-- 1. Add the role_id column (defaulting to 'user')
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INT NOT NULL DEFAULT 2;
-- 2. Create the FK if not present
ALTER TABLE users
  ADD CONSTRAINT IF NOT EXISTS fk_role FOREIGN KEY (role_id) REFERENCES roles(id);
-- 3. Set all existing users to user role (role_id = 2)
UPDATE users SET role_id = 2 WHERE role_id IS NULL;

-- (Optional) If you want a permissions table for finer-grained access (not strictly necessary for just admin/user/viewer):
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) UNIQUE NOT NULL
);

-- Example permissions:
INSERT IGNORE INTO permissions (name) VALUES
  ('manage_users'),
  ('manage_recipes'),
  ('view_recipes');

-- Map roles to permissions (Many-to-Many)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Example role-permission assignments (optional, illustrate for RBAC):
-- Admin gets all
INSERT IGNORE INTO role_permissions (role_id, permission_id)
  SELECT roles.id, permissions.id
  FROM roles, permissions
  WHERE roles.name = 'admin';

-- User can manage and view recipes
INSERT IGNORE INTO role_permissions (role_id, permission_id)
  SELECT roles.id, permissions.id
  FROM roles, permissions
  WHERE roles.name = 'user' AND permissions.name IN ('manage_recipes', 'view_recipes');

-- Viewer can only view recipes
INSERT IGNORE INTO role_permissions (role_id, permission_id)
  SELECT roles.id, permissions.id
  FROM roles, permissions
  WHERE roles.name = 'viewer' AND permissions.name = 'view_recipes';