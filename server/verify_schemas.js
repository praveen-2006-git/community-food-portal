const mongoose = require('mongoose');
const User = require('./models/User');
const Ingredient = require('./models/Ingredient');
const Request = require('./models/Request');
const Reservation = require('./models/Reservation');
const QualityReport = require('./models/QualityReport');
const Notification = require('./models/Notification');

console.log('All schemas loaded successfully!');
console.log('User Model compiled:', User.modelName);
console.log('Ingredient Model compiled:', Ingredient.modelName);
console.log('Request Model compiled:', Request.modelName);
console.log('Reservation Model compiled:', Reservation.modelName);
console.log('QualityReport Model compiled:', QualityReport.modelName);
console.log('Notification Model compiled:', Notification.modelName);

process.exit(0);
