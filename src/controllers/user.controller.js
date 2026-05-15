const userService = require("../services/user.service");

exports.list = async (req, res) => {
  try {
    const data = await userService.list(req.query);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.summary = async (req, res) => {
  try {
    const data = await userService.getSummary();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const data = await userService.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const data = await userService.update(req.params.id, req.body, req.user.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const data = await userService.changePassword(req.user.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const data = await userService.resetPassword(req.params.id, req.body.password);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
