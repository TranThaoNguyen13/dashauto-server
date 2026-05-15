const authService = require("../services/auth.service");

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ message: "Dang ky thanh cong", ...result });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
