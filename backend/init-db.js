const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'mysql' // Conecta ao mysql primeiro para garantir que a DB existe
});

const sql = `
CREATE DATABASE IF NOT EXISTS web_03mc;
USE web_03mc;
CREATE TABLE IF NOT EXISTS produtos_natal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),
    preco DECIMAL(10, 2) NOT NULL,
    descricao TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

db.connect((err) => {
    if (err) throw err;
    console.log('Conectado para inicialização.');

    // Executa múltiplos statements (precisa de multipleStatements: true se usar o arquivo SQL)
    // Para simplificar, vamos rodar um por um ou habilitar multipleStatements
    db.end(); // Fecha essa conexão

    const dbFinal = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: 'web_03mc',
        multipleStatements: true
    });

    dbFinal.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao criar tabela:', err);
        } else {
            console.log('Banco de dados e tabela preparados com sucesso!');
        }
        dbFinal.end();
    });
});
