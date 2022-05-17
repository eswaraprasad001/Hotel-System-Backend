require('dotenv').config()
const pass = process.env.PASS
module.exports = {
    database: `mongodb+srv://eswarpd001:${pass}@my-application.pgrt9.mongodb.net/Hotel-Reservation-System?retryWrites=true&w=majority`,
    secret: 'yoursecret'
};