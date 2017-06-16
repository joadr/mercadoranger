import { Meteor } from 'meteor/meteor'
import Robots from '../robots'
import Products from '../../products/products'

Meteor.publish('getRobot', function (id) {
  console.log(id)
  var product = Products.find({_id: id}).fetch()[0]
  var robotId
  if (product.robotId) {
    robotId = product.robotId
  }
  return [Robots.find({_id: robotId}), Products.find({_id: id})]
})
