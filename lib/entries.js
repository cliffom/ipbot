const aws = require('aws-sdk')
const winston = require('winston')

let entries = {}

class Entries {
  constructor(bucket, object) {
    this.bucket = bucket
    this.object = object
    this.s3 = new aws.S3()
    this.load()
  }

  add(ip, description, user) {
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    entries[ip] = {
      ip_address: ip,
      added_by: user,
      description: description,
      added_on: date + ' ' + time
    }
    this.save()
  }

  del(ip) {
    delete entries[ip]
    this.save()
  }

  get() {
    return entries
  }

  load() {
    const params = {
      Bucket: this.bucket,
      Key: this.object
    }

    this.s3.getObject(params).promise().then(
      function(data) {
        entries = JSON.parse(data.Body.toString())
      },
      function(error) {
        this.save()
      }
    )
  }

  save() {
    const params = {
      Bucket: this.bucket,
      Key: this.object,
      Body: JSON.stringify(entries)
    }

    this.s3.putObject(params).promise().then(
      function(data) {},
      function(error) {
        winston.log('error', error)
      }
    )
  }
}

module.exports = new Entries(process.env.AWS_S3_BUCKET, process.env.AWS_S3_OBJECT)
