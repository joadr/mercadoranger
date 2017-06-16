import Products from '../../../../imports/api/products/products'
import { Meteor } from 'meteor/meteor'
import { Tracker } from 'meteor/tracker'
import { FlowRouter } from 'meteor/kadira:flow-router'

Template.seleccionar_producto.onCreated(function () {
  var self = this
  self.autorun(function () {
    self.subscribe('productsFromSellerId', Session.get('id'))
  })
})

Template.seleccionar_producto.helpers({
  productos: function () {
    var products = Products.find().fetch()
    // console.log(products)
    return products
  }
})

Template.product.events({
  'click .enviar': function () {
    Meteor.call('launchRobot', this._id)
    Session.set('product', this._id)
    FlowRouter.go('robot', this._id)
  }
})
