const mongoose = require('mongoose');
const User = require('../model/Profile');
const TravelDetails = require('../model/traveldetails');
const ConsignmentDetails = require('../model/consignment.model');
const ConsignmentHistory = require('../model/travel.history');

class ReportController {
  // Helper function to retry database operations
  static async retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.log(`⚠️ Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  // Helper function to safely format dates
  static formatDate(dateValue) {
    if (!dateValue) return 'N/A';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toISOString().split('T')[0];
    } catch (error) {
      return 'N/A';
    }
  }

  // Helper function to create user lookup map
  static createUserMap(users) {
    const userMap = {};
    users.forEach(user => {
      userMap[user.phoneNumber] = user;
    });
    return userMap;
  }

  // Helper function to format amount to 2 decimal places
  static formatAmount(amount) {
    return parseFloat(amount || 0).toFixed(2);
  }

  // Helper function to generate 10-digit phone number
  // static generatePhoneNumber() {
  //   return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  // }

  // // Generate dummy user profiles
  // static generateDummyUsers() {
  //   const users = [];
  //   const names = [
  //     'John Smith', 'Emma Johnson', 'Michael Brown', 'Sarah Davis', 'David Wilson',
  //     'Lisa Anderson', 'James Taylor', 'Jennifer Martinez', 'Robert Garcia', 'Amanda Rodriguez',
  //     'William Lee', 'Michelle White', 'Christopher Hall', 'Jessica Allen', 'Daniel Young',
  //     'Ashley King', 'Matthew Wright', 'Nicole Green', 'Joshua Baker', 'Stephanie Adams'
  //   ];
  //   const addresses = [
  //     '123 Main Street, Mumbai, Maharashtra',
  //     '456 Park Avenue, Delhi, Delhi',
  //     '789 Lake Road, Bangalore, Karnataka',
  //     '321 Hill Street, Chennai, Tamil Nadu',
  //     '654 Ocean Drive, Kolkata, West Bengal',
  //     '987 Mountain View, Hyderabad, Telangana',
  //     '147 River Side, Pune, Maharashtra',
  //     '258 Garden Lane, Ahmedabad, Gujarat',
  //     '369 Sunset Boulevard, Jaipur, Rajasthan',
  //     '741 Golden Gate, Lucknow, Uttar Pradesh'
  //   ];
  //   const vehicleTypes = ['Car', 'Bike', 'Van', 'Truck', 'Auto'];
  //   const vehicleNumbers = ['MH01AB1234', 'DL02CD5678', 'KA03EF9012', 'TN04GH3456', 'WB05IJ7890'];

  //   // Generate consistent phone numbers for better data mapping
  //   const phoneNumbers = [];
  //   for (let i = 0; i < 20; i++) {
  //     phoneNumbers.push(ReportController.generatePhoneNumber());
  //   }

  //   for (let i = 0; i < 20; i++) {
  //     const [firstName, lastName] = names[i].split(' ');
  //     const isTraveler = i < 10;
  //     users.push({
  //       _id: `user_${i + 1}`,
  //       userId: `user_${i + 1}`,
  //       firstName,
  //       lastName,
  //       phoneNumber: phoneNumbers[i], // Use consistent phone numbers
  //       email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
  //       role: isTraveler ? 'traveler' : 'sender',
  //       currentLocation: {
  //         coordinates: [Math.random() * 180 - 90, Math.random() * 360 - 180]
  //       },
  //       address: addresses[Math.floor(Math.random() * addresses.length)],
  //       averageRating: (Math.random() * 5).toFixed(1),
  //       totalrating: Math.floor(Math.random() * 100),
  //       isVerified: Math.random() > 0.3,
  //       profilePicture: `https://example.com/profile_${i + 1}.jpg`,
  //       // Traveler specific fields
  //       vehicleType: isTraveler ? vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)] : null,
  //       vehicleNumber: isTraveler ? vehicleNumbers[Math.floor(Math.random() * vehicleTypes.length)] : null,
  //       licenseNumber: isTraveler ? `DL${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}` : null,
  //       experience: isTraveler ? Math.floor(Math.random() * 10) + 1 : null,
  //       totalTrips: isTraveler ? Math.floor(Math.random() * 500) + 10 : null,
  //       totalEarnings: isTraveler ? ReportController.formatAmount(Math.random() * 50000 + 5000) : null,
  //       // Sender specific fields
  //       businessName: !isTraveler ? `${firstName} ${lastName} Enterprises` : null,
  //       businessType: !isTraveler ? ['Retail', 'Manufacturing', 'Services', 'E-commerce'][Math.floor(Math.random() * 4)] : null,
  //       totalConsignments: !isTraveler ? Math.floor(Math.random() * 200) + 10 : null,
  //       totalSpent: !isTraveler ? ReportController.formatAmount(Math.random() * 100000 + 10000) : null,
  //       // Common fields
  //       dateOfBirth: new Date(1980 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
  //       gender: ['Male', 'Female', 'Other'][Math.floor(Math.random() * 3)],
  //       emergencyContact: ReportController.generatePhoneNumber(),
  //       emergencyContactName: names[Math.floor(Math.random() * names.length)],
  //       createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
  //       lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  //     });
  //   }
  //   return users;
  // }

  // // Generate dummy travel details
  // static generateDummyTravelDetails() {
  //   const travels = [];
  //   const travelModes = ['Car', 'Bike', 'Bus', 'Train', 'Flight', 'Van', 'Truck', 'Auto'];
  //   const statuses = ['Pending', 'In Progress', 'Completed', 'Cancelled', 'Delayed', 'Rescheduled'];
  //   const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
  //   const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'Motorcycle', 'Scooter', 'Van', 'Truck', 'Auto Rickshaw'];
  //   const paymentMethods = ['UPI', 'Card', 'Net Banking', 'Cash', 'Wallet'];

  //   // Generate consistent phone numbers for travelers (first 10 users)
  //   const travelerPhoneNumbers = [];
  //   for (let i = 0; i < 10; i++) {
  //     travelerPhoneNumbers.push(ReportController.generatePhoneNumber());
  //   }

  //   for (let i = 0; i < 50; i++) {
  //     const travelDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
  //     const startTime = new Date(travelDate.getTime() + Math.random() * 24 * 60 * 60 * 1000);
  //     const endTime = new Date(startTime.getTime() + Math.random() * 12 * 60 * 60 * 1000);
  //     const actualStartTime = Math.random() > 0.3 ? new Date(startTime.getTime() + Math.random() * 60 * 60 * 1000) : null;
  //     const actualEndTime = Math.random() > 0.5 ? new Date(endTime.getTime() + Math.random() * 60 * 60 * 1000) : null;
      
  //     const baseAmount = Math.random() * 5000 + 500;
  //     const discount = Math.random() * 500;
  //     const finalAmount = baseAmount - discount;
      
  //     travels.push({
  //       travelId: `travel_${i + 1}`,
  //       phoneNumber: travelerPhoneNumbers[i % 10], // Use consistent traveler phone numbers
  //       Leavinglocation: cities[Math.floor(Math.random() * cities.length)],
  //       Goinglocation: cities[Math.floor(Math.random() * cities.length)],
  //       fullFrom: cities[Math.floor(Math.random() * cities.length)],
  //       fullTo: cities[Math.floor(Math.random() * cities.length)],
  //       travelMode: travelModes[Math.floor(Math.random() * travelModes.length)],
  //       travelmode_number: Math.floor(Math.random() * 1000) + 1,
  //       vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
  //       vehicleNumber: `MH${Math.floor(Math.random() * 100).toString().padStart(2, '0')}AB${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
  //       travelDate: travelDate,
  //       expectedStartTime: startTime,
  //       expectedEndTime: endTime,
  //       actualStartTime: actualStartTime,
  //       actualEndTime: actualEndTime,
  //       endDate: endTime,
  //       distance: Math.floor(Math.random() * 1000) + 50,
  //       duration: Math.floor(Math.random() * 24) + 1,
  //       expectedearning: ReportController.formatAmount(baseAmount),
  //       payableAmount: ReportController.formatAmount(finalAmount),
  //       baseAmount: ReportController.formatAmount(baseAmount),
  //       discount: ReportController.formatAmount(discount),
  //       weight: Math.floor(Math.random() * 100) + 10,
  //       TE: Math.floor(Math.random() * 50) + 5,
  //       status: statuses[Math.floor(Math.random() * statuses.length)],
  //       startedat: actualStartTime,
  //       endedat: actualEndTime,
  //       paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
  //       paymentStatus: ['Pending', 'Completed', 'Failed'][Math.floor(Math.random() * 3)],
  //       averageRating: (Math.random() * 5).toFixed(1),
  //       totalrating: Math.floor(Math.random() * 50),
  //       review: Math.random() > 0.7 ? `Great service! Travel was smooth and on time.` : null,
  //       specialInstructions: Math.random() > 0.8 ? 'Handle with care, fragile items' : null,
  //       insuranceAmount: ReportController.formatAmount(Math.random() * 1000 + 100),
  //       fuelCost: ReportController.formatAmount(Math.random() * 500 + 50),
  //       tollCharges: ReportController.formatAmount(Math.random() * 200 + 20),
  //       createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
  //       updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  //     });
  //   }
  //   return travels;
  // }

  // // Generate dummy consignment details
  // static generateDummyConsignments() {
  //   const consignments = [];
  //   const categories = ['Electronics', 'Clothing', 'Books', 'Food', 'Furniture', 'Documents', 'Automotive', 'Healthcare', 'Sports', 'Jewelry'];
  //   const subcategories = {
  //     'Electronics': ['Mobile', 'Laptop', 'Tablet', 'Camera', 'Headphones', 'Speaker'],
  //     'Clothing': ['Shirts', 'Pants', 'Dresses', 'Shoes', 'Bags', 'Accessories'],
  //     'Books': ['Novels', 'Textbooks', 'Magazines', 'Comics', 'Reference', 'Children'],
  //     'Food': ['Snacks', 'Fruits', 'Vegetables', 'Beverages', 'Dairy', 'Frozen'],
  //     'Furniture': ['Chairs', 'Tables', 'Beds', 'Sofas', 'Cabinets', 'Lighting'],
  //     'Documents': ['Legal', 'Personal', 'Business', 'Educational', 'Medical', 'Financial'],
  //     'Automotive': ['Spare Parts', 'Tools', 'Accessories', 'Lubricants', 'Tires'],
  //     'Healthcare': ['Medicines', 'Equipment', 'Supplies', 'Devices', 'Vitamins'],
  //     'Sports': ['Equipment', 'Clothing', 'Shoes', 'Accessories', 'Fitness'],
  //     'Jewelry': ['Gold', 'Silver', 'Diamond', 'Pearl', 'Platinum', 'Fashion']
  //   };
  //   const statuses = ['Pending', 'Accepted', 'In Progress', 'Completed', 'Delivered', 'Cancelled', 'Returned', 'Lost'];
  //   const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
  //   const paymentMethods = ['UPI', 'Card', 'Net Banking', 'Cash', 'Wallet', 'COD'];
  //   const deliveryTypes = ['Standard', 'Express', 'Same Day', 'Next Day', 'Scheduled'];

  //   // Generate consistent phone numbers for senders (last 10 users)
  //   const senderPhoneNumbers = [];
  //   for (let i = 0; i < 10; i++) {
  //     senderPhoneNumbers.push(ReportController.generatePhoneNumber());
  //   }

  //   for (let i = 0; i < 80; i++) {
  //     const dateOfSending = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
  //     const category = categories[Math.floor(Math.random() * categories.length)];
  //     const subcategory = subcategories[category][Math.floor(Math.random() * subcategories[category].length)];
      
  //     const baseAmount = Math.random() * 3000 + 200;
  //     const insuranceAmount = Math.random() * 500 + 50;
  //     const totalAmount = baseAmount + insuranceAmount;
      
  //     consignments.push({
  //       consignmentId: `consignment_${i + 1}`,
  //       phoneNumber: senderPhoneNumbers[i % 10], // Use consistent sender phone numbers
  //       Description: `${category} - ${subcategory} consignment ${i + 1}`,
  //       category: category,
  //       subcategory: subcategory,
  //       weight: Math.floor(Math.random() * 50) + 1,
  //       dimensionalweight: Math.floor(Math.random() * 30) + 1,
  //       dimensions: `${Math.floor(Math.random() * 100) + 10}x${Math.floor(Math.random() * 100) + 10}x${Math.floor(Math.random() * 100) + 10}`,
  //       distance: Math.floor(Math.random() * 1000) + 50,
  //       duration: Math.floor(Math.random() * 72) + 1,
  //       earning: ReportController.formatAmount(baseAmount),
  //       insuranceAmount: ReportController.formatAmount(insuranceAmount),
  //       totalAmount: ReportController.formatAmount(totalAmount),
  //       startinglocation: cities[Math.floor(Math.random() * cities.length)],
  //       goinglocation: cities[Math.floor(Math.random() * cities.length)],
  //       recievername: `Receiver ${i + 1}`,
  //       recieverphone: ReportController.generatePhoneNumber(),
  //       receiverEmail: `receiver${i + 1}@example.com`,
  //       status: statuses[Math.floor(Math.random() * statuses.length)],
  //       handleWithCare: Math.random() > 0.7,
  //       specialRequest: Math.random() > 0.8 ? 'Handle with extra care, fragile items' : null,
  //       deliveryType: deliveryTypes[Math.floor(Math.random() * deliveryTypes.length)],
  //       paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
  //       paymentStatus: ['Pending', 'Completed', 'Failed', 'Refunded'][Math.floor(Math.random() * 4)],
  //       trackingNumber: `TN${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
  //       estimatedDelivery: new Date(dateOfSending.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
  //       actualDelivery: Math.random() > 0.6 ? new Date(dateOfSending.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
  //       pickupDate: new Date(dateOfSending.getTime() - Math.random() * 24 * 60 * 60 * 1000),
  //       pickupTime: new Date(dateOfSending.getTime() - Math.random() * 12 * 60 * 60 * 1000),
  //       deliveryDate: Math.random() > 0.6 ? new Date(dateOfSending.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
  //       deliveryTime: Math.random() > 0.6 ? new Date(dateOfSending.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
  //       signature: Math.random() > 0.6 ? `Receiver_${i + 1}_Signature` : null,
  //       notes: Math.random() > 0.7 ? `Special handling required for ${category} items` : null,
  //       dateOfSending: dateOfSending,
  //       createdAt: new Date(dateOfSending.getTime() - Math.random() * 24 * 60 * 60 * 1000),
  //       updatedAt: new Date(dateOfSending.getTime() + Math.random() * 24 * 60 * 60 * 1000)
  //     });
  //   }
  //   return consignments;
  // }

  // // Generate dummy consignment history
  // static generateDummyConsignmentHistory() {
  //   const history = [];
  //   const travelModes = ['Car', 'Bike', 'Bus', 'Train', 'Flight', 'Van', 'Truck', 'Auto'];
  //   const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
  //   const statuses = ['Pending', 'Accepted', 'In Progress', 'Completed', 'Delivered', 'Cancelled', 'Returned', 'Lost'];
  //   const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'Motorcycle', 'Scooter', 'Van', 'Truck', 'Auto Rickshaw'];

  //   for (let i = 0; i < 60; i++) {
  //     const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
  //     const delivered = Math.random() > 0.6 ? new Date(timestamp.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null;
  //     const pickupTime = new Date(timestamp.getTime() + Math.random() * 2 * 60 * 60 * 1000);
  //     const deliveryTime = delivered ? new Date(delivered.getTime() + Math.random() * 2 * 60 * 60 * 1000) : null;
      
  //     const baseEarning = Math.random() * 2000 + 300;
  //     const commission = baseEarning * 0.1; // 10% commission
  //     const netEarning = baseEarning - commission;
      
  //     history.push({
  //       consignmentId: `consignment_${i + 1}`,
  //       senderPhoneNumber: ReportController.generatePhoneNumber(),
  //       description: `Detailed history for consignment ${i + 1}`,
  //       status: statuses[Math.floor(Math.random() * statuses.length)],
  //       expectedEarning: ReportController.formatAmount(baseEarning),
  //       commission: ReportController.formatAmount(commission),
  //       netEarning: ReportController.formatAmount(netEarning),
  //       distance: Math.floor(Math.random() * 800) + 50,
  //       category: ['Electronics', 'Clothing', 'Books', 'Food', 'Furniture', 'Automotive', 'Healthcare'][Math.floor(Math.random() * 7)],
  //       pickupLocation: cities[Math.floor(Math.random() * cities.length)],
  //       deliveryLocation: cities[Math.floor(Math.random() * cities.length)],
  //       delivered: delivered,
  //       pickupTime: pickupTime,
  //       deliveryTime: deliveryTime,
  //       actualDistance: Math.floor(Math.random() * 800) + 50,
  //       fuelCost: ReportController.formatAmount(Math.random() * 300 + 50),
  //       tollCharges: ReportController.formatAmount(Math.random() * 100 + 10),
  //       insuranceAmount: ReportController.formatAmount(Math.random() * 200 + 20),
  //       totalCost: ReportController.formatAmount(Math.random() * 500 + 100),
  //       profit: ReportController.formatAmount(Math.random() * 1000 + 200),
  //       traveldetails: [
  //         {
  //           travelId: `travel_${i + 1}`,
  //           phoneNumber: ReportController.generatePhoneNumber(),
  //           travelMode: travelModes[Math.floor(Math.random() * travelModes.length)],
  //           vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
  //           vehicleNumber: `MH${Math.floor(Math.random() * 100).toString().padStart(2, '0')}AB${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
  //           timestamp: timestamp,
  //           startTime: pickupTime,
  //           endTime: deliveryTime,
  //           actualDuration: Math.floor(Math.random() * 24) + 1,
  //           status: ['Active', 'Completed', 'Cancelled'][Math.floor(Math.random() * 3)],
  //           rating: (Math.random() * 5).toFixed(1),
  //           review: Math.random() > 0.7 ? 'Excellent service, on time delivery' : null
  //         }
  //       ]
  //     });
  //   }
  //   return history;
  // }

  // // Generate dummy request for carry
  // static generateDummyRequestForCarry() {
  //   const requests = [];
  //   const statuses = ['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled', 'Expired'];
  //   const travelModes = ['Car', 'Bike', 'Bus', 'Train', 'Flight', 'Van', 'Truck', 'Auto'];
  //   const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'Motorcycle', 'Scooter', 'Van', 'Truck', 'Auto Rickshaw'];
  //   const paymentMethods = ['UPI', 'Card', 'Net Banking', 'Cash', 'Wallet'];

  //   for (let i = 0; i < 40; i++) {
  //     const createdAt = new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000);
  //     const dateandtimeofdelivery = Math.random() > 0.5 ? new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null;
  //     const acceptedAt = Math.random() > 0.3 ? new Date(createdAt.getTime() + Math.random() * 2 * 60 * 60 * 1000) : null;
      
  //     const baseEarning = Math.random() * 1500 + 200;
  //     const commission = baseEarning * 0.15; // 15% commission
  //     const netEarning = baseEarning - commission;
      
  //     requests.push({
  //       consignmentId: `consignment_${i + 1}`,
  //       travelId: `travel_${i + 1}`,
  //       travellername: `Traveler ${i + 1}`,
  //       travelerPhone: ReportController.generatePhoneNumber(),
  //       travelerEmail: `traveler${i + 1}@example.com`,
  //       earning: ReportController.formatAmount(baseEarning),
  //       commission: ReportController.formatAmount(commission),
  //       netEarning: ReportController.formatAmount(netEarning),
  //       travelmode: travelModes[Math.floor(Math.random() * travelModes.length)],
  //       vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
  //       vehicleNumber: `MH${Math.floor(Math.random() * 100).toString().padStart(2, '0')}AB${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
  //       status: statuses[Math.floor(Math.random() * statuses.length)],
  //       dateandtimeofdelivery: dateandtimeofdelivery,
  //       acceptedAt: acceptedAt,
  //       paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
  //       paymentStatus: ['Pending', 'Completed', 'Failed'][Math.floor(Math.random() * 3)],
  //       rating: (Math.random() * 5).toFixed(1),
  //       review: Math.random() > 0.6 ? 'Great service, highly recommended!' : null,
  //       specialInstructions: Math.random() > 0.7 ? 'Handle with care, fragile items' : null,
  //       insuranceAmount: ReportController.formatAmount(Math.random() * 300 + 50),
  //       fuelCost: ReportController.formatAmount(Math.random() * 200 + 30),
  //       tollCharges: ReportController.formatAmount(Math.random() * 100 + 10),
  //       totalCost: ReportController.formatAmount(Math.random() * 400 + 80),
  //       profit: ReportController.formatAmount(Math.random() * 800 + 150),
  //       createdAt: createdAt,
  //       updatedAt: new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000)
  //     });
  //   }
  //   return requests;
  // }

  // // Generate dummy earnings
  // static generateDummyEarnings() {
  //   const earnings = [];
  //   const paymentMethods = ['UPI', 'Card', 'Net Banking', 'Cash', 'Wallet'];
  //   const transactionTypes = ['Travel Payment', 'Consignment Payment', 'Bonus', 'Refund', 'Commission', 'Incentive', 'Penalty', 'Adjustment'];
  //   const transactionStatuses = ['Completed', 'Pending', 'Failed', 'Refunded', 'Cancelled'];

  //   for (let i = 0; i < 25; i++) {
  //     const transactions = [];
  //     const numTransactions = Math.floor(Math.random() * 15) + 5;
      
  //     for (let j = 0; j < numTransactions; j++) {
  //       const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
  //       const amount = Math.random() * 2000 + 100;
  //       const status = transactionStatuses[Math.floor(Math.random() * transactionStatuses.length)];
  //       const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        
  //       transactions.push({
  //         transactionId: `TXN${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
  //         title: transactionType,
  //         description: `${transactionType} for service ${j + 1}`,
  //         amount: ReportController.formatAmount(amount),
  //         status: status,
  //         paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
  //         timestamp: timestamp,
  //         referenceNumber: `REF${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
  //         bankTransactionId: status === 'Completed' ? `BANK${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}` : null,
  //         upiTransactionId: status === 'Completed' ? `UPI${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}` : null,
  //         notes: Math.random() > 0.7 ? 'Transaction processed successfully' : null
  //       });
  //     }

  //     const totalEarnings = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  //     const completedTransactions = transactions.filter(t => t.status === 'Completed');
  //     const pendingTransactions = transactions.filter(t => t.status === 'Pending');
  //     const failedTransactions = transactions.filter(t => t.status === 'Failed');

  //     earnings.push({
  //       phoneNumber: ReportController.generatePhoneNumber(),
  //       totalEarnings: ReportController.formatAmount(totalEarnings),
  //       completedEarnings: ReportController.formatAmount(completedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)),
  //       pendingEarnings: ReportController.formatAmount(pendingTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)),
  //       failedEarnings: ReportController.formatAmount(failedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)),
  //       totalTransactions: transactions.length,
  //       completedTransactions: completedTransactions.length,
  //       pendingTransactions: pendingTransactions.length,
  //       failedTransactions: failedTransactions.length,
  //       averageTransactionAmount: ReportController.formatAmount(totalEarnings / transactions.length),
  //       lastTransactionDate: transactions[transactions.length - 1]?.timestamp,
  //       transactions: transactions,
  //       // Additional fields
  //       monthlyEarnings: ReportController.formatAmount(totalEarnings * (Math.random() * 0.3 + 0.7)),
  //       yearlyEarnings: ReportController.formatAmount(totalEarnings * (Math.random() * 8 + 4)),
  //       commissionEarned: ReportController.formatAmount(totalEarnings * 0.1),
  //       bonusEarned: ReportController.formatAmount(Math.random() * 1000 + 200),
  //       penalties: ReportController.formatAmount(Math.random() * 100 + 10),
  //       netEarnings: ReportController.formatAmount(totalEarnings + Math.random() * 1000 - Math.random() * 100)
  //     });
  //   }
  //   return earnings;
  // }

  // Get Traveler Report (Enhanced) - Now shows each travel separately with dummy data
  static async getTravelerReport(req, res) {
    try {
      console.log('📊 Generating Traveler Report from Consignment Consolidated Data...');
      
      // Get query parameters for pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const skip = (page - 1) * limit;
      
      console.log('📄 Pagination params:', { page, limit, skip });

      const Consignment = require('../model/consignment.model');
      
      console.log('🔍 Starting traveler report from consolidated data...');
      
      // Debug: Check if we have any consignments at all
      const totalConsignments = await Consignment.countDocuments();
      console.log('📊 Total consignments in database:', totalConsignments);
      
      if (totalConsignments === 0) {
        console.log('⚠️ No consignments found in database');
        return res.status(200).json({
          data: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalRecords: 0,
            recordsPerPage: limit,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
      }
      
      // Debug: Get a sample consignment to see the structure
      const sampleConsignment = await Consignment.findOne();
      console.log('🔍 Sample consignment structure:', {
        consignmentId: sampleConsignment?.consignmentId,
        phoneNumber: sampleConsignment?.phoneNumber,
        earning: sampleConsignment?.earning,
        status: sampleConsignment?.status,
        startinglocation: sampleConsignment?.startinglocation
      });
      
      // Use the same aggregation pipeline as Consignment Consolidated Report
      const report = await Consignment.aggregate([
        // Debug: Add a stage to log initial data
        {
          $addFields: {
            debug_initial: {
              consignmentId: "$consignmentId",
              phoneNumber: "$phoneNumber",
              earning: "$earning",
              earningType: { $type: "$earning" },
              status: "$status"
            }
          }
        },
        
        // First get carryInfo to find travelId
        {
          $lookup: {
            from: "consignmenttocarries",
            localField: "consignmentId",
            foreignField: "consignmentId",
            as: "carryInfo"
          }
        },
        
        // Lookup travel details using travelId from carryInfo
        {
          $lookup: {
            from: "traveldetails",
            localField: "carryInfo.travelId",
            foreignField: "travelId",
            as: "travelDetails"
          }
        },
        
        // Debug: Log after travel details lookup
        {
          $addFields: {
            debug_travelDetails: {
              travelDetailsCount: { $size: "$travelDetails" },
              travelDetailsSample: { $arrayElemAt: ["$travelDetails", 0] },
              carryInfoSample: { $arrayElemAt: ["$carryInfo", 0] }
            }
          }
        },
        
        // Lookup traveler profiles
        {
          $lookup: {
            from: "profiles",
            localField: "travelDetails.phoneNumber",
            foreignField: "phoneNumber",
            as: "travelerProfiles"
          }
        },
        
        // Lookup consignment history
        {
          $lookup: {
            from: "consignmentrequesthistories",
            localField: "consignmentId",
            foreignField: "consignmentId",
            as: "consignmentHistory"
          }
        },
        
        // Debug: Log after consignment history lookup
        {
          $addFields: {
            debug_consignmentHistory: {
              historyCount: { $size: "$consignmentHistory" },
              historySample: { $arrayElemAt: ["$consignmentHistory", 0] }
            }
          }
        },
        
        // Lookup rider request
        {
          $lookup: {
            from: "requestforcarries",
            localField: "consignmentId",
            foreignField: "consignmentId",
            as: "riderRequest"
          }
        },
        
        // Lookup carry info
        {
          $lookup: {
            from: "consignmenttocarries",
            localField: "consignmentId",
            foreignField: "consignmentId",
            as: "carryInfo"
          }
        },
        
        // Debug: Log after all lookups
        {
          $addFields: {
            debug_allLookups: {
              riderRequestCount: { $size: "$riderRequest" },
              carryInfoCount: { $size: "$carryInfo" },
              carryInfoSample: { $arrayElemAt: ["$carryInfo", 0] }
            }
          }
        },
        
        // Filter: Only include consignments that have valid travel information
        // This ensures we only show consignments that are actually being carried by travelers
        {
          $match: {
            $and: [
              { "carryInfo.0": { $exists: true } },           // Must have carry info
              { "carryInfo.0.travelId": { $exists: true } }   // Must have a valid travelId
            ]
          }
        },
        
        // Project traveler-specific fields (each row is a unique travel)
        {
          $project: {
            // Debug fields
            debug_initial: 1,
            debug_travelDetails: 1,
            debug_consignmentHistory: 1,
            debug_allLookups: 1,
            
            "Traveler Id": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.phoneNumber", 0] },
                { $arrayElemAt: ["$travelDetails.userId", 0] },
                "N/A"
              ]
            },
            "Name": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.username", 0] },
                { $arrayElemAt: ["$travelerProfiles.name", 0] },
                "Unknown"
              ]
            },
            "Phone No": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.phoneNumber", 0] },
                "N/A"
              ]
            },
            "Address": {
              $ifNull: [
                {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: [{ $arrayElemAt: ["$travelDetails.Leavinglocation", 0] }, null] },
                        { $ne: [{ $arrayElemAt: ["$travelDetails.Goinglocation", 0] }, null] }
                      ]
                    },
                    then: {
                      $concat: [
                        { $ifNull: [{ $arrayElemAt: ["$travelDetails.Leavinglocation", 0] }, ""] },
                        " to ",
                        { $ifNull: [{ $arrayElemAt: ["$travelDetails.Goinglocation", 0] }, ""] }
                      ]
                    },
                    else: {
                      $ifNull: [
                        {
                          $concat: [
                            { $ifNull: [{ $arrayElemAt: ["$carryInfo.startinglocation", 0] }, ""] },
                            " to ",
                            { $ifNull: [{ $arrayElemAt: ["$carryInfo.droplocation", 0] }, ""] }
                          ]
                        },
                        "N/A"
                      ]
                    }
                  }
                },
                "N/A"
              ]
            },
            "State": "N/A", // Will be populated from profile lookup if needed
            "No of Consignment": 1, // Each row represents one consignment
            "Total Amount": {
              $ifNull: [
                {
                  $cond: {
                    if: { $eq: [{ $type: { $arrayElemAt: ["$carryInfo.earning", 0] } }, "string"] },
                    then: 0, // For now, use 0 for string values (will be processed in JavaScript)
                    else: { $toDouble: { $arrayElemAt: ["$carryInfo.earning", 0] } }
                  }
                },
                {
                  $ifNull: [
                    {
                      $cond: {
                        if: { $eq: [{ $type: { $arrayElemAt: ["$travelDetails.payableAmount", 0] } }, "object"] },
                        then: {
                          $let: {
                            vars: { earning: { $arrayElemAt: ["$travelDetails.payableAmount", 0] } },
                            in: "$$earning.totalFare"
                          }
                        },
                        else: { $toDouble: { $arrayElemAt: ["$travelDetails.payableAmount", 0] } }
                      }
                    },
                    { $ifNull: [{ $toDouble: "$earning" }, 0] }
                  ]
                }
              ]
            },
            "Traveler's Consignment": "$consignmentId",
            "Status of Consignment": {
              $ifNull: [{ $arrayElemAt: ["$travelDetails.status", 0] }, "$status"]
            },
            "Payment": {
              $cond: {
                if: { 
                  $gt: [
                    {
                      $ifNull: [
                        {
                          $cond: {
                            if: { $eq: [{ $type: { $arrayElemAt: ["$travelDetails.payableAmount", 0] } }, "object"] },
                            then: {
                              $let: {
                                vars: { earning: { $arrayElemAt: ["$travelDetails.payableAmount", 0] } },
                                in: "$$earning.totalFare"
                              }
                            },
                            else: { $toDouble: { $arrayElemAt: ["$travelDetails.payableAmount", 0] } }
                          }
                        },
                        0
                      ]
                    },
                    0
                  ]
                },
                then: {
                  $cond: {
                    if: { 
                      $in: [
                        { $ifNull: [{ $arrayElemAt: ["$travelDetails.status", 0] }, "$status"] },
                        ["Completed", "Delivered", "Accepted", "In Progress"]
                      ]
                    },
                    then: "Paid",
                    else: "Pending"
                  }
                },
                else: "Pending"
              }
            },
            
            // Additional fields for API compatibility
            travelId: { $arrayElemAt: ["$travelDetails.travelId", 0] },
            travelMode: { $arrayElemAt: ["$travelDetails.travelMode", 0] },
            travelDate: { $arrayElemAt: ["$travelDetails.travelDate", 0] },
            status: { $ifNull: [{ $arrayElemAt: ["$travelDetails.status", 0] }, "$status"] },
            createdAt: { $arrayElemAt: ["$travelDetails.createdAt", 0] },
            updatedAt: { $arrayElemAt: ["$travelDetails.updatedAt", 0] },
            consignmentId: 1
          }
        },
        
        // Add pagination
        { $skip: skip },
        { $limit: limit }
      ]);

      // Debug: Log the last few results
      console.log('🔍 Last 4 results from aggregation:');
      const lastResults = report.slice(-4);
      lastResults.forEach((item, index) => {
        console.log(`📊 Result ${report.length - 3 + index}:`, {
          consignmentId: item.consignmentId,
          travelerId: item["Traveler Id"],
          name: item["Name"],
          phoneNo: item["Phone No"],
          totalAmount: item["Total Amount"],
          status: item["Status of Consignment"],
          debug_initial: item.debug_initial,
          debug_travelDetails: item.debug_travelDetails,
          debug_consignmentHistory: item.debug_consignmentHistory,
          debug_allLookups: item.debug_allLookups
        });
      });

      // Process the report to extract earning values from strings (similar to Sender Report)
      const processedReport = report.map(item => {
        let totalAmount = item["Total Amount"];

        // If Total Amount is 0 and we have carryInfo data, try to parse the earning string
        if (totalAmount === 0 && item.debug_allLookups?.carryInfoSample?.earning) {
          try {
            const earningStr = item.debug_allLookups.carryInfoSample.earning;
            if (typeof earningStr === 'string' && earningStr.includes('totalFare:')) {
              // Extract totalFare using regex (traveler gets totalFare, not senderTotalPay)
              const match = earningStr.match(/totalFare:\s*([0-9.]+)/);
              if (match && match[1]) {
                totalAmount = parseFloat(match[1]);
                console.log(`✅ Extracted totalFare: ${totalAmount} from string for traveler`);
              }
            }
          } catch (error) {
            console.log(`⚠️ Failed to parse earning string: ${error.message}`);
          }
        }

        return {
          ...item,
          "Total Amount": totalAmount,
          // Remove debug fields for cleaner output
          debug_initial: undefined,
          debug_travelDetails: undefined,
          debug_consignmentHistory: undefined,
          debug_allLookups: undefined
        };
      });

      // Get total count for pagination
      const totalCount = await Consignment.countDocuments();

      console.log(`✅ Traveler report generated with ${processedReport.length} records (page ${page})`);
      res.status(200).json({
        data: processedReport,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalRecords: totalCount,
          recordsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      console.error('❌ Error fetching traveler report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get Sender Report (Enhanced) - Now shows each consignment separately with dummy data
  static async getSenderReport(req, res) {
    try {
      console.log('📦 Generating Sender Report from Consignment Consolidated Data...');
      
      // Get query parameters for pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const skip = (page - 1) * limit;
      
      console.log('📄 Pagination params:', { page, limit, skip });

      const Consignment = require('../model/consignment.model');
      
      console.log('🔍 Starting sender report from consolidated data...');
      
      // Debug: Check if we have any consignments at all
      const totalConsignments = await Consignment.countDocuments();
      console.log('📊 Total consignments in database:', totalConsignments);
      
      if (totalConsignments === 0) {
        console.log('⚠️ No consignments found in database');
        return res.status(200).json({
          data: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalRecords: 0,
            recordsPerPage: limit,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
      }
      
      // Debug: Get a sample consignment to see the structure
      const sampleConsignment = await Consignment.findOne();
      console.log('🔍 Sample consignment structure:', {
        consignmentId: sampleConsignment?.consignmentId,
        phoneNumber: sampleConsignment?.phoneNumber,
        earning: sampleConsignment?.earning,
        status: sampleConsignment?.status,
        startinglocation: sampleConsignment?.startinglocation,
        senderFirstName: sampleConsignment?.senderFirstName,
        senderLastName: sampleConsignment?.senderLastName
      });
      
      // Use the same aggregation pipeline as Consignment Consolidated Report
      const report = await Consignment.aggregate([
        // Debug: Add a stage to log initial data
        {
          $addFields: {
            debug_initial: {
              consignmentId: "$consignmentId",
              phoneNumber: "$phoneNumber",
              earning: "$earning",
              earningType: { $type: "$earning" },
              status: "$status"
            }
          }
        },
        
        // Lookup travel details
        {
          $lookup: {
            from: "traveldetails",
            localField: "consignmentId",
            foreignField: "consignmentId",
            as: "travelDetails"
          }
        },
        
        // Debug: Log after travel details lookup
        {
          $addFields: {
            debug_travelDetails: {
              travelDetailsCount: { $size: "$travelDetails" },
              travelDetailsSample: { $arrayElemAt: ["$travelDetails", 0] }
            }
          }
        },
        
        // Lookup consignment history
        {
          $lookup: {
            from: "consignmentrequesthistories",
            localField: "consignmentId",
            foreignField: "consignmentId",
            as: "consignmentHistory"
          }
        },
        
        // Debug: Log after consignment history lookup
        {
          $addFields: {
            debug_consignmentHistory: {
              historyCount: { $size: "$consignmentHistory" },
              historySample: { $arrayElemAt: ["$consignmentHistory", 0] }
            }
          }
        },
        
        // Lookup rider request
        {
          $lookup: {
            from: "requestforcarries",
            localField: "consignmentId",
            foreignField: "consignmentId",
            as: "riderRequest"
          }
        },
        
        // Lookup carry info
        {
          $lookup: {
            from: "consignmenttocarries",
            localField: "consignmentId",
            foreignField: "consignmentId",
            as: "carryInfo"
          }
        },
        
        // Debug: Log after all lookups
        {
          $addFields: {
            debug_allLookups: {
              riderRequestCount: { $size: "$riderRequest" },
              carryInfoCount: { $size: "$carryInfo" },
              carryInfoSample: { $arrayElemAt: ["$carryInfo", 0] }
            }
          }
        },
        

        
        // Project sender-specific fields
        {
          $project: {
            // Debug fields
            debug_initial: 1,
            debug_travelDetails: 1,
            debug_consignmentHistory: 1,
            debug_allLookups: 1,
            
            "Sender Id": {
              $ifNull: ["$phoneNumber", "N/A"]
            },
            "Name": {
              $ifNull: [
                { $arrayElemAt: ["$consignmentHistory.senderName", 0] },
                "Unknown"
              ]
            },
            "Phone No": "$phoneNumber",
            "Address": "$startinglocation",
            "State": "N/A", // Will be populated from profile lookup if needed
            "No of Consignment": 1, // Each row represents one consignment
            "Total Amount": {
              $ifNull: [
                {
                  $cond: {
                    if: { $eq: [{ $type: { $arrayElemAt: ["$carryInfo.earning", 0] } }, "string"] },
                    then: 0, // For now, use 0 for string values to avoid parsing issues
                    else: { $toDouble: { $arrayElemAt: ["$carryInfo.earning", 0] } }
                  }
                },
                {
                  $ifNull: [
                    { $toDouble: "$earning" },
                    0
                  ]
                }
              ]
            },
            "Sender's Consignment": "$consignmentId",
            "Status of Consignment": "$status",
            "Payment": {
              $cond: {
                if: { 
                  $gt: [
                    {
                      $ifNull: [
                        {
                          $cond: {
                            if: { $eq: [{ $type: { $arrayElemAt: ["$carryInfo.earning", 0] } }, "string"] },
                            then: 0, // For now, use 0 for string values to avoid parsing issues
                            else: { $toDouble: { $arrayElemAt: ["$carryInfo.earning", 0] } }
                          }
                        },
                        {
                          $ifNull: [
                            { $toDouble: "$earning" },
                            0
                          ]
                        }
                      ]
                    },
                    0
                  ]
                },
                then: {
                  $cond: {
                    if: { $in: ["$status", ["Completed", "Delivered", "Accepted", "In Progress"]] },
                    then: "Paid",
                    else: "Pending"
                  }
                },
                else: "Pending"
              }
            },
            
            // Additional fields for API compatibility
            consignmentId: 1,
            consignmentStatus: 1,
            senderId: "$phoneNumber",
            senderName: {
              $ifNull: [
                { $arrayElemAt: ["$consignmentHistory.senderName", 0] },
                "Unknown"
              ]
            },
            senderMobileNo: 1,
            senderEmail: "N/A",
            senderAddress: 1,
            description: 1,
            category: 1,
            subcategory: 1,
            weight: 1,
            dimensionalweight: 1,
            dimensions: 1,
            distance: 1,
            duration: 1,
            handleWithCare: 1,
            specialRequest: 1,
            recepientName: 1,
            recepientAddress: 1,
            recepientPhoneNo: 1,
            totalAmountSender: {
              $ifNull: [
                {
                  $cond: {
                    if: { $eq: [{ $type: { $arrayElemAt: ["$carryInfo.earning", 0] } }, "string"] },
                    then: 0, // For now, use 0 for string values to avoid parsing issues
                    else: { $toDouble: { $arrayElemAt: ["$carryInfo.earning", 0] } }
                  }
                },
                {
                  $ifNull: [
                    { $toDouble: "$earning" },
                    0
                  ]
                }
              ]
            },
            dateOfSending: 1,
            createdAt: 1,
            updatedAt: 1,
            senderCreatedAt: 1,
            senderLastUpdated: 1
          }
        },
        
        // Add pagination
        { $skip: skip },
        { $limit: limit }
      ]);

      // Process the results to extract earning values from JSON strings
      const processedReport = report.map(item => {
        let totalAmount = item["Total Amount"];
        
        // If Total Amount is 0 and we have carryInfo data, try to parse the earning string
        if (totalAmount === 0 && item.debug_allLookups?.carryInfoSample?.earning) {
          try {
            const earningStr = item.debug_allLookups.carryInfoSample.earning;
            if (typeof earningStr === 'string' && earningStr.includes('senderTotalPay:')) {
              // Extract senderTotalPay using regex
              const match = earningStr.match(/senderTotalPay:\s*([0-9.]+)/);
              if (match && match[1]) {
                totalAmount = parseFloat(match[1]);
                console.log(`✅ Extracted senderTotalPay: ${totalAmount} from string`);
              }
            }
          } catch (error) {
            console.log(`⚠️ Failed to parse earning string: ${error.message}`);
          }
        }
        
        return {
          ...item,
          "Total Amount": totalAmount,
          // Remove debug fields for cleaner output
          debug_initial: undefined,
          debug_travelDetails: undefined,
          debug_consignmentHistory: undefined,
          debug_allLookups: undefined
        };
      });

      // Debug: Log the last few processed results
      console.log('🔍 Last 4 processed results:');
      const lastProcessedResults = processedReport.slice(-4);
      lastProcessedResults.forEach((item, index) => {
        console.log(`📊 Result ${processedReport.length - 3 + index}:`, {
          consignmentId: item.consignmentId,
          senderId: item["Sender Id"],
          name: item["Name"],
          phoneNo: item["Phone No"],
          totalAmount: item["Total Amount"],
          status: item["Status of Consignment"]
        });
      });

      // Get total count for pagination
      const totalCount = await Consignment.countDocuments();

      console.log(`✅ Sender report generated with ${processedReport.length} records (page ${page})`);
      res.status(200).json({
        data: processedReport,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalRecords: totalCount,
          recordsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      console.error('❌ Error fetching sender report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get Consignment Consolidated Report (Enhanced) - Now uses dummy data
  static async getConsignmentConsolidatedReport(req, res) {
    try {
      console.log('📊 Generating Enhanced Consignment Consolidated Report with MongoDB Aggregation...');
      
      // Get query parameters for pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100; // Limit to 100 records per request
      const skip = (page - 1) * limit;
      
      // Get fare configuration
      const FareConfig = require('../model/FareConfig');
      const fareConfig = await FareConfig.findOne();
      const margin = fareConfig?.margin || 0.2;
      const TE = fareConfig?.TE || 0;

      const Consignment = require('../model/consignment.model');
      
      const report = await Consignment.aggregate([
        {
          $lookup: {
            from: "consignmenttocarries",
            localField: "consignmentId",
            foreignField: "consignmentId",
            as: "carryInfo"
          }
        },

        // Join with TravelDetails (only if carryInfo exists)
        {
          $lookup: {
            from: "traveldetails",
            let: { travelId: { $ifNull: [{ $arrayElemAt: ["$carryInfo.travelId", 0] }, null] } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$travelId", "$$travelId"] }
                }
              }
            ],
            as: "travelDetails"
          }
        },

        // Join with ConsignmentRequestHistory
        {
          $lookup: {
            from: "consignmentrequesthistories",
            localField: "consignmentId",
            foreignField: "consignmentId",
            as: "consignmentHistory"
          }
        },

        // Project fields for Excel report with proper fallbacks
        {
          $project: {
            _id: 0,
            "Consignment ID": "$consignmentId",
            "Consignment Status": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.status", 0] },
                "$status"
              ]
            },
            "Sender ID": "$phoneNumber",
            "Sender Name": "$username",
            "Sender Mobile No": "$phoneNumber",
            "Sender Address": "$startinglocation",
            "Total Amount Sender": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.earning.senderTotalPay", 0] },
                "$earning"
              ]
            },
            "Payment Status": {
              $cond: {
                if: { 
                  $in: [
                    { $ifNull: [{ $arrayElemAt: ["$carryInfo.status", 0] }, "$status"] },
                    ["Delivered", "Completed", "Collected"]
                  ]
                },
                then: "Paid",
                else: "Pending"
              }
            },
            "Traveler Id": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.travelId", 0] },
                "N/A"
              ]
            },
            "Traveler Acceptance Date": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.createdAt", 0] },
                "N/A"
              ]
            },
            "Traveler Name": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.username", 0] },
                "N/A"
              ]
            },
            "Traveler Mobile No": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.phoneNumber", 0] },
                "N/A"
              ]
            },
            "Traveler Address": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.Leavinglocation", 0] },
                "N/A"
              ]
            },
            "Amount to be paid to Traveler": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.earning.totalFare", 0] },
                "N/A"
              ]
            },
            "Traveler Payment Status": {
              $cond: {
                if: { 
                  $in: [
                    { $ifNull: [{ $arrayElemAt: ["$carryInfo.status", 0] }, "$status"] },
                    ["Delivered", "Completed"]
                  ]
                },
                then: "Paid",
                else: {
                  $cond: {
                    if: { 
                      $eq: [
                        { $ifNull: [{ $arrayElemAt: ["$carryInfo.status", 0] }, "$status"] },
                        "In Transit"
                      ]
                    },
                    then: "Partial",
                    else: "Pending"
                  }
                }
              }
            },
            "Travel Mode": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.travelMode", 0] },
                "N/A"
              ]
            },
            "Travel Start Date": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.expectedStartTime", 0] },
                "N/A"
              ]
            },
            "Travel End Date": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.expectedEndTime", 0] },
                "N/A"
              ]
            },
            "Recipient Name": "$recievername",
            "Recipient Address": "$goinglocation",
            "Recipient Phone no": "$recieverphone",
            "Received Date": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.dateandtimeofdelivery", 0] },
                "$dateOfSending"
              ]
            },
            "T&E Amount": { $literal: TE },
            "Tax Component": {
              $multiply: [
                // {
                //   $toDouble: {
                //     $ifNull: [
                //       { $arrayElemAt: ["$carryInfo.earning.senderTotalPay", 0] },
                //       "$earning"
                //     ]
                //   }
                // },
                margin
              ]
            }
          }
        },
        
                // Add pagination
        { $skip: skip },
        { $limit: limit }
      ]);

      // Get total count for pagination
      const totalCount = await Consignment.countDocuments();

      console.log(`✅ Aggregation report generated with ${report.length} records (page ${page})`);
      res.status(200).json({
        data: report,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalRecords: totalCount,
          recordsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      console.error('❌ Error fetching consignment consolidated report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // New: Get Consignment Consolidated Report with All Required Fields
  static async getConsignmentConsolidatedReportAggregation(req, res) {
    try {
      console.log('📊 Generating Consignment Consolidated Report with MongoDB Aggregation...');
      
      // Get fare configuration
      const FareConfig = require('../model/FareConfig');
      const fareConfig = await FareConfig.findOne();
      const margin = fareConfig?.margin || 0.2;
      const TE = fareConfig?.TE || 0;
      
      console.log('🔧 Configuration loaded:', { margin, TE });

      // Get query parameters for pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const skip = (page - 1) * limit;
      
      console.log('📄 Pagination params:', { page, limit, skip });

      const Consignment = require('../model/consignment.model');
      const Profile = require('../model/Profile');
      
      console.log('🔍 Starting aggregation pipeline...');
      
      const report = await Consignment.aggregate([
        {
          $lookup: {
            from: "consignmenttocarries",
            localField: "consignmentId",
            foreignField: "consignmentId",
            as: "carryInfo"
          }
        },

        {
          $lookup: {
            from: "traveldetails",
            let: { travelId: { $ifNull: [{ $arrayElemAt: ["$carryInfo.travelId", 0] }, null] } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$travelId", "$$travelId"] }
                }
              }
            ],
            as: "travelDetails"
          }
        },

        {
          $lookup: {
            from: "userprofiles",
            localField: "phoneNumber",
            foreignField: "phoneNumber",
            as: "senderProfile"
          }
        },

        {
          $lookup: {
            from: "userprofiles",
            let: { travelerPhone: { $arrayElemAt: ["$travelDetails.phoneNumber", 0] } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$phoneNumber", "$$travelerPhone"] }
                }
              }
            ],
            as: "travelerProfile"
          }
        },

        {
          $project: {
            _id: 0,
            "Consignment ID": "$consignmentId",
            "Consignment Status": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.status", 0] },
                "$status"
              ]
            },
            "Sender ID": "$_id",
            "Sender Name": {
              $ifNull: [
                "$username",
                {
                  $concat: [
                    { $ifNull: [{ $arrayElemAt: ["$senderProfile.firstName", 0] }, ""] },
                    " ",
                    { $ifNull: [{ $arrayElemAt: ["$senderProfile.lastName", 0] }, ""] }
                  ]
                }
              ]
            },
            "Sender Mobile No": "$phoneNumber",
            "Sender Address": {
              $ifNull: [
                "$fullstartinglocation",
                "$startinglocation"
              ]
            },
            "Total Amount Sender Paid": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.earning.senderTotalPay", 0] },
                0
              ]
            },
            "Payment Status": {
              $cond: {
                if: { 
                  $in: [
                    { $ifNull: [{ $arrayElemAt: ["$carryInfo.status", 0] }, "$status"] },
                    ["Delivered", "Completed", "Collected"]
                  ]
                },
                then: "Paid",
                else: "Pending"
              }
            },
            "Traveler Id": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.travelId", 0] },
                "N/A"
              ]
            },
            "Traveler Acceptance Date": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.createdAt", 0] },
                "N/A"
              ]
            },
            "Traveler Name": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.username", 0] },
                {
                  $concat: [
                    { $ifNull: [{ $arrayElemAt: ["$travelerProfile.firstName", 0] }, ""] },
                    " ",
                    { $ifNull: [{ $arrayElemAt: ["$travelerProfile.lastName", 0] }, ""] }
                  ]
                },
                "N/A"
              ]
            },
            "Traveler Mobile No": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.phoneNumber", 0] },
                "N/A"
              ]
            },
            "Traveler Address": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.Leavinglocation", 0] },
                "N/A"
              ]
            },
            "Amount to be paid to Traveler": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.earning.totalFare", 0] },
                0
              ]
            },
            "Traveler Payment Status": {
              $cond: {
                if: { 
                  $in: [
                    { $ifNull: [{ $arrayElemAt: ["$carryInfo.status", 0] }, "$status"] },
                    ["Delivered", "Completed"]
                  ]
                },
                then: "Paid",
                else: {
                  $cond: {
                    if: { 
                      $eq: [
                        { $ifNull: [{ $arrayElemAt: ["$carryInfo.status", 0] }, "$status"] },
                        "In Transit"
                      ]
                    },
                    then: "Partial",
                    else: "Pending"
                  }
                }
              }
            },
            "Travel Mode": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.travelMode", 0] },
                "N/A"
              ]
            },
            "Travel Start Date": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.expectedStartTime", 0] },
                { $arrayElemAt: ["$travelDetails.travelDate", 0] },
                "N/A"
              ]
            },
            "Travel End Date": {
              $ifNull: [
                { $arrayElemAt: ["$travelDetails.expectedEndTime", 0] },
                "N/A"
              ]
            },
            "Recipient Name": "$recievername",
            "Recipient Address": {
              $ifNull: [
                "$fullgoinglocation",
                "$goinglocation"
              ]
            },
            "Recipient Phone no": "$recieverphone",
            "Received Date": {
              $ifNull: [
                { $arrayElemAt: ["$carryInfo.dateandtimeofdelivery", 0] },
                {
                  $cond: {
                    if: { 
                      $eq: [
                        { $ifNull: [{ $arrayElemAt: ["$carryInfo.status", 0] }, "$status"] },
                        "Delivered"
                      ]
                    },
                    then: { $arrayElemAt: ["$carryInfo.updatedAt", 0] },
                    else: "N/A"
                  }
                }
              ]
            }
          }
        },
        
        // Add pagination
        { $skip: skip },
        { $limit: limit }
      ]);

      // Get total count for pagination
      const totalCount = await Consignment.countDocuments();

      console.log(`✅ Aggregation report generated with ${report.length} records (page ${page})`);
      res.status(200).json({
        data: report,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalRecords: totalCount,
          recordsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      console.error('❌ Error fetching consignment consolidated report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // New: Get Business Intelligence Report - Now uses dummy data
  static async getBusinessIntelligenceReport(req, res) {
    try {
      console.log('📈 Generating Business Intelligence Report with dummy data...');
      
      // Generate dummy data
      // const consignments = ReportController.generateDummyConsignments();
      // const userProfiles = ReportController.generateDummyUsers();
      // const travelDetails = ReportController.generateDummyTravelDetails();
      // const consignmentHistory = ReportController.generateDummyConsignmentHistory();
      // const earnings = ReportController.generateDummyEarnings();

      // Calculate business metrics
      const totalConsignments = consignments.length;
      const completedConsignments = consignments.filter(c => c.status === 'Completed').length;
      const totalRevenue = consignments.reduce((sum, c) => sum + (parseFloat(c.earning) || 0), 0);
      
      const totalTravelers = userProfiles.filter(u => u.role === 'traveler').length;
      const activeTravelers = travelDetails.length > 0 ? new Set(travelDetails.map(t => t.phoneNumber)).size : 0;
      const totalTravelerEarnings = earnings.reduce((sum, e) => sum + (parseFloat(e.totalEarnings) || 0), 0);
      
      const totalSenders = new Set(consignments.map(c => c.phoneNumber)).size;
      const totalTravels = travelDetails.length;
      const completedTravels = travelDetails.filter(t => t.status === 'Completed').length;

      // Status distribution
      const statusDistribution = {};
      consignments.forEach(consignment => {
        statusDistribution[consignment.status] = (statusDistribution[consignment.status] || 0) + 1;
      });

      // Category distribution
      const categoryDistribution = {};
      consignments.forEach(consignment => {
        if (consignment.category) {
          categoryDistribution[consignment.category] = (categoryDistribution[consignment.category] || 0) + 1;
        }
      });

      // Travel mode distribution
      const travelModeDistribution = {};
      travelDetails.forEach(travel => {
        if (travel.travelMode) {
          travelModeDistribution[travel.travelMode] = (travelModeDistribution[travel.travelMode] || 0) + 1;
        }
      });

      // Top performers
      const travelerEarnings = {};
      earnings.forEach(earning => {
        travelerEarnings[earning.phoneNumber] = earning.totalEarnings || 0;
      });

      const topTravelers = Object.entries(travelerEarnings)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([phone, earnings]) => {
          const user = userProfiles.find(u => u.phoneNumber === phone);
          return {
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
            phoneNumber: phone,
            totalEarnings: ReportController.formatAmount(earnings)
          };
        });

      const senderAmounts = {};
      consignments.forEach(consignment => {
        const amount = parseFloat(consignment.earning) || 0;
        senderAmounts[consignment.phoneNumber] = (senderAmounts[consignment.phoneNumber] || 0) + amount;
      });

      const topSenders = Object.entries(senderAmounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([phone, amount]) => {
          const user = userProfiles.find(u => u.phoneNumber === phone);
          return {
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
            phoneNumber: phone,
            totalAmount: ReportController.formatAmount(amount)
          };
        });

      const businessReport = {
        generatedAt: new Date().toISOString(),
        summary: {
          totalConsignments,
          completedConsignments,
          completionRate: totalConsignments > 0 ? (completedConsignments / totalConsignments) * 100 : 0,
          totalRevenue: ReportController.formatAmount(totalRevenue),
          totalTravelers,
          activeTravelers,
          totalTravelerEarnings: ReportController.formatAmount(totalTravelerEarnings),
          totalSenders,
          totalTravels,
          completedTravels,
          averageConsignmentValue: ReportController.formatAmount(totalConsignments > 0 ? totalRevenue / totalConsignments : 0)
        },
        distributions: {
          statusDistribution,
          categoryDistribution,
          travelModeDistribution
        },
        topPerformers: {
          topTravelers,
          topSenders
        }
      };

      console.log('✅ Business intelligence report generated successfully');
      res.status(200).json(businessReport);
    } catch (error) {
      console.error('❌ Error generating business intelligence report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  }

  // New: Get Travel Details Report - Now uses dummy data
  static async getTravelDetailsReport(req, res) {
    try {
      console.log('🚗 Generating Travel Details Report with dummy data...');
      
      // Generate dummy data
      const travelDetails = ReportController.generateDummyTravelDetails();
      const userProfiles = ReportController.generateDummyUsers();
      const requestForCarry = ReportController.generateDummyRequestForCarry();

             const userMap = ReportController.createUserMap(userProfiles);
      const requestMap = {};
      requestForCarry.forEach(request => {
        if (!requestMap[request.travelId]) {
          requestMap[request.travelId] = [];
        }
        requestMap[request.travelId].push(request);
      });

      const travelData = travelDetails.map(travel => {
        let traveler = userMap[travel.phoneNumber];
        const requests = requestMap[travel.travelId] || [];
        
        // If traveler not found, assign a random traveler from the first 10 users
        if (!traveler) {
          const randomTravelerIndex = Math.floor(Math.random() * 10);
          const randomTraveler = userProfiles[randomTravelerIndex];
          if (randomTraveler) {
            traveler = randomTraveler;
          }
        }
        
        // Calculate statistics
        const acceptedRequests = requests.filter(r => r.status === 'Accepted').length;
        const totalRequests = requests.length;
        const acceptanceRate = totalRequests > 0 ? (acceptedRequests / totalRequests) * 100 : 0;
        
        const totalEarning = requests
          .filter(r => r.status === 'Accepted')
          .reduce((sum, r) => sum + (parseFloat(r.earning) || 0), 0);

        return {
          travelId: travel.travelId,
          travelerId: traveler?._id?.toString() || travel.phoneNumber,
          travelerName: traveler ? `${traveler.firstName || ''} ${traveler.lastName || ''}`.trim() : 'Unknown',
          phoneNumber: travel.phoneNumber,
          leavingLocation: travel.Leavinglocation,
          goingLocation: travel.Goinglocation,
          fullFrom: travel.fullFrom,
          fullTo: travel.fullTo,
          travelMode: travel.travelMode,
          travelmode_number: travel.travelmode_number,
          travelDate: ReportController.formatDate(travel.travelDate),
          expectedStartTime: travel.expectedStartTime,
          expectedEndTime: travel.expectedEndTime,
          endDate: ReportController.formatDate(travel.endDate),
          distance: travel.distance,
          duration: travel.duration,
          expectedearning: ReportController.formatAmount(travel.expectedearning),
          payableAmount: ReportController.formatAmount(travel.payableAmount),
          weight: travel.weight,
          TE: travel.TE,
          discount: ReportController.formatAmount(travel.discount),
          status: travel.status,
          startedat: travel.startedat ? ReportController.formatDate(travel.startedat) : 'N/A',
          endedat: travel.endedat ? ReportController.formatDate(travel.endedat) : 'N/A',
          totalRequests: totalRequests,
          acceptedRequests: acceptedRequests,
          acceptanceRate: acceptanceRate.toFixed(2),
          totalEarning: ReportController.formatAmount(totalEarning),
          averageRating: travel.averageRating || 0,
          totalRating: travel.totalrating || 0,
          createdAt: ReportController.formatDate(travel.createdAt),
          updatedAt: ReportController.formatDate(travel.updatedAt)
        };
      });

      console.log(`✅ Travel details report generated with ${travelData.length} records`);
      res.status(200).json(travelData);
    } catch (error) {
      console.error('❌ Error generating travel details report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  }
}

module.exports = ReportController; 