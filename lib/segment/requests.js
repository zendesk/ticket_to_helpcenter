var segmentWriteKey = btoa('b08tpgubau');
module.exports = {
  identify: function(user) {
    return {
      url: 'https://api.segment.io/v1/identify',
      type: 'POST',
      dataType: 'JSON',
      contentType: 'application/JSON',
      data: user,
      headers: {'Authorization': 'Basic ' + segmentWriteKey}
    };
  },
  group: function(group) {
    return {
      url: 'https://api.segment.io/v1/group',
      type: 'POST',
      dataType: 'JSON',
      contentType: 'application/JSON',
      data: group,
      headers: {'Authorization': 'Basic ' + segmentWriteKey}
    };
  },
  track: function(event) {
    return {
      url: 'https://api.segment.io/v1/track',
      type: 'POST',
      dataType: 'JSON',
      contentType: 'application/JSON',
      data: event,
      headers: {'Authorization': 'Basic ' + segmentWriteKey}
    };
  }
};
