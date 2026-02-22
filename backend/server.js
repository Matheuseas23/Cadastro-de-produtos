const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do banco de dados (usando Pool para maior estabilidade)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'web_03mc',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// O Pool não precisa de .connect() manual para começar a funcionar.
// Vamos apenas verificar se ele consegue obter uma conexão inicial.
db.getConnection((err, connection) => {
    if (err) {
        console.error('ERRO DE CONEXÃO:', err.code, err.message);
        console.error('Verifique o serviço MySQL e a senha no arquivo .env');
    } else {
        console.log('Pool de conexões estabelecido com sucesso!');
        connection.release();
    }
});

// Rotas da API

const fs = require('fs');
const path = require('path');
const PRODUCTS_FILE = path.join(__dirname, 'produtos_backup.json');

// Função para salvar em JSON (fallback se DB falhar)
function saveToJSON(product) {
    const id = Date.now();
    try {
        let products = [];
        if (fs.existsSync(PRODUCTS_FILE)) {
            products = JSON.parse(fs.readFileSync(PRODUCTS_FILE));
        }
        const newProduct = { id, ...product };
        products.push(newProduct);
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    } catch (e) {
        console.error('Erro ao salvar no backup JSON:', e);
    }
    return id;
}

// Função para ler do JSON (fallback se DB falhar)
function readFromJSON() {
    try {
        if (fs.existsSync(PRODUCTS_FILE)) {
            return JSON.parse(fs.readFileSync(PRODUCTS_FILE));
        }
    } catch (e) {
        console.error('Erro ao ler backup JSON:', e);
    }
    return [];
}

// 1. Mostrar produtos (Listar)
app.get('/produtos', (req, res) => {
    const query = 'SELECT * FROM produtos_natal';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Falha no MySQL, usando backup JSON:', err.message);
            return res.json(readFromJSON());
        }
        res.json(results);
    });
});

// 2. Cadastrar produto
app.post('/produtos', (req, res) => {
    const { nome, categoria, preco, descricao } = req.body;

    // Salva sempre no JSON como garantia e pega o ID gerado lá
    const backupId = saveToJSON({ nome, categoria, preco, descricao });

    // Tenta no DB
    const query = 'INSERT INTO produtos_natal (nome, categoria, preco, descricao) VALUES (?, ?, ?, ?)';
    db.query(query, [nome, categoria, preco, descricao], (err, result) => {
        if (err) {
            console.error('Falha no MySQL ao cadastrar, usando ID do backup:', err.message);
            return res.status(201).json({ message: 'Item salvo (Modo Offline/Backup)!', id: backupId });
        }
        // Se o DB funcionar, retornamos o ID do DB
        res.status(201).json({ message: 'Produto cadastrado com sucesso!', id: result.insertId });
    });
});

// 3. Apagar produto
app.get('/deletar/:id', (req, res) => { // Usando GET para facilitar se quiser testar via browser, mas mantendo a lógica de remoção
    const { id } = req.params;

    // Remove do JSON sempre
    try {
        if (fs.existsSync(PRODUCTS_FILE)) {
            let products = JSON.parse(fs.readFileSync(PRODUCTS_FILE));
            products = products.filter(p => p.id != id); // Removendo por ID (timestamp ou DB id)
            fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
        }
    } catch (e) {
        console.error('Erro ao remover do JSON:', e);
    }

    const query = 'DELETE FROM produtos_natal WHERE id = ?';
    db.query(query, [id], (err, result) => {
        // Se der erro no DB (offline), o JSON já foi limpo acima
        res.json({ message: 'Produto removido com sucesso!' });
    });
});

// Mantendo a rota DELETE original para compatibilidade com padrões de API
app.delete('/produtos/:id', (req, res) => {
    const { id } = req.params;
    console.log('Tentando excluir produto com ID:', id);

    try {
        if (fs.existsSync(PRODUCTS_FILE)) {
            let products = JSON.parse(fs.readFileSync(PRODUCTS_FILE));
            const initialCount = products.length;
            // Garantindo comparação de string ou número
            products = products.filter(p => p.id.toString() !== id.toString());
            const finalCount = products.length;

            console.log(`JSON: Antes ${initialCount} itens, depois ${finalCount} itens`);
            fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
        }
    } catch (e) {
        console.error('Erro no backup JSON durante exclusão:', e);
    }

    const query = 'DELETE FROM produtos_natal WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) console.error('Erro MySQL durante exclusão:', err.message);
        console.log('Exclusão concluída (MySQL status ignorado se offline)');
        res.json({ message: 'Produto removido com sucesso!', deletedId: id });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
