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
  static generatePhoneNumber() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  // Generate dummy user profiles
  static generateDummyUsers() {
    const users = [];
    const names = [
      'John Smith', 'Emma Johnson', 'Michael Brown', 'Sarah Davis', 'David Wilson',
      'Lisa Anderson', 'James Taylor', 'Jennifer Martinez', 'Robert Garcia', 'Amanda Rodriguez',
      'William Lee', 'Michelle White', 'Christopher Hall', 'Jessica Allen', 'Daniel Young',
      'Ashley King', 'Matthew Wright', 'Nicole Green', 'Joshua Baker', 'Stephanie Adams'
    ];
    const addresses = [
      '123 Main Street, Mumbai, Maharashtra',
      '456 Park Avenue, Delhi, Delhi',
      '789 Lake Road, Bangalore, Karnataka',
      '321 Hill Street, Chennai, Tamil Nadu',
      '654 Ocean Drive, Kolkata, West Bengal',
      '987 Mountain View, Hyderabad, Telangana',
      '147 River Side, Pune, Maharashtra',
      '258 Garden Lane, Ahmedabad, Gujarat',
      '369 Sunset Boulevard, Jaipur, Rajasthan',
      '741 Golden Gate, Lucknow, Uttar Pradesh'
    ];
    const vehicleTypes = ['Car', 'Bike', 'Van', 'Truck', 'Auto'];
    const vehicleNumbers = ['MH01AB1234', 'DL02CD5678', 'KA03EF9012', 'TN04GH3456', 'WB05IJ7890'];

    // Generate consistent phone numbers for better data mapping
    const phoneNumbers = [];
    for (let i = 0; i < 20; i++) {
      phoneNumbers.push(ReportController.generatePhoneNumber());
    }

    for (let i = 0; i < 20; i++) {
      const [firstName, lastName] = names[i].split(' ');
      const isTraveler = i < 10;
      users.push({
        _id: `user_${i + 1}`,
        userId: `user_${i + 1}`,
        firstName,
        lastName,
        phoneNumber: phoneNumbers[i], // Use consistent phone numbers
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        role: isTraveler ? 'traveler' : 'sender',
        currentLocation: {
          coordinates: [Math.random() * 180 - 90, Math.random() * 360 - 180]
        },
        address: addresses[Math.floor(Math.random() * addresses.length)],
        averageRating: (Math.random() * 5).toFixed(1),
        totalrating: Math.floor(Math.random() * 100),
        isVerified: Math.random() > 0.3,
        profilePicture: `https://example.com/profile_${i + 1}.jpg`,
        // Traveler specific fields
        vehicleType: isTraveler ? vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)] : null,
        vehicleNumber: isTraveler ? vehicleNumbers[Math.floor(Math.random() * vehicleTypes.length)] : null,
        licenseNumber: isTraveler ? `DL${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}` : null,
        experience: isTraveler ? Math.floor(Math.random() * 10) + 1 : null,
        totalTrips: isTraveler ? Math.floor(Math.random() * 500) + 10 : null,
        totalEarnings: isTraveler ? ReportController.formatAmount(Math.random() * 50000 + 5000) : null,
        // Sender specific fields
        businessName: !isTraveler ? `${firstName} ${lastName} Enterprises` : null,
        businessType: !isTraveler ? ['Retail', 'Manufacturing', 'Services', 'E-commerce'][Math.floor(Math.random() * 4)] : null,
        totalConsignments: !isTraveler ? Math.floor(Math.random() * 200) + 10 : null,
        totalSpent: !isTraveler ? ReportController.formatAmount(Math.random() * 100000 + 10000) : null,
        // Common fields
        dateOfBirth: new Date(1980 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
        gender: ['Male', 'Female', 'Other'][Math.floor(Math.random() * 3)],
        emergencyContact: ReportController.generatePhoneNumber(),
        emergencyContactName: names[Math.floor(Math.random() * names.length)],
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }
    return users;
  }

  // Generate dummy travel details
  static generateDummyTravelDetails() {
    const travels = [];
    const travelModes = ['Car', 'Bike', 'Bus', 'Train', 'Flight', 'Van', 'Truck', 'Auto'];
    const statuses = ['Pending', 'In Progress', 'Completed', 'Cancelled', 'Delayed', 'Rescheduled'];
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
    const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'Motorcycle', 'Scooter', 'Van', 'Truck', 'Auto Rickshaw'];
    const paymentMethods = ['UPI', 'Card', 'Net Banking', 'Cash', 'Wallet'];

    // Generate consistent phone numbers for travelers (first 10 users)
    const travelerPhoneNumbers = [];
    for (let i = 0; i < 10; i++) {
      travelerPhoneNumbers.push(ReportController.generatePhoneNumber());
    }

    for (let i = 0; i < 50; i++) {
      const travelDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
      const startTime = new Date(travelDate.getTime() + Math.random() * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + Math.random() * 12 * 60 * 60 * 1000);
      const actualStartTime = Math.random() > 0.3 ? new Date(startTime.getTime() + Math.random() * 60 * 60 * 1000) : null;
      const actualEndTime = Math.random() > 0.5 ? new Date(endTime.getTime() + Math.random() * 60 * 60 * 1000) : null;
      
      const baseAmount = Math.random() * 5000 + 500;
      const discount = Math.random() * 500;
      const finalAmount = baseAmount - discount;
      
      travels.push({
        travelId: `travel_${i + 1}`,
        phoneNumber: travelerPhoneNumbers[i % 10], // Use consistent traveler phone numbers
        Leavinglocation: cities[Math.floor(Math.random() * cities.length)],
        Goinglocation: cities[Math.floor(Math.random() * cities.length)],
        fullFrom: cities[Math.floor(Math.random() * cities.length)],
        fullTo: cities[Math.floor(Math.random() * cities.length)],
        travelMode: travelModes[Math.floor(Math.random() * travelModes.length)],
        travelmode_number: Math.floor(Math.random() * 1000) + 1,
        vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
        vehicleNumber: `MH${Math.floor(Math.random() * 100).toString().padStart(2, '0')}AB${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        travelDate: travelDate,
        expectedStartTime: startTime,
        expectedEndTime: endTime,
        actualStartTime: actualStartTime,
        actualEndTime: actualEndTime,
        endDate: endTime,
        distance: Math.floor(Math.random() * 1000) + 50,
        duration: Math.floor(Math.random() * 24) + 1,
        expectedearning: ReportController.formatAmount(baseAmount),
        payableAmount: ReportController.formatAmount(finalAmount),
        baseAmount: ReportController.formatAmount(baseAmount),
        discount: ReportController.formatAmount(discount),
        weight: Math.floor(Math.random() * 100) + 10,
        TE: Math.floor(Math.random() * 50) + 5,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        startedat: actualStartTime,
        endedat: actualEndTime,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        paymentStatus: ['Pending', 'Completed', 'Failed'][Math.floor(Math.random() * 3)],
        averageRating: (Math.random() * 5).toFixed(1),
        totalrating: Math.floor(Math.random() * 50),
        review: Math.random() > 0.7 ? `Great service! Travel was smooth and on time.` : null,
        specialInstructions: Math.random() > 0.8 ? 'Handle with care, fragile items' : null,
        insuranceAmount: ReportController.formatAmount(Math.random() * 1000 + 100),
        fuelCost: ReportController.formatAmount(Math.random() * 500 + 50),
        tollCharges: ReportController.formatAmount(Math.random() * 200 + 20),
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }
    return travels;
  }

  // Generate dummy consignment details
  static generateDummyConsignments() {
    const consignments = [];
    const categories = ['Electronics', 'Clothing', 'Books', 'Food', 'Furniture', 'Documents', 'Automotive', 'Healthcare', 'Sports', 'Jewelry'];
    const subcategories = {
      'Electronics': ['Mobile', 'Laptop', 'Tablet', 'Camera', 'Headphones', 'Speaker'],
      'Clothing': ['Shirts', 'Pants', 'Dresses', 'Shoes', 'Bags', 'Accessories'],
      'Books': ['Novels', 'Textbooks', 'Magazines', 'Comics', 'Reference', 'Children'],
      'Food': ['Snacks', 'Fruits', 'Vegetables', 'Beverages', 'Dairy', 'Frozen'],
      'Furniture': ['Chairs', 'Tables', 'Beds', 'Sofas', 'Cabinets', 'Lighting'],
      'Documents': ['Legal', 'Personal', 'Business', 'Educational', 'Medical', 'Financial'],
      'Automotive': ['Spare Parts', 'Tools', 'Accessories', 'Lubricants', 'Tires'],
      'Healthcare': ['Medicines', 'Equipment', 'Supplies', 'Devices', 'Vitamins'],
      'Sports': ['Equipment', 'Clothing', 'Shoes', 'Accessories', 'Fitness'],
      'Jewelry': ['Gold', 'Silver', 'Diamond', 'Pearl', 'Platinum', 'Fashion']
    };
    const statuses = ['Pending', 'Accepted', 'In Progress', 'Completed', 'Delivered', 'Cancelled', 'Returned', 'Lost'];
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
    const paymentMethods = ['UPI', 'Card', 'Net Banking', 'Cash', 'Wallet', 'COD'];
    const deliveryTypes = ['Standard', 'Express', 'Same Day', 'Next Day', 'Scheduled'];

    // Generate consistent phone numbers for senders (last 10 users)
    const senderPhoneNumbers = [];
    for (let i = 0; i < 10; i++) {
      senderPhoneNumbers.push(ReportController.generatePhoneNumber());
    }

    for (let i = 0; i < 80; i++) {
      const dateOfSending = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
      const category = categories[Math.floor(Math.random() * categories.length)];
      const subcategory = subcategories[category][Math.floor(Math.random() * subcategories[category].length)];
      
      const baseAmount = Math.random() * 3000 + 200;
      const insuranceAmount = Math.random() * 500 + 50;
      const totalAmount = baseAmount + insuranceAmount;
      
      consignments.push({
        consignmentId: `consignment_${i + 1}`,
        phoneNumber: senderPhoneNumbers[i % 10], // Use consistent sender phone numbers
        Description: `${category} - ${subcategory} consignment ${i + 1}`,
        category: category,
        subcategory: subcategory,
        weight: Math.floor(Math.random() * 50) + 1,
        dimensionalweight: Math.floor(Math.random() * 30) + 1,
        dimensions: `${Math.floor(Math.random() * 100) + 10}x${Math.floor(Math.random() * 100) + 10}x${Math.floor(Math.random() * 100) + 10}`,
        distance: Math.floor(Math.random() * 1000) + 50,
        duration: Math.floor(Math.random() * 72) + 1,
        earning: ReportController.formatAmount(baseAmount),
        insuranceAmount: ReportController.formatAmount(insuranceAmount),
        totalAmount: ReportController.formatAmount(totalAmount),
        startinglocation: cities[Math.floor(Math.random() * cities.length)],
        goinglocation: cities[Math.floor(Math.random() * cities.length)],
        recievername: `Receiver ${i + 1}`,
        recieverphone: ReportController.generatePhoneNumber(),
        receiverEmail: `receiver${i + 1}@example.com`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        handleWithCare: Math.random() > 0.7,
        specialRequest: Math.random() > 0.8 ? 'Handle with extra care, fragile items' : null,
        deliveryType: deliveryTypes[Math.floor(Math.random() * deliveryTypes.length)],
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        paymentStatus: ['Pending', 'Completed', 'Failed', 'Refunded'][Math.floor(Math.random() * 4)],
        trackingNumber: `TN${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
        estimatedDelivery: new Date(dateOfSending.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        actualDelivery: Math.random() > 0.6 ? new Date(dateOfSending.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        pickupDate: new Date(dateOfSending.getTime() - Math.random() * 24 * 60 * 60 * 1000),
        pickupTime: new Date(dateOfSending.getTime() - Math.random() * 12 * 60 * 60 * 1000),
        deliveryDate: Math.random() > 0.6 ? new Date(dateOfSending.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        deliveryTime: Math.random() > 0.6 ? new Date(dateOfSending.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        signature: Math.random() > 0.6 ? `Receiver_${i + 1}_Signature` : null,
        notes: Math.random() > 0.7 ? `Special handling required for ${category} items` : null,
        dateOfSending: dateOfSending,
        createdAt: new Date(dateOfSending.getTime() - Math.random() * 24 * 60 * 60 * 1000),
        updatedAt: new Date(dateOfSending.getTime() + Math.random() * 24 * 60 * 60 * 1000)
      });
    }
    return consignments;
  }

  // Generate dummy consignment history
  static generateDummyConsignmentHistory() {
    const history = [];
    const travelModes = ['Car', 'Bike', 'Bus', 'Train', 'Flight', 'Van', 'Truck', 'Auto'];
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
    const statuses = ['Pending', 'Accepted', 'In Progress', 'Completed', 'Delivered', 'Cancelled', 'Returned', 'Lost'];
    const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'Motorcycle', 'Scooter', 'Van', 'Truck', 'Auto Rickshaw'];

    for (let i = 0; i < 60; i++) {
      const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const delivered = Math.random() > 0.6 ? new Date(timestamp.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null;
      const pickupTime = new Date(timestamp.getTime() + Math.random() * 2 * 60 * 60 * 1000);
      const deliveryTime = delivered ? new Date(delivered.getTime() + Math.random() * 2 * 60 * 60 * 1000) : null;
      
      const baseEarning = Math.random() * 2000 + 300;
      const commission = baseEarning * 0.1; // 10% commission
      const netEarning = baseEarning - commission;
      
      history.push({
        consignmentId: `consignment_${i + 1}`,
        senderPhoneNumber: ReportController.generatePhoneNumber(),
        description: `Detailed history for consignment ${i + 1}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        expectedEarning: ReportController.formatAmount(baseEarning),
        commission: ReportController.formatAmount(commission),
        netEarning: ReportController.formatAmount(netEarning),
        distance: Math.floor(Math.random() * 800) + 50,
        category: ['Electronics', 'Clothing', 'Books', 'Food', 'Furniture', 'Automotive', 'Healthcare'][Math.floor(Math.random() * 7)],
        pickupLocation: cities[Math.floor(Math.random() * cities.length)],
        deliveryLocation: cities[Math.floor(Math.random() * cities.length)],
        delivered: delivered,
        pickupTime: pickupTime,
        deliveryTime: deliveryTime,
        actualDistance: Math.floor(Math.random() * 800) + 50,
        fuelCost: ReportController.formatAmount(Math.random() * 300 + 50),
        tollCharges: ReportController.formatAmount(Math.random() * 100 + 10),
        insuranceAmount: ReportController.formatAmount(Math.random() * 200 + 20),
        totalCost: ReportController.formatAmount(Math.random() * 500 + 100),
        profit: ReportController.formatAmount(Math.random() * 1000 + 200),
        traveldetails: [
          {
            travelId: `travel_${i + 1}`,
            phoneNumber: ReportController.generatePhoneNumber(),
            travelMode: travelModes[Math.floor(Math.random() * travelModes.length)],
            vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
            vehicleNumber: `MH${Math.floor(Math.random() * 100).toString().padStart(2, '0')}AB${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            timestamp: timestamp,
            startTime: pickupTime,
            endTime: deliveryTime,
            actualDuration: Math.floor(Math.random() * 24) + 1,
            status: ['Active', 'Completed', 'Cancelled'][Math.floor(Math.random() * 3)],
            rating: (Math.random() * 5).toFixed(1),
            review: Math.random() > 0.7 ? 'Excellent service, on time delivery' : null
          }
        ]
      });
    }
    return history;
  }

  // Generate dummy request for carry
  static generateDummyRequestForCarry() {
    const requests = [];
    const statuses = ['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled', 'Expired'];
    const travelModes = ['Car', 'Bike', 'Bus', 'Train', 'Flight', 'Van', 'Truck', 'Auto'];
    const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'Motorcycle', 'Scooter', 'Van', 'Truck', 'Auto Rickshaw'];
    const paymentMethods = ['UPI', 'Card', 'Net Banking', 'Cash', 'Wallet'];

    for (let i = 0; i < 40; i++) {
      const createdAt = new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000);
      const dateandtimeofdelivery = Math.random() > 0.5 ? new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null;
      const acceptedAt = Math.random() > 0.3 ? new Date(createdAt.getTime() + Math.random() * 2 * 60 * 60 * 1000) : null;
      
      const baseEarning = Math.random() * 1500 + 200;
      const commission = baseEarning * 0.15; // 15% commission
      const netEarning = baseEarning - commission;
      
      requests.push({
        consignmentId: `consignment_${i + 1}`,
        travelId: `travel_${i + 1}`,
        travellername: `Traveler ${i + 1}`,
        travelerPhone: ReportController.generatePhoneNumber(),
        travelerEmail: `traveler${i + 1}@example.com`,
        earning: ReportController.formatAmount(baseEarning),
        commission: ReportController.formatAmount(commission),
        netEarning: ReportController.formatAmount(netEarning),
        travelmode: travelModes[Math.floor(Math.random() * travelModes.length)],
        vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
        vehicleNumber: `MH${Math.floor(Math.random() * 100).toString().padStart(2, '0')}AB${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        dateandtimeofdelivery: dateandtimeofdelivery,
        acceptedAt: acceptedAt,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        paymentStatus: ['Pending', 'Completed', 'Failed'][Math.floor(Math.random() * 3)],
        rating: (Math.random() * 5).toFixed(1),
        review: Math.random() > 0.6 ? 'Great service, highly recommended!' : null,
        specialInstructions: Math.random() > 0.7 ? 'Handle with care, fragile items' : null,
        insuranceAmount: ReportController.formatAmount(Math.random() * 300 + 50),
        fuelCost: ReportController.formatAmount(Math.random() * 200 + 30),
        tollCharges: ReportController.formatAmount(Math.random() * 100 + 10),
        totalCost: ReportController.formatAmount(Math.random() * 400 + 80),
        profit: ReportController.formatAmount(Math.random() * 800 + 150),
        createdAt: createdAt,
        updatedAt: new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000)
      });
    }
    return requests;
  }

  // Generate dummy earnings
  static generateDummyEarnings() {
    const earnings = [];
    const paymentMethods = ['UPI', 'Card', 'Net Banking', 'Cash', 'Wallet'];
    const transactionTypes = ['Travel Payment', 'Consignment Payment', 'Bonus', 'Refund', 'Commission', 'Incentive', 'Penalty', 'Adjustment'];
    const transactionStatuses = ['Completed', 'Pending', 'Failed', 'Refunded', 'Cancelled'];

    for (let i = 0; i < 25; i++) {
      const transactions = [];
      const numTransactions = Math.floor(Math.random() * 15) + 5;
      
      for (let j = 0; j < numTransactions; j++) {
        const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
        const amount = Math.random() * 2000 + 100;
        const status = transactionStatuses[Math.floor(Math.random() * transactionStatuses.length)];
        const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        
        transactions.push({
          transactionId: `TXN${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
          title: transactionType,
          description: `${transactionType} for service ${j + 1}`,
          amount: ReportController.formatAmount(amount),
          status: status,
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          timestamp: timestamp,
          referenceNumber: `REF${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
          bankTransactionId: status === 'Completed' ? `BANK${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}` : null,
          upiTransactionId: status === 'Completed' ? `UPI${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}` : null,
          notes: Math.random() > 0.7 ? 'Transaction processed successfully' : null
        });
      }

      const totalEarnings = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const completedTransactions = transactions.filter(t => t.status === 'Completed');
      const pendingTransactions = transactions.filter(t => t.status === 'Pending');
      const failedTransactions = transactions.filter(t => t.status === 'Failed');

      earnings.push({
        phoneNumber: ReportController.generatePhoneNumber(),
        totalEarnings: ReportController.formatAmount(totalEarnings),
        completedEarnings: ReportController.formatAmount(completedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)),
        pendingEarnings: ReportController.formatAmount(pendingTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)),
        failedEarnings: ReportController.formatAmount(failedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)),
        totalTransactions: transactions.length,
        completedTransactions: completedTransactions.length,
        pendingTransactions: pendingTransactions.length,
        failedTransactions: failedTransactions.length,
        averageTransactionAmount: ReportController.formatAmount(totalEarnings / transactions.length),
        lastTransactionDate: transactions[transactions.length - 1]?.timestamp,
        transactions: transactions,
        // Additional fields
        monthlyEarnings: ReportController.formatAmount(totalEarnings * (Math.random() * 0.3 + 0.7)),
        yearlyEarnings: ReportController.formatAmount(totalEarnings * (Math.random() * 8 + 4)),
        commissionEarned: ReportController.formatAmount(totalEarnings * 0.1),
        bonusEarned: ReportController.formatAmount(Math.random() * 1000 + 200),
        penalties: ReportController.formatAmount(Math.random() * 100 + 10),
        netEarnings: ReportController.formatAmount(totalEarnings + Math.random() * 1000 - Math.random() * 100)
      });
    }
    return earnings;
  }

  // Get Traveler Report (Enhanced) - Now shows each travel separately with dummy data
  static async getTravelerReport(req, res) {
    try {
      console.log('📊 Generating Enhanced Traveler Report (Individual Travels) with dummy data...');
      
      // Generate dummy data with consistent phone numbers
      const userProfiles = ReportController.generateDummyUsers();
      const allTravelDetails = ReportController.generateDummyTravelDetails();
      const consignmentHistory = ReportController.generateDummyConsignmentHistory();
      const earnings = ReportController.generateDummyEarnings();
      
      // Create lookup maps
      const userMap = ReportController.createUserMap(userProfiles);
      const travelerProfiles = userProfiles.filter(u => u.role === 'traveler');
      const earningMap = {};
      earnings.forEach(earning => {
        earningMap[earning.phoneNumber] = earning;
      });
      
      // Create consignment history map for quick lookup
      const consignmentHistoryMap = {};
      consignmentHistory.forEach(history => {
        if (history.traveldetails && history.traveldetails.length > 0) {
          history.traveldetails.forEach(travelDetail => {
            if (!consignmentHistoryMap[travelDetail.travelId]) {
              consignmentHistoryMap[travelDetail.travelId] = [];
            }
            consignmentHistoryMap[travelDetail.travelId].push({
              consignmentId: history.consignmentId,
              description: history.description,
              status: history.status,
              expectedEarning: history.expectedEarning,
              distance: history.distance,
              category: history.category,
              pickup: history.pickupLocation,
              delivery: history.deliveryLocation,
              senderPhoneNumber: history.senderPhoneNumber
            });
          });
        }
      });

      const travelReports = await Promise.all(
        allTravelDetails.map(async (travel) => {
          let traveler = userMap[travel.phoneNumber];
          let userEarnings = earningMap[travel.phoneNumber];
          
          // If traveler not found, assign a random traveler from the first 10 users
          if (!traveler) {
            const randomTravelerIndex = Math.floor(Math.random() * 10);
            const randomTraveler = userProfiles[randomTravelerIndex];
            if (randomTraveler) {
              traveler = randomTraveler;
              userEarnings = earningMap[randomTraveler.phoneNumber];
            }
          }
          
          // Get consignments associated with this travel
          const associatedConsignments = consignmentHistoryMap[travel.travelId] || [];

          // Calculate earnings for this specific travel
          const travelEarning = parseFloat(travel.payableAmount) || 0;
          const consignmentEarnings = associatedConsignments.reduce((sum, consignment) => {
            return sum + (parseFloat(consignment.expectedEarning) || 0);
          }, 0);
          const totalEarning = Math.max(travelEarning, consignmentEarnings);

          // Get recent transactions for this traveler
          const recentTransactions = userEarnings?.transactions?.slice(-5).map(t => ({
            title: t.title,
            amount: ReportController.formatAmount(t.amount),
            status: t.status,
            paymentMethod: t.paymentMethod,
            timestamp: ReportController.formatDate(t.timestamp)
          })) || [];

          return {
            travelId: travel.travelId,
            travelerId: traveler ? (traveler.userId || traveler._id.toString()) : travel.phoneNumber,
            travelerName: traveler ? `${traveler.firstName || ''} ${traveler.lastName || ''}`.trim() : 'Unknown',
            phoneNo: travel.phoneNumber,
            email: traveler?.email || 'N/A',
            address: traveler ? `${traveler.currentLocation?.coordinates?.[1] || ''}, ${traveler.currentLocation?.coordinates?.[0] || ''}` : 'Unknown',
            
            // Travel specific details
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
            
            // Associated consignments
            noOfConsignment: associatedConsignments.length,
            associatedConsignments: associatedConsignments.map(c => ({
              ...c,
              expectedEarning: ReportController.formatAmount(c.expectedEarning)
            })),
            
            // Financial details
            totalAmount: ReportController.formatAmount(totalEarning),
            payment: totalEarning > 0 ? 'Paid' : 'Pending',
            
            // Traveler profile details
            averageRating: traveler ? (traveler.averageRating || 0) : 0,
            totalRating: traveler ? (traveler.totalrating || 0) : 0,
            isVerified: traveler?.isVerified || false,
            recentTransactions: recentTransactions,
            
            // Timestamps
            createdAt: ReportController.formatDate(travel.createdAt),
            updatedAt: ReportController.formatDate(travel.updatedAt),
            travelerCreatedAt: ReportController.formatDate(traveler?.createdAt),
            travelerLastUpdated: ReportController.formatDate(traveler?.lastUpdated)
          };
        })
      );

      console.log(`✅ Enhanced traveler report generated with ${travelReports.length} individual travel records`);
      res.status(200).json(travelReports);
    } catch (error) {
      console.error('❌ Error fetching enhanced traveler report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  }

  // Get Sender Report (Enhanced) - Now shows each consignment separately with dummy data
  static async getSenderReport(req, res) {
    try {
      console.log('📦 Generating Enhanced Sender Report (Individual Consignments) with dummy data...');
      
      // Generate dummy data with consistent phone numbers
      const userProfiles = ReportController.generateDummyUsers();
      const consignments = ReportController.generateDummyConsignments();
      const consignmentHistory = ReportController.generateDummyConsignmentHistory();
      const travelDetails = ReportController.generateDummyTravelDetails();
      const requestForCarry = ReportController.generateDummyRequestForCarry();
      
      // Create lookup maps
      const userMap = ReportController.createUserMap(userProfiles);
      const travelMap = {};
      travelDetails.forEach(travel => {
        travelMap[travel.travelId] = travel;
      });
      const requestMap = {};
      requestForCarry.forEach(request => {
        if (!requestMap[request.consignmentId]) {
          requestMap[request.consignmentId] = [];
        }
        requestMap[request.consignmentId].push(request);
      });
      
      // Create consignment history map for quick lookup
      const consignmentHistoryMap = {};
      consignmentHistory.forEach(history => {
        consignmentHistoryMap[history.consignmentId] = history;
      });

      const consignmentReports = await Promise.all(
        consignments.map(async (consignment) => {
          let sender = userMap[consignment.phoneNumber];
          
          // If sender not found, assign a random sender from the last 10 users
          if (!sender) {
            const randomSenderIndex = Math.floor(Math.random() * 10) + 10; // Last 10 users are senders
            const randomSender = userProfiles[randomSenderIndex];
            if (randomSender) {
              sender = randomSender;
            }
          }
          
          // Get consignment history for this consignment
          const history = consignmentHistoryMap[consignment.consignmentId];
          
          // Get request for carry data for this consignment
          const requests = requestMap[consignment.consignmentId] || [];
          const acceptedRequest = requests.find(r => r.status === 'Accepted');
          
          // Calculate amount for this specific consignment
          const consignmentAmount = parseFloat(consignment.earning) || 0;

          // Get traveler information if available
          let traveler = null;
          let travelerAcceptanceDate = null;
          let travelMode = null;
          let travelerId = 'N/A';
          let amountToBePaidToTraveler = 0;
          
          if (history && history.traveldetails && history.traveldetails.length > 0) {
            const latestTravelDetail = history.traveldetails[history.traveldetails.length - 1];
            // Find traveler by phone number from travel details
            const travelDetail = travelMap[latestTravelDetail.travelId];
            if (travelDetail) {
              traveler = userMap[travelDetail.phoneNumber];
              travelerAcceptanceDate = latestTravelDetail.timestamp;
              travelMode = latestTravelDetail.travelMode;
              travelerId = traveler?._id?.toString() || travelDetail.phoneNumber;
              amountToBePaidToTraveler = parseFloat(history.expectedEarning) || 0;
            }
          } else if (acceptedRequest) {
            const travelDetail = travelMap[acceptedRequest.travelId];
            if (travelDetail) {
              traveler = userMap[travelDetail.phoneNumber];
              travelerAcceptanceDate = acceptedRequest.createdAt;
              travelMode = acceptedRequest.travelmode;
              travelerId = traveler?._id?.toString() || travelDetail.phoneNumber;
              amountToBePaidToTraveler = parseFloat(acceptedRequest.earning) || 0;
            }
          }
          
          // If still no traveler found, assign a random traveler from the first 10 users
          if (!traveler) {
            const randomTravelerIndex = Math.floor(Math.random() * 10);
            const randomTraveler = userProfiles[randomTravelerIndex];
            if (randomTraveler) {
              traveler = randomTraveler;
              travelerId = randomTraveler._id.toString();
              travelerAcceptanceDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
              travelMode = ['Car', 'Bike', 'Van', 'Truck', 'Auto'][Math.floor(Math.random() * 5)];
              amountToBePaidToTraveler = parseFloat(consignment.earning) * 0.7; // 70% of consignment amount
            }
          }

          // Calculate TnE amount
          const tneAmount = consignmentAmount - amountToBePaidToTraveler;
          const taxComponent = tneAmount * 0.18; // 18% tax

          // Payment status logic
          let senderPaymentStatus = 'Pending';
          let travelerPaymentStatus = 'N/A';

          if (consignmentAmount > 0) {
            if (consignment.status === 'Completed' || consignment.status === 'Delivered') {
              senderPaymentStatus = 'Paid';
            } else if (consignment.status === 'Accepted' || consignment.status === 'In Progress') {
              senderPaymentStatus = 'Paid';
            } else {
              senderPaymentStatus = 'Pending';
            }
          }

          if (amountToBePaidToTraveler > 0) {
            if (consignment.status === 'Completed' || consignment.status === 'Delivered') {
              travelerPaymentStatus = 'Paid';
            } else if (consignment.status === 'In Progress') {
              travelerPaymentStatus = 'Partial';
            } else {
              travelerPaymentStatus = 'Pending';
            }
          }

          // Get received date
          let receivedDate = 'N/A';
          if (history?.delivered) {
            receivedDate = ReportController.formatDate(history.delivered);
          } else if (acceptedRequest?.dateandtimeofdelivery) {
            receivedDate = ReportController.formatDate(acceptedRequest.dateandtimeofdelivery);
          } else if (acceptedRequest?.status === 'Delivered') {
            receivedDate = ReportController.formatDate(acceptedRequest.updatedAt);
          } else if (consignment.status === 'Completed' || consignment.status === 'Delivered') {
            // If consignment is completed, generate a realistic delivery date
            receivedDate = ReportController.formatDate(new Date(consignment.dateOfSending.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000));
          }

          return {
            consignmentId: consignment.consignmentId,
            consignmentStatus: consignment.status,
            
            // Sender information
            senderId: sender ? (sender.userId || sender._id.toString()) : consignment.phoneNumber,
            senderName: sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() : 'Unknown',
            senderMobileNo: consignment.phoneNumber,
            senderEmail: sender?.email || 'N/A',
            senderAddress: consignment.startinglocation,
            senderCurrentLocation: sender ? `${sender.currentLocation?.coordinates?.[1] || ''}, ${sender.currentLocation?.coordinates?.[0] || ''}` : 'Unknown',
            
            // Consignment details
            description: consignment.Description,
            category: consignment.category,
            subcategory: consignment.subcategory,
            weight: consignment.weight,
            dimensionalweight: consignment.dimensionalweight,
            dimensions: consignment.dimensions,
            distance: consignment.distance,
            duration: consignment.duration,
            handleWithCare: consignment.handleWithCare,
            specialRequest: consignment.specialRequest,
            
            // Recipient details
            recepientName: consignment.recievername,
            recepientAddress: consignment.goinglocation,
            recepientPhoneNo: consignment.recieverphone,
            
            // Financial details
            totalAmountSender: ReportController.formatAmount(consignmentAmount),
            amountToBePaidToTraveler: ReportController.formatAmount(amountToBePaidToTraveler),
            tneAmount: ReportController.formatAmount(tneAmount),
            taxComponent: ReportController.formatAmount(taxComponent),
            senderPaymentStatus: senderPaymentStatus,
            travelerPaymentStatus: travelerPaymentStatus,
            
            // Traveler information
            travelerId: travelerId,
            travelerName: traveler ? `${traveler.firstName || ''} ${traveler.lastName || ''}`.trim() : 'N/A',
            travelerMobileNo: traveler?.phoneNumber || 'N/A',
            travelerAddress: traveler?.currentLocation ? `${traveler.currentLocation.coordinates?.[1] || ''}, ${traveler.currentLocation.coordinates?.[0] || ''}` : 'N/A',
            travelerAcceptanceDate: ReportController.formatDate(travelerAcceptanceDate),
            travelMode: travelMode || 'N/A',
            hasTraveler: acceptedRequest ? 'Yes' : 'No',
            
            // Request details
            totalRequests: requests.length,
            acceptedRequests: acceptedRequest ? 1 : 0,
            
            // Dates
            dateOfSending: ReportController.formatDate(consignment.dateOfSending),
            receivedDate: receivedDate,
            createdAt: ReportController.formatDate(consignment.createdAt),
            updatedAt: ReportController.formatDate(consignment.updatedAt),
            senderCreatedAt: ReportController.formatDate(sender?.createdAt),
            senderLastUpdated: ReportController.formatDate(sender?.lastUpdated)
          };
        })
      );

      console.log(`✅ Enhanced sender report generated with ${consignmentReports.length} individual consignment records`);
      res.status(200).json(consignmentReports);
    } catch (error) {
      console.error('❌ Error fetching enhanced sender report:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  }

  // Get Consignment Consolidated Report (Enhanced) - Now uses dummy data
  static async getConsignmentConsolidatedReport(req, res) {
    try {
      console.log('📊 Generating Enhanced Consignment Consolidated Report with dummy data...');
      
      // Get query parameters for pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100; // Limit to 100 records per request
      const skip = (page - 1) * limit;
      
      // Generate consistent phone numbers for better data mapping
      const travelerPhoneNumbers = [];
      const senderPhoneNumbers = [];
      for (let i = 0; i < 10; i++) {
        travelerPhoneNumbers.push(ReportController.generatePhoneNumber());
        senderPhoneNumbers.push(ReportController.generatePhoneNumber());
      }
      
      // Generate dummy data with consistent phone numbers
      const userProfiles = ReportController.generateDummyUsers();
      const allConsignments = ReportController.generateDummyConsignments();
      const consignmentHistory = ReportController.generateDummyConsignmentHistory();
      const travelDetails = ReportController.generateDummyTravelDetails();
      const requestForCarry = ReportController.generateDummyRequestForCarry();
      const earnings = ReportController.generateDummyEarnings();
      
      // Apply pagination to consignments
      const consignmentsData = allConsignments.slice(skip, skip + limit);
      const consignmentToCarryData = requestForCarry; // Using requestForCarry as consignmentToCarry
      
      // Create lookup maps for efficient relationship resolution
      const userMap = ReportController.createUserMap(userProfiles);
      
      // Create travel map with phone number mapping
      const travelMap = {};
      const travelPhoneMap = {};
      travelDetails.forEach(travel => {
        travelMap[travel.travelId] = travel;
        travelPhoneMap[travel.phoneNumber] = travel;
      });
      
      // Create request map
      const requestMap = {};
      requestForCarry.forEach(request => {
        requestMap[request.consignmentId] = request;
      });
      
      // Create carry map
      const carryMap = {};
      consignmentToCarryData.forEach(carry => {
        carryMap[carry.consignmentId] = carry;
      });
      
      // Create earning map
      const earningMap = {};
      earnings.forEach(earning => {
        earningMap[earning.phoneNumber] = earning;
      });
      
      // Create consignment phone map
      const consignmentPhoneMap = {};
      allConsignments.forEach(consignment => {
        consignmentPhoneMap[consignment.phoneNumber] = consignment;
      });

      const consolidatedReport = await Promise.all(
        consignmentsData.map(async (consignment) => {
          try {
            // Find sender information
            let sender = userMap[consignment.phoneNumber];
            
            // If sender not found, assign a random sender from the last 10 users
            if (!sender) {
              const randomSenderIndex = Math.floor(Math.random() * 10) + 10; // Last 10 users are senders
              const randomSender = userProfiles[randomSenderIndex];
              if (randomSender) {
                sender = randomSender;
              }
            }
            
            // Find consignment history for this consignment
            const history = consignmentHistory.find(h => h.consignmentId === consignment.consignmentId);
            
            // Find consignment to carry data
            const carryData = carryMap[consignment.consignmentId];
            
            // Find request for carry data
            const requestData = requestMap[consignment.consignmentId];
            
            // Find traveler information with enhanced logic
            let traveler = null;
            let travelerAcceptanceDate = null;
            let travelMode = null;
            let travelStartDate = null;
            let travelEndDate = null;
            let travelerId = 'N/A';
            let amountToBePaidToTraveler = 0;
            
            // Enhanced traveler finding logic
            if (history && history.traveldetails && history.traveldetails.length > 0) {
              const latestTravelDetail = history.traveldetails[history.traveldetails.length - 1];
              // Find traveler by phone number from travel details
              const travelDetail = travelMap[latestTravelDetail.travelId];
              if (travelDetail) {
                traveler = userMap[travelDetail.phoneNumber];
                travelerAcceptanceDate = latestTravelDetail.timestamp;
                travelMode = latestTravelDetail.travelMode;
                travelerId = traveler?._id?.toString() || travelDetail.phoneNumber;
                amountToBePaidToTraveler = parseFloat(history.expectedEarning) || 0;
                travelStartDate = travelDetail.travelDate;
                travelEndDate = travelDetail.expectedEndTime;
              }
            } else if (carryData) {
              // Try to find traveler from carry data
              const travelDetail = travelMap[carryData.travelId];
              if (travelDetail) {
                traveler = userMap[travelDetail.phoneNumber];
                travelerAcceptanceDate = carryData.createdAt;
                travelMode = travelDetail.travelMode;
                travelStartDate = travelDetail.travelDate;
                travelEndDate = travelDetail.expectedEndTime;
                travelerId = traveler?._id?.toString() || travelDetail.phoneNumber;
                amountToBePaidToTraveler = parseFloat(carryData.earning) || 0;
              }
            } else if (requestData) {
              // Try to find traveler from request data
              const travelDetail = travelMap[requestData.travelId];
              if (travelDetail) {
                traveler = userMap[travelDetail.phoneNumber];
                travelerAcceptanceDate = requestData.createdAt;
                travelMode = requestData.travelmode;
                travelStartDate = travelDetail.travelDate;
                travelEndDate = travelDetail.expectedEndTime;
                travelerId = traveler?._id?.toString() || travelDetail.phoneNumber;
                amountToBePaidToTraveler = parseFloat(requestData.earning) || 0;
              }
            }
            
            // If still no traveler found, assign a random traveler from the first 10 users
            if (!traveler) {
              const randomTravelerIndex = Math.floor(Math.random() * 10);
              const randomTraveler = userProfiles[randomTravelerIndex];
              if (randomTraveler) {
                traveler = randomTraveler;
                travelerId = randomTraveler._id.toString();
                travelerAcceptanceDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
                travelMode = ['Car', 'Bike', 'Van', 'Truck', 'Auto'][Math.floor(Math.random() * 5)];
                amountToBePaidToTraveler = parseFloat(consignment.earning) * 0.7; // 70% of consignment amount
              }
            }

            // Enhanced amount calculations
            const totalAmountSender = parseFloat(consignment.earning) || 0;
            const tneAmount = totalAmountSender - amountToBePaidToTraveler;
            const taxComponent = tneAmount * 0.18; // 18% tax

            // Enhanced payment status logic
            let senderPaymentStatus = 'Pending';
            let travelerPaymentStatus = 'N/A';

            // Sender payment status logic
            if (totalAmountSender > 0) {
              if (consignment.status === 'Completed' || consignment.status === 'Delivered') {
                senderPaymentStatus = 'Paid';
              } else if (consignment.status === 'Accepted' || consignment.status === 'In Progress') {
                senderPaymentStatus = 'Paid';
              } else {
                senderPaymentStatus = 'Pending';
              }
            }

            // Traveler payment status logic
            if (amountToBePaidToTraveler > 0) {
              if (consignment.status === 'Completed' || consignment.status === 'Delivered') {
                travelerPaymentStatus = 'Paid';
              } else if (consignment.status === 'In Progress') {
                travelerPaymentStatus = 'Partial';
              } else {
                travelerPaymentStatus = 'Pending';
              }
            }

            // Enhanced received date logic
            let receivedDate = 'N/A';
            if (history?.delivered) {
              receivedDate = ReportController.formatDate(history.delivered);
            } else if (carryData?.dateandtimeofdelivery) {
              receivedDate = ReportController.formatDate(carryData.dateandtimeofdelivery);
            } else if (carryData?.status === 'Delivered') {
              receivedDate = ReportController.formatDate(carryData.updatedAt);
            } else if (consignment.status === 'Completed' || consignment.status === 'Delivered') {
              // If consignment is completed, generate a realistic delivery date
              receivedDate = ReportController.formatDate(new Date(consignment.dateOfSending.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000));
            }

            // Get traveler earnings data
            const travelerEarnings = earningMap[traveler?.phoneNumber];
            const travelerTotalEarnings = travelerEarnings?.totalEarnings || 0;
            
            // If no earnings found, generate realistic earnings
            const finalTravelerEarnings = travelerTotalEarnings || ReportController.formatAmount(Math.random() * 50000 + 10000);

            return {
              consignmentId: consignment.consignmentId,
              consignmentStatus: consignment.status,
              senderId: sender?._id?.toString() || consignment.phoneNumber,
              senderName: sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() : 'Unknown',
              senderMobileNo: consignment.phoneNumber,
              senderAddress: consignment.startinglocation,
              totalAmountSender: ReportController.formatAmount(totalAmountSender),
              paymentStatus: senderPaymentStatus,
              travelerId: travelerId,
              travelerAcceptanceDate: ReportController.formatDate(travelerAcceptanceDate),
              travelerName: traveler ? `${traveler.firstName || ''} ${traveler.lastName || ''}`.trim() : 'N/A',
              travelerMobileNo: traveler?.phoneNumber || 'N/A',
              travelerAddress: traveler?.currentLocation ? `${traveler.currentLocation.coordinates?.[1] || ''}, ${traveler.currentLocation.coordinates?.[0] || ''}` : 'N/A',
              amountToBePaidToTraveler: ReportController.formatAmount(amountToBePaidToTraveler),
              travelerPaymentStatus: travelerPaymentStatus,
              travelerTotalEarnings: finalTravelerEarnings,
              travelMode: travelMode || 'N/A',
              travelStartDate: ReportController.formatDate(travelStartDate),
              travelEndDate: ReportController.formatDate(travelEndDate),
              recepientName: consignment.recievername,
              recepientAddress: consignment.goinglocation,
              recepientPhoneNo: consignment.recieverphone,
              receivedDate: receivedDate,
              tneAmount: ReportController.formatAmount(tneAmount),
              taxComponent: ReportController.formatAmount(taxComponent),
              // Additional enhanced fields
              weight: consignment.weight,
              category: consignment.category,
              subcategory: consignment.subcategory,
              description: consignment.Description,
              dimensions: consignment.dimensions,
              distance: consignment.distance,
              duration: consignment.duration,
              handleWithCare: consignment.handleWithCare,
              specialRequest: consignment.specialRequest,
              dateOfSending: ReportController.formatDate(consignment.dateOfSending),
              createdAt: ReportController.formatDate(consignment.createdAt),
              updatedAt: ReportController.formatDate(consignment.updatedAt)
            };
          } catch (itemError) {
            console.error(`❌ Error processing consignment ${consignment.consignmentId}:`, itemError);
            // Return a basic record with error information
            return {
              consignmentId: consignment.consignmentId,
              consignmentStatus: consignment.status,
              error: 'Failed to process this record',
              message: itemError.message
            };
          }
        })
      );

      // Get total count for pagination
      const totalCount = allConsignments.length;

      console.log(`✅ Enhanced consolidated report generated with ${consolidatedReport.length} records (page ${page})`);
      res.status(200).json({
        data: consolidatedReport,
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
      console.error('❌ Error fetching enhanced consignment consolidated report:', error);
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
      const consignments = ReportController.generateDummyConsignments();
      const userProfiles = ReportController.generateDummyUsers();
      const travelDetails = ReportController.generateDummyTravelDetails();
      const consignmentHistory = ReportController.generateDummyConsignmentHistory();
      const earnings = ReportController.generateDummyEarnings();

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