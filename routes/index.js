const express = require('express')
const router = express.Router()

/* health check */
router.get('/alive', function(req, res) {
  res.send('alive')
})

module.exports = router
