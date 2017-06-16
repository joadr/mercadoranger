import { FlowRouter } from 'meteor/kadira:flow-router'
import { BlazeLayout } from 'meteor/kadira:blaze-layout'

FlowRouter.route('/', {
  name: 'index',
  action: function (params) {
    BlazeLayout.render('home')
  }
})

FlowRouter.route('/seleccionar_producto', {
  name: 'seleccionar-producto',
  action: function (params) {
    BlazeLayout.render('seleccionar_producto')
  }
})

FlowRouter.route('/robot', {
  name: 'robot',
  action: function (params) {
    BlazeLayout.render('robot')
  }
})
