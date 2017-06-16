Template.home.events({
  'submit form': function (event) {
    event.preventDefault()
    var id = $('#id_ml').val()
    Meteor.call('insertProductsInDatabase', id, function (error, response) {
      if (error) {
        console.log(error)
      }
      if (response === 'success') {
        Session.set('id', id)
        FlowRouter.go('seleccionar-producto')
      }
    })
  }
})
