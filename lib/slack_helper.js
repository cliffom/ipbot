function validateRequest(req) {
  return process.env.SLACK_TOKEN == undefined || req.body.token != process.env.SLACK_TOKEN
}

module.exports = {
  validateRequest: validateRequest
}
