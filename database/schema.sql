-- Potter's Duel — create a fresh database from scratch (as if it never existed).
-- WARNING: DROP DATABASE removes the entire database named below (all tables + data).
--
-- Option A — from project root (uses .env: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME):
--   npm run db:init
--
-- Option B — MySQL CLI:
--   mysql -u root -p < database/schema.sql

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

DROP DATABASE IF EXISTS potters_duel;

CREATE DATABASE potters_duel
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE potters_duel;

-- Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255) DEFAULT 'https://via.placeholder.com/150',
  house ENUM('gryffindor', 'slytherin', 'hufflepuff', 'ravenclaw') DEFAULT 'gryffindor',
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  points INT DEFAULT 0,
  reset_token VARCHAR(255),
  reset_token_expires DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cards (characters: good / evil)
CREATE TABLE cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  alias VARCHAR(100) NULL,
  power INT NOT NULL,
  attack INT NOT NULL DEFAULT 0,
  defense INT NOT NULL DEFAULT 0,
  cost INT NOT NULL DEFAULT 0,
  side ENUM('good', 'evil', 'neutral') NOT NULL,
  description TEXT,
  image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cooldowns (cards used recently)
CREATE TABLE cooldowns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  card_id INT NOT NULL,
  game_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Matches
CREATE TABLE matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_mode ENUM('1v1', '2v2') NOT NULL,
  player1_id INT NOT NULL,
  player2_id INT NOT NULL,
  player3_id INT,
  player4_id INT,
  winner_id INT,
  player1_final_hp INT,
  player2_final_hp INT,
  status ENUM('active', 'completed', 'abandoned') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (player3_id) REFERENCES users(id),
  FOREIGN KEY (player4_id) REFERENCES users(id),
  FOREIGN KEY (winner_id) REFERENCES users(id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Game rounds
CREATE TABLE game_rounds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  round_number INT NOT NULL,
  player_id INT NOT NULL,
  card_id INT NOT NULL,
  power INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  INDEX idx_match_id (match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Character cards: 10 good, 10 evil (Dumbledore & Voldemort — highest power).
INSERT INTO cards (name, power, attack, defense, cost, side, description, image_url) VALUES
('Albus Dumbledore', 10, 9, 9, 10, 'good', 'Headmaster; greatest living wizard.', '/assets/img-cards/Albus Dumbledore.jpg'),
('Harry Potter', 9, 8, 7, 8, 'good', 'The Boy Who Lived; strong in defence and nerve.', '/assets/img-cards/harry potter.jpg'),
('Hermione Granger', 8, 7, 8, 7, 'good', 'Brightest witch of her age.', '/assets/img-cards/hermione granger.jpg'),
('Minerva McGonagall', 8, 6, 9, 7, 'good', 'Transfiguration mistress; strict and formidable.', '/assets/img-cards/Minerva McGonagall.jpg'),
('Sirius Black', 8, 8, 6, 6, 'good', 'Animagus and loyal Order member.', '/assets/img-cards/Sirius Black.jpg'),
('Severus Snape', 7, 7, 7, 6, 'good', 'Master of occlumency and potions.', '/assets/img-cards/Severus Snape.jpg'),
('Remus Lupin', 7, 6, 7, 5, 'good', 'Defence Against the Dark Arts; werewolf.', '/assets/img-cards/Remus Lupin.jpg'),
('Alastor Moody', 7, 8, 5, 6, 'good', 'Auror; constant vigilance.', '/assets/img-cards/Alastor Moody.jpg'),
('Molly Weasley', 6, 5, 7, 4, 'good', 'Matriarch; fierce protector of her family.', '/assets/img-cards/Molly Weasley.jpg'),
('Kingsley Shacklebolt', 6, 6, 6, 5, 'good', 'Senior Auror; calm under pressure.', '/assets/img-cards/Kingsley Shacklebolt.jpg'),
('Lord Voldemort', 10, 10, 8, 10, 'evil', 'Dark Lord; peak magical power.', '/assets/img-cards/Lord Voldemort.jpg'),
('Bellatrix Lestrange', 9, 9, 6, 8, 'evil', 'Fanatically loyal; deadly duellist.', '/assets/img-cards/Bellatrix Lestrange.jpg'),
('Tom Marvolo Riddle', 9, 8, 7, 8, 'evil', 'Young Voldemort; brilliant and ruthless.', '/assets/img-cards/Tom Marvolo Riddle.jpg'),
('Lucius Malfoy', 7, 6, 6, 5, 'evil', 'Death Eater; influence and cruelty.', '/assets/img-cards/Lucius Malfoy.jpg'),
('Fenrir Greyback', 7, 8, 5, 5, 'evil', 'Savage werewolf.', '/assets/img-cards/Fenrir Greyback.jpg'),
('Dolores Umbridge', 6, 5, 7, 5, 'evil', 'Ministry enforcer; sadistic control.', '/assets/img-cards/Dolores Umbridge.jpg'),
('Barty Crouch Jr', 7, 7, 5, 6, 'evil', 'Impersonator; unforgivable curses.', '/assets/img-cards/Barty Crouch Jr.jpg'),
('Antonin Dolohov', 7, 7, 6, 5, 'evil', 'Death Eater; brutal duellist.', '/assets/img-cards/Antonin Dolohov.jpg'),
('Peter Pettigrew', 4, 3, 4, 3, 'evil', 'Cowardly betrayer.', '/assets/img-cards/Peter Pettigrew.jpg'),
('Narcissa Malfoy', 6, 5, 6, 4, 'evil', 'Protects her family above all.', '/assets/img-cards/Narcissa Malfoy.jpg');
