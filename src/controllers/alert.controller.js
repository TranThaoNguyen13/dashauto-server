const alertService = require("../services/alert.service");

exports.list = async (req, res) => {
  try {
    const data = await alertService.list(req.query);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const data = await alertService.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.resolve = async (req, res) => {
  try {
    const data = await alertService.resolve(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};