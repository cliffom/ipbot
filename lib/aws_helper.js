function getParams(ip, sg_group_id) {
  return {
    CidrIp: ip + '/32',
    FromPort: -1,
    IpProtocol: '-1',
    GroupId: sg_group_id
  }
}

module.exports = {
  getParams: getParams
}
