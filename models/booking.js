/*jslint node: true */
"use strict";

// load the things we need
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

/**
 * define the schema for our booking model
 * @type {Schema}
 */
var bookingSchema = new Schema({
		name:String,
		email:String,
		PhoneNo:Number,
	 	noOfRooms:Number,
	 	guests:Number,
		roomType: String,
		checkInDate: Date,
		checkOutDate: Date,
		finalAmount:Number,
		hotel: { type: Schema.Types.ObjectId, ref: "Hotel" },
		user: { type: Schema.Types.ObjectId, ref: "User" },
});


// create the model for users and expose it to our app
module.exports = mongoose.model("Booking", bookingSchema);
