const aws = require('aws-sdk')
const ec2 = new aws.EC2()
const entries = require('../lib/entries')
const express = require('express')
const router = express.Router()

//helpers
const awsHelper = require('../lib/aws_helper')
const getParams = awsHelper.getParams

const botHelper = require('../lib/bot_helper')
const tokenizeOperation = botHelper.tokenizeOperation
const postActionResponse = botHelper.postActionResponse

router.post('/', function(req, res) {
  // validate request
  if (process.env.SLACK_TOKEN == undefined || req.body.token != process.env.SLACK_TOKEN) {
    res.send(401)
    return
  }
  const operation = tokenizeOperation(req.body.text.split(" ").shift())
  const body = req.body.text.replace(operation.raw, '').trim()
  const sg_group_id = process.env.AWS_SG_GROUP_ID

  switch(operation.raw) {
    case 'ip.add':
      ip = body.split(" ")[0]
      description = body.replace(ip, '').trim()
      res.send('Attempting to whitelist ' + ip + '...')

      ec2.authorizeSecurityGroupIngress(getParams(ip, sg_group_id)).promise()
        .then(
          function(data) {
            const message = `${ip} was successfully whitelisted.`
            postActionResponse(message, req.body.response_url)
            entries.add(ip, description, req.body.user_name)
          },
          function(error) {
            const message = `${error.code}: ${error.message}`
            postActionResponse(message, req.body.response_url)
          }
        )
      break
    case 'ip.del':
      res.send('Attempting to remove ' + body + ' from the whitelist...')

      ec2.revokeSecurityGroupIngress(getParams(body, sg_group_id)).promise()
        .then(
          function(data) {
            const message = `${body} was successfully removed from our whitelist.`
            postActionResponse(message, req.body.response_url)
            entries.del(body)
          },
          function(error) {
            const message = `${error.code}: ${error.message}`
            postActionResponse(message, req.body.response_url)
          }
        )
      break
    case 'ip.all':
      res.send(entries.get())
      break
    case 'ip.list':
      myEntries = {}
      for (var i in entries.get()) {
        if (entries.get()[i]['added_by'] == req.body.user_name) {
          myEntries[i] = entries.get()[i]
        }
      }
      res.send(myEntries)
      break
    case 'version':
      res.send('My version is: ' + process.env.npm_package_version)
      break
    default:
      const helpText = `Usage:
      Whitelist your IP*:
        /opsbot ip.add IP DESCRIPTION
      Remove your IP from the whitelist:
        /opsbot ip.del IP
      View your whitelisted IPs:
        /opsbot ip.list
      Get the bot version:
        /opsbot version
      This help text:
        /opsbot help

      * You can get your IP from https://api.ipify.org`
      res.send(helpText)
      break
  }
})

module.exports = router
