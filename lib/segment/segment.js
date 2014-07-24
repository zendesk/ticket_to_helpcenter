// replace this string with your key
var segmentWriteKey = 'b08tpgubau';

// 
// 
// leave all this alone unless you know what you're doing
// 
// 
var auth = btoa(segmentWriteKey),
  Segment = function(globalThis) {
    this.global = globalThis;
  };
Segment.prototype = {
  id: function() {
    return helpers.fmt("%@+%@", this.global.currentAccount().subdomain(), this.global.currentUser().id());
  },
  identifyAndGroup: function() {
    // generates the unique user ID, grabs select user info, and posts it to segment.io
    var zenUser = this.global.currentUser(),
    zenAccount = this.global.currentAccount(),
    segmentId = this.global.segment.id(),
    segmentUser = {
      'userId': segmentId,
      'traits': {
        'name': zenUser.name(),
        'email': zenUser.email(),
        'id': zenUser.id(),
        'subdomain': zenAccount.subdomain(),
        'locale': zenUser.locale(),
        'product': 'Help Center App'
      }
    },
    segmentGroup = {
      'userId': segmentId,
      'groupId': zenAccount.subdomain(),
      'traits': {
        'zendeskPlan': zenAccount.planName()
      }
    };
    // make the ajax requests
    this.global.ajax('identify', JSON.stringify(segmentUser));
    this.global.ajax('group', JSON.stringify(segmentGroup));
  },
  track: function(name, properties) {
    // pass in an event object with event and properties key-value pairs
    // this.global function generates the unique user id (id+subdomain) and fires the POST request
    if(!properties) {properties = {};}
    properties.product = 'Help Center App';
    if(this.global.ticket()) {
      properties.ticket_id = this.global.ticket().id();
    }
    var event = {
      'userId': this.global.segment.id(),
      'event': name,
      'properties': properties
    };
    this.global.ajax('track', JSON.stringify(event));
  },
  identifyReq: function(user) {
    return {
      url: 'https://api.segment.io/v1/identify',
      type: 'POST',
      dataType: 'JSON',
      contentType: 'application/JSON',
      data: user,
      headers: {'Authorization': 'Basic ' + auth}
    };
  },
  groupReq: function(group) {
    return {
      url: 'https://api.segment.io/v1/group',
      type: 'POST',
      dataType: 'JSON',
      contentType: 'application/JSON',
      data: group,
      headers: {'Authorization': 'Basic ' + auth}
    };
  },
  trackReq: function(event) {
    return {
      url: 'https://api.segment.io/v1/track',
      type: 'POST',
      dataType: 'JSON',
      contentType: 'application/JSON',
      data: event,
      headers: {'Authorization': 'Basic ' + auth}
    };
  }
};

module.exports = Segment;