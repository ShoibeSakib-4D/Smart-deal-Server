const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

const express = require('express')
const cors = require('cors');
require('dotenv').config()

const jwt = require('jsonwebtoken');

const app = express()

const admin = require("firebase-admin");

const port = process.env.PORT || 5000;
//const uri = "mongodb+srv://smartuserdb:2BvWmlCtA2sUvlbk@cluster0.llva5me.mongodb.net/?appName=Cluster0";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.llva5me.mongodb.net/?appName=Cluster0`;

app.use(cors())
app.use(express.json())

//-------firebase service account --------------------


const serviceAccount = require("./smart-deal-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


//verify middleware for the firebase token

/* const fireBaseToken = async(req, res, next) =>{
   console.log("from verify middleware", req.headers.authorization)
   if(!req.headers.authorization)
   {
    return res.status(401).send({message:"Headers not found"})
   }

   const token = req.headers.authorization.split(' ')[1]
   if(!token)
   {
    return res.status(401).send({message:"Token not found"})
   }

  try{
      const userDetail = await admin.auth().verifyIdToken(token)
      req.token_email = userDetail.email;

      console.log("after token validation",userDetail)
      next();

   }
   catch{
    return res.status(401).send({message:"Token not founddddddddddddddd"})

   }


  } */

   //token veryfied for create product

   const verifyFirebaseToken = async (req, res, next) =>
   {
    const authorization = req.headers.authorization;

    if(!authorization)
    {
      return res.status(401).send({message : 'Unauthorized Access'})
    }

    const token = authorization.split(' ')[1]


try{
  const decode = await admin.auth().verifyIdToken(token)
  console.log('inside token', decode)
  req.token_email = decode.email;
  next();
}
catch (error){
   return res.status(401).send({message:"Unauthorised Access"})
}

   }




/* const jwtToken = async(req, res, next) =>{
  console.log(req.headers)
  if(!req.headers.authorization)
  {
    return res.status(401).send({message:"Headers Not Found"})
  }

  const token = req.headers.authorization.split(' ')[1]
  if(!token)
  {
    return res.status(401).send({message:"Token not found"})
  }



  jwt.verify(token,process.env.JWT_TOKEN , (err,decode)=>{
    if(err)
    {
      return res.status(401).send({message:"Unauthorized Access"})
    }
     console.log('after decoded',decode)
     req.token_email = decode.email;
    next()
   })
} */

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get('/', (req, res) => {
  res.send('Hello World!')
})

async function run() {
  try {

         // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

   const db = client.db("smart_db");

   const productCollection = db.collection("products");
   const bidCollection = db.collection("bids")



// <-------------------------------Products---------------------------->
   app.post("/products",verifyFirebaseToken,async(req,res)=>{

    console.log('post req for the creatProduct',req.headers)

    const product = req.body;
    const result = await productCollection.insertOne(product)
    res.send(result)
   })

   app.delete("/products/:id",async(req, res)=>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id)}
      const result = await productCollection.deleteOne(query)
      res.send(result)
   })

   //update
 app.patch("/products/:id",async(req,res)=>{

  const id = req.params.id;
  const updateData = req.body;

  const query = { _id : new ObjectId(id)}

  const update = { $set : {name: updateData.name, price : updateData.price}}

  const result = await productCollection.updateOne(query, update)
  res.send(result)

 })

 app.get("/products",async(req, res)=> {
  const cursor = productCollection.find({})
  const result = await cursor.toArray()
  res.send(result)
 })

 app.get("/products/:id",async(req,res)=>{
  const id = req.params.id;
  const query = { _id : new ObjectId(id)}
  const result = await productCollection.findOne(query)
  res.send(result)
 })
    
 app.get("/recent-products",async(req,res)=> {
  const cursor = productCollection.find({}).sort({created_at: -1}).limit(8)
  const result = await cursor.toArray()
  res.send(result)
 })

//<---------------------------------bids---------------------------->

app.post("/bids",async (req, res) =>{
  const bid = req.body;
  const result = await bidCollection.insertOne(bid)
  res.send(result)
})

//-------------see how many bids i have done so far---------------

app.get("/bids",verifyFirebaseToken, async(req,res)=>{
  const email = req.query.email; //request theke email ta nibo

  //Token
 
  const query = {} 
  // query = {buyer_email = "chudlingpong@gmail.com"}

  if(email)
  {
    query.buyer_email = email
    if(email !== req.token_email)
    {
      return res.status(401).send({message : 'FORBIDDEN ACCESS'})
    }
  }

  if(email !== req.token_email)
  {
    return res.status(403).send({message : "Forbidden Access"})
  }

  const cursor = bidCollection.find(query).sort({bid_price : -1})
  const result = await cursor.toArray()
  res.send(result)

})

//-----------bids for a single product--------------
app.get("/products/bids/:productId",async(req,res)=>{
  const productId = req.params.productId;
  const query = {product: productId} //ekhane search ID set kora

 // const cursor = bidCollection.find(query).sort({bid_price : -1})
  // const result = await cursor.toArray();

  const result = await bidCollection.find(query).sort({bid_price : -1}).toArray()

  res.send(result)
})

//-------------Delete any of my Bid-----------

app.delete("/bids/:id", async(req, res)=> {
    const id = req.params.id;
    const query = { _id : new ObjectId(id)}
    const result = await bidCollection.deleteOne(query)
    res.send(result)
})


//-----------------------JWT TOKEN-------------------------------

app.post('/getToken',(req,res)=>{

  const userEmail = req.body;

  const token = jwt.sign(userEmail,process.env.JWT_TOKEN, { expiresIn: '1h' });
  res.send({token : token})


})

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error(error);
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})