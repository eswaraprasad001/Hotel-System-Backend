const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const router = express.Router();
const randtoken = require('rand-token');
const app = express();
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
const stripe = require("stripe")("sk_test_51L1OJWSGdpiEKZzuccFqGpQbdKN09nLUxb6ff2Y9jOQGCgs3aQAaFZjjRE6uokSRdWnMIFYql0X0xTbCgw4vMWYz00R1wAyiKK");
const cors = require('cors')

app.use(cors())

var User = require("../models/user");
var Hotel = require("../models/hotel");
var Booking = require("../models/booking");
const config = require("../config/database");
app.set('view engine', 'html');

const refreshTokens = {};

function isAdminLoggedIn(req, res, next) {
	if (req.isAuthenticated() && req.user.isAdmin === true) {
		return next();
	}
	res.send("Not a Admin");
}
router.get('/hello',(req,res)=>{
	res.send("Its Working")
})


// Register
router.post('/register', (req, res) => {
    let newUser = new User({
        firstname:req.body.firstname,
        lastname: req.body.lastname,
        email:req.body.email ,
        password: req.body.password

    });

    User.addUser(newUser, (err, user) => {
        if (err) {
            res.json({success: false, msg: 'Failed to register user'});
            console.log(err);
        } else {
            res.json({success: true, msg: 'User registered'});
        }
    });
});

// Authenticate
router.post('/authenticate', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    User.getUserByEmail(email, (err, user) => {
        if (err) throw err;
        // There is no user with that email
        if (!user) {
            return res.json({success: false, msg: 'User not found'});
        }
        // User found, check password
        User.comparePassword(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if(isMatch) {
                // create jwt
                const token = jwt.sign(user.toObject(), config.secret, {
                    expiresIn: '604800' // 1 week
                });
				const refreshToken = randtoken.uid(256);
				refreshTokens[refreshToken] = user.email;

                res.json({
                    success: true,
                    token: `Bearer ${token}`,
					refreshToken: refreshToken,
                    user: {
                        id: user._id,
                        email: user.email,
                        firstname: user.firstName,
                        email: user.email,
                        isAdmin:user.isAdmin
                    }
                });
            } else {
                return res.json({success: false, msg: 'Wrong password'});
            }
        });
    });
});

// Profile
router.get('/profile', passport.authenticate('jwt', {session: false}), (req, res) => {
    res.json( req.user);
});
// router.get('/admin', passport.authenticate('jwt', {session: false}), (req, res) => {
//     res.json({user: req.user});
// });


router.post("/logout", function (req, res) {
	req.logout();
	res.json({ success: "You have been logout successfully!!!." });
});

router.post('/refresh', function (req, res) {
    const refreshToken = req.body.refreshToken;
    

    if (refreshToken in refreshTokens) {
      const user = {
        'email': refreshTokens[refreshToken]
      }
      const token = jwt.sign(user, config.secret,{ expiresIn: 600 });
      res.json({jwt: token})
    }
    else {
      res.sendStatus(401);
    }
});

/**
 * route to load user date on user home page.
 * Only if user is logged in and user is having admin rights.
 *

 */
 router.get("/api/admin/users/" ,passport.authenticate('jwt', {session: false}),isAdminLoggedIn, function (req, res) {
if(req.user.isAdmin===true){
	User.find()
		.where("_id")
		.ne(req.user._id)
		.sort("firstName")
		.exec(function (err, users) {
			if (err) {
				return res.json(err);
			}
			return res.json(users); // return all users in JSON format
		});
    }
else{
    return res("You are not a Admin")
}
});

router.delete("/api/admin/users/:id", passport.authenticate('jwt',{session: false}), isAdminLoggedIn,  function (req, res) {
	User.findOne({ _id: req.params.id }).exec(function (err, user) {
		if (err) {
			return res.json(err);
		}
		if (user) {
			user.remove();
			return res.json({ redirect: "/admin" });
		} else {
			return res.json(err);
		}
	});
});
router.delete("/api/admin/hotels/:id",passport.authenticate('jwt',{session: false}), isAdminLoggedIn, function (req, res) {
	Hotel.findOne({ _id: req.params.id }).exec(function (err, hotel) {
		if (err) {
			return res.json(err);
		}
		if (hotel) {
			hotel.remove();
			return res.json({ redirect: "/admin" });
		} else {
			return res.json(err);
		}
	});
});

router.put("/api/admin/updatehotel/:id",passport.authenticate('jwt',{session: false}), isAdminLoggedIn, function (req, res) {
	Hotel.findByIdAndUpdate({ _id: req.params.id },req.body).exec(function (err, hotel) {
		if (err) {
			return res.json(err);
		} 
		else {
			return res.json(err);
		}
	});
});
router.post("/api/admin/hotels", passport.authenticate('jwt', {session: false}),isAdminLoggedIn,  function (req, res) {
	var hotel = new Hotel(req.body);
	hotel.save(function (err) {
		if (err) {
			throw err;
		}
		return res.json({success:"Hotel added successfully" });
	});
});



// router.get("*", function (req, res) {
// 	let user = {};
// 	if (req.user) {
// 		user = {
// 			isAdmin: req.user.isAdmin,
// 			email: req.user.email,
// 			firstName: req.user.firstName,
// 			lastName: req.user.lastName,
// 		};
// 	}
// 	res.send({
// 		title: "Hotel Booking System",
// 		user: user,
// 	});
// });
/**
 * route to list down all hotels and load a specific hotel detail if id is provided.
 * Only if user is logged in.
 *
 */
 router.get("/api/hotels/:id?",passport.authenticate('jwt', {session: false}), function (req, res) {
	if (req.params.id) {
		Hotel.findOne({ _id: req.params.id }, function (err, hotel) {
			if (err) {
				return res.json(err);
			}
			if (hotel) {
				return res.json(hotel); // return hotel in JSON format
			} else {
				return res.json(err);
			}
		});
	} else {
		Hotel.find(function (err, hotels) {
			if (err) {
				return res.json(err);
			}
			return res.json(hotels); // return all hotels in JSON format
		});
	}
});

router.post("/api/hotels/search",  passport.authenticate('jwt', {session: false}), function (req, res) {
	var regex = new RegExp(req.body.term, "i"); // 'i' makes it case insensitive
	Hotel.find({ city: regex })
		.where("roomCount")
		.gt(0)
		.sort("name")
		.exec(function (err, hotels) {
			if (err) {
				return res.json(err);
			}
			if (!hotels.length) {
				return res.json({
					error: "No hotel found for the given search input. ",
				});
			}
			Booking.find({ user: req.user })
				.populate("hotel")
				.exec(function (err, bookings) {
					if (err) {
						return res.json(err);
					}
					return res.json(hotels); // return all hotels in JSON format
				});
		});
});
/**
 * route to list down all the bookings done my user.
 * Only if user is logged in.
 *
 */
 router.get("/api/bookings", passport.authenticate('jwt', {session: false}), function (req, res) {
	Booking.find({ user: req.user }, function (err, bookings) {
		if (err) {
			return res.json(err);
		}
		return res.json(bookings); // return all bookings in JSON format
	});
});

/**
 * route to create a new booking based on user data.
 * Only if user is logged in.
 *
 */
router.post("/api/bookings", passport.authenticate('jwt', {session: false}), function (req, res) {
	Hotel.findOne({ _id: req.body.hotel._id }, function (err, hotel) {
		if (err) {
			return res.json(err);
		}
		if (hotel) {
			hotel.bookHotel(function (err, hotel) {
				if (err) {
					throw err;
				}
				var booking = new Booking();
				booking.name= req.body.name,
				booking.email= req.body.email,
				booking.PhoneNo= req.body.PhoneNo,
				booking.noOfRooms= req.body.noOfRooms,
				booking.guests= req.body.guests,
				booking.roomType = req.body.roomType;
				booking.checkInDate = new Date(req.body.checkInDate);
				booking.checkOutDate = new Date(req.body.checkOutDate);
				booking.finalAmount = req.body.finalAmount;
				booking.hotel = hotel;
				booking.user = req.user;
				booking.save(function (err) {
					if (err) {
						throw err;
					}
					return res.json({ redirect: "/profile" });
				});
			});
		} else {
			return res.json(err);
		}
	});
});

/**
 * route to cancel booking based on booking id.
 * Only if user is logged in.
 *
 */
router.delete("/api/bookings/:id", passport.authenticate('jwt', {session: false}), function (req, res) {
	Booking.findOne({ _id: req.params.id, user: req.user._id }).exec(function (err, booking) {
		if (err) {
			return res.json(err);
		}

		if (booking) {
			Hotel.findOne({ _id: booking.hotel }, function (err, hotel) {
				if (err) {
					return res.json(err);
				}
				hotel.cancelHotel(function (err, hotel) {
					if (err) {
						throw err;
					}
					booking.remove();
					return res.json({ redirect: "/profile" });
				});
			});
		} else {
			return res.json(err);
		}
	});
});

router.post('/checkout', (req, res) => {
    try {
        console.log(req.body);
        token = req.body.token
        amount=req.body.amount
        email=req.body.email
        console.log(amount)
      const customer = stripe.customers
        .create({
          email: email,
          source: token.id
        })
        .then((customer) => {
          console.log(customer);
          return stripe.paymentIntents.create({
            amount: amount*100,
            description: "Test  using express and Node",
            currency: "INR",
            customer: customer.id,
          });
        })
        .then((paymentIntents) => {
          console.log(paymentIntents);
            res.json({
              data:"success"
          })
        })
        .catch((err) => {
            res.json({
              data: "failure",
            });
        });
      return true;
    } catch (error) {
      return false;
    }
})
module.exports = router;