# 🚀 How to Test the TableFlow MVP

Welcome! You've been invited to test the TableFlow MVP. 

TableFlow is a modern restaurant operating system. It allows customers to order directly from their tables using their phones, while the kitchen staff manages the orders in a real-time dashboard.

To properly test this product, grab a friend (or use your phone and your laptop) and play out the following **Roleplay Scenario**.

---

## 🎭 The Setup: Choose Your Roles

You need two devices for the best experience:
1. **The Kitchen / Manager (Laptop)**: This person manages the restaurant.
2. **The Customer (Smartphone)**: This person sits at the table and orders food.

---

## 💻 Step 1: The Kitchen (Laptop)

1. Open your web browser and go to the live application URL (or `http://localhost:3000` if running locally).
2. **Sign In**: Create a test account or log in with the credentials provided to you.
3. Once logged in, you will be on the **Overview Dashboard**. You'll notice your Live Revenue and Active Orders.
4. **Generate a Table**:
   - Navigate to the **Tables** tab on the left menu.
   - Click **Add Table** (e.g., "Table 5").
   - Click on the new table card to reveal its unique QR code.
   - Leave this QR code open on your laptop screen!

---

## 📱 Step 2: The Customer (Smartphone)

1. Pull out your smartphone.
2. Open your camera app and **Scan the QR Code** displayed on the laptop screen.
3. Tap the link that appears to open the TableFlow digital menu.
4. Notice the **premium glassmorphism design** and the categories. 
5. Browse the menu and add a few items to your cart.
6. Tap the **Floating Cart Button** at the bottom of the screen.
7. Tap **Place Order**.
8. Keep your phone screen on! You will now see the live **Order Status Tracker**.

---

## ⚡ Step 3: The Magic (Real-Time Sync)

1. **The Notification**: The moment the Customer taps "Place Order," the person on the laptop should hear a **"Ding!"** and see a green notification popup appear on their screen.
2. **The Kitchen Board**: 
   - On the laptop, navigate to the **Orders** tab.
   - You will see the new order sitting in the **Pending** column.
3. **Move the Order**: 
   - On the laptop, drag the order (or click it) to move it from **Pending** to **Preparing**.
   - *Look at the smartphone!* The customer's phone will immediately play a notification ping and update the tracker to "Preparing" without anyone refreshing the page.

---

## 🎉 Step 4: The Delivery (The "Wow" Moment)

1. On the laptop, move the order to the final column: **Delivered**.
2. *Look at the smartphone again!*
3. The customer will experience a beautiful **Confetti Explosion**! 🎊
4. The customer will be presented with a **Thank You** screen and asked to rate their meal out of 5 stars.
5. Tap a star on the phone to complete the feedback loop!

---

## 🔍 Extra Things to Test

If you want to dig deeper into the product, try testing these features:

- **Menu Management**: On the laptop, go to the **Menu** tab and add a new item or mark an item as "Unavailable". Refresh the phone to see the item disappear!
- **Languages**: On the laptop dashboard, click your profile icon in the bottom left and switch the language to French or Arabic. Watch the entire dashboard (including RTL support for Arabic) translate instantly!
- **Dashboard Analytics**: On the laptop, go back to the **Overview** tab. Notice that your new order's total has instantly been added to "Today's Revenue"!

---

### Have fun testing!
*Please report any bugs or feedback to the creator.*
