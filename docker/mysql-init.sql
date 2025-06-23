CREATE DATABASE IF NOT EXISTS cookbook;
USE cookbook;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(32) UNIQUE NOT NULL
);
INSERT IGNORE INTO roles (name) VALUES ('admin'), ('user'), ('viewer');

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL DEFAULT 2,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  ingredients TEXT,
  instructions TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) UNIQUE NOT NULL
);
INSERT IGNORE INTO permissions (name) VALUES
  ('manage_users'),
  ('manage_recipes'),
  ('view_recipes');

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

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