const entries = require('../lib/entries')
const express = require('express')
const router = express.Router()

//helpers
const ipHelper = require('../lib/ip_helper')
const botHelper = require('../lib/bot_helper')
const slackHelper = require('../lib/slack_helper')

router.post('/', function(req, res) {
  // validate request
  if (slackHelper.validateRequest(req)) {
    res.sendStatus(401)
    return
  }

  const operation = botHelper.tokenizeOperation(req.body.text.split(" ").shift())
  const body = req.body.text.replace(operation.raw, '').trim()
  const sg_group_id = process.env.AWS_SG_GROUP_ID

  switch(operation.raw) {
    case 'ip.add':
      ipHelper.add(body, entries, sg_group_id, req, res)
      break
    case 'ip.del':
      ipHelper.del(body, entries, sg_group_id, req, res)
      break
    case 'ip.all':
      res.send(entries.get())
      break
    case 'ip.list':
      ipHelper.list(entries, req, res)
      break
    case 'version':
      res.send('My version is: ' + process.env.npm_package_version)
      break
    default:
      ipHelper.help(res)
      break
  }
})

module.exports = router
