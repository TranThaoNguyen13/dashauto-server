const productService = require("../services/product.service");

exports.list = async (req, res) => {
  try {
    const data = await productService.list(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};