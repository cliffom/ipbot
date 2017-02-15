const aws = require('aws-sdk')
const ec2 = new aws.EC2()
const express = require('express')
const got = require('got')
const router = express.Router()
const winston = require('winston')
winston.level = process.env.LOG_LEVEL || 'info'

let entries = {}
getEntriesFromS3()

router.post('/', function(req, res) {
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
            entriesAdd(ip, description, req.body.user_name)
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
            entriesDel(body)
          },
          function(error) {
            const message = `${error.code}: ${error.message}`
            postActionResponse(message, req.body.response_url)
          }
        )
      break
    case 'ip.list':
      res.send(entries)
      break
    default:
      res.send('Invalid command: ' + operation.raw)
  }
})

function tokenizeOperation(operation) {
  return {
    raw: operation,
    class: operation.split('.')[0],
    command: operation.split('.')[1]
  }
}

function getParams(ip, sg_group_id) {
  return {
    CidrIp: ip + '/32',
    FromPort: -1,
    IpProtocol: '-1',
    GroupId: sg_group_id
  }
}

function entriesAdd(ip, description, user) {
  const today = new Date();
  const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  entries[ip] = {
    ip_address: ip,
    added_by: user,
    description: description,
    added_on: date + ' ' + time
  }
  saveEntriesToS3()
}

function entriesDel(ip) {
  delete entries[ip]
  saveEntriesToS3()
}

function postActionResponse(message, url) {
  winston.log('debug', message)
  got.post(url, {
    body: JSON.stringify({ text: message })
  })
    .catch(error => {
      winston.log('error', error)
    })
}

function getEntriesFromS3() {
  const s3 = new aws.S3()
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: process.env.AWS_S3_OBJECT
  }

  s3.getObject(params).promise().then(
    function(data) {
      entries = JSON.parse(data.Body.toString())
    },
    function(error) {
      saveEntriesToS3()
    }
  )
}

function saveEntriesToS3() {
  const s3 = new aws.S3()
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: process.env.AWS_S3_OBJECT,
    Body: JSON.stringify(entries)
  }

  s3.putObject(params).promise().then(
    function(data) {},
    function(error) {
      winston.log('error', error)
    }
  )
}

module.exports = router
