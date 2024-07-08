const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@atlascluster.j32tjfb.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster`;
console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const dbConnect = async () => {
  try {
    // await client.connect();
    console.log('Database Connected!');
  } catch (error) {
    console.log(error.name, error.message);
  }
};
dbConnect();

//! Database Collection
// const userInfoCollection = client.db('bloodAid').collection('userInfo');
// const donationRequestCollection = client
//   .db('bloodAid')
//   .collection('donationRequest');
// const blogCollection = client.db('bloodAid').collection('blogData');

app.get('/', (req, res) => {
  res.send('Workout Gear Server!');
});

app.listen(port, () => {
  console.log(`Workout Gear is running on port:${port}`);
});
