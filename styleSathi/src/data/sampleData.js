export const categories = [
  { id: 1, name: 'Rings', count: 15 },
  { id: 2, name: 'Glasses', count: 12 },
  { id: 3, name: 'Watches', count: 8 },
  { id: 4, name: 'Shoes', count: 20 },
];
import Watch from '/Mywork/styleSathiFrontend/styleSathi/src/assets/images/watch.png';
import Ring from '/Mywork/styleSathiFrontend/styleSathi/src/assets/images/Rings.png';
import Glasses from '/Mywork/styleSathiFrontend/styleSathi/src/assets/images/Glasses.png';
import Shoes from '/Mywork/styleSathiFrontend/styleSathi/src/assets/images/Shoes.png';
import AR_VR from '/Mywork/styleSathiFrontend/styleSathi/src/assets/images/AR & VR.png';
export const sampleProducts = [
  {
    id: 'f1',
    title: 'Premium Diamond Ring',
    price: 1299.99,
    originalPrice: 1599.99,
    category: 'Rings',
    brand: 'Tiffany & Co.',
    description: 'Exquisite premium diamond ring with exceptional clarity and cut.',
    imageUrl:Ring ,
    inStock: true,
    rating: 4.8,
    features: ['18K White Gold', '2.5 Carat Diamond', 'VS1 Clarity', 'Excellent Cut']
  },
  {
    id: 'f2',
    title: 'Luxury Watch Collection',
    price: 899.99,
    originalPrice: 1199.99,
    category: 'Watches',
    brand: 'Rolex',
    description: 'Elegant luxury watch with precision movement and premium materials.',
    imageUrl: Watch,
    inStock: true,
    rating: 4.9,
    features: ['Swiss Movement', 'Sapphire Crystal', 'Water Resistant', 'Stainless Steel']
  },
  {
    id: 'f3',
    title: 'Designer Sunglasses',
    price: 299.99,
    originalPrice: 399.99,
    category: 'Glasses',
    brand: 'Ray-Ban',
    description: 'Stylish designer sunglasses with UV protection and polarized lenses.',
    imageUrl: Glasses,
    inStock: true,
    rating: 4.6,
    features: ['Polarized Lenses', 'UV Protection', 'Lightweight Frame', 'Case Included']
  },
  {
    id: 'f5',
    title: 'Smart Watch Pro',
    price: 349.99,
    originalPrice: 449.99,
    category: 'Watches',
    brand: 'Apple',
    description: 'Advanced smartwatch with health monitoring and fitness tracking.',
    imageUrl: Watch,
    inStock: true,
    rating: 4.7,
    features: ['Heart Rate Monitor', 'GPS', 'Water Resistant', 'iOS & Android']
  },
  {
    id: 'f6',
    title: 'Classic Loafers',
    price: 199.99,
    originalPrice: 249.99,
    category: 'Shoes',
    brand: 'Cole Haan',
    description: 'Comfortable classic loafers made from genuine leather with cushioned insoles.',
    imageUrl: Shoes,
    inStock: true,
    rating: 4.5,
    features: ['Genuine Leather', 'Cushioned Insole', 'Rubber Sole', 'Multiple Colors']
  }
];