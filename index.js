const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuração da conexão com o PostgreSQL (NeonDB)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- ROTAS DA ENTIDADE: PESSOAS ---

// Listar todas as pessoas
app.get('/pessoas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pessoas');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar currículo completo por ID (com relacionamentos)
app.get('/pessoas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pessoa = await pool.query('SELECT * FROM pessoas WHERE id = $1', [id]);
    if (pessoa.rows.length === 0) return res.status(404).json({ error: 'Pessoa não encontrada' });
    
    const expProf = await pool.query('SELECT * FROM experiencias_profissionais WHERE pessoa_id = $1', [id]);
    const expAcad = await pool.query('SELECT * FROM experiencias_academicas WHERE pessoa_id = $1', [id]);
    const projetos = await pool.query('SELECT * FROM projetos WHERE pessoa_id = $1', [id]);
    const habilidades = await pool.query('SELECT * FROM habilidades WHERE pessoa_id = $1', [id]);

    res.json({
      ...pessoa.rows[0],
      experiencias_profissionais: expProf.rows,
      experiencias_academicas: expAcad.rows,
      projetos: projetos.rows,
      habilidades: habilidades.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar nova pessoa
app.post('/pessoas', async (req, res) => {
  try {
    const { nome, cargo, resumo, email, telefone, linkedin, github, localizacao } = req.body;
    const query = `INSERT INTO pessoas (nome, cargo, resumo, email, telefone, linkedin, github, localizacao) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
    const values = [nome, cargo, resumo, email, telefone, linkedin, github, localizacao];
    const newPessoa = await pool.query(query, values);
    res.status(201).json(newPessoa.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar pessoa
app.put('/pessoas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cargo, resumo, email, telefone, linkedin, github, localizacao } = req.body;
    const query = `UPDATE pessoas SET nome = $1, cargo = $2, resumo = $3, email = $4, telefone = $5, 
                   linkedin = $6, github = $7, localizacao = $8 WHERE id = $9 RETURNING *`;
    const values = [nome, cargo, resumo, email, telefone, linkedin, github, localizacao, id];
    const updated = await pool.query(query, values);
    if (updated.rows.length === 0) return res.status(404).json({ error: 'Pessoa não encontrada' });
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar pessoa
app.delete('/pessoas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM pessoas WHERE id = $1', [id]);
    res.json({ message: 'Pessoa deletada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROTAS DE RELACIONAMENTOS (Exemplo: Experiências Profissionais) ---

app.post('/experiencias-profissionais', async (req, res) => {
  try {
    const { pessoa_id, empresa, cargo, periodo, descricao } = req.body;
    const query = `INSERT INTO experiencias_profissionais (pessoa_id, empresa, cargo, periodo, descricao) 
                   VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = app.locals.pool ? await app.locals.pool.query(query, [pessoa_id, empresa, cargo, periodo, descricao]) 
                                  : await pool.query(query, [pessoa_id, empresa, cargo, periodo, descricao]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});