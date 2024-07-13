const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@atlascluster.j32tjfb.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster`;

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

const productsCollection = client.db('workoutGear').collection('products');

app.get('/', (req, res) => {
  res.json('Workout Gear Server!');
});

// Fetch all products with filters and sorting
app.get('/api/v1/products', async (req, res) => {
  try {
    const { search, categories, minPrice, maxPrice, sort } = req.query;

    let query = {};

    // Search
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Category filter
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
      message: 'Products retrieved successfully',
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

// Fetch a product by ID
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
      message: 'Product retrieved successfully',
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

// Create a new product
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

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
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

// Update a product by ID
app.put('/api/v1/products/:id', async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateProduct = req.body;

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

// Delete a product by ID
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
      message: 'Product deleted successfully',
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

// Checkout Endpoint
app.post('/api/v1/checkout', async (req, res) => {
  const { cartItems, userDetails } = req.body;

  try {
    // Iterate through cart items to update stock
    for (const item of cartItems) {
      const product = await productsCollection.findOne({
        _id: new ObjectId(item.productId),
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.productId} not found`,
        });
      }

      if (item.quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Requested quantity for ${product.name} exceeds available stock`,
          availableQuantity: product.stock,
        });
      }

      // Deduct the ordered quantity from the product's stock
      await productsCollection.updateOne(
        { _id: new ObjectId(item.productId) },
        { $inc: { stock: -item.quantity } }
      );
    }

    // Process cash on delivery
    // You can add logic to save order details to a database or perform other actions here

    res.status(200).json({
      success: true,
      message: 'Checkout completed successfully',
    });
  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error?.message : null,
    });
  }
});

app.listen(port, () => {
  console.log(`Workout Gear is running on port:${port}`);
});
