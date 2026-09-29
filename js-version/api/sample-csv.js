module.exports = function handler(req, res) {
  const sampleProducts = [
    ["Product Name", "Category", "Price"],
    ["Apple iPhone 15 Pro 128GB Black Titanium", "Smartphones", "$999"],
    ["Sony WH-1000XM5 Wireless Noise Canceling Headphones Silver", "Audio", "$399"],
    ["Nike Air Jordan 1 Retro High OG Chicago", "Footwear", "$180"],
    ["Logitech MX Master 3S Wireless Performance Mouse", "Accessories", "$99"],
    ["Dyson V15 Detect Cordless Vacuum Cleaner Yellow/Nickel", "Home Appliances", "$749"],
    ["Nutella Hazelnut Spread with Cocoa 750g Jar", "Groceries", "$6.99"],
    ["Samsung 65-Inch Class OLED 4K S90C Series Smart TV", "Television", "$1599"],
    ["Nintendo Switch OLED Model with White Joy-Con", "Gaming", "$349"],
    ["Stanley Quencher H2.0 FlowState Stainless Steel Tumbler 40oz", "Kitchen", "$45"],
    ["Ray-Ban Classic Polarized Wayfarer Sunglasses Black", "Eyewear", "$210"]
  ];

  const csvContent = sampleProducts.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=sample_products.csv');
  return res.status(200).send(csvContent);
};
