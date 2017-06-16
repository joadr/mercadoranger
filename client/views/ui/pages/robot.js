import Robots from '../../../../imports/api/robots/robots'
import Products from '../../../../imports/api/products/products'
import moment from 'moment'

moment.locale('es')

Template.robot.helpers({
  robot: function () {
    return Robots.findOne()
  },
  name: function () {
    console.log(this)
    return this._id.substr(0, 5)
  },
  fecha: function () {
    return moment(this.createdAt).format('dddd Do, MMMM h:mm:ss')
  },
  respondidos: function () {
    // return this.
  },
  product: function () {
    return Products.findOne()
  },
  matchedTweetsCount: function () {
    return this.matchedTweets.length
  },
  scannedTweetsCount: function () {
    return this.scannedTweets.length
  },
  scannedTweets: function () {
    return this.scannedTweets.reverse()
  },
  clase: function () {
    if (this.destacado) return 'destacado'
    else return ''
  }
})

Template.robot.events({
  'click .stopBot': function () {
    Meteor.call('stopRobot', this._id)
  }
})

Template.robot.onCreated(function () {
  var self = this
  self.autorun(function () {
    self.subscribe('getRobot', Session.get('product'))
  })
})
