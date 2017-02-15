const got = require('got')
const winston = require('winston')
winston.level = process.env.LOG_LEVEL || 'info'

function postActionResponse(message, url) {
  winston.log('debug', message)
  got.post(url, {
    body: JSON.stringify({ text: message })
  })
    .catch(error => {
      winston.log('error', error)
    })
}

function tokenizeOperation(operation) {
  return {
    raw: operation,
    class: operation.split('.')[0],
    command: operation.split('.')[1]
  }
}

module.exports = {
  postActionResponse: postActionResponse,
  tokenizeOperation: tokenizeOperation
}
