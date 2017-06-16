import { Meteor } from 'meteor/meteor'
import meli from 'mercadolibre'
import Products from '../products'
import Robots from '../../robots/robots'
import _ from 'underscore'
import client from '../../../startup/server/twitter'
import Fiber from 'fibers'

Meteor.methods({
  getProducts: function (sellerId) {
    this.unblock()
    var meliObject = Meteor.call('getMeli')
    var meliget = Meteor.wrapAsync(meliObject.get)
    var response = meliget('sites/MLC/search?seller_id=' + sellerId)
    return response.results
  },
  getMeli: function () {
    this.unblock()
    var meliObject = new meli.Meli(2310556251141659, 'n2GbuH1mtKLcj93bhDUenUGnvPbSUjvF')
    return meliObject
  },
  insertProductsInDatabase: function (sellerId) {
    this.unblock()
    var products = Meteor.call('getProducts', sellerId)
    // console.log('productos', products)
    _.each(products, function (product) {
      var exist = Products.findOne({id: product.id})
      if (exist) {
        return
      }
      product.keywords = getKeywords(product.title)
      console.log(product.keywords)
      Products.insert(product)
    })
    return 'success'
  },
  getKeywords: function (productId) {
    var product = Products.findOne(productId)
    var keywords = getKeywords(product.title)
    Products.update(product._id, {$set: {keywords: keywords}})
  }
})

Meteor.methods({
  launchRobot: function (productId) {
    this.unblock()
    // Get product
    // console.log(productId)
    var product = Products.findOne(productId)
    // console.log(product)
    // Check if already running
    if (product.robotId) {
      var bot = Robots.findOne(product.robotId)
      if (bot && bot.isOn === true) {
        return product.robotId
      }
    }

    // Create bot on database and insert in on product
    var robot = Robots.insert({isOn: true, scannedTweets: [], createdAt: new Date(), matchedTweets: []})
    // console.log(robot)
    Products.update(productId, {$set: {robotId: robot}})

    // Get the keyworkds and join them for the track
    var keywords = product.keywords.join(',')
    console.log(keywords)

    Meteor.call('stream', robot, keywords, product.title, product.permalink)
  },
  stream: function (robot, keywords, titulo, permalink) {
    this.unblock()
    // Make the stopper (stop the bot)
    var OptimusPrime = Robots.find({_id: robot})
    var isOn = true
    var handler = OptimusPrime.observeChanges({
      changed: function (id, fields) {
        if (id === robot) {
          if (fields.isOn === false) {
            console.log('should turn off')
            isOn = false
          }
        }
      }
    })

    // Create the stream with Twitter
    client.stream('statuses/filter', {track: keywords}, function (stream) {
      // On twit receive
      stream.on('data', function (event) {
        console.log('twit')
        if (!isOn) {
          console.log('turning off')
          handler.stop()
          stream.destroy()
        }
        // Remove replies, and shit, keep only spanish
        if (event.retweeted_status || event.quoted_status || event.in_reply_to_user_id || event.in_reply_to_screen_name || event.in_reply_to_status_id || event.lang !== 'es') {
          return
        }
        console.log(event)
        // console.log(event)
        var score = Score(event.text)
        // Keep only chilean twits
        if (buyer(event.text) /* && event.place && event.place.country_code === 'CL' */) {
          console.log('eureka! Enviar tweet')
          Fiber(function () {
            var ans = '¿Buscabas esto @' + event.user['screen_name'] + '? ¡ya lo encontraste! ' + permalink
            Robots.update(robot, {$push: {matchedTweets: {$each: [{ id: event.id_str, name: event.user['screen_name'], pic: event.user.profile_image_url_https, text: event.text, answer: ans, score: score }]}}})
            Robots.update(robot, {$push: {scannedTweets: {$each: [{ id: event.id_str, name: event.user['screen_name'], pic: event.user.profile_image_url_https, text: event.text, destacado: true, score: score }]}}})
            // Reply Tweet
            client.post('statuses/update', {status: ans, in_reply_to_status_id: event.id}, function (error, tweet, response) {
              if (error) {
                console.log('error')
              }
              console.log(tweet)  // Tweet body.
              console.log(response)  // Raw response object.
            })
          }).run()
        } else {
          Fiber(function () {
            Robots.update(robot, {$push: {scannedTweets: {$each: [{ id: event.id_str, name: event.user['screen_name'], pic: event.user.profile_image_url_https, text: event.text, destacado: false, score: score }]}}})
          }).run()
            
          }
      })

      stream.on('error', function (error) {
        console.log('error')
      })
    })
  },
  stopRobot: function (robotId) {
    Robots.update(robotId, {$set: {isOn: false}})
  }
})

// Buyer analyzer
function occurrences (string, subString, allowOverlapping) {
  string += ''
  subString += ''
  if (subString.length <= 0) return (string.length + 1)

  var n = 0
  var pos = 0
  var step = allowOverlapping ? 1 : subString.length

  while (true) {
    pos = string.indexOf(subString, pos)
    if (pos >= 0) {
      ++n
      pos += step
    } else break
  }
  return n
}

var notKeywords = ['roja', 'rojo', 'negra', 'negro', 'blanco', 'blanca', 'verde', 'amarilla', 'amarillo', 'morada', 'azul', 'morada', 'púrpura', 'naranjo', 'naranja',
  'el', 'la', 'con', 'incluye', 'un', 'de', 'sin', 'nuevos', 'nuevo', 'sellado', 'sellados', 'hermos',
  'estilo', 'o', 'a', 'y', 'silver', 'gold', 'en', 'classic', 'standard', 'dorado', 'plateado', 'entrega', 'inmediata',
  'último modelo', 'sin', 'rayas', 'golpes', 'ni', 'su', 'para', 'rosado', 'generación', 'hombre', 'mujer', 'unisex',
  'primera', '1era', '1º', 'segunda', '2da', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava',
  '3era', '3ra', '4ta', '5ta', '6ta', '7ma', '3g', 'al', '4g', '5g', 'casuales', 'casual', 'garantía',
  'garantizado', 'garantizada', 'garantizados', 'garantizadas', 'niños', 'niño', 'niña', 'par', 'deportiva', 'deportivo']

var Vc = ['comprar', 'conseguir', 'querer', 'busco', 'buscamos', 'recomendar', 'desear', 'necesitar', 'sugerir',
  'compro', 'compras', 'compramos', 'compren', 'compres', 'compra', 'quiero', 'quiere', 'quisiera',
  'quieren', 'recomienda', 'recomendacion', 'recomiendas', 'recomiendan', 'deseo', 'deseas',
  'desearía', 'desearia', 'necesito', 'sugieran', 'sugieres', 'sugieren', 'tener', 'pedir', 'pido',
  'denme', 'dame', 'regalame', 'regalenme', 'alguien tiene', 'quien tiene', 'quien vende', 'alguien vende', 'me vende', 'ojala', 'compraría', 'compraré', 'estoy buscando', 'compraríamos', 'compre', 'me regalen']

var Vnc = ['no querer', 'no recomendar', 'no quiero', 'no lo quiero', 'no la quiero',
  'no quisiera', 'no quieres', 'no quieren', 'no recomiendo', 'no me gusta', 'no lo recomiendo',
  'no lo recomendaría', 'no la recomendaría', 'no te recomendaría', 'no compraría', 'no lo compraría',
  'no la compraría', 'nica', 'nica lo compro', 'nica quiero', 'nica lo quiero',
  'no recomiendas', 'no recomiendan', 'ni cagando', 'nunca']

var Consumo = ['iphone', 'ipad', 'audifono', 'zapatilla', 'auto', 'cama', 'casa', 'celular', 'cámara',
  'cuadros', 'pelota', 'collar', 'pulsera', 'computador', 'notebook', 'violin', 'guitarra', 'piano',
  'teclado', 'libro', 'revista', 'nintendo', 'playstation 1', 'playstation 2',
  'playstation 3', 'playstation 4', 'playstation', 'play4', 'play1', 'play2', 'xbox one', 'xbox360',
  'xbox', 'psp', 'gamecube', 'gameboy', 'android', 'samsung galaxy', 'iwatch', 'samsung',
  'atari', 'mouse', 'silla', 'mesa', 'estante', 'velador', 'colchón', 'zapato', 'traje', 'bicicleta',
  'moto', 'coleccionable', 'patines', 'polera', 'polerón']

function cantidades (word) {
  var NVc = 0
  var NVnc = 0
  for (var palabra in Vnc) {
    NVnc += occurrences(word, Vnc[palabra])
    word = word.replace(Vnc[palabra], '')
  }
  for (var palabra2 in Vc) {
    NVc += occurrences(word, Vc[palabra2])
    word = word.replace(Vc[palabra2], '')
  }
  return [parseFloat(NVc), parseFloat(NVnc)]
}

function Objeto (word) {
  for (var palabra in Consumo) {
    if (occurrences(word, Consumo[palabra]) > 0) {
      return 1
    }
  }
  return 0
}

function Score (word) {
  word = word.toLowerCase()
  var resultados = cantidades(word)
  var NVc = resultados[0]
  var NVnc = resultados[1]
  return Objeto(word) * (NVc - 2 * NVnc) / word.split(' ').length
}

function buyer (keyword) {
  var score = Score(keyword)
  if (score > 0) {
    return true
  }
  return false
}

function getKeywords (phrase) {
  phrase = ' ' + phrase.toLowerCase() + ' '
  phrase = phrase.replace(',', ' ')
  phrase = phrase.replace('/', ' ')
  phrase = phrase.replace('.', ' ')
  phrase = phrase.replace(' - ', ' ')
  phrase = phrase.replace('+', ' ')
  var regex
  for (var i = 0; i < 1000; i++) {
    regex = new RegExp(' ' + i + ' ', 'g')
    phrase = phrase.replace(regex, ' ')
  }
  for (var palabra in notKeywords) {
    regex = new RegExp(' ' + notKeywords[palabra] + ' ', 'g')
    phrase = phrase.replace(regex, ' ')
  }
  regex = new RegExp(' ', 'g')
  phrase = phrase.replace(regex, ' ')
  regex = new RegExp(' ', 'g')
  return phrase.replace(regex, ',').split(',').slice(1, -1)
}
