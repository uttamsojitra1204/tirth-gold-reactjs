const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { log, error } = require("console");
const { type } = require("os");

app.use(express.json());
app.use(cors());

// Database Connection With MonoDB
// mongoose.connect("mongodb+srv://ketanshort1204:97489748@cluster0.nnej4bm.mongodb.net/tirth-gold")
mongoose.connect(
  "mongodb+srv://ketanshort1204:97489748@cluster0.nnej4bm.mongodb.net/tirth-gold"
);

// API Creation
app.get("/", (req, res) => {
  res.send("Express App is Running");
});

//Image Storage Engine
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

// Creating Upload EendPoint for images
app.use("/images", express.static("upload/images"));

app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});

// Schema for Creating Products
const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  avilable: {
    type: Boolean,
    default: true,
  },
});

app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id: 1;
  }
  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });
  console.log(product);
  await product.save();
  console.log("Saved");
  res.json({
    success: true,
    name: req.body.name,
  });
});

//creating API For deleting products
app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Removed");
  res.json({
    success: true,
    name: req.body.name,
  });
});

//Creating API for getting all product
app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});
  console.log("All Products Fetched");
  res.send(products);
});

// shema creating for User model
const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
});

// Creating Endpoint for registering the user
app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({
      success: false,
      errors: "existing user found with same email address",
    });
  }
  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });

  await user.save();

  const data = {
    user: {
      id: user.id,
    },
  };

  const token = jwt.sign(data, "secret_ecom");
  res.json({ success: true, token });
});

// creating endpoint for login
app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: {
          id: user.id,
        },
      };
      const token = jwt.sign(data, "secret_ecom");
      res.json({ success: true, token });
    } else {
      res.json({ success: false, errors: "Wrong Password" });
    }
  } else {
    res.json({ success: false, errors: "Wrong Email Id" });
  }
});

// creating endpoint for new collection data
app.get("/newcollections", async (req, res) => {
  let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8);
  console.log("NewCollection Fetched");
  res.send(newcollection);
});

// creating endpoint for popular in women selction
app.get("/popularinwomen", async (req, res) => {
  let products = await Product.find({ category: "women" });
  let popular_in_women = products.slice(0, 4);
  console.log("Popular in women fetched");
  res.send(popular_in_women);
});

// creating endpoint for releted selction
app.get("/relatedproducts", async (req, res) => {
  let products = await Product.find({ category: "women" });
  let Related_Products = products.slice(0, 4);
  console.log("Related Products");
  res.send(Related_Products);
});

// creating middelware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send({ errors: "Please authenticate using valid token" });
  } else {
    try {
      const data = jwt.verify(token, "secret_ecom");
      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).send({ errors: "Please authenticate using valid token" });
    }
  }
};

// creating endpoint for adding products in cartdata
app.post("/addtocart", fetchUser, async (req, res) => {
  console.log("Added", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Added");
});

// creating endpoint to remove product for cartdata
app.post("/removefromcart", fetchUser, async (req, res) => {
  console.log("removed", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Removed");
});

// creating endpoint to get cartdata
app.post("/getcart", fetchUser, async (req, res) => {
  console.log("GetCart");
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

// creating endpoint to orderAddress
const addressSchema = new mongoose.Schema({
  email: String,
  city: String,
  state: String,
  pincode: Number,
});

const Address = mongoose.model("Address", addressSchema);

app.post("/order", async (req, res) => {
  const { email, city, state, pincode } = req.body;
  const address = new Address({ email, city, state, pincode });
  try {
    await address.save();
    res.status(201).json(address);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const orderSchema = new mongoose.Schema({
  products: [Object],
  subtotal: Number,
  shippingFee: Number,
  total: Number,
});

const Order = mongoose.model("Order", orderSchema);

app.post("/placeorder", async (req, res) => {
  try {
    const { products, subtotal, shippingFee, total } = req.body;

    const newOrder = new Order({
      products,
      subtotal,
      shippingFee,
      total,
    });

    await newOrder.save();
    res.status(401).json({ message: 'Order placed successfully', orderId: newOrder._id });
  } catch (err) {
    console.error('Error placing order:', error);
        res.status(500).json({ message: 'Failed to place order' });
  }
});

const contectSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
});

const Contect = mongoose.model("Contect", contectSchema);

app.post("/contect", async (req, res) => {
  const { name, email, message } = req.body;
  const contect = new Contect({ name, email, message });
  try {
    await contect.save();
    res.status(201).json(contect);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


  
  // Set up routes
  app.get('/admin', async (req, res) => {
    try {
      const data = await YourData.find();
      res.render('admin', { data }); // Render admin view with data
    } catch (err) {
      res.status(500).send('Internal Server Error');
    }
  });
  
  // Set up view engine
  app.set('view engine', 'ejs');
  app.set('views', __dirname + '/views');

app.listen(port, (error) => {
  if (!error) {
    console.log("Server Running on port" + port);
  } else {
    console.log("Error :" + error);
  }
});
