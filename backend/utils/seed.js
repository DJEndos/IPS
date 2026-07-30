require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const { Inventory } = require('../models/Inventory');

const seedData = async () => {
  try {
    await connectDB();

    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany(),
      Category.deleteMany(),
      Product.deleteMany(),
      Supplier.deleteMany(),
      Inventory.deleteMany(),
    ]);

    console.log('Seeding users...');
    await User.create([
      { name: 'System Admin', email: 'admin@possystem.com', password: 'Admin@12345', role: 'admin' },
      { name: 'Store Manager', email: 'manager@possystem.com', password: 'Manager@12345', role: 'manager' },
      { name: 'Cashier One', email: 'cashier@possystem.com', password: 'Cashier@12345', role: 'cashier' },
    ]);

    console.log('Seeding categories...');
    const categories = await Category.create([
      { name: 'Beverages', description: 'Soft drinks, juices, water' },
      { name: 'Groceries', description: 'Rice, beans, garri, spices' },
      { name: 'Toiletries', description: 'Soap, detergents, personal care' },
      { name: 'Electronics', description: 'Small electronics and accessories' },
    ]);

    console.log('Seeding suppliers...');
    const suppliers = await Supplier.create([
      { name: 'Lagos FMCG Distributors', phone: '08012345678', email: 'sales@lagosfmcg.ng', address: 'Ikeja, Lagos' },
      { name: 'Kano Grains & Foods', phone: '08023456789', email: 'info@kanograins.ng', address: 'Kano' },
    ]);

    console.log('Seeding products + inventory...');
    const products = await Product.create([
      {
        name: 'Coca-Cola 50cl',
        sku: 'BEV-COKE-50',
        barcode: '6001240123456',
        category: categories[0]._id,
        supplier: suppliers[0]._id,
        costPrice: 250,
        sellingPrice: 350,
        taxRate: 7.5,
        unit: 'bottle',
        reorderLevel: 20,
      },
      {
        name: 'Rice 50kg Bag',
        sku: 'GRO-RICE-50',
        barcode: '6001240234567',
        category: categories[1]._id,
        supplier: suppliers[1]._id,
        costPrice: 45000,
        sellingPrice: 52000,
        taxRate: 0,
        unit: 'bag',
        reorderLevel: 5,
      },
      {
        name: 'Dettol Soap 100g',
        sku: 'TOI-DETTOL-100',
        barcode: '6001240345678',
        category: categories[2]._id,
        supplier: suppliers[0]._id,
        costPrice: 350,
        sellingPrice: 500,
        taxRate: 7.5,
        unit: 'pcs',
        reorderLevel: 15,
      },
    ]);

    await Inventory.create(
      products.map((p, i) => ({
        product: p._id,
        quantityInStock: [100, 20, 60][i],
        lastRestockedAt: new Date(),
      }))
    );

    console.log('Seed complete!');
    console.log('Login credentials:');
    console.log('  Admin:    admin@possystem.com / Admin@12345');
    console.log('  Manager:  manager@possystem.com / Manager@12345');
    console.log('  Cashier:  cashier@possystem.com / Cashier@12345');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
