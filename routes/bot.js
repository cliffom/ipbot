const aws = require('aws-sdk')
const ec2 = new aws.EC2()
const express = require('express')
const got = require('got')
const router = express.Router()

let entries = {}
getEntriesFromS3()

/* health check */
router.post('/', function(req, res) {
  const msg_text = req.body.text
  const user_name = req.body.user_name
  const response_url = req.body.response_url

  let ip_address = ''
  let message = ''

  const command = msg_text.split(" ").shift()
  const body = msg_text.replace(command + ' ', '')

  switch(command) {
    case 'ip.add':
      ip_address = body
      res.send('Attempting to whitelist ' + ip_address + '...')
      addToSecurityGroup(ip_address, req, res)
      break
    case 'ip.del':
      ip_address = body
      res.send('Attempting to remove ' + ip_address + ' from the whitelist...')
      delFromSecurityGroup(ip_address, req, res)
      break
    case 'ip.list':
      res.send(entries)
      break
    default:
      res.send('Invalid command.')
  }
})

function addToSecurityGroup(ip, req, res) {
  params = {
    CidrIp: ip + '/32',
    FromPort: -1,
    IpProtocol: '-1',
    GroupId: process.env.AWS_SG_GROUP_ID
  }

  ec2.authorizeSecurityGroupIngress(params, function(err, data) {
    if (err) {
      message = `${err.code} ${err.message}`
    }
    else {
      let today = new Date();
      let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
      let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
      message = `${ip} was successfully whitelisted.`
      entries[ip] = {
        ip_address: ip,
        added_by: req.body.user_name,
        added_on: date + ' ' + time
      }
      saveEntriesToS3()
    }
    postActionResponse(message, req.body.response_url)
  })
}

function delFromSecurityGroup(ip, req, res) {
  params = {
    CidrIp: ip + '/32',
    FromPort: -1,
    IpProtocol: '-1',
    GroupId: process.env.AWS_SG_GROUP_ID
  }

  ec2.revokeSecurityGroupIngress(params, function(err, data) {
    if (err) {
      message = `${err.code} ${err.message}`
    }
    else {
      message = `${ip} was successfully removed.`
      delete entries[ip]
      saveEntriesToS3()
    }
    postActionResponse(message, req.body.response_url)
  })
}

function postActionResponse(message, url) {
  got.post(url, {
    body: JSON.stringify({ text: message })
  })
    .catch(err => {
      console.log(err)
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
      console.log(error)
    }
  )
}

module.exports = router
