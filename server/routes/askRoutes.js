const express = require("express");
const { ask } = require("../controllers/askController");

const router = express.Router();

router.get("/ask", ask);
router.post("/ask", ask);

module.exports = router;
