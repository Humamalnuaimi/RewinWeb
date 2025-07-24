// Firebase Structure Checker
// Run this in your browser console to see what data exists in Firebase

// First, make sure you're logged into Firebase
// Then run this script in the browser console

console.log('🔍 Checking Firebase structure...');

// Check if we can access Firebase
if (typeof firebase === 'undefined') {
  console.error('❌ Firebase not loaded. Make sure you\'re on the dashboard page.');
  return;
}

// Function to check Firestore collections
async function checkFirestoreStructure() {
  try {
    console.log('📊 Checking Firestore collections...');
    
    // Check users collection
    const usersSnapshot = await firebase.firestore().collection('users').get();
    console.log('👥 Users collection:', usersSnapshot.docs.length, 'documents');
    
    if (usersSnapshot.docs.length > 0) {
      const sampleUser = usersSnapshot.docs[0].data();
      console.log('📋 Sample user structure:', sampleUser);
      
      // Check outlets for this user
      const outletsSnapshot = await firebase.firestore()
        .collection('users')
        .doc(usersSnapshot.docs[0].id)
        .collection('outlets')
        .get();
      console.log('🏪 Outlets for user:', outletsSnapshot.docs.length, 'documents');
      
      if (outletsSnapshot.docs.length > 0) {
        console.log('📋 Sample outlet structure:', outletsSnapshot.docs[0].data());
      }
      
      // Check customers for this user
      const customersSnapshot = await firebase.firestore()
        .collection('users')
        .doc(usersSnapshot.docs[0].id)
        .collection('web_customers')
        .get();
      console.log('👤 Customers for user:', customersSnapshot.docs.length, 'documents');
      
      if (customersSnapshot.docs.length > 0) {
        console.log('📋 Sample customer structure:', customersSnapshot.docs[0].data());
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking Firestore:', error);
  }
}

// Function to check Realtime Database
function checkRealtimeDatabase() {
  try {
    console.log('📊 Checking Realtime Database...');
    
    const db = firebase.database();
    
    // Check customers
    db.ref('customers').once('value')
      .then(snapshot => {
        const customers = snapshot.val();
        console.log('👤 Customers in Realtime DB:', customers ? Object.keys(customers).length : 0);
        if (customers) {
          console.log('📋 Sample customer structure:', Object.values(customers)[0]);
        }
      });
    
    // Check outlets
    db.ref('outlets').once('value')
      .then(snapshot => {
        const outlets = snapshot.val();
        console.log('🏪 Outlets in Realtime DB:', outlets ? Object.keys(outlets).length : 0);
        if (outlets) {
          console.log('📋 Sample outlet structure:', Object.values(outlets)[0]);
        }
      });
    
  } catch (error) {
    console.error('❌ Error checking Realtime Database:', error);
  }
}

// Run the checks
console.log('🚀 Starting Firebase structure check...');
checkFirestoreStructure();
checkRealtimeDatabase();

console.log('✅ Check complete! Look for the results above.'); 