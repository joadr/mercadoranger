import { Meteor } from 'meteor/meteor'
import Products from '../products'

Meteor.publish('productsFromSellerId', function (sellerId) {
  return Products.find({'seller.id': parseInt(sellerId)})
})
