const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect('mongodb://localhost:27017/jd-dishing-works').then(() => {
    return mongoose.connection.db.collection('users').updateOne(
        { email: 'test3@test.com' },
        { $set: { role: 'admin' } }
    );
})
    .then(() => console.log('Successfully made admin'))
    .catch((err) => console.log('Error.', err))
    .finally(() => process.exit());