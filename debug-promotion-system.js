// Debug script to check promotion system setup
// Run this in the browser console when logged into the dashboard

async function debugPromotionSystem() {
  // Import required functions
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
  const { getFirestore, doc, getDoc, collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;
  
  console.log("=== PROMOTION SYSTEM DEBUG ===");
  console.log("1. Current User UID:", user?.uid);
  console.log("2. Current User Email:", user?.email);
  
  if (!user) {
    console.error("❌ No user logged in!");
    return;
  }
  
  // Check user profile for businessId
  try {
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
    const userData = userDoc.data();
    console.log("3. User Profile businessId:", userData?.businessId || "Not set");
  } catch (error) {
    console.log("3. User Profile: Error reading", error.message);
  }
  
  // Check default business document
  const defaultBusinessId = 'esZRrfTvOdOgqsx9Dvo8';
  try {
    const businessDoc = await getDoc(doc(firestore, 'businesses', defaultBusinessId));
    const businessData = businessDoc.data();
    
    console.log("\n=== BUSINESS DOCUMENT CHECK ===");
    console.log("4. Business Document Exists:", businessDoc.exists());
    console.log("5. Business Name:", businessData?.name);
    console.log("6. Business ownerId:", businessData?.ownerId || "❌ MISSING!");
    console.log("7. Business isActive:", businessData?.isActive);
    console.log("8. ownerId matches current user:", businessData?.ownerId === user?.uid ? "✅ YES" : "❌ NO");
    
    if (!businessData?.ownerId) {
      console.error("\n❌ CRITICAL: Business document is missing 'ownerId' field!");
      console.log("To fix, run this command:");
      console.log(`await updateDoc(doc(firestore, 'businesses', '${defaultBusinessId}'), { ownerId: '${user.uid}' });`);
    }
  } catch (error) {
    console.error("4-8. Business Document: Error reading", error.message);
  }
  
  // Check for businesses owned by current user
  try {
    const businessQuery = query(
      collection(firestore, 'businesses'),
      where('ownerId', '==', user.uid)
    );
    const businessSnapshot = await getDocs(businessQuery);
    
    console.log("\n=== USER'S BUSINESSES ===");
    console.log("9. Businesses owned by user:", businessSnapshot.size);
    
    businessSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   Business ${index + 1}: ID=${doc.id}, Name=${data.name}, Active=${data.isActive}`);
    });
  } catch (error) {
    console.log("9. User's Businesses: Error querying", error.message);
  }
  
  // Check promotions
  try {
    const promotionsSnapshot = await getDocs(
      collection(firestore, 'users', user.uid, 'promotions')
    );
    
    console.log("\n=== PROMOTIONS CHECK ===");
    console.log("10. Total promotions:", promotionsSnapshot.size);
    
    if (promotionsSnapshot.size > 0) {
      const firstPromo = promotionsSnapshot.docs[0].data();
      console.log("11. Sample promotion:");
      console.log("    - Title:", firstPromo.title);
      console.log("    - Type:", firstPromo.type);
      console.log("    - isActive:", firstPromo.isActive);
      console.log("    - businessId:", firstPromo.businessId);
      console.log("    - discountType:", firstPromo.discountType);
      console.log("    - discountAmount:", firstPromo.discountAmount);
    }
  } catch (error) {
    console.log("10-11. Promotions: Error reading", error.message);
  }
  
  console.log("\n=== SUMMARY ===");
  console.log("Path where promotions are stored:", `/users/${user.uid}/promotions/`);
  console.log("Business ID being used:", defaultBusinessId);
  console.log("\nIf the mobile app can't see promotions, check that:");
  console.log("1. Business document has 'ownerId' field set to:", user.uid);
  console.log("2. Promotions have 'isActive': true");
  console.log("3. Promotions have 'type': 'PROMOTION'");
}

// Run the debug function
debugPromotionSystem();
