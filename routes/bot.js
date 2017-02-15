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
  const operation = tokenizeOperation(req.body.text.split(" ").shift())
  const body = req.body.text.replace(operation.raw, '').trim()
  const sg_group_id = process.env.AWS_SG_GROUP_ID

  switch(operation.raw) {
    case 'version':
      res.send('My version is: ' + process.env.npm_package_version)
      break
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
    case 'ip.list':
      res.send(entries.get())
      break
    default:
      res.send('Invalid command: ' + operation.raw)
  }
})

module.exports = router
