const { query } = require('../db');

async function getLocales(req, res, next) {
  try {
    if (req.user.role === 'PLATFORM_ADMIN') {
      const locales = await query('SELECT * FROM locales ORDER BY id');
      return res.json(locales);
    }

    if (req.user.role === 'LOCAL_ADMIN') {
      const locales = await query('SELECT * FROM locales WHERE id = ?', [req.user.locale_id]);
      return res.json(locales);
    }

    return res.status(403).json({ message: 'I client non possono visualizzare i locali' });
  } catch (error) {
    return next(error);
  }
}

async function createLocale(req, res, next) {
  try {
    if (req.user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ message: 'Solo gli amministratori piattaforma possono creare locali' });
    }

    const { name, city, address } = req.body;
    if (!name || !city || !address) {
      return res.status(400).json({ message: 'Nome, citta e indirizzo sono obbligatori' });
    }

    const result = await query(
      'INSERT INTO locales (name, city, address) VALUES (?, ?, ?)',
      [name, city, address]
    );

    const created = await query('SELECT * FROM locales WHERE id = ?', [result.insertId]);
    return res.status(201).json(created[0]);
  } catch (error) {
    return next(error);
  }
}

async function updateLocale(req, res, next) {
  try {
    if (req.user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ message: 'Solo gli amministratori piattaforma possono modificare locali' });
    }

    const { name, city, address } = req.body;
    if (!name || !city || !address) {
      return res.status(400).json({ message: 'Nome, citta e indirizzo sono obbligatori' });
    }

    const result = await query(
      'UPDATE locales SET name = ?, city = ?, address = ? WHERE id = ?',
      [name, city, address, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Locale non trovato' });
    }

    const updated = await query('SELECT * FROM locales WHERE id = ?', [req.params.id]);
    return res.json(updated[0]);
  } catch (error) {
    return next(error);
  }
}

async function deleteLocale(req, res, next) {
  try {
    if (req.user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ message: 'Solo gli amministratori piattaforma possono eliminare locali' });
    }

    const result = await query('DELETE FROM locales WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Locale non trovato' });
    }

    return res.json({ message: 'Locale eliminato' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getLocales,
  createLocale,
  updateLocale,
  deleteLocale
};
