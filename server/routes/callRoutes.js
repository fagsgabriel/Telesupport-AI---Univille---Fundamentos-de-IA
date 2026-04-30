const express = require("express");
const { getCalls } = require("../controllers/callController");

const router = express.Router();

router.get("/calls", getCalls);

module.exports = router;
