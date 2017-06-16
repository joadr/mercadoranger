Template.registerHelper('formatMoney', function (number) {
  if (!number || !_.isNumber(number)) {
    return
  }
  var re = '(\\d)(?=(\\d{' + (0 || 3) + '})+' + (0 > 0 ? '\\.' : '$') + ')'
  return number.toFixed(Math.max(0, ~~0)).replace(new RegExp(re, 'g'), '$1.')
})
