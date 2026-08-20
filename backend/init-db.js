const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'benserverplex.ddns.net',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alunos_filmes03MB',
    multipleStatements: true
});

const sql = `
CREATE TABLE IF NOT EXISTS filmes_MatheusGarciaDanielLandim (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    genre VARCHAR(100) NOT NULL,
    duration INT NOT NULL,
    age_rating VARCHAR(10) NOT NULL,
    release_year YEAR NOT NULL DEFAULT 2026,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO filmes_MatheusGarciaDanielLandim (title, genre, duration, age_rating, release_year)
SELECT 'Super Mario Galaxy: O Filme', 'Animacao', 95, 'Livre', 2026 WHERE NOT EXISTS (SELECT 1 FROM filmes_MatheusGarciaDanielLandim WHERE title = 'Super Mario Galaxy: O Filme');
INSERT INTO filmes_MatheusGarciaDanielLandim (title, genre, duration, age_rating, release_year)
SELECT 'Toy Story 5', 'Animacao', 100, 'Livre', 2026 WHERE NOT EXISTS (SELECT 1 FROM filmes_MatheusGarciaDanielLandim WHERE title = 'Toy Story 5');
INSERT INTO filmes_MatheusGarciaDanielLandim (title, genre, duration, age_rating, release_year)
SELECT 'Vingadores: Doomsday', 'Acao', 150, '12 anos', 2026 WHERE NOT EXISTS (SELECT 1 FROM filmes_MatheusGarciaDanielLandim WHERE title = 'Vingadores: Doomsday');
INSERT INTO filmes_MatheusGarciaDanielLandim (title, genre, duration, age_rating, release_year)
SELECT 'Homem-Aranha: Um Novo Dia', 'Acao', 135, '12 anos', 2026 WHERE NOT EXISTS (SELECT 1 FROM filmes_MatheusGarciaDanielLandim WHERE title = 'Homem-Aranha: Um Novo Dia');
INSERT INTO filmes_MatheusGarciaDanielLandim (title, genre, duration, age_rating, release_year)
SELECT 'The Mandalorian e Grogu', 'Ficcao cientifica', 125, '10 anos', 2026 WHERE NOT EXISTS (SELECT 1 FROM filmes_MatheusGarciaDanielLandim WHERE title = 'The Mandalorian e Grogu');
INSERT INTO filmes_MatheusGarciaDanielLandim (title, genre, duration, age_rating, release_year)
SELECT 'Moana: Um Mar de Aventuras', 'Aventura', 110, 'Livre', 2026 WHERE NOT EXISTS (SELECT 1 FROM filmes_MatheusGarciaDanielLandim WHERE title = 'Moana: Um Mar de Aventuras');
INSERT INTO filmes_MatheusGarciaDanielLandim (title, genre, duration, age_rating, release_year)
SELECT 'Supergirl', 'Acao', 125, '12 anos', 2026 WHERE NOT EXISTS (SELECT 1 FROM filmes_MatheusGarciaDanielLandim WHERE title = 'Supergirl');
INSERT INTO filmes_MatheusGarciaDanielLandim (title, genre, duration, age_rating, release_year)
SELECT 'Mestres do Universo', 'Fantasia', 120, '12 anos', 2026 WHERE NOT EXISTS (SELECT 1 FROM filmes_MatheusGarciaDanielLandim WHERE title = 'Mestres do Universo');
INSERT INTO filmes_MatheusGarciaDanielLandim (title, genre, duration, age_rating, release_year)
SELECT 'A Era do Gelo 6', 'Animacao', 95, 'Livre', 2026 WHERE NOT EXISTS (SELECT 1 FROM filmes_MatheusGarciaDanielLandim WHERE title = 'A Era do Gelo 6');
INSERT INTO filmes_MatheusGarciaDanielLandim (title, genre, duration, age_rating, release_year)
SELECT 'Shrek 5', 'Animacao', 100, 'Livre', 2026 WHERE NOT EXISTS (SELECT 1 FROM filmes_MatheusGarciaDanielLandim WHERE title = 'Shrek 5');
INSERT INTO filmes_MatheusGarciaDanielLandim (title, genre, duration, age_rating, release_year)
SELECT 'O Diabo Veste Prada 2', 'Comedia', 118, '12 anos', 2026 WHERE NOT EXISTS (SELECT 1 FROM filmes_MatheusGarciaDanielLandim WHERE title = 'O Diabo Veste Prada 2');
INSERT INTO filmes_MatheusGarciaDanielLandim (title, genre, duration, age_rating, release_year)
SELECT 'Jumanji 3', 'Aventura', 120, '12 anos', 2026 WHERE NOT EXISTS (SELECT 1 FROM filmes_MatheusGarciaDanielLandim WHERE title = 'Jumanji 3');
`;
const primeiroInsert = sql.indexOf('INSERT INTO');
const createTableSql = sql.slice(0, primeiroInsert);
const seedSql = sql.slice(primeiroInsert);

db.connect((err) => {
    if (err) throw err;
    console.log('Conectado para inicialização.');

    db.query(createTableSql, (createErr) => {
        if (createErr) {
            console.error('Erro ao criar tabela:', createErr);
            return db.end();
        }

        db.query('SHOW COLUMNS FROM filmes_MatheusGarciaDanielLandim LIKE \'release_year\'', (columnsErr, columns) => {
            if (columnsErr) {
                console.error('Erro ao verificar a estrutura da tabela:', columnsErr);
                return db.end();
            }

            const adicionarColuna = columns.length === 0
                ? (callback) => db.query('ALTER TABLE filmes_MatheusGarciaDanielLandim ADD COLUMN release_year YEAR NOT NULL DEFAULT 2026', callback)
                : (callback) => callback(null);

            adicionarColuna((alterErr) => {
                if (alterErr) {
                    console.error('Erro ao adicionar release_year:', alterErr);
                    return db.end();
                }

                db.query(seedSql, (seedErr) => {
                    if (seedErr) {
                        console.error('Erro ao inserir filmes:', seedErr);
                    } else {
                        console.log('Tabela de filmes e 12 registros preparados com sucesso!');
                    }
                    db.end();
                });
            });
        });
    });
});
