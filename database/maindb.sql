USE defaultdb;

SHOW TABLES;

CREATE TABLE IF NOT EXISTS users (
  id            INT           NOT NULL AUTO_INCREMENT,
  username      VARCHAR(255)  NOT NULL,
  password      VARCHAR(255)  NOT NULL,       
  role          VARCHAR(50)   NOT NULL DEFAULT 'user',
  refresh_token VARCHAR(255)  DEFAULT NULL,
  created_at    TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id          INT           NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)  NOT NULL,
  description TEXT          DEFAULT NULL,
  created_at  TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id          INT             NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255)    NOT NULL,
  price       DECIMAL(10, 2)  NOT NULL,
  category_id INT             DEFAULT NULL,
  created_at  TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_products_category (category_id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES categories (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id         INT        NOT NULL AUTO_INCREMENT,
  user_id    INT        NOT NULL,
  product_id INT        NOT NULL,
  quantity   INT        NOT NULL,
  created_at TIMESTAMP  NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_orders_user (user_id),
  KEY fk_orders_product (product_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_orders_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;

SET @add_column := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE products ADD COLUMN category_id INT DEFAULT NULL',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'products'
    AND COLUMN_NAME  = 'category_id'
);
PREPARE stmt FROM @add_column; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @add_fk := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE products ADD CONSTRAINT fk_products_category
       FOREIGN KEY (category_id) REFERENCES categories (id)
       ON DELETE SET NULL ON UPDATE CASCADE',
    'DO 0'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA     = DATABASE()
    AND TABLE_NAME       = 'products'
    AND CONSTRAINT_NAME  = 'fk_products_category'
);
PREPARE stmt FROM @add_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;



-- DATA 
INSERT IGNORE INTO categories (name, description) VALUES
  ('Electronics', 'Gadgets, computers and accessories'),
  ('Groceries',   'Food and household consumables'),
  ('Stationery',  'School and office supplies');

INSERT INTO products (name, price, category_id)
SELECT 'Wireless Mouse', 549.00, c.id FROM categories c WHERE c.name = 'Electronics'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.name = 'Wireless Mouse');

INSERT INTO products (name, price, category_id)
SELECT 'Mechanical Keyboard', 2450.50, c.id FROM categories c WHERE c.name = 'Electronics'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.name = 'Mechanical Keyboard');

INSERT INTO products (name, price, category_id)
SELECT 'Brown Rice 5kg', 380.75, c.id FROM categories c WHERE c.name = 'Groceries'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.name = 'Brown Rice 5kg');

INSERT INTO products (name, price, category_id)
SELECT 'Notebook (80 leaves)', 45.00, c.id FROM categories c WHERE c.name = 'Stationery'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.name = 'Notebook (80 leaves)');


INSERT INTO orders (user_id, product_id, quantity)
SELECT (SELECT MIN(id) FROM users), p.id, 2
FROM products p
WHERE p.name = 'Wireless Mouse'
  AND EXISTS (SELECT 1 FROM users)
  AND NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.product_id = p.id AND o.user_id = (SELECT MIN(id) FROM users)
  );

INSERT INTO orders (user_id, product_id, quantity)
SELECT (SELECT MIN(id) FROM users), p.id, 1
FROM products p
WHERE p.name = 'Brown Rice 5kg'
  AND EXISTS (SELECT 1 FROM users)
  AND NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.product_id = p.id AND o.user_id = (SELECT MIN(id) FROM users)
  );
