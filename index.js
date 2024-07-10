const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@atlascluster.j32tjfb.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster`;
// console.log(uri);

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
const productsCollection = client.db('workoutGear').collection('products');
// const donationRequestCollection = client
//   .db('bloodAid')
//   .collection('donationRequest');
// const blogCollection = client.db('bloodAid').collection('blogData');

app.get('/', (req, res) => {
  res.json('Workout Gear Server!');
});

//!  Product Management Starts
//* Get all products
app.get('/api/v1/products', async (req, res) => {
  try {
    const { search, categories, minPrice, maxPrice, sort } = req.query;

    let query = {};

    //search
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // category filter
    if (categories) {
      const categoryList = categories.split(',');
      query.category = { $in: categoryList };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Sorting
    let sortOption = {};
    if (sort === 'priceAsc') {
      sortOption = { price: 1 };
    } else if (sort === 'priceDesc') {
      sortOption = { price: -1 };
    }

    const products = await productsCollection
      .find(query)
      .sort(sortOption)
      .toArray();

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No products found matching the criteria',
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: 'Products retrieved succesfully',
      data: products,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error?.message : null,
    });
  }
});

//* Get a product by ID
app.get('/api/v1/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await productsCollection.findOne({ _id: new ObjectId(id) });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Product retrieved succesfully',
      data: product,
    });
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error?.message : null,
    });
  }
});

//* Create a new product
app.post('/api/v1/products', async (req, res) => {
  const { name, price, description, images, category, stock } = req.body;
  const newProduct = { name, price, description, images, category, stock };
  try {
    const result = await productsCollection.insertOne(newProduct);

    // Fetch the newly inserted document
    const insertedProduct = await productsCollection.findOne({
      _id: result.insertedId,
    });

    if (!insertedProduct) {
      return res.status(500).json({
        success: false,
        message: 'Add product failed',
      });
    }

    // res.status(201).send(insertedProduct);
    res.status(201).json({
      success: true,
      message: 'Product added succesfully',
      data: insertedProduct,
    });
  } catch (error) {
    console.error('Error creating new product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error?.message : null,
    });
  }
});

//* Update a product by ID
app.put('/api/v1/products/:id', async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateProduct = req.body;

  // Dynamically construct the updateFields object
  const updateFields = {};
  if (updateProduct.name !== undefined) updateFields.name = updateProduct.name;
  if (updateProduct.images !== undefined)
    updateFields.images = updateProduct.images;
  if (updateProduct.price !== undefined)
    updateFields.price = updateProduct.price;
  if (updateProduct.description !== undefined)
    updateFields.description = updateProduct.description;
  if (updateProduct.category !== undefined)
    updateFields.category = updateProduct.category;
  if (updateProduct.stock !== undefined)
    updateFields.stock = updateProduct.stock;

  const updateDocument = { $set: updateFields };

  try {
    const result = await productsCollection.findOneAndUpdate(
      filter,
      updateDocument,
      { returnDocument: 'after', upsert: false }
    );
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error?.message : null,
    });
  }
});

//* Delete a product by ID
app.delete('/api/v1/products/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await productsCollection.findOneAndDelete({
      _id: new ObjectId(id),
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Product deleted succesfully',
      data: result,
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error?.message : null,
    });
  }
});
//!  Product Management ends

app.listen(port, () => {
  console.log(`Workout Gear is running on port:${port}`);
});
