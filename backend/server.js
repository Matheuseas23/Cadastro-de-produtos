const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do banco de dados (usando Pool para maior estabilidade)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alunos_filmes03MB',
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
const PRODUCTS_FILE = path.join(__dirname, 'produtos_backup.json');
const FILMS_TABLE = 'filmes_MatheusGarciaDanielLandim';

function validarFilme(body) {
    const { title, genre, duration, age_rating } = body;
    const duracao = Number(duration);

    if (!title || !genre || !age_rating || !Number.isInteger(duracao) || duracao <= 0) {
        return 'Informe title, genre, duration (inteiro positivo) e age_rating.';
    }

    return null;
}

// Função para salvar em JSON (fallback se DB falhar)
function saveToJSON(product) {
    const id = Date.now();
    try {
        let products = [];
        if (fs.existsSync(PRODUCTS_FILE)) {
            const fileContent = fs.readFileSync(PRODUCTS_FILE, 'utf8');
            try {
                products = JSON.parse(fileContent);
                if (!Array.isArray(products)) products = [];
            } catch (parseError) {
                console.error('Erro ao processar JSON existente, resetando backup:', parseError.message);
                products = [];
            }
        }
        const newProduct = { id, ...product };
        products.push(newProduct);
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
        console.log('✅ Item salvo no backup JSON:', newProduct.nome);
    } catch (e) {
        console.error('❌ Erro crítico ao salvar no backup JSON:', e);
    }
    return id;
}

// Função para ler do JSON (fallback se DB falhar)
function readFromJSON() {
    try {
        if (fs.existsSync(PRODUCTS_FILE)) {
            const fileContent = fs.readFileSync(PRODUCTS_FILE, 'utf8');
            const data = JSON.parse(fileContent);
            return Array.isArray(data) ? data : [];
        }
    } catch (e) {
        console.error('❌ Erro ao ler backup JSON:', e);
    }
    return [];
}

// CRUD de filmes
app.get('/filmes', (req, res) => {
    const query = `SELECT * FROM ${FILMS_TABLE} ORDER BY id`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao listar filmes:', err.message);
            return res.status(500).json({ message: 'Não foi possível listar os filmes.' });
        }
        res.json(results);
    });
});

app.get('/filmes/:id', (req, res) => {
    const query = `SELECT * FROM ${FILMS_TABLE} WHERE id = ?`;
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Erro ao buscar filme:', err.message);
            return res.status(500).json({ message: 'Não foi possível buscar o filme.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Filme não encontrado.' });
        }
        res.json(results[0]);
    });
});

app.post('/filmes', (req, res) => {
    const erro = validarFilme(req.body);
    if (erro) return res.status(400).json({ message: erro });

    const { title, genre, duration, age_rating } = req.body;
    const anoLancamento = Number(req.body.release_year || 2026);
    if (anoLancamento !== 2026) {
        return res.status(400).json({ message: 'O filme deve ter ano_lancamento igual a 2026.' });
    }

    const query = `INSERT INTO ${FILMS_TABLE} (title, genre, duration, age_rating, release_year) VALUES (?, ?, ?, ?, ?)`;
    db.query(query, [title, genre, Number(duration), age_rating, anoLancamento], (err, result) => {
        if (err) {
            console.error('Erro ao cadastrar filme:', err.message);
            return res.status(500).json({ message: 'Não foi possível cadastrar o filme.' });
        }
        res.status(201).json({ message: 'Filme cadastrado com sucesso.', id: result.insertId });
    });
});

app.put('/filmes/:id', (req, res) => {
    const erro = validarFilme(req.body);
    if (erro) return res.status(400).json({ message: erro });

    const anoLancamento = Number(req.body.release_year || 2026);
    if (anoLancamento !== 2026) {
        return res.status(400).json({ message: 'O filme deve ter ano_lancamento igual a 2026.' });
    }

    const { title, genre, duration, age_rating } = req.body;
    const query = `UPDATE ${FILMS_TABLE} SET title = ?, genre = ?, duration = ?, age_rating = ?, release_year = ? WHERE id = ?`;
    db.query(query, [title, genre, Number(duration), age_rating, anoLancamento, req.params.id], (err, result) => {
        if (err) {
            console.error('Erro ao editar filme:', err.message);
            return res.status(500).json({ message: 'Não foi possível editar o filme.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Filme não encontrado.' });
        }
        res.json({ message: 'Filme editado com sucesso.', id: req.params.id });
    });
});

app.delete('/filmes/:id', (req, res) => {
    const query = `DELETE FROM ${FILMS_TABLE} WHERE id = ?`;
    db.query(query, [req.params.id], (err, result) => {
        if (err) {
            console.error('Erro ao apagar filme:', err.message);
            return res.status(500).json({ message: 'Não foi possível apagar o filme.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Filme não encontrado.' });
        }
        res.json({ message: 'Filme apagado com sucesso.', id: req.params.id });
    });
});

// 1. Mostrar produtos (Listar)
app.get('/produtos', (req, res) => {
    console.log('🔍 Solicitando lista de produtos...');
    const query = 'SELECT * FROM produtos_natal';
    db.query(query, (err, results) => {
        if (err) {
            console.error('⚠️ Falha no MySQL ao listar, usando backup JSON:', err.message);
            const backupData = readFromJSON();
            return res.json(backupData);
        }
        console.log(`✅ ${results.length} produtos encontrados no MySQL.`);
        res.json(results);
    });
});

// 1.1 Obter um único produto
app.get('/produtos/:id', (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Buscando dados do produto ID: ${id}`);
    const query = 'SELECT * FROM produtos_natal WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err || !results || results.length === 0) {
            console.log('⚠️ MySQL falhou ou não encontrou, tentando backup JSON...');
            const products = readFromJSON();
            const product = products.find(p => p.id.toString() === id.toString());
            if (product) {
                console.log('✅ Produto encontrado no backup JSON');
                return res.json(product);
            }
            console.log('❌ Produto não encontrado em nenhum lugar');
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        console.log('✅ Produto encontrado no MySQL');
        res.json(results[0]);
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
            console.error('⚠️ Falha no MySQL ao cadastrar, usando ID do backup:', err.message);
            return res.status(201).json({
                message: 'Item salvo (Modo Backup)!',
                id: backupId,
                warning: 'MySQL Offline'
            });
        }
        console.log('✅ Produto cadastrado no MySQL com ID:', result.insertId);
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

// 4. Editar produto
app.put('/produtos/:id', (req, res) => {
    const { id } = req.params;
    const { nome, categoria, preco, descricao } = req.body;

    // Atualiza no JSON
    try {
        if (fs.existsSync(PRODUCTS_FILE)) {
            let products = JSON.parse(fs.readFileSync(PRODUCTS_FILE));
            const index = products.findIndex(p => p.id.toString() === id.toString());
            if (index !== -1) {
                products[index] = { ...products[index], nome, categoria, preco, descricao };
                fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
            }
        }
    } catch (e) {
        console.error('Erro ao atualizar JSON:', e);
    }

    // Atualiza no MySQL
    const query = 'UPDATE produtos_natal SET nome = ?, categoria = ?, preco = ?, descricao = ? WHERE id = ?';
    db.query(query, [nome, categoria, preco, descricao, id], (err, result) => {
        if (err) {
            console.error('Erro MySQL ao atualizar:', err.message);
            return res.json({ message: 'Produto atualizado (Modo Offline/Backup)!', id });
        }
        res.json({ message: 'Produto atualizado com sucesso!', id });
    });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}

module.exports = app;
