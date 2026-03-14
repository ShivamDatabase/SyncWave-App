const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect('mongodb+srv://officework2023abs_db_user:1mwVliKA0wxjLmxX@cluster0.97dj40u.mongodb.net/?appName=Cluster0').then(() => {
    return mongoose.connection.db.collection('users').updateOne(
        { email: 'test3@test.com' },
        { $set: { role: 'admin' } }
    );
})
    .then(() => console.log('Successfully made admin'))
    .catch((err) => console.log('Error.', err))
    .finally(() => process.exit());