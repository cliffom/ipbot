const aws = require('aws-sdk')
const awsHelper = require('../lib/aws_helper')
const botHelper = require('../lib/bot_helper')
const ec2 = new aws.EC2()

function add(body, entries, sg_group_id, req, res) {
  ip = body.split(" ")[0]
  description = body.replace(ip, '').trim()
  res.send('Attempting to whitelist ' + ip + '...')

  ec2.authorizeSecurityGroupIngress(awsHelper.getParams(ip, sg_group_id)).promise()
    .then(
      function(data) {
        const message = `${ip} was successfully whitelisted.`
        botHelper.postActionResponse(message, req.body.response_url)
        entries.add(ip, description, req.body.user_name)
      },
      function(error) {
        const message = `${error.code}: ${error.message}`
        botHelper.postActionResponse(message, req.body.response_url)
      }
    )
}

function del(body, entries, sg_group_id, req, res) {
  res.send('Attempting to remove ' + body + ' from the whitelist...')

  ec2.revokeSecurityGroupIngress(awsHelper.getParams(body, sg_group_id)).promise()
    .then(
      function(data) {
        const message = `${body} was successfully removed from our whitelist.`
        botHelper.postActionResponse(message, req.body.response_url)
        entries.del(body)
      },
      function(error) {
        const message = `${error.code}: ${error.message}`
        botHelper.postActionResponse(message, req.body.response_url)
      }
    )
}

function list(entries, req, res) {
  let myEntries = {}
  for (var i in entries.get()) {
    if (entries.get()[i]['added_by'] == req.body.user_name) {
      myEntries[i] = entries.get()[i]
    }
  }
  res.send(myEntries)
}

function help(res) {
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
}

module.exports = {
  add: add,
  del: del,
  list: list,
  help: help
}
